import { categoryById, isCategoryId, type ItemCategoryId } from "@/lib/pricing/categories";
import type { Confidence, JobScope } from "@/lib/pricing/types";

// Turning many owners' corrections into better estimates for everyone.
//
// Two kinds of signal come in:
// - When a quote is sent: the AI's lines and the lines the owner actually
//   quoted on. Each line keeps its id through edits, so we know which AI
//   guess the owner corrected, and by how much.
// - After the job: how big it really was (a one-tap rating, or the actual
//   share of the trailer) and, optionally, the dump ticket weight.
//
// Everything is aggregated as a median of each owner's median. Every owner
// gets one vote, so a careless or malicious account can't drag the numbers,
// and nothing is used until enough different owners agree.

export const MIN_OWNERS = 3;
/**
 * Each owner's vote uses only their latest jobs, so the correction tracks the
 * AI as it is now: once learned sizes improve its guesses, older misses stop counting.
 */
export const RECENT_JOBS_PER_OWNER = 10;
export const RECENT_ITEMS_PER_OWNER = 30;

export type JobRating = "much_smaller" | "smaller" | "about_right" | "bigger" | "much_bigger";

/** Actual size ÷ estimated size implied by a one-tap rating. */
export const RATING_RATIO: Record<JobRating, number> = {
  much_smaller: 0.7,
  smaller: 0.85,
  about_right: 1,
  bigger: 1.15,
  much_bigger: 1.3,
};

export interface FeedbackLine {
  id: string;
  category: ItemCategoryId;
  quantity: number;
  cubicYards: number;
  weightLbs: number;
}

/** One job as the shared store keeps it. No photos, names, addresses or prices. */
export interface FeedbackRecord {
  id: string;
  deviceId: string;
  scope: JobScope;
  confidence: Confidence;
  trailerCubicYards: number;
  /** What the AI said, before any edits. */
  aiLines: FeedbackLine[];
  /** What the owner quoted on, after editing. */
  sentLines: FeedbackLine[] | null;
  /** Correction already applied to the quote the owner saw (ratings are relative to that). */
  calibrationPct?: number;
  outcome: {
    won: boolean;
    rating: JobRating | null;
    actualCubicYards: number | null;
    dumpWeightLbs: number | null;
  } | null;
}

export interface LearnedItem {
  category: ItemCategoryId;
  /** Median size per piece owners quoted on, for countable items. */
  perUnitCubicYards: number | null;
  /** How far owners moved the AI's guess: +15 means they made it 15% bigger. */
  biasPct: number;
  owners: number;
  observations: number;
}

export interface LearnedModel {
  jobs: number;
  owners: number;
  items: LearnedItem[];
  /** Whole-job correction by kind of job, from finished jobs. */
  scopeCalibration: Partial<Record<JobScope, { pct: number; jobs: number; owners: number }>>;
  /** Dump-ticket weight per cubic yard, from finished jobs. */
  lbsPerCubicYard: { value: number; owners: number } | null;
}

export const EMPTY_MODEL: LearnedModel = { jobs: 0, owners: 0, items: [], scopeCalibration: {}, lbsPerCubicYard: null };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Median of each owner's median: one vote per owner. Null until enough owners. */
function ownerMedian(byOwner: Map<string, number[]>): { value: number; owners: number; observations: number } | null {
  const perOwner = [...byOwner.values()].filter((xs) => xs.length > 0).map(median);
  if (perOwner.length < MIN_OWNERS) return null;
  const observations = [...byOwner.values()].reduce((n, xs) => n + xs.length, 0);
  return { value: median(perOwner), owners: perOwner.length, observations };
}

/** Records arrive newest first, so capping per owner keeps their most recent values. */
function push(map: Map<string, Map<string, number[]>>, key: string, owner: string, value: number, cap: number) {
  if (!Number.isFinite(value) || value <= 0) return;
  const byOwner = map.get(key) ?? new Map<string, number[]>();
  const values = byOwner.get(owner) ?? [];
  if (values.length >= cap) return;
  byOwner.set(owner, [...values, value]);
  map.set(key, byOwner);
}

const totalCy = (lines: FeedbackLine[]) => lines.reduce((s, l) => s + l.cubicYards, 0);
/** Ratios outside this band are typos or a different job entirely, not a correction. */
const plausible = (r: number) => r >= 0.2 && r <= 5;

/** Records must be newest first (the store returns them that way). */
export function learn(records: FeedbackRecord[]): LearnedModel {
  const ratios = new Map<string, Map<string, number[]>>();
  const sizes = new Map<string, Map<string, number[]>>();
  const jobRatios = new Map<string, Map<string, number[]>>();
  const densities = new Map<string, Map<string, number[]>>();

  for (const r of records) {
    // Item level: the AI's line next to the line the owner quoted on.
    for (const sent of r.sentLines ?? []) {
      if (!isCategoryId(sent.category) || sent.quantity <= 0) continue;
      // Only lines that pair with an AI guess teach anything; ones the owner added have no baseline.
      const ai = r.aiLines.find((l) => l.id === sent.id);
      if (!ai || ai.cubicYards <= 0 || ai.quantity <= 0) continue;
      const ratio = sent.cubicYards / sent.quantity / (ai.cubicYards / ai.quantity);
      if (!plausible(ratio)) continue;
      push(ratios, sent.category, r.deviceId, ratio, RECENT_ITEMS_PER_OWNER);
      if (categoryById(sent.category).unit === "each") {
        push(sizes, sent.category, r.deviceId, sent.cubicYards / sent.quantity, RECENT_ITEMS_PER_OWNER);
      }
    }

    // Job level: how big the job really was against the AI's whole estimate.
    // An exact size compares directly; a rating is relative to the quote the
    // owner saw, which already had their edits and any correction applied.
    const o = r.outcome;
    const aiTotal = totalCy(r.aiLines);
    if (o?.won && aiTotal > 0) {
      const shown = (r.sentLines ? totalCy(r.sentLines) : aiTotal) * (1 + (r.calibrationPct ?? 0) / 100);
      const ratio = o.actualCubicYards
        ? o.actualCubicYards / aiTotal
        : o.rating
          ? (shown * RATING_RATIO[o.rating]) / aiTotal
          : null;
      if (ratio !== null && plausible(ratio)) push(jobRatios, r.scope, r.deviceId, ratio, RECENT_JOBS_PER_OWNER);
      if (o.actualCubicYards && o.dumpWeightLbs) {
        push(densities, "all", r.deviceId, o.dumpWeightLbs / o.actualCubicYards, RECENT_JOBS_PER_OWNER);
      }
    }
  }

  const items: LearnedItem[] = [];
  for (const [category, byOwner] of ratios) {
    const bias = ownerMedian(byOwner);
    if (!bias) continue;
    const size = sizes.has(category) ? ownerMedian(sizes.get(category)!) : null;
    items.push({
      category: category as ItemCategoryId,
      perUnitCubicYards: size ? round2(size.value) : null,
      biasPct: Math.round((bias.value - 1) * 100),
      owners: bias.owners,
      observations: bias.observations,
    });
  }

  const scopeCalibration: LearnedModel["scopeCalibration"] = {};
  for (const [scope, byOwner] of jobRatios) {
    const m = ownerMedian(byOwner);
    if (m) scopeCalibration[scope as JobScope] = { pct: Math.round((m.value - 1) * 100), jobs: m.observations, owners: m.owners };
  }

  const density = densities.has("all") ? ownerMedian(densities.get("all")!) : null;

  return {
    jobs: records.length,
    owners: new Set(records.map((r) => r.deviceId)).size,
    // Biggest corrections first: those are what change estimates.
    items: items.sort((a, b) => Math.abs(b.biasPct) - Math.abs(a.biasPct) || b.owners - a.owners),
    scopeCalibration,
    lbsPerCubicYard: density ? { value: Math.round(density.value), owners: density.owners } : null,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
