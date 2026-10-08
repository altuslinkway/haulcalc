import { specialItem } from "./engine";
import type { EstimateLine, ItemFee, JobEstimate, Material, Settings } from "./types";

// Edits the owner makes to an estimate. Each returns a new estimate so the
// UI can keep the AI's original around for "undo".

export const newLineId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

/** Pounds per cubic yard used when the owner adds a line by hand. */
export const DEFAULT_DENSITY: Record<Material, number> = {
  household: 200,
  construction: 500,
  yard: 300,
  dense: 2000,
};

export function updateLine(estimate: JobEstimate, id: string, patch: Partial<EstimateLine>): JobEstimate {
  return { ...estimate, lines: estimate.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
}

export function removeLine(estimate: JobEstimate, id: string): JobEstimate {
  return { ...estimate, lines: estimate.lines.filter((l) => l.id !== id) };
}

/** Changing a count keeps the size and weight of each unit the same. */
export function setLineQuantity(estimate: JobEstimate, id: string, quantity: number): JobEstimate {
  const line = estimate.lines.find((l) => l.id === id);
  if (!line || quantity < 1) return estimate;
  const per = line.quantity > 0 ? 1 / line.quantity : 1;
  return updateLine(estimate, id, {
    quantity,
    cubicYards: round2(line.cubicYards * per * quantity),
    weightLbs: Math.round(line.weightLbs * per * quantity),
  });
}

/** Move a line between "by the load" (itemId null) and a flat-rate or on-site item. */
export function setLinePricing(estimate: JobEstimate, id: string, itemId: string | null): JobEstimate {
  return updateLine(estimate, id, { itemId });
}

/** A new line for one of the owner's flat-rate or on-site items, sized from its defaults. */
export function lineForItem(fee: ItemFee): EstimateLine {
  return {
    id: newLineId(),
    description: fee.name,
    quantity: 1,
    cubicYards: fee.cubicYardsEach,
    weightLbs: fee.lbsEach,
    material: "household",
    itemId: fee.id,
  };
}

export function customLine(description: string, cubicYards: number, material: Material): EstimateLine {
  return {
    id: newLineId(),
    description,
    quantity: 1,
    cubicYards,
    weightLbs: Math.round(cubicYards * DEFAULT_DENSITY[material]),
    material,
    itemId: null,
  };
}

export function addLine(estimate: JobEstimate, line: EstimateLine): JobEstimate {
  return { ...estimate, lines: [...estimate.lines, line] };
}

/** Cubic yards priced by the load (flat-rate and on-site lines excluded). */
export function loadCubicYards(estimate: JobEstimate, settings: Settings): number {
  return estimate.lines.filter((l) => !specialItem(l, settings)).reduce((s, l) => s + l.cubicYards, 0);
}

/**
 * Resize everything priced by the load to a target size, keeping the mix:
 * the owner says "it's really a half load" and every line scales with it.
 */
export function scaleLoadTo(estimate: JobEstimate, settings: Settings, targetCubicYards: number): JobEstimate {
  const current = loadCubicYards(estimate, settings);
  if (current <= 0) {
    return addLine(estimate, customLine("Mixed junk", targetCubicYards, "household"));
  }
  const ratio = targetCubicYards / current;
  return {
    ...estimate,
    lines: estimate.lines.map((l) =>
      specialItem(l, settings)
        ? l
        : { ...l, cubicYards: l.cubicYards * ratio, weightLbs: Math.round(l.weightLbs * ratio) },
    ),
  };
}

export function addOnQuantity(estimate: JobEstimate, itemId: string): number {
  return estimate.addOns.find((a) => a.itemId === itemId)?.quantity ?? 0;
}

export function setAddOn(estimate: JobEstimate, itemId: string, quantity: number): JobEstimate {
  const rest = estimate.addOns.filter((a) => a.itemId !== itemId);
  return { ...estimate, addOns: quantity > 0 ? [...rest, { itemId, quantity }] : rest };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
