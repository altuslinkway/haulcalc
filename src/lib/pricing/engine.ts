import { trailerCubicYards } from "./defaults";
import type { EstimateLine, ItemFee, JobDetails, JobEstimate, LoadTier, Quote, QuoteLine, Range, Settings } from "./types";

// The AI never sets the price. It lists what's in the photos (space, weight,
// material); everything below turns that into dollars using the owner's
// settings, so the same job always prices the same way.

const LBS_PER_TON = 2000;
/** Average speed for estimating drive time to and from the job. */
const AVG_DRIVE_MPH = 35;
/** Each flight of stairs adds this share to on-site loading time. */
const STAIRS_TIME_FACTOR = 0.25;
/** Extra loading time for each ton of dense material over the included weight. */
const HEAVY_HOURS_PER_TON = 0.25;
/** Even a single item takes the crew a while once they're on site. */
const MIN_ONSITE_HOURS = 0.5;
/** Share of a dump run a small job carries when it rides along with others. */
const SHARED_DUMP_RUN_SHARE = 1 / 3;
/** Above this share of a trailer, stairs cost double. */
const HEAVY_STAIRS_FRACTION = 0.5;

const round = (n: number) => Math.round(n);
const roundTo5 = (n: number) => Math.round(n / 5) * 5;
const range = (a: number, b: number): Range => ({ low: Math.min(a, b), high: Math.max(a, b) });
const fixed = (n: number): Range => ({ low: n, high: n });
const addRanges = (rs: Range[]): Range =>
  rs.reduce((acc, r) => ({ low: acc.low + r.low, high: acc.high + r.high }), { low: 0, high: 0 });
const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

export function sortedTiers(tiers: LoadTier[]): LoadTier[] {
  return [...tiers].filter((t) => t.fraction > 0).sort((a, b) => a.fraction - b.fraction);
}

/**
 * Price for a share of one trailer, read off the rate card as a curve.
 * Each tier's range spans the volume between the previous tier and itself:
 * with tiers 1/4 = $150–$255 and 1/2 = $255–$430, a 3/8 load is $342.50.
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

/** The rate-card tier a given share of a trailer falls into (a hair over a boundary still counts). */
export function tierFor(fraction: number, tiers: LoadTier[]): LoadTier | undefined {
  const sorted = sortedTiers(tiers);
  return sorted.find((t) => fraction <= t.fraction + 1e-3) ?? sorted[sorted.length - 1];
}

function tierLabel(fractions: Range, tiers: LoadTier[]): string {
  if (fractions.high <= 0) return "";
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

/** Lines priced as a flat-rate or on-site item, while that item is still set up that way. */
export function specialItem(line: EstimateLine, settings: Settings): ItemFee | undefined {
  if (!line.itemId) return undefined;
  const fee = settings.itemFees.find((f) => f.id === line.itemId);
  return fee && fee.pricing !== "addon" ? fee : undefined;
}

/** The share of the high end added for things the photos don't show. */
export function unseenPctFor(settings: Settings, estimate: JobEstimate, details: JobDetails): number {
  if (details.unseenPct !== null) return details.unseenPct;
  const highRisk = estimate.scope === "multi_area" || estimate.confidence === "low";
  return highRisk ? settings.estimate.unseenHighRiskPct : settings.estimate.unseenPct;
}

/**
 * Multipliers that turn the visible load into the quoted low–high range: a
 * spread by AI confidence, the owner's correction from past jobs, and a
 * cushion on the high end for what the photos don't show.
 */
export function rangeFactors(settings: Settings, estimate: JobEstimate, details: JobDetails): Range {
  const unseenPct = unseenPctFor(settings, estimate, details);
  const spread = (settings.estimate.spreadPct[estimate.confidence] ?? 0) / 100;
  const calibration = 1 + calibrationFor(settings, estimate).pct / 100;
  return { low: calibration * (1 - spread), high: calibration * (1 + spread) * (1 + unseenPct / 100) };
}

/** The owner's own correction wins; otherwise what HaulCalc learned across owners, if they use it. */
export function calibrationFor(
  settings: Settings,
  estimate: JobEstimate,
): { pct: number; source: "owner" | "network" | null } {
  if (settings.estimate.calibrationPct !== null) return { pct: settings.estimate.calibrationPct, source: "owner" };
  if (settings.learning.useNetwork && estimate.networkCalibrationPct) {
    return { pct: estimate.networkCalibrationPct, source: "network" };
  }
  return { pct: 0, source: null };
}

export function computeQuote(settings: Settings, estimate: JobEstimate, details: JobDetails): Quote {
  const { charges, costs } = settings;
  const warnings: string[] = [];
  const capacity = Math.max(0.1, trailerCubicYards(settings.trailer));
  const payload = settings.trailer.payloadLbs > 0 ? settings.trailer.payloadLbs : Infinity;

  // ---- What's in the job ----
  const loadLines = estimate.lines.filter((l) => !specialItem(l, settings));
  const flatLines = estimate.lines.flatMap((l) => {
    const fee = specialItem(l, settings);
    return fee?.pricing === "flat" ? [{ line: l, fee }] : [];
  });
  const onsiteLines = estimate.lines.flatMap((l) => {
    const fee = specialItem(l, settings);
    return fee?.pricing === "onsite" ? [{ line: l, fee }] : [];
  });
  const addOns = estimate.addOns.flatMap((a) => {
    const fee = settings.itemFees.find((f) => f.id === a.itemId);
    return fee?.pricing === "addon" && a.quantity > 0 ? [{ fee, quantity: a.quantity }] : [];
  });

  // The photos show a floor, not a ceiling: the range spreads around what's
  // visible and leans up for what isn't. Low and high are two scenarios
  // carried through every line, price and cost alike.
  const unseenPct = unseenPctFor(settings, estimate, details);
  const calibration = calibrationFor(settings, estimate);
  const factor = rangeFactors(settings, estimate, details);

  const loadCy = sum(loadLines, (l) => l.cubicYards);
  const loadLbs = sum(loadLines, (l) => l.weightLbs);
  const flatCy = sum(flatLines, ({ line }) => line.cubicYards);
  const flatLbs = sum(flatLines, ({ line }) => line.weightLbs);

  const cubicYards = range(loadCy * factor.low, loadCy * factor.high);
  const weight = range(loadLbs * factor.low, loadLbs * factor.high);
  const fraction = range(cubicYards.low / capacity, cubicYards.high / capacity);
  const totalCy = range(cubicYards.low + flatCy, cubicYards.high + flatCy);
  const totalLbs = range(weight.low + flatLbs, weight.high + flatLbs);

  const tripsFor = (cy: number, lbs: number) =>
    Math.max(1, Math.ceil(cy / capacity - 1e-9), Math.ceil(lbs / payload - 1e-9));
  const trips = { low: tripsFor(totalCy.low, totalLbs.low), high: tripsFor(totalCy.high, totalLbs.high) };
  const tripsBySpace = Math.max(1, Math.ceil(totalCy.high / capacity - 1e-9));
  const weightLimited = trips.high > tripsBySpace;

  const flights = details.stairsFlights ?? estimate.stairsFlights;
  const roundTripMiles = Math.max(0, details.distanceMiles) * 2;

  // ---- Your costs, per scenario ----
  const scenario = (s: "low" | "high") => {
    const f = factor[s];
    const perLine = (cy: number, lbs: number, rateFactor: number) =>
      (costs.dumpFeeMethod === "per_ton" ? (lbs / LBS_PER_TON) * costs.dumpFeePerTon : cy * costs.dumpFeePerCubicYard) *
      rateFactor;
    const dumpFees =
      sum(loadLines, (l) => perLine(l.cubicYards * f, l.weightLbs * f, costs.materialRateFactor[l.material] ?? 1)) +
      sum(flatLines, ({ line }) => perLine(line.cubicYards, line.weightLbs, 1));
    const dump = Math.max(dumpFees, costs.dumpMinimumPerTrip * trips[s]);

    const includedLbs = cubicYards[s] * charges.includedLbsPerCubicYard;
    const heavyTons = Math.max(0, weight[s] - includedLbs) / LBS_PER_TON;
    const onsite = Math.max(
      MIN_ONSITE_HOURS,
      (totalCy[s] / capacity) * costs.hoursPerFullLoad * (1 + STAIRS_TIME_FACTOR * flights) +
        heavyTons * HEAVY_HOURS_PER_TON,
    );
    const share = details.sharedDumpRun && trips[s] === 1 ? SHARED_DUMP_RUN_SHARE : 1;
    const dumpHours = (trips[s] * costs.dumpTripMinutes * share) / 60;
    const hours = onsite + roundTripMiles / AVG_DRIVE_MPH + dumpHours;
    const labor = hours * costs.crewSize * costs.laborWagePerHour * (1 + costs.payrollBurdenPct / 100);
    const vehicle = (roundTripMiles + trips[s] * costs.dumpTripMiles * share) * costs.vehicleCostPerMile;
    return { dump, labor, vehicle, hours };
  };
  const lo = scenario("low");
  const hi = scenario("high");
  const disposal =
    sum(flatLines, ({ line, fee }) => fee.disposalCost * line.quantity) +
    sum(addOns, ({ fee, quantity }) => fee.disposalCost * quantity);
  const overhead = costs.overheadPerJob;
  const marketing = details.paidLead ? costs.marketingPerPaidLead : 0;
  const costBeforeCard = {
    low: lo.dump + lo.labor + lo.vehicle + disposal + overhead + marketing,
    high: hi.dump + hi.labor + hi.vehicle + disposal + overhead + marketing,
  };
  const cardRate = costs.cardFeePct / 100;

  // ---- Customer price ----
  const lines: QuoteLine[] = [];
  if (settings.pricingMethod === "cost_plus") {
    const markup = 1 / Math.max(0.05, 1 - costs.targetMarginPct / 100 - cardRate);
    lines.push({
      label: "Hauling, labor & disposal",
      detail: `Your costs plus ${costs.targetMarginPct}% margin`,
      amount: range(round(costBeforeCard.low * markup), round(costBeforeCard.high * markup)),
    });
  } else {
    if (loadCy > 0) {
      lines.push({
        label: `Load: ${tierLabel(fraction, settings.loadTiers)}`,
        detail: [
          `${fmtYards(cubicYards)} of a ${round1(capacity)} yd trailer`,
          unseenPct > 0 ? `incl. +${unseenPct}% for unseen items` : "",
          calibration.pct ? `${signed(calibration.pct)}% learned from past jobs` : "",
        ]
          .filter(Boolean)
          .join(", "),
        amount: range(round(loadPrice(fraction.low, settings.loadTiers)), round(loadPrice(fraction.high, settings.loadTiers))),
      });
    }

    for (const { line, fee } of flatLines) {
      const label = line.quantity > 1 ? `${line.description} ×${line.quantity}` : line.description;
      lines.push({
        label,
        detail: `${fee.name}, flat rate${fee.priceLow === fee.priceHigh ? ` $${fee.priceLow}` : ` $${fee.priceLow}–$${fee.priceHigh}`} each`,
        amount: range(fee.priceLow * line.quantity, fee.priceHigh * line.quantity),
      });
    }

    for (const { fee, quantity } of addOns) {
      lines.push({
        label: quantity > 1 ? `${fee.name} ×${quantity}` : fee.name,
        detail: fee.priceLow === fee.priceHigh ? `$${fee.priceLow} each` : `$${fee.priceLow}–$${fee.priceHigh} each`,
        amount: range(fee.priceLow * quantity, fee.priceHigh * quantity),
      });
    }

    const travelMiles = Math.max(0, details.distanceMiles - charges.freeTravelMiles);
    if (travelMiles > 0 && charges.travelFeePerMile > 0) {
      lines.push({
        label: "Travel fee",
        detail: `${round(travelMiles)} mi past your ${charges.freeTravelMiles} mi free zone`,
        amount: fixed(round(travelMiles * charges.travelFeePerMile)),
      });
    }

    if (flights > 0 && charges.stairsFeePerFlight > 0) {
      const heavy = fraction.high > HEAVY_STAIRS_FRACTION + 1e-3;
      const fee = flights * charges.stairsFeePerFlight * (heavy ? 2 : 1);
      lines.push({
        label: "Stairs",
        detail: `${flights} flight${flights > 1 ? "s" : ""} × $${charges.stairsFeePerFlight}${heavy ? " × 2 for a big load" : ""}`,
        amount: fixed(fee),
      });
    }

    const extraCarry = Math.max(0, details.carryFeet - charges.freeCarryFeet);
    if (extraCarry > 0 && charges.longCarryFeePer50Ft > 0) {
      const steps = Math.ceil(extraCarry / 50);
      lines.push({
        label: "Long carry",
        detail: `${details.carryFeet} ft from the truck, ${charges.freeCarryFeet} ft included`,
        amount: fixed(steps * charges.longCarryFeePer50Ft),
      });
    }

    // The load price assumes typical junk; dense material pays by weight, and
    // never less than twice what the dump charges you for it.
    const heavyRate = Math.max(
      charges.heavyFeePerTon,
      costs.dumpFeeMethod === "per_ton" ? 2 * costs.dumpFeePerTon : 0,
    );
    const heavyFor = (s: "low" | "high") =>
      (Math.max(0, weight[s] - cubicYards[s] * charges.includedLbsPerCubicYard) / LBS_PER_TON) * heavyRate;
    const heavy = range(round(heavyFor("low")), round(heavyFor("high")));
    if (heavy.high > 0) {
      lines.push({
        label: "Heavy material",
        detail: `Est. ${fmtLbs(weight)}; ${charges.includedLbsPerCubicYard} lbs/yd³ included, then $${heavyRate}/ton`,
        amount: heavy,
      });
    }
  }

  // Job-type and timing premiums apply however the base price was set.
  const base = addRanges(lines.map((l) => l.amount));
  if (details.hoarder && charges.hoarderPct > 0) {
    lines.push({
      label: "Heavy sorting / packed rooms",
      detail: `+${charges.hoarderPct}%`,
      amount: range(round((base.low * charges.hoarderPct) / 100), round((base.high * charges.hoarderPct) / 100)),
    });
  }
  if (details.afterHours && charges.afterHoursPct > 0) {
    lines.push({
      label: "After-hours / weekend",
      detail: `+${charges.afterHoursPct}%`,
      amount: range(round((base.low * charges.afterHoursPct) / 100), round((base.high * charges.afterHoursPct) / 100)),
    });
  }
  if (details.sameDay && charges.sameDayFee > 0) {
    lines.push({ label: "Same-day service", detail: "Rush fee", amount: fixed(charges.sameDayFee) });
  }

  const subtotal = addRanges(lines.map((l) => l.amount));
  const minimumApplied = subtotal.low < charges.minimumCharge;
  const total = range(
    roundTo5(Math.max(subtotal.low, charges.minimumCharge)),
    roundTo5(Math.max(subtotal.high, charges.minimumCharge)),
  );
  const suggested = roundTo5((total.low + total.high) / 2);

  const cardFees = range(total.low * cardRate, total.high * cardRate);
  const costTotal = range(costBeforeCard.low + cardFees.low, costBeforeCard.high + cardFees.high);
  // Pair the scenarios: a smaller job means both a lower price and lower costs.
  const profitLow = total.low - (costBeforeCard.low + total.low * cardRate);
  const profitHigh = total.high - (costBeforeCard.high + total.high * cardRate);
  const marginOf = (p: number, price: number) => (price > 0 ? (p / price) * 100 : 0);
  const margin = range(marginOf(profitLow, total.low), marginOf(profitHigh, total.high));
  const truckHours = range(lo.hours, hi.hours);
  const revenuePerTruckHour = range(total.low / lo.hours, total.high / hi.hours);

  // ---- Heads-ups for the owner ----
  for (const p of estimate.prohibitedItems) {
    warnings.push(`Prohibited item: ${p.name}. ${p.reason.replace(/\.$/, "")}.`);
  }
  for (const { line, fee } of onsiteLines) {
    warnings.push(`${line.description} (${fee.name}) needs an on-site quote per your rates, so it isn't in this price.`);
  }
  if (loadLines.some((l) => l.material === "dense" && l.cubicYards > 0)) {
    if (charges.densePolicy === "decline") {
      warnings.push("Dense material (concrete, dirt, brick or rock): you've set this to decline. Remove it or refer the job.");
    } else if (charges.densePolicy === "review") {
      warnings.push("Dense material (concrete, dirt, brick or rock): review weight and trips before sending.");
    }
  }
  if (weightLimited) {
    warnings.push(
      `Weight, not space, sets the trips: about ${trips.high} loads to stay under your ${payload.toLocaleString("en-US")} lb payload.`,
    );
  } else if (trips.high > 1) {
    warnings.push(`About ${trips.high} trailer loads, so plan for ${trips.high} dump trips.`);
  }
  if (estimate.confidence === "low") {
    warnings.push("Low-confidence estimate: the photos may not show everything. Confirm before committing.");
  }
  if (estimate.scope === "multi_area" && estimate.confidence !== "high") {
    warnings.push("Several rooms or a whole-house job: consider an on-site estimate before committing to a price.");
  }
  if (margin.low < costs.targetMarginPct) {
    warnings.push(
      `Margin at the low end is ${Math.round(margin.low)}%, below your ${costs.targetMarginPct}% target. Consider quoting toward the high end.`,
    );
  }
  if (costs.targetRevenuePerTruckHour > 0 && revenuePerTruckHour.low < costs.targetRevenuePerTruckHour) {
    warnings.push(
      `About $${round(revenuePerTruckHour.low)} per truck-hour at the low end, under your $${costs.targetRevenuePerTruckHour} target.`,
    );
  }

  return {
    volume: {
      cubicYards,
      trailerFraction: fraction,
      tierLabel: tierLabel(fraction, settings.loadTiers),
      totalCubicYards: totalCy,
      totalWeightLbs: roundRange(totalLbs),
      loads: trips.high,
      weightLimited,
      unseenPct,
      calibrationPct: calibration.pct,
      calibrationSource: calibration.source,
    },
    lines,
    subtotal,
    minimumApplied,
    total,
    suggested,
    cost: {
      dump: roundRange(range(lo.dump, hi.dump)),
      labor: roundRange(range(lo.labor, hi.labor)),
      vehicle: roundRange(range(lo.vehicle, hi.vehicle)),
      disposal: round(disposal),
      cardFees: roundRange(cardFees),
      overhead,
      marketing,
      total: roundRange(costTotal),
    },
    truckHours,
    revenuePerTruckHour: roundRange(revenuePerTruckHour),
    profit: roundRange(range(profitLow, profitHigh)),
    margin: roundRange(margin),
    warnings,
  };
}

function roundRange(r: Range): Range {
  return { low: round(r.low), high: round(r.high) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function fmtYards(r: Range): string {
  return round1(r.low) === round1(r.high) ? `${round1(r.low)} yd³` : `${round1(r.low)}–${round1(r.high)} yd³`;
}

function fmtLbs(r: Range): string {
  const f = (n: number) => Math.round(n).toLocaleString("en-US");
  return Math.round(r.low) === Math.round(r.high) ? `${f(r.low)} lbs` : `${f(r.low)}–${f(r.high)} lbs`;
}
