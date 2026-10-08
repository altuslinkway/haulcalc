"use client";

import { useState } from "react";
import { deleteJob, recordOutcome, useJobs, type JobOutcome, type SavedJob } from "@/lib/client/jobsStore";
import { saveSettings, useSettings } from "@/lib/client/settingsStore";
import { formatFraction, parseFraction } from "@/lib/format";
import { calibrate, MIN_JOBS_FOR_CALIBRATION } from "@/lib/pricing/calibration";
import { buttonClass, Card, money, moneyRange, NumberField, Toggle } from "./ui";

export function JobsList() {
  const jobs = useJobs();
  const settings = useSettings();
  const calibration = calibrate(
    jobs.map((j) => ({
      aiLoadCubicYards: j.aiLoadCubicYards,
      actualLoadCubicYards: j.outcome?.won ? j.outcome.actualLoadCubicYards : null,
      dumpWeightLbs: j.outcome?.won ? j.outcome.dumpWeightLbs : null,
    })),
  );
  const current = settings.estimate.calibrationPct;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Jobs</h1>
        <p className="text-sm text-stone-500">
          Quotes you&apos;ve sent. After a job, log how big it really was so future quotes get closer.
        </p>
      </div>

      <Card title="How close are the photo estimates?">
        {calibration.jobs === 0 ? (
          <p className="text-sm text-stone-600">
            No finished jobs logged yet. After a job, open it below and enter the actual load size. After {MIN_JOBS_FOR_CALIBRATION} jobs
            you&apos;ll see a suggested correction.
          </p>
        ) : (
          <div className="space-y-2 text-sm text-stone-700">
            <p>
              {calibration.jobs} finished job{calibration.jobs > 1 ? "s" : ""} logged.
              {calibration.suggestedPct === null
                ? ` Log ${MIN_JOBS_FOR_CALIBRATION - calibration.jobs} more to get a suggested correction.`
                : calibration.suggestedPct === 0
                  ? " The AI's load estimates have been about right."
                  : ` Actual loads ran about ${Math.abs(calibration.suggestedPct)}% ${calibration.suggestedPct > 0 ? "bigger" : "smaller"} than the AI estimated.`}
            </p>
            {calibration.lbsPerCubicYard !== null && (
              <p>
                Your dump tickets average about {calibration.lbsPerCubicYard} lbs per yd³ (you include{" "}
                {settings.charges.includedLbsPerCubicYard} in the load price).
              </p>
            )}
            {calibration.suggestedPct !== null && calibration.suggestedPct !== current && (
              <button
                type="button"
                className={`${buttonClass.primary} w-full`}
                onClick={() =>
                  saveSettings({ ...settings, estimate: { ...settings.estimate, calibrationPct: calibration.suggestedPct! } })
                }
              >
                Use a {calibration.suggestedPct > 0 ? "+" : ""}
                {calibration.suggestedPct}% correction on new quotes
              </button>
            )}
            {current !== 0 && (
              <p className="text-xs text-stone-500">
                Currently applying {current > 0 ? "+" : ""}
                {current}%. Change it any time in My rates → Photo estimates.
              </p>
            )}
          </div>
        )}
      </Card>

      {jobs.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">
          Quotes show up here when you copy, share or text them.
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobRow({ job }: { job: SavedJob }) {
  const date = new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const quoted = job.sentPrice !== null ? money(job.sentPrice) : moneyRange(job.priceLow, job.priceHigh);
  const status = !job.outcome ? "Not logged" : job.outcome.won ? "Done" : "Didn't book";

  return (
    <li className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900">
              {job.customerName || "Customer"} · {date}
            </p>
            <p className="line-clamp-2 text-xs text-stone-500">{job.summary}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">{quoted}</p>
            <p className={`text-xs ${job.outcome ? "text-emerald-700" : "text-stone-400"}`}>{status}</p>
          </div>
        </summary>
        <OutcomeForm job={job} />
      </details>
    </li>
  );
}

function OutcomeForm({ job }: { job: SavedJob }) {
  const [draft, setDraft] = useState<JobOutcome>(
    job.outcome ?? { actualLoadCubicYards: null, finalPrice: null, dumpWeightLbs: null, won: true },
  );
  const capacity = job.trailerCubicYards || 1;
  const set = (patch: Partial<JobOutcome>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-3 border-t border-stone-100 p-4">
      <p className="text-xs text-stone-500">
        AI estimated {formatFraction(job.aiLoadCubicYards / capacity)} of a trailer ({Math.round(job.aiLoadCubicYards * 10) / 10} yd³)
        {Math.abs(job.quotedLoadCubicYards - job.aiLoadCubicYards) > 0.05 &&
          `; you quoted on ${Math.round(job.quotedLoadCubicYards * 10) / 10} yd³`}
        .
      </p>
      <Toggle label="The customer booked it" checked={draft.won} onChange={(won) => set({ won })} />
      {draft.won && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Actual load"
            value={(draft.actualLoadCubicYards ?? 0) / capacity}
            format={(f) => (f > 0 ? formatFraction(f) : "")}
            parse={parseFraction}
            inputMode="text"
            onChange={(f) => set({ actualLoadCubicYards: Math.round(f * capacity * 100) / 100 })}
            hint="Share of the trailer: 1/4, 3/8, 60%"
          />
          <NumberField
            label="Final price"
            prefix="$"
            value={draft.finalPrice ?? 0}
            format={(n) => (n > 0 ? String(n) : "")}
            onChange={(finalPrice) => set({ finalPrice })}
          />
          <NumberField
            label="Dump ticket weight"
            suffix="lbs"
            value={draft.dumpWeightLbs ?? 0}
            format={(n) => (n > 0 ? String(n) : "")}
            onChange={(dumpWeightLbs) => set({ dumpWeightLbs })}
            hint="Optional"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={buttonClass.primary} onClick={() => recordOutcome(job.id, draft)}>
          Save
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          onClick={() => {
            if (window.confirm("Delete this job?")) deleteJob(job.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
