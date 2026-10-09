import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/pricing/defaults";
import { backupFileName, makeBackup, parseBackup } from "./backup";
import { jobKept, monthKey, monthsWithJobs, normalizeJob, shiftMonth, summarizeMonth, type SavedJob } from "./jobs";

function job(o: Partial<SavedJob> = {}): SavedJob {
  return normalizeJob({
    id: Math.random().toString(36).slice(2),
    createdAt: "2026-10-02T15:00:00",
    customerName: "Dana",
    priceLow: 400,
    priceHigh: 500,
    sentPrice: null,
    estCosts: { dump: 40, gas: 20, helpers: 50 },
    ...o,
  })!;
}

describe("saved jobs", () => {
  it("brings older jobs forward: waiting, done or lost", () => {
    const old = { id: "a", createdAt: "2026-09-01T10:00:00", priceLow: 300, priceHigh: 300, outcome: null };
    expect(normalizeJob(old)).toMatchObject({ status: "quoted", customerPhone: "", source: "photos", doneAt: null });
    expect(normalizeJob({ ...old, outcome: { won: true, rating: "bigger", finalPrice: 350 } })).toMatchObject({
      status: "done",
      doneAt: "2026-09-01T10:00:00",
      finalPrice: 350,
    });
    expect(normalizeJob({ ...old, outcome: { won: false } })?.status).toBe("lost");
    expect(normalizeJob({ nope: true })).toBeNull();
  });

  it("works out what was kept, using the real dump fee when there is one", () => {
    expect(jobKept(job({ finalPrice: 450 }))).toBe(450 - 40 - 20 - 50);
    expect(jobKept(job({ finalPrice: 450, dumpFeePaid: 70 }))).toBe(450 - 70 - 20 - 50);
    // No final price: the middle of the quote.
    expect(jobKept(job())).toBe(450 - 110);
  });

  it("adds up a month from the jobs marked done in it", () => {
    const jobs = [
      job({ status: "done", doneAt: "2026-10-05T12:00:00", finalPrice: 450, dumpFeePaid: 38 }),
      job({ status: "done", doneAt: "2026-10-20T12:00:00", sentPrice: 300 }),
      job({ status: "done", doneAt: "2026-09-28T12:00:00", finalPrice: 999 }),
      job({ status: "booked", sentPrice: 250 }),
      job({ status: "quoted" }),
      job({ status: "lost" }),
    ];
    expect(summarizeMonth(jobs, "2026-10")).toEqual({
      jobs: 2,
      made: 750,
      kept: 450 - 38 - 70 + (300 - 110),
      dumpFees: 78,
      booked: 250,
      bookedJobs: 1,
    });
    expect(summarizeMonth(jobs, "2026-09").made).toBe(999);
  });

  it("steps between months and lists the ones with work", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthKey(new Date(2026, 9, 9))).toBe("2026-10");
    const jobs = [job({ status: "done", doneAt: "2026-08-03T12:00:00" })];
    expect(monthsWithJobs(jobs, "2026-10")).toEqual(["2026-10", "2026-08"]);
  });
});

describe("backups", () => {
  it("round-trips settings and jobs", () => {
    const settings = { ...DEFAULT_SETTINGS, businessName: "Joe's Hauling", paymentInfo: "@joe" };
    const jobs = [job({ status: "done", doneAt: "2026-10-05T12:00:00", finalPrice: 450 })];
    const restored = parseBackup(JSON.stringify(makeBackup(settings, jobs)));
    expect(restored.settings).toEqual(settings);
    expect(restored.jobs).toEqual(jobs);
  });

  it("refuses files that aren't backups", () => {
    expect(() => parseBackup("not json")).toThrow("isn't a HaulCalc backup");
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow("isn't a HaulCalc backup");
  });

  it("names the file by date", () => {
    expect(backupFileName(new Date("2026-10-09T12:00:00Z"))).toBe("haulcalc-backup-2026-10-09.json");
  });
});
