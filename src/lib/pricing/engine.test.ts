import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import { computeQuote, loadPrice } from "./engine";
import { buildQuoteMessage } from "./message";
import type { JobDetails, JobEstimate, Settings } from "./types";

const tiers = DEFAULT_SETTINGS.loadTiers;

function estimate(overrides: Partial<JobEstimate> = {}): JobEstimate {
  return {
    summary: "",
    items: [],
    feeItems: [],
    volumeCubicYardsLow: 7.5,
    volumeCubicYardsHigh: 7.5,
    weightLbsLow: 1000,
    weightLbsHigh: 1000,
    prohibitedItems: [],
    stairsFlights: 0,
    accessNotes: "",
    confidence: "high",
    questionsForCustomer: [],
    ...overrides,
  };
}

const details: JobDetails = { customerName: "", distanceMiles: 10, stairsFlights: null };

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...structuredClone(DEFAULT_SETTINGS), ...overrides };
}

describe("loadPrice", () => {
  it("hits each tier's high price at the tier boundary", () => {
    expect(loadPrice(0.125, tiers)).toBe(125);
    expect(loadPrice(0.25, tiers)).toBe(200);
    expect(loadPrice(0.5, tiers)).toBe(350);
    expect(loadPrice(0.75, tiers)).toBe(500);
    expect(loadPrice(1, tiers)).toBe(765);
  });

  it("interpolates inside a tier", () => {
    // 3/8 is halfway through the 1/2 tier ($200–$350).
    expect(loadPrice(0.375, tiers)).toBe(275);
  });

  it("starts the smallest tier at its low price", () => {
    expect(loadPrice(0.0001, tiers)).toBeCloseTo(75, 0);
  });

  it("charges full loads at the top price plus the remainder", () => {
    expect(loadPrice(1.25, tiers)).toBe(765 + 200);
    expect(loadPrice(2, tiers)).toBe(765 * 2);
  });

  it("ignores tier order in the settings", () => {
    expect(loadPrice(0.375, [...tiers].reverse())).toBe(275);
  });
});

describe("computeQuote (rate card)", () => {
  it("prices a half load from the rate card", () => {
    const q = computeQuote(settings(), estimate(), details);
    expect(q.volume.tierLabel).toBe("1/2 Load");
    expect(q.lines[0].amount).toEqual({ low: 350, high: 350 });
    expect(q.total).toEqual({ low: 350, high: 350 });
  });

  it("turns a volume range into a price range", () => {
    const q = computeQuote(
      settings(),
      estimate({ volumeCubicYardsLow: 3.75, volumeCubicYardsHigh: 7.5, weightLbsLow: 500 }),
      details,
    );
    expect(q.total).toEqual({ low: 200, high: 350 });
    expect(q.volume.tierLabel).toBe("1/4 Load – 1/2 Load");
    expect(q.suggested).toBe(275);
  });

  it("adds item fees, using the low and high ends", () => {
    const q = computeQuote(
      settings(),
      estimate({
        feeItems: [
          { itemId: "mattress", quantity: 2, note: "" },
          { itemId: "couch", quantity: 1, note: "" },
        ],
      }),
      details,
    );
    expect(q.total).toEqual({ low: 350 + 120 + 75, high: 350 + 120 + 150 });
  });

  it("flags on-site-quote items instead of pricing them", () => {
    const q = computeQuote(
      settings(),
      estimate({ feeItems: [{ itemId: "construction-debris", quantity: 1, note: "" }] }),
      details,
    );
    expect(q.lines).toHaveLength(1);
    expect(q.warnings.some((w) => w.includes("on-site quote"))).toBe(true);
  });

  it("ignores fee items that aren't on the rate card", () => {
    const q = computeQuote(settings(), estimate({ feeItems: [{ itemId: "piano", quantity: 1, note: "" }] }), details);
    expect(q.lines).toHaveLength(1);
  });

  it("applies the minimum charge", () => {
    const s = settings();
    s.charges.minimumCharge = 100;
    const q = computeQuote(
      s,
      estimate({ volumeCubicYardsLow: 0.1, volumeCubicYardsHigh: 0.2, weightLbsLow: 20, weightLbsHigh: 40 }),
      details,
    );
    expect(q.minimumApplied).toBe(true);
    expect(q.total).toEqual({ low: 100, high: 100 });
  });

  it("charges travel past the free zone", () => {
    const q = computeQuote(settings(), estimate(), { ...details, distanceMiles: 25 });
    const travel = q.lines.find((l) => l.label === "Travel fee");
    expect(travel?.amount).toEqual({ low: 20, high: 20 });
  });

  it("charges for stairs, preferring the owner's number over the AI's", () => {
    const fromAi = computeQuote(settings(), estimate({ stairsFlights: 1 }), details);
    expect(fromAi.lines.find((l) => l.label === "Stairs")?.amount.low).toBe(25);

    const fromOwner = computeQuote(settings(), estimate({ stairsFlights: 1 }), { ...details, stairsFlights: 0 });
    expect(fromOwner.lines.find((l) => l.label === "Stairs")).toBeUndefined();
  });

  it("charges heavy material above the included weight", () => {
    // Half load includes 1,500 lbs; 3,500 lbs is one ton over at $100/ton.
    const q = computeQuote(settings(), estimate({ weightLbsLow: 3500, weightLbsHigh: 3500 }), details);
    expect(q.lines.find((l) => l.label === "Heavy material")?.amount).toEqual({ low: 100, high: 100 });
  });

  it("warns about prohibited items and multiple loads", () => {
    const q = computeQuote(
      settings(),
      estimate({
        volumeCubicYardsLow: 18,
        volumeCubicYardsHigh: 22,
        weightLbsLow: 3000,
        weightLbsHigh: 4000,
        prohibitedItems: [{ name: "Propane tank", reason: "Compressed gas cylinder" }],
      }),
      details,
    );
    expect(q.warnings[0]).toContain("Propane tank");
    expect(q.volume.loads).toBe(2);
    expect(q.warnings.some((w) => w.includes("2 trailer loads"))).toBe(true);
  });
});

describe("computeQuote (costs)", () => {
  it("adds up dump, labor, vehicle, disposal and overhead", () => {
    const q = computeQuote(settings(), estimate({ feeItems: [{ itemId: "mattress", quantity: 1, note: "" }] }), details);
    // Dump: 0.5 t × $65 = $32.50 → trip minimum $40.
    expect(q.cost.dump.low).toBe(40);
    // Labor: (0.5 × 2 h on site + 20 mi / 35 mph) × 2 crew × $20.
    expect(q.cost.labor.low).toBe(Math.round((1 + 20 / 35) * 2 * 20));
    expect(q.cost.vehicle).toBe(15);
    expect(q.cost.disposal.low).toBe(20);
    expect(q.cost.overhead).toBe(25);
    expect(q.cost.total.low).toBe(q.cost.dump.low + q.cost.labor.low + 15 + 20 + 25);
  });

  it("supports per-cubic-yard dump fees", () => {
    const s = settings();
    s.costs.dumpFeeMethod = "per_cubic_yard";
    const q = computeQuote(s, estimate({ volumeCubicYardsLow: 10, volumeCubicYardsHigh: 10 }), details);
    expect(q.cost.dump.low).toBe(80);
  });

  it("warns when margin falls below target", () => {
    const s = settings();
    s.costs.laborWagePerHour = 200;
    const q = computeQuote(s, estimate(), details);
    expect(q.warnings.some((w) => w.includes("below your 50% target"))).toBe(true);
  });

  it("prices cost-plus at the target margin", () => {
    const q = computeQuote(settings({ pricingMethod: "cost_plus" }), estimate(), details);
    expect(q.lines).toHaveLength(1);
    expect(q.margin.low).toBeGreaterThan(48);
    expect(q.margin.high).toBeLessThan(52);
  });
});

describe("buildQuoteMessage", () => {
  it("writes a customer-ready quote", () => {
    const s = settings({ businessName: "Junk Bros" });
    const e = estimate({
      prohibitedItems: [
        { name: "Two paint cans", reason: "Liquid" },
        { name: "PCBs", reason: "Hazardous" },
      ],
      questionsForCustomer: ["Is anything in the back room too?"],
    });
    const d = { ...details, customerName: "Dana" };
    const q = computeQuote(s, e, d);
    const msg = buildQuoteMessage(s, e, d, q, "range");
    expect(msg).toContain("Hi Dana! This is Junk Bros.");
    expect(msg).toContain("$350");
    expect(msg).toContain("we can't take two paint cans and PCBs");
    expect(msg).toContain("Is anything in the back room too?");
  });

  it("uses a single price when asked", () => {
    const e = estimate({ volumeCubicYardsLow: 3.75, volumeCubicYardsHigh: 7.5 });
    const q = computeQuote(settings(), e, details);
    const msg = buildQuoteMessage(settings(), e, details, q, "single", 300);
    expect(msg).toContain("your price is $300,");
  });
});
