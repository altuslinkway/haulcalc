"use client";

import type { JobRating } from "@/lib/learning/learn";
import { createLocalStore } from "./localStore";

/** A quote that was sent, and what the job turned out to be. */
export interface SavedJob {
  id: string;
  createdAt: string;
  customerName: string;
  summary: string;
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
  outcome: JobOutcome | null;
}

export interface JobOutcome {
  won: boolean;
  /** One-tap answer to "how did the job compare to the estimate?" */
  rating: JobRating | null;
  actualCubicYards: number | null;
  finalPrice: number | null;
  dumpWeightLbs: number | null;
}

const MAX_JOBS = 200;

const store = createLocalStore<SavedJob[]>("haulcalc.jobs.v2", [], (saved) => (Array.isArray(saved) ? saved : []));

export const useJobs = store.use;

/** Save or update a quote by id, newest first. */
export function saveJob(job: SavedJob) {
  const jobs = store.read().filter((j) => j.id !== job.id);
  store.save([job, ...jobs].slice(0, MAX_JOBS));
}

export function recordOutcome(id: string, outcome: JobOutcome | null) {
  store.save(store.read().map((j) => (j.id === id ? { ...j, outcome } : j)));
}

export function deleteJob(id: string) {
  store.save(store.read().filter((j) => j.id !== id));
}
