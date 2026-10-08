import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { LearnedModel } from "@/lib/learning/learn";
import { isCategoryId } from "@/lib/pricing/categories";
import type { JobEstimate } from "@/lib/pricing/types";
import { PHOTO_ANALYSIS_SYSTEM, RATE_CARD_SYSTEM, photoAnalysisInstructions } from "./prompts";
import {
  PhotoAnalysisSchema,
  RateCardSchema,
  type AnalyzeRequest,
  type PhotoAnalysis,
  type RateCard,
} from "./schemas";

// Server-only: talks to the Claude API with the owner's photos.

const MODEL = process.env.HAULCALC_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.HAULCALC_EFFORT || "medium") as "low" | "medium" | "high" | "xhigh" | "max";

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

type Photo = AnalyzeRequest["photos"][number];

/** Thrown with a message that's safe to show the owner. */
export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

function photoBlocks(photos: Photo[]): Anthropic.Beta.BetaContentBlockParam[] {
  return photos.flatMap((p, i): Anthropic.Beta.BetaContentBlockParam[] => [
    { type: "text", text: `Photo ${i + 1}:` },
    { type: "image", source: { type: "base64", media_type: p.mediaType, data: p.data } },
  ]);
}

async function ask<T>(
  system: string,
  content: Anthropic.Beta.BetaContentBlockParam[],
  format: ReturnType<typeof betaZodOutputFormat<typeof PhotoAnalysisSchema | typeof RateCardSchema>>,
): Promise<T> {
  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, retry on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT, format },
      system,
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    throw toAnalysisError(err);
  }

  if (response.stop_reason === "refusal") {
    throw new AnalysisError("The AI declined to analyze these photos. Try different photos.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new AnalysisError("The AI's answer came back incomplete. Please try again.");
  }
  return response.parsed_output as T;
}

function toAnalysisError(err: unknown): AnalysisError {
  if (err instanceof Anthropic.AuthenticationError) {
    return new AnalysisError("The server's Anthropic API key is missing or invalid.", 500);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AnalysisError("The AI is busy right now. Try again in a minute.", 429);
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new AnalysisError(`The AI couldn't read that request: ${err.message}`, 400);
  }
  if (err instanceof Anthropic.APIError) {
    return new AnalysisError(`The AI service returned an error (${err.status ?? "network"}). Try again.`);
  }
  if (err instanceof Error && /api key|apiKey|auth/i.test(err.message)) {
    return new AnalysisError("No Anthropic API key is configured on the server. Set ANTHROPIC_API_KEY.", 500);
  }
  return new AnalysisError("Something went wrong talking to the AI. Try again.");
}

export async function analyzePhotos(req: AnalyzeRequest, learned?: LearnedModel): Promise<JobEstimate> {
  const analysis = await ask<PhotoAnalysis>(
    PHOTO_ANALYSIS_SYSTEM,
    [...photoBlocks(req.photos), { type: "text", text: photoAnalysisInstructions(req, learned) }],
    betaZodOutputFormat(PhotoAnalysisSchema),
  );
  return toEstimate(analysis, req.itemFees);
}

export async function readRateCard(photos: Photo[]): Promise<RateCard> {
  return ask<RateCard>(
    RATE_CARD_SYSTEM,
    [...photoBlocks(photos), { type: "text", text: "Read the rate card in these images." }],
    betaZodOutputFormat(RateCardSchema),
  );
}

/** Map the model's answer onto app types, guarding against impossible numbers and unknown ids. */
export function toEstimate(a: PhotoAnalysis, itemFees: AnalyzeRequest["itemFees"]): JobEstimate {
  const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const count = (n: number) => Math.max(1, Math.round(pos(n)));
  const special = new Set(itemFees.filter((f) => f.pricing !== "addon").map((f) => f.id));
  const addOnIds = new Set(itemFees.filter((f) => f.pricing === "addon").map((f) => f.id));

  return {
    summary: a.summary,
    lines: a.lines
      .filter((l) => pos(l.cubic_yards_total) > 0 || special.has(l.flat_rate_item_id))
      .map((l, i) => ({
        id: `ai-${i}`,
        description: l.description,
        quantity: count(l.quantity),
        cubicYards: pos(l.cubic_yards_total),
        weightLbs: Math.round(pos(l.weight_lbs_total)),
        material: l.material,
        category: isCategoryId(l.category) ? l.category : "other",
        itemId: special.has(l.flat_rate_item_id) ? l.flat_rate_item_id : null,
      })),
    addOns: a.add_ons
      .filter((x) => addOnIds.has(x.item_id) && x.quantity > 0)
      .map((x) => ({ itemId: x.item_id, quantity: Math.round(x.quantity) })),
    scope: a.scope,
    prohibitedItems: a.prohibited_items,
    stairsFlights: Math.round(pos(a.stairs_flights)),
    accessNotes: a.access_notes,
    confidence: a.confidence,
    questionsForCustomer: a.questions_for_customer.slice(0, 3),
    networkCalibrationPct: 0,
  };
}
