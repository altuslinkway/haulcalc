"use client";

import { useEffect, useState } from "react";
import { sendFeedback } from "@/lib/client/feedback";
import { deleteJob, recordOutcome, useJobs, type JobOutcome, type SavedJob } from "@/lib/client/jobsStore";
import { saveSettings, useSettings } from "@/lib/client/settingsStore";
import { formatFraction, parseFraction } from "@/lib/format";
import type { JobRating, LearnedModel } from "@/lib/learning/learn";
import { categoryById } from "@/lib/pricing/categories";
import { calibrate, MIN_JOBS_FOR_CALIBRATION } from "@/lib/pricing/calibration";
import type { Settings } from "@/lib/pricing/types";
import { buttonClass, Card, money, moneyRange, NumberField } from "./ui";

const RATINGS: { value: JobRating; label: string }[] = [
  { value: "much_smaller", label: "Much smaller" },
  { value: "smaller", label: "Smaller" },
  { value: "about_right", label: "About right" },
  { value: "bigger", label: "Bigger" },
  { value: "much_bigger", label: "Much bigger" },
];

/** Save the outcome here and, if this job was shared, add it to what all owners' quotes learn from. */
function logOutcome(job: SavedJob, outcome: JobOutcome) {
  recordOutcome(job.id, outcome);
  if (job.shared) {
    const { won, rating, actualCubicYards, dumpWeightLbs } = outcome;
    sendFeedback({ id: job.id, outcome: { won, rating, actualCubicYards, dumpWeightLbs } });
  }
}

export function JobsList() {
  const jobs = useJobs();
  const settings = useSettings();
  const toLog = jobs.filter((j) => !j.outcome).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Jobs</h1>
        <p className="text-sm text-stone-500">
          Quotes you&apos;ve sent. After each job, tap how it compared to the estimate. That&apos;s how the estimates get better.
        </p>
      </div>

      <YourAccuracy jobs={jobs} settings={settings} />
      <NetworkLearning settings={settings} />

      {jobs.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">
          Quotes show up here when you copy, share or text them.
        </p>
      ) : (
        <>
          {toLog > 0 && (
            <p className="text-sm font-medium text-stone-700">
              {toLog} job{toLog > 1 ? "s" : ""} waiting for feedback
            </p>
          )}
          <ul className="space-y-3">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function YourAccuracy({ jobs, settings }: { jobs: SavedJob[]; settings: Settings }) {
  const own = calibrate(
    jobs
      .filter((j) => j.outcome?.won)
      .map((j) => ({
        aiCubicYards: j.aiCubicYards,
        quotedCubicYards: j.quotedCubicYards,
        calibrationPct: j.calibrationPct ?? 0,
        actualCubicYards: j.outcome!.actualCubicYards,
        rating: j.outcome!.rating,
        dumpWeightLbs: j.outcome!.dumpWeightLbs,
      })),
  );
  const current = settings.estimate.calibrationPct;
  const setCalibration = (pct: number | null) =>
    saveSettings({ ...settings, estimate: { ...settings.estimate, calibrationPct: pct } });

  return (
    <Card title="Your estimates">
      {own.jobs === 0 ? (
        <p className="text-sm text-stone-600">
          No finished jobs rated yet. After {MIN_JOBS_FOR_CALIBRATION} you&apos;ll see how close the photo estimates run for your
          jobs.
        </p>
      ) : (
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            {own.jobs} finished job{own.jobs > 1 ? "s" : ""} rated.
            {own.suggestedPct === null
              ? ` Rate ${MIN_JOBS_FOR_CALIBRATION - own.jobs} more to see a pattern.`
              : own.suggestedPct === 0
                ? " Your jobs have come in about as estimated."
                : ` Your jobs have run about ${Math.abs(own.suggestedPct)}% ${own.suggestedPct > 0 ? "bigger" : "smaller"} than estimated.`}
          </p>
          {own.lbsPerCubicYard !== null && (
            <p>
              Your dump tickets average about {own.lbsPerCubicYard} lbs per yd³ (your load price includes{" "}
              {settings.charges.includedLbsPerCubicYard}).
            </p>
          )}
          {own.suggestedPct !== null && own.suggestedPct !== current && (
            <button type="button" className={`${buttonClass.primary} w-full`} onClick={() => setCalibration(own.suggestedPct)}>
              Use my own {own.suggestedPct > 0 ? "+" : ""}
              {own.suggestedPct}% correction
            </button>
          )}
        </div>
      )}
      {current !== null && (
        <p className="mt-2 text-xs text-stone-500">
          Applying your own {current > 0 ? "+" : ""}
          {current}% correction to new quotes.{" "}
          <button type="button" className="font-semibold text-orange-700" onClick={() => setCalibration(null)}>
            Use what all owners have learned instead
          </button>
        </p>
      )}
    </Card>
  );
}

type NetworkState = (LearnedModel & { enabled: boolean }) | null;

function NetworkLearning({ settings }: { settings: Settings }) {
  const [model, setModel] = useState<NetworkState>(null);
  useEffect(() => {
    fetch("/api/learning")
      .then((r) => (r.ok ? r.json() : null))
      .then(setModel)
      .catch(() => setModel(null));
  }, []);

  if (!model) return null;
  if (!model.enabled) {
    return (
      <Card title="Learning from all owners">
        <p className="text-sm text-stone-600">
          Shared learning isn&apos;t switched on for this server yet. Your own job ratings still work above.
        </p>
      </Card>
    );
  }

  const scopes = Object.entries(model.scopeCalibration);
  // Small differences are noise; the prompt skips them too.
  const corrected = model.items.filter((i) => Math.abs(i.biasPct) >= 5);
  const confirmed = model.items.length - corrected.length;
  const scopeLabel = { few_items: "Single items", single_area: "One room or pile", multi_area: "Multi-room cleanouts" };
  return (
    <Card
      title="Learning from all owners"
      subtitle={`${model.jobs.toLocaleString("en-US")} quotes from ${model.owners.toLocaleString("en-US")} owners so far.`}
    >
      {model.items.length === 0 && scopes.length === 0 ? (
        <p className="text-sm text-stone-600">
          Nothing learned yet. Corrections start counting once several different owners agree on them.
        </p>
      ) : (
        <div className="space-y-3 text-sm text-stone-700">
          {model.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Item sizes owners corrected</p>
              {corrected.length > 0 ? (
                <ul className="mt-1 divide-y divide-stone-100">
                  {corrected.slice(0, 8).map((i) => (
                    <li key={i.category} className="flex justify-between gap-3 py-1.5">
                      <span>{categoryById(i.category).label}</span>
                      <span className="text-right text-stone-500 tabular-nums">
                        {i.perUnitCubicYards !== null && `${i.perUnitCubicYards} yd³ each · `}
                        AI {i.biasPct > 0 ? "low" : "high"} by {Math.abs(i.biasPct)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1">No consistent corrections yet.</p>
              )}
              {confirmed > 0 && (
                <p className="mt-1 text-xs text-stone-500">
                  {confirmed} other item type{confirmed > 1 ? "s" : ""} confirmed about right.
                </p>
              )}
            </div>
          )}
          {scopes.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Whole-job correction</p>
              <ul className="mt-1 divide-y divide-stone-100">
                {scopes.map(([scope, c]) => (
                  <li key={scope} className="flex justify-between gap-3 py-1.5">
                    <span>{scopeLabel[scope as keyof typeof scopeLabel]}</span>
                    <span className="text-stone-500 tabular-nums">
                      {c!.pct > 0 ? "+" : ""}
                      {c!.pct}% · {c!.owners} owners
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-stone-500">
            {settings.learning.useNetwork
              ? "New quotes use these automatically. Item sizes go into the AI's instructions; whole-job corrections adjust the range."
              : "You've turned this off in My rates, so your quotes don't use it."}
          </p>
        </div>
      )}
    </Card>
  );
}

function JobRow({ job }: { job: SavedJob }) {
  const date = new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const quoted = job.sentPrice !== null ? money(job.sentPrice) : moneyRange(job.priceLow, job.priceHigh);
  const o = job.outcome;
  const status = !o ? "Needs feedback" : !o.won ? "Didn't book" : (RATINGS.find((r) => r.value === o.rating)?.label ?? "Logged");
  const rate = (rating: JobRating) =>
    logOutcome(job, { won: true, rating, actualCubicYards: o?.actualCubicYards ?? null, finalPrice: o?.finalPrice ?? null, dumpWeightLbs: o?.dumpWeightLbs ?? null });

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">
            {job.customerName || "Customer"} · {date}
          </p>
          <p className="line-clamp-2 text-xs text-stone-500">{job.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">{quoted}</p>
          <p className={`text-xs ${o ? "text-emerald-700" : "text-amber-700"}`}>{status}</p>
        </div>
      </div>

      <p className="mt-3 mb-1.5 text-xs font-medium text-stone-600">How did the job compare to the estimate?</p>
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="How did the job compare to the estimate?">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={o?.won === true && o.rating === r.value}
            onClick={() => rate(r.value)}
            className={`rounded-lg border px-1 py-2 text-xs leading-tight font-medium ${
              o?.won && o.rating === r.value
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-stone-300 bg-white text-stone-700 active:bg-stone-100"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <details className="group mt-2">
        <summary className="cursor-pointer py-1 text-xs font-semibold text-orange-700">More detail: exact size, price, dump ticket</summary>
        <OutcomeForm job={job} />
      </details>
    </li>
  );
}

function OutcomeForm({ job }: { job: SavedJob }) {
  const [draft, setDraft] = useState<JobOutcome>(
    job.outcome ?? { won: true, rating: null, actualCubicYards: null, finalPrice: null, dumpWeightLbs: null },
  );
  const capacity = job.trailerCubicYards || 1;
  const set = (patch: Partial<JobOutcome>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-stone-500">
        The AI estimated {formatFraction(job.aiCubicYards / capacity)} of a trailer ({Math.round(job.aiCubicYards * 10) / 10} yd³)
        {Math.abs(job.quotedCubicYards - job.aiCubicYards) > 0.05 &&
          `; you quoted on ${Math.round(job.quotedCubicYards * 10) / 10} yd³`}
        .
      </p>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Actual load"
          value={(draft.actualCubicYards ?? 0) / capacity}
          format={(f) => (f > 0 ? formatFraction(f) : "")}
          parse={parseFraction}
          inputMode="text"
          onChange={(f) => set({ actualCubicYards: Math.round(f * capacity * 100) / 100 })}
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
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className={buttonClass.primary} onClick={() => logOutcome(job, { ...draft, won: true })}>
          Save
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          onClick={() => logOutcome(job, { won: false, rating: null, actualCubicYards: null, finalPrice: null, dumpWeightLbs: null })}
        >
          Didn&apos;t book
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
