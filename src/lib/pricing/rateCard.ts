import type { RateCard } from "@/lib/ai/schemas";
import type { ItemFee, LoadTier, Settings } from "./types";

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** Ids that are unique within a list, derived from names so they stay readable. */
function uniqueIds(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const base = slugify(name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/**
 * Replace the parts of the owner's settings that a rate card covers. Costs
 * (dump fees, wages, etc) never appear on a card, so they're left alone, and
 * an item's disposal cost carries over when the same item is on the new card.
 */
export function applyRateCard(settings: Settings, card: RateCard): Settings {
  const next: Settings = structuredClone(settings);

  if (card.load_tiers.length > 0) {
    const tiers = [...card.load_tiers].sort((a, b) => a.fraction - b.fraction);
    const ids = uniqueIds(tiers.map((t) => t.label));
    next.loadTiers = tiers.map(
      (t, i): LoadTier => ({
        id: ids[i],
        label: t.label,
        fraction: t.fraction,
        description: t.description,
        priceLow: Math.min(t.price_low, t.price_high),
        priceHigh: Math.max(t.price_low, t.price_high),
      }),
    );
  }

  if (card.item_fees.length > 0) {
    const ids = uniqueIds(card.item_fees.map((f) => f.name));
    next.itemFees = card.item_fees.map((f, i): ItemFee => {
      const existing = settings.itemFees.find(
        (e) => e.id === ids[i] || e.name.toLowerCase() === f.name.toLowerCase(),
      );
      return {
        id: ids[i],
        name: f.name,
        priceLow: Math.min(f.price_low, f.price_high),
        priceHigh: Math.max(f.price_low, f.price_high),
        onSiteQuote: f.on_site_quote,
        disposalCost: existing?.disposalCost ?? 0,
        hint: f.hint,
      };
    });
  }

  if (card.prohibited_items.length > 0) next.prohibitedItems = [...card.prohibited_items];
  if (card.minimum_charge != null) next.charges.minimumCharge = card.minimum_charge;
  if (card.business_name && !settings.businessName.trim()) next.businessName = card.business_name;

  return next;
}
