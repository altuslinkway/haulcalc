import { describe, expect, it } from "vitest";
import { DEFAULT_DETAILS, DEFAULT_SETTINGS } from "./defaults";
import { computeQuote, loadPrice, rangeFactors } from "./engine";
import { scaleLoadTo } from "./estimate";
import { buildPhotoRequestMessage, buildQuoteMessage } from "./message";
import type { EstimateLine, JobDetails, JobEstimate, Settings } from "./types";

const tiers = DEFAULT_SETTINGS.loadTiers;

/** Default rates on a 15 yd trailer with no range, so prices are easy to check by hand. */
function exact(): Settings {
  const s = structuredClone(DEFAULT_SETTINGS);
  s.trailer = { ...s.trailer, lengthFt: 15, widthFt: 6.75, sideHeightFt: 4 }; // 15 yd³
  s.estimate = { spreadPct: { high: 0, medium: 0, low: 0 }, unseenPct: 0, unseenHighRiskPct: 0, calibrationPct: null };
  return s;
}

let nextId = 0;
function line(overrides: Partial<EstimateLine> = {}): EstimateLine {
  return {
    id: `l${nextId++}`,
    description: "Mixed junk",
    quantity: 1,
    cubicYards: 7.5,
    weightLbs: 1500,
    material: "household",
    category: "mixed_pile",
    itemId: null,
    ...overrides,
  };
}

function estimate(overrides: Partial<JobEstimate> = {}): JobEstimate {
  return {
    summary: "",
    lines: [line()],
    addOns: [],
    scope: "single_area",
    prohibitedItems: [],
    stairsFlights: 0,
    accessNotes: "",
    confidence: "high",
    questionsForCustomer: [],
    networkCalibrationPct: 0,
    ...overrides,
  };
}

const details: JobDetails = { ...DEFAULT_DETAILS, distanceMiles: 10 };
const fridge = (o: Partial<EstimateLine> = {}) =>
  line({ description: "Refrigerator", cubicYards: 1.5, weightLbs: 250, itemId: "appliance", ...o });
const lineAmount = (q: ReturnType<typeof computeQuote>, label: string) => q.lines.find((l) => l.label === label)?.amount;

describe("loadPrice", () => {
  it("holds the minimum flat for the first sixteenth of a load", () => {
    expect(loadPrice(0.03, tiers)).toBe(99);
    expect(loadPrice(1 / 16, tiers)).toBe(99);
  });

  it("hits each tier's high price at the tier boundary", () => {
    expect(loadPrice(0.125, tiers)).toBe(150);
    expect(loadPrice(0.25, tiers)).toBe(255);
    expect(loadPrice(0.5, tiers)).toBe(430);
    expect(loadPrice(0.75, tiers)).toBe(595);
    expect(loadPrice(1, tiers)).toBe(765);
  });

  it("interpolates inside a tier", () => {
    expect(loadPrice(0.375, tiers)).toBe(342.5);
  });

  it("charges full loads at the top price plus the remainder", () => {
    expect(loadPrice(1.25, tiers)).toBe(765 + 255);
    expect(loadPrice(2, tiers)).toBe(765 * 2);
  });

  it("ignores tier order in the settings", () => {
    expect(loadPrice(0.375, [...tiers].reverse())).toBe(342.5);
  });
});

describe("computeQuote: what's priced", () => {
  it("prices a half load from the rate card", () => {
    const q = computeQuote(exact(), estimate(), details);
    expect(q.volume.tierLabel).toBe("1/2 Load");
    expect(q.total).toEqual({ low: 430, high: 430 });
  });

  it("spreads the range by confidence and leans up for unseen items", () => {
    const s = exact();
    s.estimate.spreadPct.medium = 10;
    s.estimate.unseenPct = 10;
    const q = computeQuote(s, estimate({ confidence: "medium" }), details);
    // 7.5 yd³ → 6.75 to 9.075 yd³ (45%–60.5% of the trailer).
    expect(q.volume.cubicYards.low).toBeCloseTo(6.75);
    expect(q.volume.cubicYards.high).toBeCloseTo(9.075);
    expect(q.total).toEqual({ low: 395, high: 500 });
    expect(q.volume.unseenPct).toBe(10);
  });

  it("uses the bigger cushion for multi-room jobs, and lets the owner override it", () => {
    const s = exact();
    s.estimate.unseenHighRiskPct = 20;
    const e = estimate({ scope: "multi_area" });
    expect(computeQuote(s, e, details).volume.unseenPct).toBe(20);
    expect(computeQuote(s, e, { ...details, unseenPct: 0 }).volume.unseenPct).toBe(0);
  });

  it("lets a chosen load size land at the top of the range", () => {
    const s = exact();
    s.estimate.spreadPct.medium = 10;
    s.estimate.unseenPct = 10;
    const e = estimate({ confidence: "medium" });
    const top = rangeFactors(s, e, details).high;
    const q = computeQuote(s, scaleLoadTo(e, s, 7.5 / top), details);
    expect(q.volume.tierLabel).toBe("1/2 Load");
    expect(q.total.high).toBe(430);
  });

  it("applies the calibration learned from finished jobs", () => {
    const s = exact();
    s.estimate.calibrationPct = 20;
    // 7.5 → 9 yd³ = 60% → 430 + 0.4 × 165.
    expect(computeQuote(s, estimate(), details).total.low).toBe(495);
  });

  it("applies the network correction unless the owner set their own or opted out", () => {
    const e = estimate({ networkCalibrationPct: 20 });
    const q = computeQuote(exact(), e, details);
    expect(q.volume.calibrationSource).toBe("network");
    expect(q.total.low).toBe(495);

    const own = exact();
    own.estimate.calibrationPct = 0;
    expect(computeQuote(own, e, details)).toMatchObject({ total: { low: 430 }, volume: { calibrationSource: "owner" } });

    const optedOut = exact();
    optedOut.learning.useNetwork = false;
    expect(computeQuote(optedOut, e, details).volume.calibrationSource).toBeNull();
  });

  it("prices flat-rate items on their own, without charging for their space", () => {
    const q = computeQuote(exact(), estimate({ lines: [line(), fridge()], addOns: [{ itemId: "freon", quantity: 1 }] }), details);
    expect(lineAmount(q, "Load: 1/2 Load")).toEqual({ low: 430, high: 430 });
    expect(lineAmount(q, "Refrigerator")).toEqual({ low: 120, high: 120 });
    expect(lineAmount(q, "Freon removal")).toEqual({ low: 35, high: 35 });
    expect(q.total.low).toBe(585);
    // The fridge still takes room in the trailer.
    expect(q.volume.totalCubicYards.low).toBeCloseTo(9);
  });

  it("prices a lone flat-rate item with no load line", () => {
    const q = computeQuote(exact(), estimate({ lines: [fridge()] }), details);
    expect(q.lines).toHaveLength(1);
    expect(q.total.low).toBe(120);
  });

  it("charges a line by the load once it's moved off the flat rate", () => {
    const q = computeQuote(exact(), estimate({ lines: [line(), fridge({ itemId: null })] }), details);
    // 9 yd³ = 60% of the trailer.
    expect(q.total.low).toBe(495);
  });

  it("flags on-site items instead of pricing them", () => {
    const q = computeQuote(
      exact(),
      estimate({ lines: [line(), line({ description: "Drywall scraps", itemId: "construction-debris" })] }),
      details,
    );
    expect(q.total.low).toBe(430);
    expect(q.warnings.some((w) => w.includes("Drywall scraps") && w.includes("on-site"))).toBe(true);
  });

  it("ignores add-ons for items that aren't add-ons any more", () => {
    const q = computeQuote(exact(), estimate({ addOns: [{ itemId: "appliance", quantity: 1 }] }), details);
    expect(q.lines).toHaveLength(1);
  });

  it("applies the minimum charge", () => {
    const s = exact();
    s.charges.minimumCharge = 125;
    const q = computeQuote(s, estimate({ lines: [line({ cubicYards: 0.3, weightLbs: 40 })] }), details);
    expect(q.minimumApplied).toBe(true);
    expect(q.total).toEqual({ low: 125, high: 125 });
  });

  it("charges travel past the free zone", () => {
    const q = computeQuote(exact(), estimate(), { ...details, distanceMiles: 35 });
    expect(lineAmount(q, "Travel fee")).toEqual({ low: 40, high: 40 });
  });

  it("charges stairs, doubled for big loads, and prefers the owner's count", () => {
    expect(lineAmount(computeQuote(exact(), estimate({ stairsFlights: 1 }), details), "Stairs")?.low).toBe(25);
    const big = estimate({ stairsFlights: 1, lines: [line({ cubicYards: 9, weightLbs: 1800 })] });
    expect(lineAmount(computeQuote(exact(), big, details), "Stairs")?.low).toBe(50);
    expect(lineAmount(computeQuote(exact(), big, { ...details, stairsFlights: 0 }), "Stairs")).toBeUndefined();
  });

  it("charges a long carry per 50 ft past the free distance", () => {
    const q = computeQuote(exact(), estimate(), { ...details, carryFeet: 120 });
    expect(lineAmount(q, "Long carry")).toEqual({ low: 100, high: 100 });
  });

  it("charges dense material by weight, at least twice the dump rate", () => {
    // A quarter trailer of concrete: 750 lbs included, 6,750 over at $150/ton.
    const concrete = estimate({ lines: [line({ cubicYards: 3.75, weightLbs: 7500, material: "dense" })] });
    const q = computeQuote(exact(), concrete, details);
    expect(lineAmount(q, "Heavy material")).toEqual({ low: 506, high: 506 });

    const s = exact();
    s.costs.dumpFeePerTon = 100;
    expect(lineAmount(computeQuote(s, concrete, details), "Heavy material")?.low).toBe(675);
  });

  it("counts trips by weight when the payload runs out first", () => {
    const q = computeQuote(
      exact(),
      estimate({ lines: [line({ cubicYards: 3.75, weightLbs: 10000, material: "dense" })] }),
      details,
    );
    expect(q.volume.loads).toBe(2);
    expect(q.volume.weightLimited).toBe(true);
    expect(q.warnings.some((w) => w.includes("Weight, not space"))).toBe(true);
  });

  it("follows the owner's policy for dense material", () => {
    const s = exact();
    s.charges.densePolicy = "decline";
    const q = computeQuote(s, estimate({ lines: [line({ material: "dense", weightLbs: 15000 })] }), details);
    expect(q.warnings.some((w) => w.includes("decline"))).toBe(true);
  });

  it("adds job-type and timing premiums", () => {
    const q = computeQuote(exact(), estimate(), { ...details, hoarder: true, afterHours: true, sameDay: true });
    expect(lineAmount(q, "Heavy sorting / packed rooms")?.low).toBe(108);
    expect(lineAmount(q, "After-hours / weekend")?.low).toBe(86);
    expect(lineAmount(q, "Same-day service")?.low).toBe(50);
    expect(q.total.low).toBe(675);
  });

  it("warns about prohibited items", () => {
    const q = computeQuote(
      exact(),
      estimate({ prohibitedItems: [{ name: "Propane tank", reason: "Compressed gas cylinder" }] }),
      details,
    );
    expect(q.warnings[0]).toContain("Propane tank");
  });
});

describe("computeQuote: your costs", () => {
  it("adds up dump, labor with payroll, dump run, truck, overhead, marketing and card fees", () => {
    const q = computeQuote(exact(), estimate(), details);
    // Dump: 0.75 t × $65 = $48.75 (over the $40 minimum).
    expect(q.cost.dump.low).toBe(49);
    // Labor: (1 h loading + 20 mi / 35 mph + 45 min dump run) × 2 crew × $20 × 1.2.
    const hours = 1 + 20 / 35 + 0.75;
    expect(q.cost.labor.low).toBe(Math.round(hours * 2 * 20 * 1.2));
    expect(q.truckHours.low).toBeCloseTo(hours);
    // Truck: (20 mi round trip + 10 mi to the dump) × $0.75.
    expect(q.cost.vehicle.low).toBe(23);
    expect(q.cost.overhead).toBe(40);
    expect(q.cost.marketing).toBe(35);
    expect(q.cost.cardFees.low).toBe(11);
    expect(q.profit.low).toBe(Math.round(430 - (48.75 + hours * 48 + 22.5 + 40 + 35 + 430 * 0.025)));
  });

  it("shares the dump run and skips marketing when asked", () => {
    const q = computeQuote(exact(), estimate(), { ...details, sharedDumpRun: true, paidLead: false });
    expect(q.cost.vehicle.low).toBe(Math.round((20 + 10 / 3) * 0.75));
    expect(q.cost.marketing).toBe(0);
  });

  it("charges dump fees by material", () => {
    const s = exact();
    const yard = computeQuote(s, estimate({ lines: [line({ weightLbs: 3000, material: "yard" })] }), details);
    // 1.5 t × $65 × 0.75.
    expect(yard.cost.dump.low).toBe(73);
  });

  it("supports per-cubic-yard dump fees", () => {
    const s = exact();
    s.costs.dumpFeeMethod = "per_cubic_yard";
    const q = computeQuote(s, estimate({ lines: [line({ cubicYards: 10, weightLbs: 2000 })] }), details);
    expect(q.cost.dump.low).toBe(100);
  });

  it("counts disposal fees for flat-rate items and add-ons", () => {
    const q = computeQuote(
      exact(),
      estimate({ lines: [line(), fridge()], addOns: [{ itemId: "freon", quantity: 1 }, { itemId: "mattress", quantity: 2 }] }),
      details,
    );
    expect(q.cost.disposal).toBe(25 + 2 * 15);
  });

  it("warns when margin or revenue per truck-hour falls below target", () => {
    const s = exact();
    s.costs.laborWagePerHour = 200;
    s.costs.targetRevenuePerTruckHour = 1000;
    const q = computeQuote(s, estimate(), details);
    expect(q.warnings.some((w) => w.includes("below your 30% target"))).toBe(true);
    expect(q.warnings.some((w) => w.includes("per truck-hour"))).toBe(true);
  });

  it("prices cost-plus at the target margin after card fees", () => {
    const s = exact();
    s.pricingMethod = "cost_plus";
    const q = computeQuote(s, estimate(), details);
    expect(q.lines).toHaveLength(1);
    expect(q.margin.low).toBeGreaterThanOrEqual(28);
    expect(q.margin.high).toBeLessThanOrEqual(32);
  });
});

describe("messages", () => {
  it("writes a customer-ready quote", () => {
    const s = exact();
    s.businessName = "Junk Bros";
    const e = estimate({
      prohibitedItems: [
        { name: "Two paint cans", reason: "Liquid" },
        { name: "PCBs", reason: "Hazardous" },
      ],
      questionsForCustomer: ["Is anything in the back room too?"],
    });
    const d = { ...details, customerName: "Dana" };
    const msg = buildQuoteMessage(s, e, d, computeQuote(s, e, d), "range");
    expect(msg).toContain("Hi Dana! This is Junk Bros.");
    expect(msg).toContain("about 1/2 load of our trailer");
    expect(msg).toContain("$430");
    expect(msg).toContain("we can't take two paint cans and PCBs");
    expect(msg).toContain("Is anything in the back room too?");
  });

  it("uses a single price when asked, and skips the load size for flat-rate-only jobs", () => {
    const e = estimate({ lines: [fridge()] });
    const msg = buildQuoteMessage(exact(), e, details, computeQuote(exact(), e, details), "single", 150);
    expect(msg).toContain("Based on what we can see, your price is $150,");
  });

  it("asks customers for useful photos and the standard questions", () => {
    const msg = buildPhotoRequestMessage(DEFAULT_SETTINGS);
    expect(msg).toContain("2 wide photos of each pile");
    expect(msg).toContain("What floor is everything on?");
  });
});
