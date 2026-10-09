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

/** A readable id from a name that isn't one of `taken`: "tv", then "tv-2", "tv-3"… */
export function freshId(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name);
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** Ids that are unique within a list, derived from names so they stay readable. */
export function uniqueIds(names: string[], taken: Iterable<string> = []): string[] {
  const used = new Set(taken);
  return names.map((name) => {
    const id = freshId(name, used);
    used.add(id);
    return id;
  });
}

type LoadSize = keyof Settings["loadPrices"];
const SIZES: LoadSize[] = ["quarter", "half", "threeQuarter", "full"];
const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Fill in load sizes a card doesn't list (some only price a half and a full),
 * keeping the usual shape: smaller loads cost more per yard. A size between
 * two priced ones lands between them, so a bigger load never costs less.
 */
function completeLoadPrices(found: Partial<Record<LoadSize, number>>, current: Settings["loadPrices"]) {
  const known = SIZES.filter((s) => (found[s] ?? 0) > 0);
  if (known.length === 0) return current;
  const shape = DEFAULT_SETTINGS.loadPrices;
  const out = {} as Settings["loadPrices"];
  SIZES.forEach((s, i) => {
    if ((found[s] ?? 0) > 0) {
      out[s] = Math.round(found[s]!);
      return;
    }
    const below = known.filter((k) => SIZES.indexOf(k) < i).at(-1);
    const above = known.find((k) => SIZES.indexOf(k) > i);
    let price: number;
    if (below && above) {
      // Between two prices on the card, following the usual curve.
      const t = (shape[s] - shape[below]) / (shape[above] - shape[below]);
      price = found[below]! + t * (found[above]! - found[below]!);
    } else {
      // Past the end of the card: scale from the nearest price it has.
      const near = (below ?? above)!;
      price = (found[near]! * shape[s]) / shape[near];
    }
    out[s] = roundTo5(price);
  });
  // Keep the order even if the card itself was out of order.
  SIZES.forEach((s, i) => {
    if (i > 0) out[s] = Math.max(out[s], out[SIZES[i - 1]]);
  });
  return out;
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
    // An item the owner already had keeps its id, so a quote on screen stays matched.
    const used = new Set<string>();
    next.flatItems = items.map((i): FlatItem => {
      const name = i.name.trim();
      const same = settings.flatItems.find((e) => e.name.trim().toLowerCase() === name.toLowerCase() && !used.has(e.id));
      const id = same?.id ?? freshId(name, used);
      used.add(id);
      return { id, name, price: Math.round(i.price) };
    });
  }

  if (card.prohibited_items.length > 0) next.prohibitedItems = [...card.prohibited_items];
  if (card.business_name && !settings.businessName.trim()) next.businessName = card.business_name;

  return next;
}
