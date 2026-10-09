import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/pricing/defaults";
import { fromV2, withDefaults } from "./settingsStore";

describe("saved settings", () => {
  it("fills in fields added since they were saved", () => {
    const old: Partial<typeof DEFAULT_SETTINGS> = structuredClone(DEFAULT_SETTINGS);
    delete old.learning;
    delete old.extras;
    expect(withDefaults(old).learning).toEqual(DEFAULT_SETTINGS.learning);
    expect(withDefaults(old).extras).toEqual(DEFAULT_SETTINGS.extras);
  });

  it("keeps a 0% correction the owner chose deliberately", () => {
    expect(withDefaults({ ...DEFAULT_SETTINGS, calibrationPct: 0 }).calibrationPct).toBe(0);
  });

  it("carries an owner's rates over from the older, detailed settings", () => {
    const s = fromV2({
      businessName: "Joe's Hauling",
      trailer: { lengthFt: 14, widthFt: 7, sideHeightFt: 4, payloadLbs: 9000 },
      loadTiers: [
        { fraction: 0.125, priceLow: 99, priceHigh: 150 },
        { fraction: 0.25, priceLow: 150, priceHigh: 250 },
        { fraction: 0.5, priceLow: 250, priceHigh: 400 },
        { fraction: 1, priceLow: 600, priceHigh: 700 },
      ],
      itemFees: [
        { name: "Fridge", pricing: "flat", priceLow: 100, priceHigh: 140 },
        { name: "Mattress", pricing: "addon", priceLow: 40, priceHigh: 40 },
        { name: "Piano", pricing: "onsite", priceLow: 0, priceHigh: 0 },
      ],
      estimate: { calibrationPct: 12 },
      charges: { minimumCharge: 95, freeTravelMiles: 20, travelFeePerMile: 3, stairsFeePerFlight: 30, heavyFeePerTon: 180 },
      costs: { dumpFeePerTon: 70, vehicleCostPerMile: 0.8, crewSize: 2, laborWagePerHour: 22 },
    });

    expect(s.businessName).toBe("Joe's Hauling");
    expect(s.trailer).toEqual({ preset: "7x14", cubicYards: 14.5, payloadLbs: 9000 });
    // Sizes the old card had keep their top price; 3/4 wasn't on it, so it stays at the default.
    expect(s.loadPrices).toEqual({ quarter: 250, half: 400, threeQuarter: DEFAULT_SETTINGS.loadPrices.threeQuarter, full: 700 });
    expect(s.flatItems).toEqual([
      { id: "fridge", name: "Fridge", price: 120 },
      { id: "mattress", name: "Mattress", price: 40 },
    ]);
    expect(s.minimumCharge).toBe(95);
    expect(s.extras).toEqual({ freeMiles: 20, perMile: 3, stairsPerFlight: 30, heavyPerTon: 180, curbsidePct: 25 });
    expect(s.costs).toEqual({ dumpFeePerTon: 70, gasPerMile: 0.8, helpers: 1, helperPerHour: 22 });
    expect(s.calibrationPct).toBe(12);
  });
});
