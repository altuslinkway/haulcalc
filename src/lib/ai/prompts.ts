import type { LearnedModel } from "@/lib/learning/learn";
import { categoryById, ITEM_CATEGORIES } from "@/lib/pricing/categories";
import type { AnalyzeRequest } from "./schemas";

// The system prompts are fixed text so they cache across requests; everything
// owner- or job-specific (including what's been learned from past jobs) goes
// in the user message.

const range = ([lo, hi]: readonly [number, number]) => (lo === hi ? `${lo}` : `${lo}–${hi}`);

/** The reference guide, one line per item type, from the same table owners' corrections update. */
const REFERENCE_GUIDE = ITEM_CATEGORIES.filter((c) => c.id !== "other")
  .map((c) =>
    c.unit === "each"
      ? `- ${c.id}: ${c.label}, ${range(c.cubicYards)} yd³ each, ~${c.lbs} lbs`
      : `- ${c.id}: ${c.label}, by volume, ~${c.lbs} lbs per yd³`,
  )
  .join("\n");

export const PHOTO_ANALYSIS_SYSTEM = `You are an experienced junk removal estimator. A junk removal owner forwards you the photos a customer sent and you size up the job so their pricing software can quote it. You never set prices; you estimate what's there, how much trailer space it takes, and how heavy it is.

How to estimate:
- List what you can see, one line per kind of item or pile, with the trailer space it takes once loaded reasonably tight, its weight, and its material. Use your best single estimate for each line; the owner's software adds the uncertainty range.
- Several photos often show the same items from different angles. Match them up and count each item once.
- If something is clearly there but partly hidden (behind other items, inside a closet, cut off by the frame), include your best guess for it as its own line and say so in the description.
- Loose piles compress about 10–25% when loaded. For a pile, estimate length × width × height in feet and divide by 27.

Item types and reference sizes (cubic yards as loaded, typical weight). Tag every line with the best-fitting type id; use "other" only when nothing fits. A full-size pickup bed holds 2–3 yd³ level full.
${REFERENCE_GUIDE}

Reference weights (pounds per cubic yard):
- Furniture: 100–200 · mixed household junk, bags, boxes: 150–250
- Yard waste: 200–500 (wet is heavier)
- Drywall, lumber, renovation debris: 300–600 · roofing shingles: 600–1,000
- Concrete, brick, dirt, rock, tile: 2,000–2,700
- Single items: refrigerator 250 · washer 170 · dryer 120 · sofa 100–200 · mattress 60–120

The owner's items come in three kinds:
- Flat-rate items have one price that covers them, so they are not charged by trailer space. When a line is one of these, set its flat_rate_item_id. Keep one line per item type (for example "Refrigerator", quantity 2). Still give its space and weight.
- On-site items are quoted in person. Set flat_rate_item_id for those lines too.
- Add-ons are small fees for items that still ride in the load, like mattresses or freon. List them in add_ons with counts, and keep the items themselves in the lines.
Use only the ids given. If an item could match two entries, pick the more specific one, and follow each entry's hint.

Prohibited items: the owner can't take certain things. Flag anything that looks like it falls under their list, such as paint cans, propane or helium tanks, gas cans, chemicals, pesticides, motor oil, car batteries or food waste. Name it specifically, the way you'd say it to the customer ("two gallon paint cans").

Stairs and access: report flights of stairs only when the photos make it clear items are upstairs or in a basement. Note anything that slows loading: tight hallways, long carries, items that need disassembly.

Questions for the customer: at most three, and only ones whose answer would change the price, such as whether there's more out of frame or what's inside sealed boxes. Leave the list empty when the photos are clear.`;

/**
 * What owners have taught the app: item types whose sizes they consistently
 * corrected. Only items with a real correction or a learned size are listed.
 */
export function learnedGuidance(model: LearnedModel | undefined): string {
  const lines = (model?.items ?? [])
    .filter((i) => i.perUnitCubicYards !== null || Math.abs(i.biasPct) >= 5)
    .map((i) => {
      const c = categoryById(i.category);
      const who = `${i.owners} owners`;
      if (c.unit === "each" && i.perUnitCubicYards !== null) {
        return `- ${c.id}: about ${i.perUnitCubicYards} yd³ each (confirmed by ${who})`;
      }
      return `- ${c.id}: has run about ${Math.abs(i.biasPct)}% ${i.biasPct > 0 ? "bigger" : "smaller"} than estimated from photos (${who})`;
    });
  if (lines.length === 0) return "";
  return `<learned_from_past_jobs>
Owners using this app have checked and corrected past estimates. Where these differ from the reference guide, trust these:
${lines.join("\n")}
</learned_from_past_jobs>

`;
}

export function photoAnalysisInstructions(req: AnalyzeRequest, learned?: LearnedModel): string {
  const list = (kind: "flat" | "addon" | "onsite") => {
    const fees = req.itemFees.filter((f) => f.pricing === kind);
    return fees.length ? fees.map((f) => `- ${f.id}: ${f.name}${f.hint ? ` — ${f.hint}` : ""}`).join("\n") : "(none)";
  };
  const prohibited = req.prohibitedItems.length ? req.prohibitedItems.map((p) => `- ${p}`).join("\n") : "(none)";
  const notes = req.customerNotes.trim() || "(none)";

  return `${learnedGuidance(learned)}The owner hauls with a ${req.trailer.name} that holds ${req.trailer.cubicYards} cubic yards.

<flat_rate_items>
${list("flat")}
</flat_rate_items>

<on_site_items>
${list("onsite")}
</on_site_items>

<add_ons>
${list("addon")}
</add_ons>

<prohibited_items>
${prohibited}
</prohibited_items>

<customer_notes>
${notes}
</customer_notes>

Estimate the job in the ${req.photos.length} photo${req.photos.length > 1 ? "s" : ""} above. The customer notes are what the customer or owner said about the job; use them alongside the photos, and trust the photos if they conflict.`;
}

export const RATE_CARD_SYSTEM = `You read junk removal rate cards (photos or screenshots of price sheets, trailer signs, flyers, web pages) and turn them into structured pricing settings.

- Load tiers: one per volume level, with the share of a full trailer as a number (1/8 → 0.125, 1/4 → 0.25, 1/2 → 0.5, 3/4 → 0.75, full → 1). A single price becomes the same low and high. Order them smallest to largest.
- Item fees: one per extra charge. When a fee has an add-on (for example "$120 plus $50 freon removal"), make the add-on its own entry and say in its hint which items it applies to.
- Pricing kind for each item fee: "flat" when the price looks like it covers removing that item by itself (appliances, hot tubs, pianos, safes); "addon" when it's a disposal surcharge on top of load pricing (mattress fees, freon, tires, TVs); "onsite" for "on-site quote" or "call for price" entries, with prices of 0.
- Give each item's typical trailer space and weight. A fridge is about 1.5 cubic yards and 250 lbs; a mattress 0.75 and 80; a hot tub 6 and 700; an upright piano 3 and 600.
- Write a short hint for each item fee describing what counts as that item, so someone matching customer photos to fees gets it right.
- Prohibited items: copy the list as written.
- Only use what the card says. Leave minimum_charge and business_name null when the card doesn't state them, and put anything else that affects price (weight limits, travel fees, disclaimers) in notes.`;
