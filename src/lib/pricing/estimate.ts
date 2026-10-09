import { categoryById, guessCategory, type ItemCategoryId } from "./categories";
import { flatItemFor } from "./engine";
import type { EstimateLine, FlatItem, JobEstimate, Settings } from "./types";

// Edits the owner makes to an estimate. Each returns a new estimate so the
// UI can keep the AI's original around for "undo".

export const newLineId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

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

/** Charge a line as one of the owner's flat-rate items, or by the load (null). */
export function setLineItem(estimate: JobEstimate, id: string, itemId: string | null): JobEstimate {
  return updateLine(estimate, id, { itemId });
}

/** A new line for a common item type, sized from the typical (or learned) size. */
export function lineForCategory(id: ItemCategoryId, cubicYardsEach?: number): EstimateLine {
  const c = categoryById(id);
  const cubicYards = cubicYardsEach ?? (c.cubicYards[0] + c.cubicYards[1]) / 2;
  return {
    id: newLineId(),
    description: c.label,
    quantity: 1,
    cubicYards,
    weightLbs: Math.round(c.unit === "each" ? c.lbs : c.lbs * cubicYards),
    material: c.material,
    category: c.id as ItemCategoryId,
    itemId: null,
  };
}

/** A new line for one of the owner's flat-rate items, taking up about that item's space. */
export function lineForItem(item: FlatItem): EstimateLine {
  const category = guessCategory(item.name);
  return {
    ...lineForCategory(category),
    // Unknown items (batteries, paint, a box of cords) are usually small.
    ...(category === "other" ? { cubicYards: 0.25, weightLbs: 30 } : {}),
    description: item.name,
    itemId: item.id,
  };
}

export function addLine(estimate: JobEstimate, line: EstimateLine): JobEstimate {
  return { ...estimate, lines: [...estimate.lines, line] };
}

/** Cubic yards priced by the load (flat-rate lines excluded). */
export function loadCubicYards(estimate: JobEstimate, settings: Settings): number {
  return estimate.lines.filter((l) => !flatItemFor(l, settings)).reduce((s, l) => s + l.cubicYards, 0);
}

/**
 * Resize everything priced by the load to a target size, keeping the mix:
 * the owner says "it's really a half load" and every line scales with it.
 */
export function scaleLoadTo(estimate: JobEstimate, settings: Settings, targetCubicYards: number): JobEstimate {
  const current = loadCubicYards(estimate, settings);
  if (current <= 0) {
    return addLine(estimate, { ...lineForCategory("mixed_pile", targetCubicYards), description: "Mixed junk" });
  }
  const ratio = targetCubicYards / current;
  return {
    ...estimate,
    lines: estimate.lines.map((l) =>
      flatItemFor(l, settings)
        ? l
        : { ...l, cubicYards: l.cubicYards * ratio, weightLbs: Math.round(l.weightLbs * ratio) },
    ),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
