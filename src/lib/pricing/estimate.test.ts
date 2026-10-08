import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import {
  addLine,
  customLine,
  lineForCategory,
  lineForItem,
  loadCubicYards,
  scaleLoadTo,
  setAddOn,
  setLinePricing,
  setLineQuantity,
} from "./estimate";
import type { JobEstimate } from "./types";

const base: JobEstimate = {
  summary: "",
  lines: [
    { id: "boxes", description: "Boxes", quantity: 10, cubicYards: 1, weightLbs: 200, material: "household", category: "boxes", itemId: null },
    { id: "sofa", description: "Sofa", quantity: 1, cubicYards: 2, weightLbs: 150, material: "household", category: "sofa", itemId: null },
    { id: "fridge", description: "Fridge", quantity: 1, cubicYards: 1.5, weightLbs: 250, material: "household", category: "refrigerator", itemId: "appliance" },
  ],
  addOns: [],
  scope: "single_area",
  prohibitedItems: [],
  stairsFlights: 0,
  accessNotes: "",
  confidence: "high",
  questionsForCustomer: [],
  networkCalibrationPct: 0,
};

describe("estimate edits", () => {
  it("keeps per-unit size and weight when the count changes", () => {
    const e = setLineQuantity(base, "boxes", 15);
    expect(e.lines[0]).toMatchObject({ quantity: 15, cubicYards: 1.5, weightLbs: 300 });
  });

  it("counts only load-priced lines toward the load", () => {
    expect(loadCubicYards(base, DEFAULT_SETTINGS)).toBe(3);
    expect(loadCubicYards(setLinePricing(base, "fridge", null), DEFAULT_SETTINGS)).toBe(4.5);
    expect(loadCubicYards(setLinePricing(base, "sofa", "appliance"), DEFAULT_SETTINGS)).toBe(1);
  });

  it("treats a line as load-priced if its item became an add-on", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.itemFees.find((f) => f.id === "appliance")!.pricing = "addon";
    expect(loadCubicYards(base, settings)).toBe(4.5);
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
  });

  it("builds new lines from the owner's items or by hand", () => {
    const tub = lineForItem(DEFAULT_SETTINGS.itemFees.find((f) => f.id === "hot-tub")!);
    expect(tub).toMatchObject({ itemId: "hot-tub", cubicYards: 6, weightLbs: 700 });
    const dirt = customLine("Dirt", 2, "dense");
    expect(dirt).toMatchObject({ itemId: null, weightLbs: 4000 });
    expect(addLine(base, dirt).lines).toHaveLength(4);
  });

  it("sizes a new line from its item type", () => {
    expect(lineForCategory("sectional")).toMatchObject({ category: "sectional", cubicYards: 3.5, weightLbs: 250 });
    expect(lineForCategory("sectional", 4.2).cubicYards).toBe(4.2);
    expect(lineForCategory("dense", 2)).toMatchObject({ material: "dense", weightLbs: 4000 });
  });

  it("sets and clears add-on counts", () => {
    const e = setAddOn(base, "mattress", 2);
    expect(e.addOns).toEqual([{ itemId: "mattress", quantity: 2 }]);
    expect(setAddOn(e, "mattress", 0).addOns).toEqual([]);
  });
});
