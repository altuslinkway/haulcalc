import { describe, expect, it } from "vitest";
import type { RateCard } from "@/lib/ai/schemas";
import { DEFAULT_SETTINGS } from "./defaults";
import { applyRateCard } from "./rateCard";

const card: RateCard = {
  business_name: "Haul Pros",
  load_tiers: [
    { label: "Full", fraction: 1, description: "", price_low: 600, price_high: 600 },
    { label: "Half", fraction: 0.5, description: "", price_low: 350, price_high: 300 },
  ],
  item_fees: [
    { name: "Mattress / box spring", pricing: "addon", price_low: 50, price_high: 50, cubic_yards_each: 0.75, lbs_each: 80, hint: "" },
    { name: "Fridge", pricing: "flat", price_low: 130, price_high: 110, cubic_yards_each: 1.5, lbs_each: 250, hint: "" },
  ],
  prohibited_items: ["Paint"],
  minimum_charge: 99,
  notes: [],
};

describe("applyRateCard", () => {
  const next = applyRateCard(DEFAULT_SETTINGS, card);

  it("replaces load tiers, sorted and with low ≤ high", () => {
    expect(next.loadTiers.map((t) => t.label)).toEqual(["Half", "Full"]);
    expect(next.loadTiers[0]).toMatchObject({ priceLow: 300, priceHigh: 350 });
  });

  it("keeps disposal costs for items that carry over", () => {
    expect(next.itemFees.find((f) => f.name === "Mattress / box spring")?.disposalCost).toBe(15);
    expect(next.itemFees.find((f) => f.name === "Fridge")?.disposalCost).toBe(0);
  });

  it("keeps each item's pricing kind, size and weight", () => {
    expect(next.itemFees.find((f) => f.name === "Fridge")).toMatchObject({
      pricing: "flat",
      priceLow: 110,
      priceHigh: 130,
      cubicYardsEach: 1.5,
      lbsEach: 250,
    });
  });

  it("copies prohibited items, minimum and business name", () => {
    expect(next.prohibitedItems).toEqual(["Paint"]);
    expect(next.charges.minimumCharge).toBe(99);
    expect(next.businessName).toBe("Haul Pros");
  });

  it("leaves costs alone and doesn't mutate the input", () => {
    expect(next.costs).toEqual(DEFAULT_SETTINGS.costs);
    expect(DEFAULT_SETTINGS.charges.minimumCharge).toBe(99);
  });

  it("keeps what the card doesn't mention", () => {
    const sparse = applyRateCard(DEFAULT_SETTINGS, { ...card, load_tiers: [], item_fees: [], minimum_charge: null });
    expect(sparse.loadTiers).toEqual(DEFAULT_SETTINGS.loadTiers);
    expect(sparse.itemFees).toEqual(DEFAULT_SETTINGS.itemFees);
    expect(sparse.charges.minimumCharge).toBe(99);
  });
});
