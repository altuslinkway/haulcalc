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
    { name: "Mattress / Box Spring", price_low: 50, price_high: 50, on_site_quote: false, hint: "" },
    { name: "Tires", price_low: 15, price_high: 15, on_site_quote: false, hint: "" },
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
    expect(next.itemFees.find((f) => f.name === "Mattress / Box Spring")?.disposalCost).toBe(20);
    expect(next.itemFees.find((f) => f.name === "Tires")?.disposalCost).toBe(0);
  });

  it("copies prohibited items, minimum and business name", () => {
    expect(next.prohibitedItems).toEqual(["Paint"]);
    expect(next.charges.minimumCharge).toBe(99);
    expect(next.businessName).toBe("Haul Pros");
  });

  it("leaves costs alone and doesn't mutate the input", () => {
    expect(next.costs).toEqual(DEFAULT_SETTINGS.costs);
    expect(DEFAULT_SETTINGS.charges.minimumCharge).toBe(75);
  });

  it("keeps what the card doesn't mention", () => {
    const sparse = applyRateCard(DEFAULT_SETTINGS, { ...card, load_tiers: [], item_fees: [], minimum_charge: null });
    expect(sparse.loadTiers).toEqual(DEFAULT_SETTINGS.loadTiers);
    expect(sparse.itemFees).toEqual(DEFAULT_SETTINGS.itemFees);
    expect(sparse.charges.minimumCharge).toBe(75);
  });
});
