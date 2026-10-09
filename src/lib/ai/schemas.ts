import { z } from "zod/v4";
import { CATEGORY_IDS } from "@/lib/pricing/categories";
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
        quantity: z.number().describe("How many pieces this line counts (1 for a pile)."),
        cubic_yards_total: z
          .number()
          .describe("Trailer space for ALL pieces on this line together, as loaded (e.g. 14 boxes at 0.1 each = 1.4)."),
        weight_lbs_total: z.number().describe("Weight of ALL pieces on this line together, in pounds."),
        material: MaterialSchema,
        category: z.enum(CATEGORY_IDS).describe("The item type from the reference guide that best fits this line."),
        flat_rate_item_id: z
          .string()
          .describe("Id from the owner's flat-rate list when this line is one of those items, otherwise an empty string."),
      }),
    )
    .describe("Everything that will be hauled, one line per kind of item or pile."),
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

const LoadPrice = (size: string) =>
  z
    .number()
    .nullable()
    .describe(`Price for ${size} trailer. If the card gives a range, use the top of it. Null if the card has no price for this size.`);

export const RateCardSchema = z.object({
  business_name: z.string().nullable(),
  quarter_load: LoadPrice("a 1/4"),
  half_load: LoadPrice("a 1/2"),
  three_quarter_load: LoadPrice("a 3/4"),
  full_load: LoadPrice("a full"),
  minimum_charge: z
    .number()
    .nullable()
    .describe("The least any job costs (a minimum or single-item price). Null if the card doesn't say."),
  items: z
    .array(
      z.object({
        name: z.string().describe("Short, plain name, e.g. \"TV\" or \"Fridge or freezer\"."),
        price: z.number().describe("Price for one. If the card gives a range, use the middle of it."),
      }),
    )
    .describe("Items with their own set price (mattress, TV, fridge, hot tub). Leave out fees that depend on the job, like stairs or travel."),
  prohibited_items: z.array(z.string()),
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
  flatItems: z.array(z.object({ id: z.string(), name: z.string() })).max(100),
  prohibitedItems: z.array(z.string()),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const RateCardRequestSchema = z.object({
  photos: z.array(PhotoSchema).min(1).max(MAX_RATE_CARD_PHOTOS),
});

// ---- Feedback the app sends so estimates improve for everyone ----

const FeedbackLineSchema = z.object({
  id: z.string().max(64),
  category: z.enum(CATEGORY_IDS),
  quantity: z.number().min(0).max(1000),
  cubicYards: z.number().min(0).max(200),
  weightLbs: z.number().min(0).max(100_000),
});

export const FeedbackRequestSchema = z.object({
  id: z.string().min(8).max(64),
  deviceId: z.string().min(8).max(64),
  /** Sent with the quote. */
  quote: z
    .object({
      scope: z.enum(["few_items", "single_area", "multi_area"]),
      confidence: z.enum(["low", "medium", "high"]),
      trailerCubicYards: z.number().min(1).max(100),
      aiLines: z.array(FeedbackLineSchema).max(100),
      sentLines: z.array(FeedbackLineSchema).max(100),
      calibrationPct: z.number().min(-90).max(500),
    })
    .optional(),
  /** Sent after the job. */
  outcome: z
    .object({
      won: z.boolean(),
      rating: z.enum(["much_smaller", "smaller", "about_right", "bigger", "much_bigger"]).nullable(),
      actualCubicYards: z.number().min(0).max(200).nullable(),
      dumpWeightLbs: z.number().min(0).max(100_000).nullable(),
    })
    .optional(),
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
