import { capacityOf, EIGHTH, LOAD_SIZES } from "./engine";
import { lineForCategory, lineForItem } from "./estimate";
import type { EstimateLine, JobEstimate, Settings } from "./types";

// A quick quote: no photos, the owner taps the load size and items while the
// customer is on the phone. It runs through the same pricing as a photo quote.

export interface QuickPick {
  /** Share of the trailer charged by the load: 0 (items only), 1/8 to 3/4, or a number of full loads (1, 2, 3…). */
  fraction: number;
  /** Count of each flat-rate item, by id. */
  items: Record<string, number>;
}

export const EMPTY_PICK: QuickPick = { fraction: 0, items: {} };

export function quickEstimate(settings: Settings, pick: QuickPick): JobEstimate {
  const lines: EstimateLine[] = [];
  if (pick.fraction > 0) {
    const cubicYards = pick.fraction * capacityOf(settings);
    lines.push({ ...lineForCategory("mixed_pile", cubicYards), id: "quick-load", description: loadWords(pick.fraction, true) });
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
  if (pick.fraction > 0) parts.push(loadWords(pick.fraction, false));
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

/** "a 1/2 load", "a full load", "2 full loads" (or capitalized for an item line). */
function loadWords(fraction: number, capital: boolean): string {
  const words =
    fraction > 1
      ? `${Math.round(fraction)} full loads`
      : `a ${([EIGHTH, ...LOAD_SIZES].find((s) => s.fraction === fraction)?.label ?? "partial").toLowerCase()} load`;
  return capital ? words.replace(/^a /, "").replace(/^./, (c) => c.toUpperCase()) : words;
}
