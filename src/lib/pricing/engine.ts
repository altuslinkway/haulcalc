import type { EstimateLine, FlatItem, JobDetails, JobEstimate, Quote, QuoteLine, Range, Settings } from "./types";

// The AI never sets the price. It lists what's in the photos (space, weight);
// everything below turns that into dollars using the owner's few settings,
// so the same job always prices the same way.
//
// The details an owner shouldn't have to think about are fixed here, set from
// the market research in reports/Junk removal cost drivers.md.

const LBS_PER_TON = 2000;
/**
 * The load prices cover junk up to this heavy (household junk and yard waste
 * run 150–300 lbs a yard); concrete, dirt, shingles and the like pay the heavy-load rate.
 */
const INCLUDED_LBS_PER_CUBIC_YARD = 300;
/** A learned or typed correction beyond this is a mistake, not a pattern. */
const CALIBRATION_LIMITS = { min: -50, max: 200 };
/** Fractions of a trailer this close to a boundary count as on it, so labels, prices and trips agree. */
const EPS = 1e-3;
/** Spread around what's visible in the photos, by how sure the AI is. */
const SPREAD = { high: 0.05, medium: 0.1, low: 0.2 };
/** Added to the top of the range for things the photos don't show. */
const UNSEEN_PCT = 10;
const UNSEEN_PCT_BIG_JOB = 20;
// For the "you'd keep" estimate.
const AVG_DRIVE_MPH = 35;
const HOURS_PER_FULL_LOAD = 2;
const STAIRS_TIME_FACTOR = 0.25;
const MIN_ONSITE_HOURS = 0.5;
const DUMP_RUN_HOURS = 0.75;
const DUMP_RUN_MILES = 10;
/** Warn when dump fees, gas and helpers would eat more than this share of the price. */
const LOW_KEEP_SHARE = 0.3;

const round = (n: number) => Math.round(n);
const roundTo5 = (n: number) => Math.round(n / 5) * 5;
const range = (a: number, b: number): Range => ({ low: Math.min(a, b), high: Math.max(a, b) });
const fixed = (n: number): Range => ({ low: n, high: n });
const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const yards = (n: number) => Math.round(n * 10) / 10;

/** Trailer space the math uses. A blank or zero size in settings would otherwise divide by zero. */
export function capacityOf(settings: Settings): number {
  return Math.max(1, settings.trailer.cubicYards || 0);
}

/** Load sizes as a share of the trailer, in the order the owner prices them. */
export const LOAD_SIZES = [
  { key: "quarter", label: "1/4", fraction: 0.25 },
  { key: "half", label: "1/2", fraction: 0.5 },
  { key: "threeQuarter", label: "3/4", fraction: 0.75 },
  { key: "full", label: "Full", fraction: 1 },
] as const;

/**
 * Price for a share of one trailer. The four load prices are points on a
 * line that starts at the minimum charge: with 1/4 = $255 and 1/2 = $430, a
 * 3/8 load is $342.50. Beyond one trailer, each full load is charged at the
 * full price and the rest is priced on the same line. A bigger load never
 * costs less, even if a price was typed out of order.
 */
export function loadPrice(fraction: number, settings: Settings): number {
  if (!(fraction > 0)) return 0;
  const points = loadCurve(settings);
  const full = points[points.length - 1][1];
  if (fraction > 1 + EPS) {
    const fullLoads = Math.floor(fraction + EPS);
    const rest = fraction - fullLoads;
    return fullLoads * full + (rest > EPS ? loadPrice(rest, settings) : 0);
  }
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (fraction <= x1) return y0 + ((fraction - x0) / (x1 - x0)) * (y1 - y0);
  }
  return full;
}

function loadCurve(settings: Settings): [number, number][] {
  const { loadPrices } = settings;
  const points: [number, number][] = [[0, Math.max(0, Math.min(settings.minimumCharge, loadPrices.quarter))]];
  for (const size of LOAD_SIZES) {
    points.push([size.fraction, Math.max(points[points.length - 1][1], loadPrices[size.key] || 0)]);
  }
  return points;
}

/** The load size a share of the trailer rounds up to (a hair over still counts). */
function sizeName(fraction: number): string {
  if (fraction < 0.125 - EPS) return "Small";
  return LOAD_SIZES.find((s) => fraction <= s.fraction + EPS)?.label ?? "Full";
}

/** "1/2 load", "1/4 to 1/2 load", "1 to 2 loads"; empty for nothing. */
export function sizeLabel(fractions: Range): string {
  if (fractions.high <= 0) return "";
  if (fractions.high > 1 + EPS) {
    const low = Math.max(1, Math.ceil(fractions.low - EPS));
    const high = Math.ceil(fractions.high - EPS);
    return low === high ? `${high} loads` : `${low} to ${high} loads`;
  }
  const low = sizeName(fractions.low);
  const high = sizeName(fractions.high);
  return low === high ? `${low} load` : `${low} to ${high.toLowerCase()} load`;
}

/** The owner's flat-rate item this line is charged as, if it still exists. */
export function flatItemFor(line: EstimateLine, settings: Settings): FlatItem | undefined {
  return line.itemId ? settings.flatItems.find((i) => i.id === line.itemId) : undefined;
}

/** The share of the high end added for things the photos don't show. None once the owner has set the size. */
export function unseenPctFor(estimate: JobEstimate): number {
  if (estimate.sizedByOwner) return 0;
  return estimate.scope === "multi_area" || estimate.confidence === "low" ? UNSEEN_PCT_BIG_JOB : UNSEEN_PCT;
}

/**
 * The owner's own correction wins; otherwise what HaulCalc learned across
 * owners, if they use it. Corrections fix the AI's guesses, so none applies
 * once the owner has set the size themselves.
 */
export function calibrationFor(
  settings: Settings,
  estimate: JobEstimate,
): { pct: number; source: "owner" | "network" | null } {
  const clamp = (n: number) => Math.min(CALIBRATION_LIMITS.max, Math.max(CALIBRATION_LIMITS.min, n || 0));
  if (estimate.sizedByOwner) return { pct: 0, source: null };
  if (settings.calibrationPct !== null) return { pct: clamp(settings.calibrationPct), source: "owner" };
  if (settings.learning.useNetwork && estimate.networkCalibrationPct) {
    return { pct: clamp(estimate.networkCalibrationPct), source: "network" };
  }
  return { pct: 0, source: null };
}

/**
 * Multipliers that turn the visible load into the quoted low–high range: a
 * spread by AI confidence, the learned correction, and a cushion on the high
 * end for what the photos don't show. When the owner has said how big the
 * load is, that's the size: no range.
 */
export function rangeFactors(settings: Settings, estimate: JobEstimate): Range {
  if (estimate.sizedByOwner) return { low: 1, high: 1 };
  const spread = SPREAD[estimate.confidence] ?? SPREAD.medium;
  const calibration = 1 + calibrationFor(settings, estimate).pct / 100;
  return {
    low: calibration * (1 - spread),
    high: calibration * (1 + spread) * (1 + unseenPctFor(estimate) / 100),
  };
}

export function computeQuote(settings: Settings, estimate: JobEstimate, details: JobDetails): Quote {
  const { extras, costs } = settings;
  const warnings: string[] = [];
  const capacity = capacityOf(settings);
  const payload = settings.trailer.payloadLbs > 0 ? settings.trailer.payloadLbs : Infinity;

  // ---- What's in the job ----
  const loadLines = estimate.lines.filter((l) => !flatItemFor(l, settings));
  const flatLines = estimate.lines.flatMap((l) => {
    const item = flatItemFor(l, settings);
    return item ? [{ line: l, item }] : [];
  });

  // The photos show a floor, not a ceiling: the range spreads around what's
  // visible and leans up for what isn't. Low and high are two scenarios
  // carried through every line, price and cost alike.
  const unseenPct = unseenPctFor(estimate);
  const calibration = calibrationFor(settings, estimate);
  const factor = rangeFactors(settings, estimate);

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
    Math.max(1, Math.ceil(cy / capacity - EPS), Math.ceil(lbs / payload - EPS));
  const trips = { low: tripsFor(totalCy.low, totalLbs.low), high: tripsFor(totalCy.high, totalLbs.high) };
  const weightLimited = trips.high > Math.max(1, Math.ceil(totalCy.high / capacity - EPS));

  const flights = details.stairsFlights ?? estimate.stairsFlights;
  const roundTripMiles = Math.max(0, details.distanceMiles) * 2;

  // ---- The price ----
  const lines: QuoteLine[] = [];
  const size = sizeLabel(fraction);
  if (loadCy > 0) {
    lines.push({
      label: size,
      detail: estimate.sizedByOwner
        ? `${yards(cubicYards.high)} yd³ of your ${yards(capacity)} yd³, sized by you`
        : `${yards(cubicYards.low)}–${yards(cubicYards.high)} yd³ of your ${yards(capacity)} yd³, with room for what the photos don't show`,
      amount: range(round(loadPrice(fraction.low, settings)), round(loadPrice(fraction.high, settings))),
    });
  }

  for (const { line, item } of flatLines) {
    lines.push({
      label: line.quantity > 1 ? `${line.description} ×${line.quantity}` : line.description,
      detail: `${money(item.price)} each`,
      amount: fixed(item.price * line.quantity),
    });
  }

  const travelMiles = Math.max(0, details.distanceMiles - extras.freeMiles);
  if (travelMiles > 0 && extras.perMile > 0) {
    lines.push({
      label: "Travel",
      detail: `${round(travelMiles)} mi past your free ${extras.freeMiles} mi`,
      amount: fixed(round(travelMiles * extras.perMile)),
    });
  }

  if (flights > 0 && extras.stairsPerFlight > 0) {
    lines.push({
      label: "Stairs",
      detail: `${flights} flight${flights > 1 ? "s" : ""} at ${money(extras.stairsPerFlight)}`,
      amount: fixed(flights * extras.stairsPerFlight),
    });
  }

  // Heavier than normal junk pays by the ton, never less than twice the dump fee.
  const heavyRate = Math.max(extras.heavyPerTon, 2 * costs.dumpFeePerTon);
  const heavyFor = (s: "low" | "high") =>
    (Math.max(0, weight[s] - cubicYards[s] * INCLUDED_LBS_PER_CUBIC_YARD) / LBS_PER_TON) * heavyRate;
  const heavy = range(round(heavyFor("low")), round(heavyFor("high")));
  if (heavy.high > 0) {
    lines.push({ label: "Heavy load", detail: `${money(heavyRate)} a ton over normal junk`, amount: heavy });
  }

  const subtotal = { low: roundTo5(sum(lines, (l) => l.amount.low)), high: roundTo5(sum(lines, (l) => l.amount.high)) };
  const minimumApplied = subtotal.low < settings.minimumCharge;
  const total = range(Math.max(subtotal.low, settings.minimumCharge), Math.max(subtotal.high, settings.minimumCharge));
  const suggested = total.low === total.high ? total.low : roundTo5((total.low + total.high) / 2);

  // ---- What you'd keep (a smaller job means both a lower price and lower costs) ----
  const costFor = (s: "low" | "high") => {
    const dump = (totalLbs[s] / LBS_PER_TON) * costs.dumpFeePerTon;
    const gas = (roundTripMiles + trips[s] * DUMP_RUN_MILES) * costs.gasPerMile;
    const onsite = Math.max(
      MIN_ONSITE_HOURS,
      (totalCy[s] / capacity) * HOURS_PER_FULL_LOAD * (1 + STAIRS_TIME_FACTOR * flights),
    );
    const hours = onsite + roundTripMiles / AVG_DRIVE_MPH + trips[s] * DUMP_RUN_HOURS;
    const helpers = Math.max(0, costs.helpers) * costs.helperPerHour * hours;
    return { dump, gas, helpers, total: dump + gas + helpers };
  };
  const lo = costFor("low");
  const hi = costFor("high");
  const keep = range(round(total.low - lo.total), round(total.high - hi.total));

  // ---- Heads-ups ----
  for (const p of estimate.prohibitedItems) {
    warnings.push(`Prohibited item: ${p.name}. ${p.reason.replace(/\.$/, "")}.`);
  }
  if (weightLimited) {
    warnings.push(
      `Heavy load: about ${trips.high} trips to stay under your trailer's ${payload.toLocaleString("en-US")} lb limit.`,
    );
  } else if (trips.high > 1) {
    warnings.push(`About ${trips.high} trailer loads, so plan for ${trips.high} dump trips.`);
  }
  if (estimate.confidence === "low") {
    warnings.push("The photos may not show everything. Confirm before committing to a price.");
  }
  if (estimate.scope === "multi_area" && estimate.confidence !== "high") {
    warnings.push("Several rooms or a whole house: consider seeing it in person before committing.");
  }
  if (total.low > 0 && keep.low < total.low * LOW_KEEP_SHARE) {
    warnings.push(
      `You'd keep about ${money(keep.low)} at the low end after dump fees, gas and helpers. Consider quoting higher.`,
    );
  }

  return {
    volume: {
      cubicYards,
      trailerFraction: fraction,
      sizeLabel: size,
      totalCubicYards: totalCy,
      loads: trips.high,
      weightLimited,
      unseenPct,
      calibrationPct: calibration.pct,
      calibrationSource: calibration.source,
    },
    lines,
    minimumApplied,
    total,
    suggested,
    costs: {
      dump: range(round(lo.dump), round(hi.dump)),
      gas: range(round(lo.gas), round(hi.gas)),
      helpers: range(round(lo.helpers), round(hi.helpers)),
      total: range(round(lo.total), round(hi.total)),
    },
    keep,
    warnings,
  };
}
