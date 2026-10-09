import { describe, expect, it } from "vitest";
import { DEFAULT_DETAILS, DEFAULT_SETTINGS } from "./defaults";
import { capacityOf, computeQuote, loadPrice, rangeFactors, sizeLabel } from "./engine";
import { scaleLoadTo, setLineQuantity, setLoadSize } from "./estimate";
import { buildPhotoRequestMessage, buildQuoteMessage } from "./message";
import type { EstimateLine, JobDetails, JobEstimate, Settings } from "./types";

/** Default rates on a 15 yd³ trailer, so sizes are easy to check by hand. */
function settings(): Settings {
  const s = structuredClone(DEFAULT_SETTINGS);
  s.trailer = { preset: "custom", cubicYards: 15, payloadLbs: 9500 };
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
  line({ description: "Refrigerator", cubicYards: 1.5, weightLbs: 250, category: "refrigerator", itemId: "fridge", ...o });
const lineAmount = (q: ReturnType<typeof computeQuote>, label: string) => q.lines.find((l) => l.label === label)?.amount;
const price = (fraction: number) => loadPrice(fraction, DEFAULT_SETTINGS);

describe("loadPrice", () => {
  it("charges each load size its own price", () => {
    expect(price(0.25)).toBe(255);
    expect(price(0.5)).toBe(430);
    expect(price(0.75)).toBe(595);
    expect(price(1)).toBe(765);
  });

  it("prices sizes in between on a straight line, starting from the minimum", () => {
    expect(price(0.375)).toBe(342.5);
    expect(price(0.125)).toBe(99 + (255 - 99) / 2);
    expect(price(0)).toBe(0);
  });

  it("charges full loads at the full price, plus the rest", () => {
    expect(price(1.25)).toBe(765 + 255);
    expect(price(2)).toBe(765 * 2);
  });

  it("never starts the line above the quarter price", () => {
    expect(loadPrice(0.125, { ...DEFAULT_SETTINGS, minimumCharge: 400 })).toBe(255);
  });

  it("never charges less for a bigger load, even with prices typed out of order", () => {
    const s = { ...DEFAULT_SETTINGS, loadPrices: { quarter: 255, half: 200, threeQuarter: 595, full: 765 } };
    expect(loadPrice(0.5, s)).toBe(255);
    expect(loadPrice(0.4, s)).toBe(255);
    expect(loadPrice(0.625, s)).toBeGreaterThan(255);
  });

  it("agrees with the load label right at a full trailer", () => {
    expect(price(1.0008)).toBe(765);
    expect(sizeLabel({ low: 1.0008, high: 1.0008 })).toBe("Full load");
  });
});

describe("sizeLabel", () => {
  it("names the load size, rounding up", () => {
    expect(sizeLabel({ low: 0.03, high: 0.05 })).toBe("Small load");
    expect(sizeLabel({ low: 0.1, high: 0.125 })).toBe("1/8 load");
    expect(sizeLabel({ low: 0.05, high: 0.1 })).toBe("Small to 1/8 load");
    expect(sizeLabel({ low: 0.25, high: 0.25 })).toBe("1/4 load");
    expect(sizeLabel({ low: 0.3, high: 0.45 })).toBe("1/2 load");
    expect(sizeLabel({ low: 0.45, high: 0.6 })).toBe("1/2 to 3/4 load");
    expect(sizeLabel({ low: 0.9, high: 1 })).toBe("Full load");
    expect(sizeLabel({ low: 0.9, high: 1.3 })).toBe("1 to 2 loads");
    expect(sizeLabel({ low: 1.2, high: 1.8 })).toBe("2 loads");
    expect(sizeLabel({ low: 0, high: 0 })).toBe("");
  });
});

describe("computeQuote: the price", () => {
  it("spreads the range around what's visible and leans up for what isn't", () => {
    const q = computeQuote(settings(), estimate(), details);
    // High confidence: 7.5 yd³ → 7.125 to 8.66 yd³ (5% either way, then +10% unseen).
    expect(q.volume.cubicYards.low).toBeCloseTo(7.125);
    expect(q.volume.cubicYards.high).toBeCloseTo(8.6625);
    expect(q.volume.unseenPct).toBe(10);
    expect(q.volume.sizeLabel).toBe("1/2 to 3/4 load");
    expect(q.total).toEqual({ low: 415, high: 480 });
    expect(q.suggested).toBe(450);
  });

  it("allows more for the unseen on big or unclear jobs", () => {
    expect(computeQuote(settings(), estimate({ scope: "multi_area" }), details).volume.unseenPct).toBe(20);
    expect(computeQuote(settings(), estimate({ confidence: "low" }), details).volume.unseenPct).toBe(20);
  });

  it("lands a chosen load size at the top of the range", () => {
    const s = settings();
    const e = estimate({ confidence: "medium" });
    const q = computeQuote(s, scaleLoadTo(e, s, 7.5 / rangeFactors(s, e).high), details);
    expect(q.volume.sizeLabel).toBe("1/2 load");
    expect(q.total.high).toBe(430);
  });

  it("applies the owner's correction from finished jobs", () => {
    const s = settings();
    s.calibrationPct = 20;
    const q = computeQuote(s, estimate(), details);
    expect(q.volume.cubicYards.low).toBeCloseTo(7.5 * 1.2 * 0.95);
    expect(q.volume.calibrationSource).toBe("owner");
  });

  it("applies the network correction unless the owner set their own or opted out", () => {
    const e = estimate({ networkCalibrationPct: 20 });
    const q = computeQuote(settings(), e, details);
    expect(q.volume.calibrationSource).toBe("network");
    expect(q.volume.cubicYards.low).toBeCloseTo(7.5 * 1.2 * 0.95);

    const own = settings();
    own.calibrationPct = 0;
    expect(computeQuote(own, e, details).volume).toMatchObject({ calibrationSource: "owner", calibrationPct: 0 });

    const optedOut = settings();
    optedOut.learning.useNetwork = false;
    expect(computeQuote(optedOut, e, details).volume.calibrationSource).toBeNull();
  });

  it("charges flat-rate items their price, without charging for their space", () => {
    const plain = computeQuote(settings(), estimate(), details);
    const q = computeQuote(settings(), estimate({ lines: [line(), fridge()] }), details);
    expect(lineAmount(q, "Refrigerator")).toEqual({ low: 170, high: 170 });
    expect(q.total).toEqual({ low: plain.total.low + 170, high: plain.total.high + 170 });
    // The fridge still takes room in the trailer.
    expect(q.volume.totalCubicYards.low).toBeCloseTo(7.125 + 1.5);
  });

  it("multiplies a flat price by the count", () => {
    const tvs = line({ description: "TVs", quantity: 3, cubicYards: 1, weightLbs: 120, itemId: "tv" });
    const q = computeQuote(settings(), estimate({ lines: [tvs] }), details);
    expect(q.lines).toEqual([{ label: "TVs ×3", detail: "$50 each", amount: { low: 150, high: 150 } }]);
    expect(q.total).toEqual({ low: 150, high: 150 });
  });

  it("charges a line by the load once it's off the flat rate, or its flat item is deleted", () => {
    const byLoad = computeQuote(settings(), estimate({ lines: [line(), fridge({ itemId: null })] }), details);
    expect(byLoad.volume.cubicYards.low).toBeCloseTo(9 * 0.95);

    const s = settings();
    s.flatItems = s.flatItems.filter((i) => i.id !== "fridge");
    expect(computeQuote(s, estimate({ lines: [line(), fridge()] }), details).total).toEqual(byLoad.total);
  });

  it("prices exactly the size the owner picks, with no range on top", () => {
    const s = settings();
    s.calibrationPct = 20;
    const e = setLoadSize(estimate({ confidence: "low", lines: [line(), fridge()] }), s, 0.5);
    const q = computeQuote(s, e, details);
    expect(q.volume.sizeLabel).toBe("1/2 load");
    expect(q.volume.unseenPct).toBe(0);
    expect(q.volume.calibrationSource).toBeNull();
    expect(q.total).toEqual({ low: 430 + 170, high: 430 + 170 });
    // What gets learned is the owner's size: half of the trailer.
    expect(e.lines[0].cubicYards).toBeCloseTo(7.5);
  });

  it("keeps a line's size when its count goes down and back up", () => {
    let e = estimate({ lines: [line({ id: "piles", quantity: 200, cubicYards: 0.8, weightLbs: 80 })] });
    e = setLineQuantity(setLineQuantity(e, "piles", 1), "piles", 200);
    expect(e.lines[0].cubicYards).toBeCloseTo(0.8);
    expect(e.lines[0].weightLbs).toBeCloseTo(80);
  });

  it("treats a blank or zero trailer size as 1 yd³ everywhere", () => {
    const s = settings();
    s.trailer.cubicYards = 0;
    expect(capacityOf(s)).toBe(1);
    const q = computeQuote(s, setLoadSize(estimate(), s, 1), details);
    expect(q.total.high).toBe(765);
  });

  it("caps a typed or learned correction at sensible limits", () => {
    const s = settings();
    s.calibrationPct = -100;
    const q = computeQuote(s, estimate(), details);
    expect(q.volume.calibrationPct).toBe(-50);
    expect(q.volume.cubicYards.low).toBeGreaterThan(0);
    expect(lineAmount(q, "Heavy load")).toBeUndefined();
    expect(computeQuote(settings(), estimate({ networkCalibrationPct: 900 }), details).volume.calibrationPct).toBe(200);
  });

  it("only says the minimum applied when the rounded total was under it", () => {
    const tv = line({ description: "TV", cubicYards: 0.25, weightLbs: 40, itemId: "tv" });
    const q = computeQuote(settings(), estimate({ lines: [tv] }), { ...details, distanceMiles: 37 });
    // $50 TV + $48 travel rounds to $100.
    expect(q.total).toEqual({ low: 100, high: 100 });
    expect(q.minimumApplied).toBe(false);
  });

  it("takes the curbside share off the load and items, but not travel, and drops stairs", () => {
    const e = setLoadSize(estimate({ stairsFlights: 2, lines: [line(), fridge()] }), settings(), 0.5);
    const d = { ...details, distanceMiles: 35, curbside: true };
    const q = computeQuote(settings(), e, d);
    expect(lineAmount(q, "Curbside pickup")).toEqual({ low: -150, high: -150 });
    expect(lineAmount(q, "Stairs")).toBeUndefined();
    // (430 + 170) × 75% + $40 travel.
    expect(q.total).toEqual({ low: 490, high: 490 });
  });

  it("never goes below the minimum charge", () => {
    const tv = line({ description: "TV", cubicYards: 0.25, weightLbs: 40, itemId: "tv" });
    const q = computeQuote(settings(), estimate({ lines: [tv] }), details);
    expect(q.minimumApplied).toBe(true);
    expect(q.total).toEqual({ low: 99, high: 99 });
    expect(q.suggested).toBe(99);
  });

  it("charges travel past the free miles", () => {
    const q = computeQuote(settings(), estimate(), { ...details, distanceMiles: 35 });
    expect(lineAmount(q, "Travel")).toEqual({ low: 40, high: 40 });
    expect(lineAmount(computeQuote(settings(), estimate(), details), "Travel")).toBeUndefined();
  });

  it("charges stairs per flight, preferring the owner's count", () => {
    expect(lineAmount(computeQuote(settings(), estimate({ stairsFlights: 2 }), details), "Stairs")?.low).toBe(50);
    expect(
      lineAmount(computeQuote(settings(), estimate({ stairsFlights: 2 }), { ...details, stairsFlights: 0 }), "Stairs"),
    ).toBeUndefined();
  });

  it("charges heavy loads by the ton, at least twice the dump fee", () => {
    // A quarter trailer of concrete: 300 lbs a yard is included, the rest is $150 a ton.
    const concrete = estimate({ lines: [line({ cubicYards: 3.75, weightLbs: 7500, material: "dense" })] });
    const over = (cy: number, lbs: number) => (lbs - cy * 300) / 2000;
    expect(lineAmount(computeQuote(settings(), concrete, details), "Heavy load")).toEqual({
      low: Math.round(over(3.5625, 7125) * 150),
      high: Math.round(over(4.33125, 8662.5) * 150),
    });

    const s = settings();
    s.costs.dumpFeePerTon = 100;
    expect(lineAmount(computeQuote(s, concrete, details), "Heavy load")?.low).toBe(Math.round(over(3.5625, 7125) * 200));
  });

  it("counts trips by weight when the trailer's limit comes first", () => {
    const q = computeQuote(
      settings(),
      estimate({ lines: [line({ cubicYards: 3.75, weightLbs: 10000, material: "dense" })] }),
      details,
    );
    expect(q.volume.loads).toBe(2);
    expect(q.volume.weightLimited).toBe(true);
    expect(q.warnings.some((w) => w.startsWith("Heavy load"))).toBe(true);
  });

  it("warns about prohibited items and unclear jobs", () => {
    const q = computeQuote(
      settings(),
      estimate({
        prohibitedItems: [{ name: "Propane tank", reason: "Compressed gas cylinder." }],
        scope: "multi_area",
        confidence: "low",
      }),
      details,
    );
    expect(q.warnings[0]).toBe("Prohibited item: Propane tank. Compressed gas cylinder.");
    expect(q.warnings.some((w) => w.includes("may not show everything"))).toBe(true);
    expect(q.warnings.some((w) => w.includes("in person"))).toBe(true);
  });
});

describe("computeQuote: what you'd keep", () => {
  it("takes dump fees, gas and helper pay out of the price", () => {
    const q = computeQuote(settings(), estimate(), details);
    // Low end: 1,425 lbs at $65 a ton.
    const dump = (1425 / 2000) * 65;
    // 20 mi round trip plus 10 mi to the dump, at $0.75 a mile.
    const gas = 30 * 0.75;
    // One helper at $20 an hour: loading (share of 2 h per full load), driving at 35 mph, a 45 min dump run.
    const hours = (7.125 / 15) * 2 + 20 / 35 + 0.75;
    const helpers = 20 * hours;
    expect(q.costs.dump.low).toBe(Math.round(dump));
    expect(q.costs.gas.low).toBe(Math.round(gas));
    expect(q.costs.helpers.low).toBe(Math.round(helpers));
    expect(q.keep.low).toBe(Math.round(415 - dump - gas - helpers));
  });

  it("counts no helper pay when working alone", () => {
    const s = settings();
    s.costs.helpers = 0;
    expect(computeQuote(s, estimate(), details).costs.helpers).toEqual({ low: 0, high: 0 });
  });

  it("warns when costs eat most of the price", () => {
    const s = settings();
    s.costs.helperPerHour = 200;
    expect(computeQuote(s, estimate(), details).warnings.some((w) => w.startsWith("You'd keep about"))).toBe(true);
    expect(computeQuote(settings(), estimate(), details).warnings).toEqual([]);
  });
});

describe("messages", () => {
  it("writes a customer-ready quote", () => {
    const s = settings();
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
    expect(msg).toContain("(about a 1/2 to 3/4 load)");
    expect(msg).toContain("$415–$480");
    expect(msg).toContain("we can't take two paint cans and PCBs");
    expect(msg).toContain("Is anything in the back room too?");
  });

  it("ignores a typed single price once the range is chosen again", () => {
    const e = estimate({ lines: [fridge()] });
    const q = computeQuote(settings(), e, details);
    expect(buildQuoteMessage(settings(), e, details, q, "range", 300)).toContain("your price is $170,");
  });

  it("uses a single price when asked, and skips the load size for flat-rate-only jobs", () => {
    const e = estimate({ lines: [fridge()] });
    const msg = buildQuoteMessage(settings(), e, details, computeQuote(settings(), e, details), "single", 150);
    expect(msg).toContain("Based on what we can see, your price is $150,");
  });

  it("asks customers for useful photos and the standard questions", () => {
    const msg = buildPhotoRequestMessage(DEFAULT_SETTINGS);
    expect(msg).toContain("2 wide photos of each pile");
    expect(msg).toContain("What floor is everything on?");
  });
});
