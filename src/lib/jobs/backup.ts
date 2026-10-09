import { normalizeJobs } from "@/lib/client/jobsStore";
import { withDefaults } from "@/lib/client/settingsStore";
import type { Settings } from "@/lib/pricing/types";
import type { SavedJob } from "./jobs";

// Everything lives on one phone for now, so owners can save a copy of their
// rates and jobs to a file and load it on another phone (or after clearing).

export interface Backup {
  app: "haulcalc";
  version: 1;
  exportedAt: string;
  settings: Settings;
  jobs: SavedJob[];
}

export function makeBackup(settings: Settings, jobs: SavedJob[], now = new Date()): Backup {
  return { app: "haulcalc", version: 1, exportedAt: now.toISOString(), settings, jobs };
}

export function backupFileName(now = new Date()): string {
  return `haulcalc-backup-${now.toISOString().slice(0, 10)}.json`;
}

/** Read a backup file back in. Throws a message that's safe to show the owner. */
export function parseBackup(text: string): { settings: Settings; jobs: SavedJob[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a HaulCalc backup.");
  }
  const b = data as Partial<Backup> | null;
  if (!b || b.app !== "haulcalc" || typeof b.settings !== "object") {
    throw new Error("That file isn't a HaulCalc backup.");
  }
  return { settings: withDefaults(b.settings), jobs: normalizeJobs(b.jobs) };
}
