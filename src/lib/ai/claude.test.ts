import { describe, expect, it } from "vitest";
import { toEstimate } from "./claude";
import type { PhotoAnalysis } from "./schemas";

const fees = [
  { id: "appliance", name: "Appliance", hint: "", pricing: "flat" as const },
  { id: "debris", name: "Construction debris", hint: "", pricing: "onsite" as const },
  { id: "mattress", name: "Mattress", hint: "", pricing: "addon" as const },
];

const analysis: PhotoAnalysis = {
  summary: "Garage",
  lines: [
    { description: "Boxes", quantity: 9.6, cubic_yards_total: 1.2, weight_lbs_total: 240.4, material: "household", flat_rate_item_id: "" },
    { description: "Fridge", quantity: 1, cubic_yards_total: 1.5, weight_lbs_total: 250, material: "household", flat_rate_item_id: "appliance" },
    { description: "Mattress", quantity: 1, cubic_yards_total: 0.75, weight_lbs_total: 80, material: "household", flat_rate_item_id: "mattress" },
    { description: "Ghost", quantity: 1, cubic_yards_total: -2, weight_lbs_total: 10, material: "household", flat_rate_item_id: "" },
  ],
  add_ons: [
    { item_id: "mattress", quantity: 1 },
    { item_id: "appliance", quantity: 1 },
    { item_id: "made-up", quantity: 3 },
  ],
  scope: "single_area",
  prohibited_items: [],
  stairs_flights: -1,
  access_notes: "",
  confidence: "high",
  questions_for_customer: ["a", "b", "c", "d"],
};

describe("toEstimate", () => {
  const e = toEstimate(analysis, fees);

  it("keeps load and flat-rate lines, rounding counts and dropping empty lines", () => {
    expect(e.lines.map((l) => [l.description, l.quantity, l.itemId])).toEqual([
      ["Boxes", 10, null],
      ["Fridge", 1, "appliance"],
      ["Mattress", 1, null],
    ]);
    expect(e.lines[0].weightLbs).toBe(240);
  });

  it("keeps only real add-ons", () => {
    expect(e.addOns).toEqual([{ itemId: "mattress", quantity: 1 }]);
  });

  it("guards impossible numbers and caps questions", () => {
    expect(e.stairsFlights).toBe(0);
    expect(e.questionsForCustomer).toHaveLength(3);
  });
});
