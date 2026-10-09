import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import { addLine, lineForCategory, lineForItem, loadCubicYards, scaleLoadTo, setLineItem, setLineQuantity } from "./estimate";
import type { JobEstimate } from "./types";

const base: JobEstimate = {
  summary: "",
  lines: [
    { id: "boxes", description: "Boxes", quantity: 10, cubicYards: 1, weightLbs: 200, material: "household", category: "boxes", itemId: null },
    { id: "sofa", description: "Sofa", quantity: 1, cubicYards: 2, weightLbs: 150, material: "household", category: "sofa", itemId: null },
    { id: "fridge", description: "Fridge", quantity: 1, cubicYards: 1.5, weightLbs: 250, material: "household", category: "refrigerator", itemId: "fridge" },
  ],
  scope: "single_area",
  prohibitedItems: [],
  stairsFlights: 0,
  accessNotes: "",
  confidence: "high",
  questionsForCustomer: [],
  networkCalibrationPct: 0,
};

const item = (id: string) => DEFAULT_SETTINGS.flatItems.find((i) => i.id === id)!;

describe("estimate edits", () => {
  it("keeps per-unit size and weight when the count changes", () => {
    const e = setLineQuantity(base, "boxes", 15);
    expect(e.lines[0]).toMatchObject({ quantity: 15, cubicYards: 1.5, weightLbs: 300 });
  });

  it("counts only lines charged by the load toward the load", () => {
    expect(loadCubicYards(base, DEFAULT_SETTINGS)).toBe(3);
    expect(loadCubicYards(setLineItem(base, "fridge", null), DEFAULT_SETTINGS)).toBe(4.5);
    expect(loadCubicYards(setLineItem(base, "sofa", "couch"), DEFAULT_SETTINGS)).toBe(1);
  });

  it("resizes the load without touching flat-rate items", () => {
    const e = scaleLoadTo(base, DEFAULT_SETTINGS, 6);
    expect(e.lines.map((l) => l.cubicYards)).toEqual([2, 4, 1.5]);
    expect(e.lines[1].weightLbs).toBe(300);
  });

  it("adds a load line when there's nothing to resize", () => {
    const onlyFridge = { ...base, lines: [base.lines[2]] };
    const e = scaleLoadTo(onlyFridge, DEFAULT_SETTINGS, 3.6);
    expect(loadCubicYards(e, DEFAULT_SETTINGS)).toBe(3.6);
    expect(e.lines[1]).toMatchObject({ description: "Mixed junk", category: "mixed_pile", weightLbs: 720 });
  });

  it("sizes a flat-rate item from its name", () => {
    expect(lineForItem(item("hot-tub"))).toMatchObject({ itemId: "hot-tub", category: "hot_tub", cubicYards: 7, weightLbs: 700 });
    expect(lineForItem(item("couch"))).toMatchObject({ description: "Couch", category: "sofa" });
    expect(lineForItem({ id: "batteries", name: "Car batteries", price: 50 })).toMatchObject({
      category: "other",
      cubicYards: 0.25,
      weightLbs: 30,
    });
    expect(addLine(base, lineForItem(item("tv"))).lines).toHaveLength(4);
  });

  it("sizes a new line from its item type", () => {
    expect(lineForCategory("sectional")).toMatchObject({ category: "sectional", cubicYards: 3.5, weightLbs: 250 });
    expect(lineForCategory("sectional", 4.2).cubicYards).toBe(4.2);
    expect(lineForCategory("dense", 2)).toMatchObject({ material: "dense", weightLbs: 4000 });
  });
});
