import { capacityOf, LOAD_SIZES } from "./engine";
import { lineForCategory, lineForItem } from "./estimate";
import type { EstimateLine, JobEstimate, Settings } from "./types";

// A quick quote: no photos, the owner taps the load size and items while the
// customer is on the phone. It runs through the same pricing as a photo quote.

export interface QuickPick {
  /** Share of the trailer charged by the load: 0 (items only), 0.25, 0.5, 0.75 or 1. */
  fraction: number;
  /** Count of each flat-rate item, by id. */
  items: Record<string, number>;
}

export const EMPTY_PICK: QuickPick = { fraction: 0, items: {} };

export function quickEstimate(settings: Settings, pick: QuickPick): JobEstimate {
  const lines: EstimateLine[] = [];
  if (pick.fraction > 0) {
    const cubicYards = pick.fraction * capacityOf(settings);
    lines.push({ ...lineForCategory("mixed_pile", cubicYards), id: "quick-load", description: `${sizeWord(pick.fraction)} load` });
  }
  for (const item of settings.flatItems) {
    const n = pick.items[item.id] ?? 0;
    if (n <= 0) continue;
    const one = lineForItem(item);
    lines.push({ ...one, id: `quick-${item.id}`, quantity: n, cubicYards: one.cubicYards * n, weightLbs: one.weightLbs * n });
  }
  return {
    summary: quickSummary(settings, pick),
    lines,
    scope: "single_area",
    prohibitedItems: [],
    stairsFlights: 0,
    accessNotes: "",
    confidence: "high",
    questionsForCustomer: [],
    networkCalibrationPct: 0,
    sizedByOwner: true,
  };
}

/** "a 1/2 load, a TV and 2 mattresses", for the customer text and the Jobs list. */
export function quickSummary(settings: Settings, pick: QuickPick): string {
  const parts: string[] = [];
  if (pick.fraction > 0) parts.push(`a ${sizeWord(pick.fraction).toLowerCase()} load`);
  for (const item of settings.flatItems) {
    const n = pick.items[item.id] ?? 0;
    const name = midSentence(item.name);
    if (n > 0) parts.push(n === 1 ? `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}` : `${name} ×${n}`);
  }
  if (parts.length === 0) return "";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** "Couch" reads wrong mid-sentence; "TV" should stay as is. */
const midSentence = (name: string) => (/^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name);

const sizeWord = (fraction: number) => LOAD_SIZES.find((s) => s.fraction === fraction)?.label ?? "Partial";
