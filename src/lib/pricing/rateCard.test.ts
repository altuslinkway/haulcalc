import { describe, expect, it } from "vitest";
import type { RateCard } from "@/lib/ai/schemas";
import { DEFAULT_SETTINGS } from "./defaults";
import { applyRateCard, freshId } from "./rateCard";

const card: RateCard = {
  business_name: "Haul Pros",
  quarter_load: 200,
  half_load: 350,
  three_quarter_load: 500,
  full_load: 650,
  minimum_charge: 99,
  items: [
    { name: "TV", price: 50 },
    { name: "Fridge ", price: 129.6 },
    { name: "TV", price: 60 },
    { name: "Free pickup", price: 0 },
  ],
  prohibited_items: ["Paint"],
  notes: [],
};

describe("applyRateCard", () => {
  const next = applyRateCard(DEFAULT_SETTINGS, card);

  it("takes the four load prices and the minimum", () => {
    expect(next.loadPrices).toEqual({ quarter: 200, half: 350, threeQuarter: 500, full: 650 });
    expect(next.minimumCharge).toBe(99);
  });

  it("replaces flat-rate items with unique ids, skipping ones with no price", () => {
    expect(next.flatItems).toEqual([
      { id: "tv", name: "TV", price: 50 },
      { id: "fridge", name: "Fridge", price: 130 },
      { id: "tv-2", name: "TV", price: 60 },
    ]);
  });

  it("fills in sizes the card doesn't price, keeping the usual shape", () => {
    const s = applyRateCard(DEFAULT_SETTINGS, { ...card, quarter_load: null, three_quarter_load: null });
    expect(s.loadPrices.half).toBe(350);
    expect(s.loadPrices.full).toBe(650);
    expect(s.loadPrices.quarter).toBeGreaterThan(DEFAULT_SETTINGS.minimumCharge);
    expect(s.loadPrices.quarter).toBeLessThan(350);
    expect(s.loadPrices.threeQuarter).toBeGreaterThan(350);
    expect(s.loadPrices.threeQuarter).toBeLessThan(650);
    expect(s.loadPrices.quarter % 5).toBe(0);
  });

  it("fills a missing size between its neighbours, never above the next size up", () => {
    const s = applyRateCard(DEFAULT_SETTINGS, { ...card, half_load: null, three_quarter_load: null, quarter_load: 300, full_load: 500 });
    expect(s.loadPrices.quarter).toBe(300);
    expect(s.loadPrices.half).toBeGreaterThan(300);
    expect(s.loadPrices.threeQuarter).toBeGreaterThan(s.loadPrices.half);
    expect(s.loadPrices.threeQuarter).toBeLessThanOrEqual(500);
  });

  it("keeps an item's id when the card has the same item, so open quotes stay matched", () => {
    const s = applyRateCard(DEFAULT_SETTINGS, { ...card, items: [{ name: "fridge or freezer", price: 150 }] });
    expect(s.flatItems).toEqual([{ id: "fridge", name: "fridge or freezer", price: 150 }]);
  });

  it("makes ids that never collide", () => {
    expect(freshId("TV", ["tv", "tv-2"])).toBe("tv-3");
  });

  it("keeps the owner's prices when the card has none, and never lets the minimum pass a quarter load", () => {
    const s = applyRateCard(DEFAULT_SETTINGS, {
      ...card,
      quarter_load: null,
      half_load: null,
      three_quarter_load: null,
      full_load: null,
      minimum_charge: 400,
      items: [],
    });
    expect(s.loadPrices).toEqual(DEFAULT_SETTINGS.loadPrices);
    expect(s.minimumCharge).toBe(DEFAULT_SETTINGS.loadPrices.quarter);
    expect(s.flatItems).toEqual(DEFAULT_SETTINGS.flatItems);
  });

  it("leaves costs alone and only fills in a missing business name", () => {
    expect(next.costs).toEqual(DEFAULT_SETTINGS.costs);
    expect(next.businessName).toBe("Haul Pros");
    expect(applyRateCard({ ...DEFAULT_SETTINGS, businessName: "Mine" }, card).businessName).toBe("Mine");
    expect(next.prohibitedItems).toEqual(["Paint"]);
  });
});
