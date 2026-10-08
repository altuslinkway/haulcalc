// Learning from finished jobs: how far off were the photo estimates?

export interface JobResult {
  aiLoadCubicYards: number;
  actualLoadCubicYards: number | null;
  dumpWeightLbs: number | null;
}

export interface Calibration {
  /** Jobs with both an AI estimate and an actual load size. */
  jobs: number;
  /** Suggested correction: +15 means actual loads ran 15% bigger than the AI said. */
  suggestedPct: number | null;
  /** Average weight per cubic yard from dump tickets, when recorded. */
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

export function calibrate(results: JobResult[]): Calibration {
  const sized = results.filter((r) => r.aiLoadCubicYards > 0 && (r.actualLoadCubicYards ?? 0) > 0);
  // Median, so one odd job (a garage that turned out to be two) doesn't swing it.
  const ratio = sized.length ? median(sized.map((r) => r.actualLoadCubicYards! / r.aiLoadCubicYards)) : null;

  const weighed = results.filter((r) => (r.actualLoadCubicYards ?? 0) > 0 && (r.dumpWeightLbs ?? 0) > 0);
  const density = weighed.length ? median(weighed.map((r) => r.dumpWeightLbs! / r.actualLoadCubicYards!)) : null;

  return {
    jobs: sized.length,
    suggestedPct: ratio !== null && sized.length >= MIN_JOBS_FOR_CALIBRATION ? Math.round((ratio - 1) * 100) : null,
    lbsPerCubicYard: density !== null ? Math.round(density) : null,
    weighedJobs: weighed.length,
  };
}
