import type { RateCard } from "@/lib/ai/schemas";
import { DEFAULT_SETTINGS } from "./defaults";
import type { FlatItem, Settings } from "./types";

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** Ids that are unique within a list, derived from names so they stay readable. */
export function uniqueIds(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const base = slugify(name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

type LoadSize = keyof Settings["loadPrices"];
const SIZES: LoadSize[] = ["quarter", "half", "threeQuarter", "full"];
const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Fill in load sizes a card doesn't list (some only price a half and a full),
 * keeping the usual shape: smaller loads cost more per yard.
 */
function completeLoadPrices(found: Partial<Record<LoadSize, number>>, current: Settings["loadPrices"]) {
  const known = SIZES.filter((s) => (found[s] ?? 0) > 0);
  if (known.length === 0) return current;
  const shape = DEFAULT_SETTINGS.loadPrices;
  const full = known.reduce((sum, s) => sum + (found[s]! / shape[s]) * shape.full, 0) / known.length;
  return Object.fromEntries(
    SIZES.map((s) => [s, (found[s] ?? 0) > 0 ? Math.round(found[s]!) : roundTo5((full * shape[s]) / shape.full)]),
  ) as Settings["loadPrices"];
}

/**
 * Replace the parts of the owner's settings that a rate card covers. Costs
 * and extras never appear on a card, so they're left alone.
 */
export function applyRateCard(settings: Settings, card: RateCard): Settings {
  const next: Settings = structuredClone(settings);

  next.loadPrices = completeLoadPrices(
    {
      quarter: card.quarter_load ?? undefined,
      half: card.half_load ?? undefined,
      threeQuarter: card.three_quarter_load ?? undefined,
      full: card.full_load ?? undefined,
    },
    settings.loadPrices,
  );

  if (card.minimum_charge != null && card.minimum_charge > 0) {
    next.minimumCharge = Math.round(card.minimum_charge);
  }
  next.minimumCharge = Math.min(next.minimumCharge, next.loadPrices.quarter);

  const items = card.items.filter((i) => i.name.trim() && i.price > 0);
  if (items.length > 0) {
    const ids = uniqueIds(items.map((i) => i.name));
    next.flatItems = items.map((i, n): FlatItem => ({ id: ids[n], name: i.name.trim(), price: Math.round(i.price) }));
  }

  if (card.prohibited_items.length > 0) next.prohibitedItems = [...card.prohibited_items];
  if (card.business_name && !settings.businessName.trim()) next.businessName = card.business_name;

  return next;
}
