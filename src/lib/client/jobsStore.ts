"use client";

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
  /** The AI's own load estimate (before edits, cushion or correction), for calibration. */
  aiLoadCubicYards: number;
  /** The load size the quote was priced on, after the owner's edits. */
  quotedLoadCubicYards: number;
  trailerCubicYards: number;
  outcome: JobOutcome | null;
}

export interface JobOutcome {
  actualLoadCubicYards: number | null;
  finalPrice: number | null;
  dumpWeightLbs: number | null;
  won: boolean;
}

const MAX_JOBS = 200;

const store = createLocalStore<SavedJob[]>("haulcalc.jobs.v1", [], (saved) => (Array.isArray(saved) ? saved : []));

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
