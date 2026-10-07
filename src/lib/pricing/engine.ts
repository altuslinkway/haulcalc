import type { JobDetails, JobEstimate, LoadTier, Quote, QuoteLine, Range, Settings } from "./types";

// The AI never sets the price. It describes the job (volume, weight, items);
// everything below turns that description into dollars using the owner's
// settings, so the same job always prices the same way.

const LBS_PER_TON = 2000;
/** Average speed for estimating drive time to and from the job. */
const AVG_DRIVE_MPH = 35;
/** Each flight of stairs adds this share to on-site loading time. */
const STAIRS_TIME_FACTOR = 0.15;
/** Even a single item takes the crew a while once they're on site. */
const MIN_ONSITE_HOURS = 0.5;

const round = (n: number) => Math.round(n);
const roundTo5 = (n: number) => Math.round(n / 5) * 5;
const range = (a: number, b: number): Range => ({ low: Math.min(a, b), high: Math.max(a, b) });
const addRanges = (rs: Range[]): Range =>
  rs.reduce((acc, r) => ({ low: acc.low + r.low, high: acc.high + r.high }), { low: 0, high: 0 });

export function sortedTiers(tiers: LoadTier[]): LoadTier[] {
  return [...tiers].filter((t) => t.fraction > 0).sort((a, b) => a.fraction - b.fraction);
}

/**
 * Price for a share of one trailer, read off the rate card as a curve.
 * Each tier's range spans the volume between the previous tier and itself:
 * with tiers 1/4 = $125–$200 and 1/2 = $200–$350, a 3/8 load is $275.
 * Above a full load, every full trailer is charged at the top tier's high
 * price and the remainder is priced on the curve.
 */
export function loadPrice(fraction: number, tiers: LoadTier[]): number {
  const sorted = sortedTiers(tiers);
  if (sorted.length === 0 || fraction <= 0) return 0;

  const top = sorted[sorted.length - 1];
  if (fraction > top.fraction) {
    const fullLoads = Math.floor(fraction / top.fraction);
    const remainder = fraction - fullLoads * top.fraction;
    return fullLoads * top.priceHigh + (remainder > 1e-9 ? loadPrice(remainder, tiers) : 0);
  }

  let prevFraction = 0;
  for (const tier of sorted) {
    if (fraction <= tier.fraction) {
      const t = (fraction - prevFraction) / (tier.fraction - prevFraction);
      return tier.priceLow + t * (tier.priceHigh - tier.priceLow);
    }
    prevFraction = tier.fraction;
  }
  return top.priceHigh;
}

/** The rate-card tier a given share of a trailer falls into. */
export function tierFor(fraction: number, tiers: LoadTier[]): LoadTier | undefined {
  const sorted = sortedTiers(tiers);
  return sorted.find((t) => fraction <= t.fraction) ?? sorted[sorted.length - 1];
}

function tierLabel(fractions: Range, tiers: LoadTier[]): string {
  const top = sortedTiers(tiers).at(-1);
  if (top && fractions.high > top.fraction) {
    const loads = Math.ceil(fractions.high / top.fraction - 1e-9);
    return `${loads} ${top.label}s`;
  }
  const low = tierFor(fractions.low, tiers);
  const high = tierFor(fractions.high, tiers);
  if (!low || !high) return "";
  return low.id === high.id ? low.label : `${low.label} – ${high.label}`;
}

export function computeQuote(settings: Settings, estimate: JobEstimate, details: JobDetails): Quote {
  const { charges, costs, trailer } = settings;
  const warnings: string[] = [];

  // Volume → share of the trailer. Low and high are two scenarios that are
  // carried through every line, so the range reflects photo uncertainty.
  const cubicYards = range(estimate.volumeCubicYardsLow, estimate.volumeCubicYardsHigh);
  const capacity = trailer.cubicYards > 0 ? trailer.cubicYards : 1;
  const fraction = range(cubicYards.low / capacity, cubicYards.high / capacity);
  const weight = range(estimate.weightLbsLow, estimate.weightLbsHigh);
  const loads = Math.max(1, Math.ceil(fraction.high - 1e-9));

  const flights = details.stairsFlights ?? estimate.stairsFlights;
  const roundTripMiles = Math.max(0, details.distanceMiles) * 2;

  // Fee items the owner charges for, matched to the rate card.
  const feeItems = estimate.feeItems
    .filter((f) => f.quantity > 0)
    .flatMap((f) => {
      const fee = settings.itemFees.find((i) => i.id === f.itemId);
      return fee ? [{ fee, quantity: f.quantity }] : [];
    });
  for (const { fee, quantity } of feeItems) {
    if (fee.onSiteQuote) {
      warnings.push(`${fee.name} (×${quantity}) needs an on-site quote per your rate card — not included in this price.`);
    }
  }
  const pricedFeeItems = feeItems.filter(({ fee }) => !fee.onSiteQuote);

  // ---- Your costs ----
  const dumpFor = (cy: number, lbs: number) => {
    const fee =
      costs.dumpFeeMethod === "per_ton" ? (lbs / LBS_PER_TON) * costs.dumpFeePerTon : cy * costs.dumpFeePerCubicYard;
    return Math.max(fee, costs.dumpMinimumPerTrip * loads);
  };
  const dump = range(dumpFor(cubicYards.low, weight.low), dumpFor(cubicYards.high, weight.high));

  const driveHours = roundTripMiles / AVG_DRIVE_MPH;
  const laborFor = (frac: number) => {
    const onsite = Math.max(MIN_ONSITE_HOURS, frac * costs.hoursPerFullLoad * (1 + STAIRS_TIME_FACTOR * flights));
    return (onsite + driveHours) * costs.crewSize * costs.laborWagePerHour;
  };
  const labor = range(laborFor(fraction.low), laborFor(fraction.high));
  const vehicle = roundTripMiles * costs.vehicleCostPerMile;
  const disposalTotal = pricedFeeItems.reduce((sum, { fee, quantity }) => sum + fee.disposalCost * quantity, 0);
  const disposal = range(disposalTotal, disposalTotal);
  const overhead = costs.overheadPerJob;
  const costTotal = addRanges([dump, labor, disposal, { low: vehicle + overhead, high: vehicle + overhead }]);

  // ---- Customer price ----
  const lines: QuoteLine[] = [];
  if (settings.pricingMethod === "cost_plus") {
    const markup = 1 / Math.max(0.01, 1 - costs.targetMarginPct / 100);
    lines.push({
      label: "Hauling, labor & disposal",
      detail: `Your costs plus ${costs.targetMarginPct}% margin`,
      amount: range(round(costTotal.low * markup), round(costTotal.high * markup)),
    });
  } else {
    lines.push({
      label: `Load: ${tierLabel(fraction, settings.loadTiers)}`,
      detail: `${fmtYards(cubicYards)} of a ${trailer.cubicYards} yd trailer`,
      amount: range(round(loadPrice(fraction.low, settings.loadTiers)), round(loadPrice(fraction.high, settings.loadTiers))),
    });

    for (const { fee, quantity } of pricedFeeItems) {
      lines.push({
        label: quantity > 1 ? `${fee.name} ×${quantity}` : fee.name,
        detail: fee.priceLow === fee.priceHigh ? `$${fee.priceLow} each` : `$${fee.priceLow}–$${fee.priceHigh} each`,
        amount: range(fee.priceLow * quantity, fee.priceHigh * quantity),
      });
    }

    const travelMiles = Math.max(0, details.distanceMiles - charges.freeTravelMiles);
    if (travelMiles > 0 && charges.travelFeePerMile > 0) {
      const fee = round(travelMiles * charges.travelFeePerMile);
      lines.push({
        label: "Travel fee",
        detail: `${round(travelMiles)} mi past your ${charges.freeTravelMiles} mi free zone`,
        amount: range(fee, fee),
      });
    }

    // The rate card assumes typical junk; heavy material pays by weight.
    const overweightFor = (lbs: number, frac: number) =>
      (Math.max(0, lbs - frac * charges.includedLbsPerFullLoad) / LBS_PER_TON) * charges.overweightFeePerTon;
    const overweight = range(round(overweightFor(weight.low, fraction.low)), round(overweightFor(weight.high, fraction.high)));
    if (overweight.high > 0) {
      lines.push({
        label: "Heavy material",
        detail: `Est. ${fmtLbs(weight)} vs ${fmtLbs(range(fraction.low * charges.includedLbsPerFullLoad, fraction.high * charges.includedLbsPerFullLoad))} included`,
        amount: overweight,
      });
    }

    // In cost-plus mode stairs are already priced in as extra labor time.
    if (flights > 0 && charges.stairsFeePerFlight > 0) {
      const fee = flights * charges.stairsFeePerFlight;
      lines.push({
        label: "Stairs",
        detail: `${flights} flight${flights > 1 ? "s" : ""} × $${charges.stairsFeePerFlight}`,
        amount: range(fee, fee),
      });
    }
  }

  const subtotal = addRanges(lines.map((l) => l.amount));
  const minimumApplied = subtotal.low < charges.minimumCharge;
  const total = range(
    roundTo5(Math.max(subtotal.low, charges.minimumCharge)),
    roundTo5(Math.max(subtotal.high, charges.minimumCharge)),
  );
  const suggested = roundTo5((total.low + total.high) / 2);

  // Pair the scenarios: a smaller job means both a lower price and lower costs.
  const profit = range(total.low - costTotal.low, total.high - costTotal.high);
  const marginOf = (p: number, price: number) => (price > 0 ? (p / price) * 100 : 0);
  const margin = range(marginOf(total.low - costTotal.low, total.low), marginOf(total.high - costTotal.high, total.high));

  // ---- Heads-ups for the owner ----
  for (const p of estimate.prohibitedItems) {
    warnings.unshift(`Prohibited item: ${p.name} — ${p.reason}`);
  }
  if (loads > 1) {
    warnings.push(`About ${loads} trailer loads — plan for ${loads} dump trips.`);
  }
  if (estimate.confidence === "low") {
    warnings.push("Low-confidence estimate — the photos may not show everything. Confirm before committing.");
  }
  if (margin.low < costs.targetMarginPct) {
    warnings.push(
      `Margin at the low end is ${Math.round(margin.low)}%, below your ${costs.targetMarginPct}% target. Consider quoting toward the high end.`,
    );
  }

  return {
    volume: { cubicYards, trailerFraction: fraction, tierLabel: tierLabel(fraction, settings.loadTiers), loads },
    lines,
    subtotal,
    minimumApplied,
    total,
    suggested,
    cost: {
      dump: roundRange(dump),
      labor: roundRange(labor),
      vehicle: round(vehicle),
      disposal,
      overhead,
      total: roundRange(costTotal),
    },
    profit: roundRange(profit),
    margin: roundRange(margin),
    warnings,
  };
}

function roundRange(r: Range): Range {
  return { low: round(r.low), high: round(r.high) };
}

function fmtYards(r: Range): string {
  const f = (n: number) => (Math.round(n * 10) / 10).toString();
  return r.low === r.high ? `${f(r.low)} yd³` : `${f(r.low)}–${f(r.high)} yd³`;
}

function fmtLbs(r: Range): string {
  const f = (n: number) => Math.round(n).toLocaleString("en-US");
  return r.low === r.high ? `${f(r.low)} lbs` : `${f(r.low)}–${f(r.high)} lbs`;
}
