import { RATING_RATIO, type JobRating } from "@/lib/learning/learn";

// Learning from one owner's own finished jobs: how far off were the photo
// estimates? (Pooling across all owners happens on the server, in learning/.)

export interface JobResult {
  aiCubicYards: number;
  /** What the quote was based on, after edits, and the correction it already carried. */
  quotedCubicYards: number;
  calibrationPct: number;
  actualCubicYards: number | null;
  rating: JobRating | null;
  dumpWeightLbs: number | null;
}

export interface Calibration {
  /** Jobs with an AI estimate and either an actual size or a rating. */
  jobs: number;
  /** Suggested correction: +15 means jobs ran 15% bigger than the AI said. */
  suggestedPct: number | null;
  /** Typical weight per cubic yard from dump tickets, when recorded. */
  lbsPerCubicYard: number | null;
  weighedJobs: number;
}

/** Need a few jobs before a correction means anything. */
export const MIN_JOBS_FOR_CALIBRATION = 3;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Actual ÷ the AI's estimate for one job. An exact size compares directly; a
 * rating is relative to the quote the owner saw (their edits and any
 * correction included), so it's converted back to the AI's terms.
 */
export function jobRatio(r: JobResult): number | null {
  if (r.aiCubicYards <= 0) return null;
  if ((r.actualCubicYards ?? 0) > 0) return r.actualCubicYards! / r.aiCubicYards;
  if (!r.rating) return null;
  const shown = r.quotedCubicYards * (1 + r.calibrationPct / 100);
  return (shown * RATING_RATIO[r.rating]) / r.aiCubicYards;
}

export function calibrate(results: JobResult[]): Calibration {
  // Median, so one odd job (a garage that turned out to be two) doesn't swing it.
  const ratios = results.map(jobRatio).filter((r): r is number => r !== null);
  const ratio = ratios.length ? median(ratios) : null;

  const weighed = results.filter((r) => (r.actualCubicYards ?? 0) > 0 && (r.dumpWeightLbs ?? 0) > 0);
  const density = weighed.length ? median(weighed.map((r) => r.dumpWeightLbs! / r.actualCubicYards!)) : null;

  return {
    jobs: ratios.length,
    suggestedPct: ratio !== null && ratios.length >= MIN_JOBS_FOR_CALIBRATION ? Math.round((ratio - 1) * 100) : null,
    lbsPerCubicYard: density !== null ? Math.round(density) : null,
    weighedJobs: weighed.length,
  };
}
