"use client";

import { normalizeJob, type SavedJob } from "@/lib/jobs/jobs";
import { createLocalStore } from "./localStore";

export type { JobOutcome, JobStatus, PaidWith, SavedJob } from "@/lib/jobs/jobs";

const MAX_JOBS = 500;

export function normalizeJobs(saved: unknown): SavedJob[] {
  return Array.isArray(saved) ? saved.map(normalizeJob).filter((j): j is SavedJob => j !== null) : [];
}

const store = createLocalStore<SavedJob[]>("haulcalc.jobs.v2", [], normalizeJobs);

export const useJobs = store.use;
export const readJobs = store.read;

/** Save or update a quote by id, newest first. Sending the same quote again keeps what's happened since. */
export function saveJob(job: SavedJob) {
  const all = store.read();
  const prev = all.find((j) => j.id === job.id);
  const next = prev
    ? {
        ...job,
        createdAt: prev.createdAt,
        status: prev.status,
        jobDate: prev.jobDate,
        doneAt: prev.doneAt,
        finalPrice: prev.finalPrice,
        paidWith: prev.paidWith,
        dumpFeePaid: prev.dumpFeePaid,
        outcome: prev.outcome,
      }
    : job;
  store.save([next, ...all.filter((j) => j.id !== job.id)].slice(0, MAX_JOBS));
}

export function updateJob(id: string, patch: Partial<SavedJob>) {
  store.save(store.read().map((j) => (j.id === id ? { ...j, ...patch } : j)));
}

export function deleteJob(id: string) {
  store.save(store.read().filter((j) => j.id !== id));
}

/** Replace every job, e.g. when restoring a backup. */
export function replaceJobs(jobs: SavedJob[]) {
  store.save(jobs.slice(0, MAX_JOBS));
}
