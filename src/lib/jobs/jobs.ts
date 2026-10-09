import type { JobRating } from "@/lib/learning/learn";

// A sent quote and what became of it: booked, done (and paid), or lost.
// Kept deliberately light: enough to answer "what did I make this month?"
// and to teach the estimates, nothing a weekend hauler has to maintain.

export type JobStatus = "quoted" | "booked" | "done" | "lost";
export type PaidWith = "cash" | "app" | "card" | "unpaid";

export const PAID_WITH: { value: PaidWith; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "app", label: "Venmo" },
  { value: "card", label: "Card" },
  { value: "unpaid", label: "Not yet" },
];

/** What feeds the shared learning: did it book, and how big was it really. */
export interface JobOutcome {
  won: boolean;
  /** One-tap answer to "how did the job compare to the estimate?" */
  rating: JobRating | null;
  actualCubicYards: number | null;
  finalPrice: number | null;
  dumpWeightLbs: number | null;
}

export interface SavedJob {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  summary: string;
  /** Priced from photos by the AI, or a quick quote the owner tapped in. */
  source: "photos" | "quick";
  priceLow: number;
  priceHigh: number;
  /** The single price sent, when the owner quoted one number. */
  sentPrice: number | null;
  /** The AI's whole estimate (before edits, cushion or correction), for calibration. */
  aiCubicYards: number;
  /** The size the quote was priced on, after the owner's edits. */
  quotedCubicYards: number;
  trailerCubicYards: number;
  /** Correction already in the quote, so a later rating can be read against what was shown. */
  calibrationPct: number;
  /** Whether this job's corrections went to the shared learning store. */
  shared: boolean;
  /** Rough costs worked out when quoting (middle of the range), for "what you kept". */
  estCosts: { dump: number; gas: number; helpers: number };

  status: JobStatus;
  /** The day it's booked for, if the owner set one (YYYY-MM-DD). */
  jobDate: string | null;
  /** When it was marked done; the money counts toward that month. */
  doneAt: string | null;
  finalPrice: number | null;
  paidWith: PaidWith | null;
  /** What the dump actually charged, if the owner entered it. */
  dumpFeePaid: number | null;

  outcome: JobOutcome | null;
}

const num = (n: unknown, fallback = 0) => (typeof n === "number" && Number.isFinite(n) ? n : fallback);
const numOrNull = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);
const str = (s: unknown) => (typeof s === "string" ? s : "");

/** Fill in fields added since a job was saved, so older quotes still show up. */
export function normalizeJob(saved: unknown): SavedJob | null {
  if (!saved || typeof saved !== "object") return null;
  const j = saved as Partial<SavedJob>;
  if (typeof j.id !== "string" || typeof j.createdAt !== "string") return null;
  const outcome = j.outcome && typeof j.outcome === "object" ? j.outcome : null;
  // Before statuses, a job was either waiting for feedback, booked and rated, or lost.
  const status: JobStatus =
    j.status && ["quoted", "booked", "done", "lost"].includes(j.status)
      ? j.status
      : !outcome
        ? "quoted"
        : outcome.won
          ? "done"
          : "lost";
  return {
    id: j.id,
    createdAt: j.createdAt,
    customerName: str(j.customerName),
    customerPhone: str(j.customerPhone),
    summary: str(j.summary),
    source: j.source === "quick" ? "quick" : "photos",
    priceLow: num(j.priceLow),
    priceHigh: num(j.priceHigh, num(j.priceLow)),
    sentPrice: numOrNull(j.sentPrice),
    aiCubicYards: num(j.aiCubicYards),
    quotedCubicYards: num(j.quotedCubicYards),
    trailerCubicYards: num(j.trailerCubicYards, 1),
    calibrationPct: num(j.calibrationPct),
    shared: Boolean(j.shared),
    estCosts: {
      dump: num(j.estCosts?.dump),
      gas: num(j.estCosts?.gas),
      helpers: num(j.estCosts?.helpers),
    },
    status,
    jobDate: typeof j.jobDate === "string" && j.jobDate ? j.jobDate : null,
    doneAt: typeof j.doneAt === "string" ? j.doneAt : status === "done" ? j.createdAt : null,
    finalPrice: numOrNull(j.finalPrice) ?? numOrNull(outcome?.finalPrice),
    paidWith: j.paidWith && PAID_WITH.some((p) => p.value === j.paidWith) ? j.paidWith : null,
    dumpFeePaid: numOrNull(j.dumpFeePaid),
    outcome: outcome
      ? {
          won: Boolean(outcome.won),
          rating: outcome.rating ?? null,
          actualCubicYards: numOrNull(outcome.actualCubicYards),
          finalPrice: numOrNull(outcome.finalPrice),
          dumpWeightLbs: numOrNull(outcome.dumpWeightLbs),
        }
      : null,
  };
}

/** The price to expect: the single price sent, else the middle of the range. */
export function quotedPrice(job: SavedJob): number {
  return job.sentPrice ?? Math.round((job.priceLow + job.priceHigh) / 2);
}

/** What a finished job brought in: the final price if entered, else what was quoted. */
export function jobRevenue(job: SavedJob): number {
  return job.finalPrice ?? quotedPrice(job);
}

/** Revenue minus the dump fee (actual if entered), gas and helper pay. */
export function jobKept(job: SavedJob, revenue = jobRevenue(job), dumpFee = job.dumpFeePaid): number {
  const { dump, gas, helpers } = job.estCosts;
  return Math.round(revenue - (dumpFee ?? dump) - gas - helpers);
}

/** "2026-10" for a date, in the phone's own time zone. */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function shiftMonth(key: string, by: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
}

export interface MonthSummary {
  /** Jobs marked done this month. */
  jobs: number;
  made: number;
  kept: number;
  dumpFees: number;
  /** Booked and not done yet, at the quoted price (all upcoming, not just this month). */
  booked: number;
  bookedJobs: number;
}

export function summarizeMonth(jobs: SavedJob[], key: string): MonthSummary {
  const done = jobs.filter((j) => j.status === "done" && j.doneAt && monthKey(j.doneAt) === key);
  const booked = jobs.filter((j) => j.status === "booked");
  return {
    jobs: done.length,
    made: done.reduce((s, j) => s + jobRevenue(j), 0),
    kept: done.reduce((s, j) => s + jobKept(j), 0),
    dumpFees: Math.round(done.reduce((s, j) => s + (j.dumpFeePaid ?? j.estCosts.dump), 0)),
    booked: booked.reduce((s, j) => s + quotedPrice(j), 0),
    bookedJobs: booked.length,
  };
}

/** Months that have finished jobs, newest first, always including the current one. */
export function monthsWithJobs(jobs: SavedJob[], currentMonth: string): string[] {
  const keys = new Set([currentMonth]);
  for (const j of jobs) if (j.status === "done" && j.doneAt) keys.add(monthKey(j.doneAt));
  return [...keys].sort().reverse();
}
