import { describe, expect, it } from "vitest";
import { toEstimate } from "./claude";
import type { PhotoAnalysis } from "./schemas";

const flatItems = [
  { id: "fridge", name: "Fridge or freezer" },
  { id: "tv", name: "TV" },
];

const analysis: PhotoAnalysis = {
  summary: "Garage",
  lines: [
    { description: "Boxes", quantity: 9.6, cubic_yards_total: 1.2, weight_lbs_total: 240.4, material: "household", category: "boxes", flat_rate_item_id: "" },
    { description: "Fridge", quantity: 1, cubic_yards_total: 1.5, weight_lbs_total: 250, material: "household", category: "refrigerator", flat_rate_item_id: "fridge" },
    { description: "Mattress", quantity: 1, cubic_yards_total: 0.75, weight_lbs_total: 80, material: "household", category: "mattress", flat_rate_item_id: "made-up" },
    { description: "TV", quantity: 1, cubic_yards_total: 0, weight_lbs_total: 40, material: "household", category: "tv", flat_rate_item_id: "tv" },
    { description: "Ghost", quantity: 1, cubic_yards_total: -2, weight_lbs_total: 10, material: "household", category: "other", flat_rate_item_id: "" },
  ],
  scope: "single_area",
  prohibited_items: [],
  stairs_flights: -1,
  access_notes: "",
  confidence: "high",
  questions_for_customer: ["a", "b", "c", "d"],
};

describe("toEstimate", () => {
  const e = toEstimate(analysis, flatItems);

  it("keeps load and flat-rate lines, rounding counts and dropping empty lines", () => {
    expect(e.lines.map((l) => [l.description, l.quantity, l.itemId])).toEqual([
      ["Boxes", 10, null],
      ["Fridge", 1, "fridge"],
      ["Mattress", 1, null],
      ["TV", 1, "tv"],
    ]);
    expect(e.lines[0]).toMatchObject({ weightLbs: 240, category: "boxes" });
  });

  it("guards impossible numbers and caps questions", () => {
    expect(e.stairsFlights).toBe(0);
    expect(e.questionsForCustomer).toHaveLength(3);
  });
});
