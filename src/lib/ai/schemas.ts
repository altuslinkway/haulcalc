import { z } from "zod/v4";
import { MAX_PHOTOS, MAX_RATE_CARD_PHOTOS } from "./limits";

// Shapes Claude must answer in (structured outputs). Snake_case because
// that's what the model reads; the server maps them onto app types.

export const PhotoAnalysisSchema = z.object({
  summary: z.string().describe("One or two sentences describing the job, written for the owner."),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        cubic_yards_total: z.number().describe("Trailer space for all of this line's quantity, in cubic yards."),
      }),
    )
    .describe("Everything visible that will be hauled, grouped into lines."),
  fee_items: z
    .array(
      z.object({
        item_id: z.string().describe("An id from the owner's item fee list. Never invent ids."),
        quantity: z.number(),
        note: z.string(),
      }),
    )
    .describe("Items that match the owner's per-item fees."),
  volume_cubic_yards_low: z.number(),
  volume_cubic_yards_high: z.number(),
  weight_lbs_low: z.number(),
  weight_lbs_high: z.number(),
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
      price_low: z.number(),
      price_high: z.number(),
      on_site_quote: z.boolean(),
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
  itemFees: z.array(z.object({ id: z.string(), name: z.string(), hint: z.string() })),
  prohibitedItems: z.array(z.string()),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const RateCardRequestSchema = z.object({
  photos: z.array(PhotoSchema).min(1).max(MAX_RATE_CARD_PHOTOS),
});
