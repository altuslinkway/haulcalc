import { z } from "zod/v4";
import { MAX_PHOTOS, MAX_RATE_CARD_PHOTOS } from "./limits";

// Shapes Claude must answer in (structured outputs). Snake_case because
// that's what the model reads; the server maps them onto app types.

const MaterialSchema = z
  .enum(["household", "construction", "yard", "dense"])
  .describe("household: furniture, boxes, bags, appliances. construction: drywall, lumber, tile, shingles. yard: brush, branches, leaves. dense: concrete, dirt, brick, rock.");

export const PhotoAnalysisSchema = z.object({
  summary: z.string().describe("One or two sentences describing the job, written for the owner."),
  lines: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        cubic_yards_total: z.number().describe("Trailer space for the whole line, as loaded."),
        weight_lbs_total: z.number().describe("Weight of the whole line."),
        material: MaterialSchema,
        flat_rate_item_id: z
          .string()
          .describe("Id from the owner's flat-rate or on-site list when this line is one of those items, otherwise an empty string."),
      }),
    )
    .describe("Everything that will be hauled, one line per kind of item or pile."),
  add_ons: z
    .array(z.object({ item_id: z.string().describe("Id from the owner's add-on list."), quantity: z.number() }))
    .describe("Add-on fees that apply, with counts."),
  scope: z
    .enum(["few_items", "single_area", "multi_area"])
    .describe("few_items: a handful of pieces. single_area: one room, garage or pile. multi_area: several rooms, a whole house, estate or hoarder cleanout."),
  prohibited_items: z.array(z.object({ name: z.string(), reason: z.string() })),
  stairs_flights: z.number().describe("Flights of stairs the crew must carry items down, 0 if none are evident."),
  access_notes: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  questions_for_customer: z.array(z.string()),
});

export type PhotoAnalysis = z.infer<typeof PhotoAnalysisSchema>;

export const RateCardSchema = z.object({
  business_name: z.string().nullable(),
  load_tiers: z.array(
    z.object({
      label: z.string(),
      fraction: z.number().describe("Share of a full trailer, e.g. 0.125 for 1/8, 1 for a full load."),
      description: z.string(),
      price_low: z.number(),
      price_high: z.number(),
    }),
  ),
  item_fees: z.array(
    z.object({
      name: z.string(),
      pricing: z
        .enum(["flat", "addon", "onsite"])
        .describe("flat: the price covers removing the item by itself. addon: a fee on top of load pricing. onsite: quoted on site."),
      price_low: z.number(),
      price_high: z.number(),
      cubic_yards_each: z.number().describe("Typical trailer space for one, in cubic yards."),
      lbs_each: z.number().describe("Typical weight of one, in pounds."),
      hint: z.string().describe("What counts as this item, for whoever matches photos to fees."),
    }),
  ),
  prohibited_items: z.array(z.string()),
  minimum_charge: z.number().nullable(),
  notes: z.array(z.string()).describe("Anything else on the card that affects pricing but didn't fit above."),
});

export type RateCard = z.infer<typeof RateCardSchema>;

// ---- Request bodies the API routes accept ----

const PhotoSchema = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  data: z.string().min(1),
});

export const AnalyzeRequestSchema = z.object({
  photos: z.array(PhotoSchema).min(1).max(MAX_PHOTOS),
  customerNotes: z.string().max(4000).default(""),
  trailer: z.object({ name: z.string(), cubicYards: z.number() }),
  itemFees: z.array(
    z.object({ id: z.string(), name: z.string(), hint: z.string(), pricing: z.enum(["flat", "addon", "onsite"]) }),
  ),
  prohibitedItems: z.array(z.string()),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const RateCardRequestSchema = z.object({
  photos: z.array(PhotoSchema).min(1).max(MAX_RATE_CARD_PHOTOS),
});
