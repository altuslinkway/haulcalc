"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { sendFeedback } from "@/lib/client/feedback";
import { deleteJob, updateJob, useJobs, type JobOutcome, type PaidWith, type SavedJob } from "@/lib/client/jobsStore";
import { saveSettings, useSettings } from "@/lib/client/settingsStore";
import {
  jobKept,
  jobRevenue,
  monthKey,
  monthName,
  monthsWithJobs,
  PAID_WITH,
  quotedPrice,
  shiftMonth,
  summarizeMonth,
  type JobStatus,
} from "@/lib/jobs/jobs";
import type { JobRating, LearnedModel } from "@/lib/learning/learn";
import { categoryById } from "@/lib/pricing/categories";
import { calibrate, MIN_JOBS_FOR_CALIBRATION } from "@/lib/pricing/calibration";
import { buildThankYouMessage, smsHref } from "@/lib/pricing/message";
import type { Settings } from "@/lib/pricing/types";
import { buttonClass, Card, money, moneyRange, NumberField, PageTitle } from "./ui";

/** Save the outcome and, if this job was shared, add it to what all owners' quotes learn from. */
function logOutcome(job: SavedJob, outcome: JobOutcome, patch: Partial<SavedJob>) {
  updateJob(job.id, { ...patch, outcome });
  if (job.shared) {
    const { won, rating, actualCubicYards, dumpWeightLbs } = outcome;
    sendFeedback({ id: job.id, outcome: { won, rating, actualCubicYards, dumpWeightLbs } });
  }
}

const NO_OUTCOME = { rating: null, actualCubicYards: null, finalPrice: null, dumpWeightLbs: null };

type Filter = "all" | Exclude<JobStatus, "lost">;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "quoted", label: "Quoted" },
  { value: "booked", label: "Booked" },
  { value: "done", label: "Done" },
];

export function JobsList() {
  const jobs = useJobs();
  const settings = useSettings();
  const [filter, setFilter] = useState<Filter>("all");
  const [finishing, setFinishing] = useState<string | null>(null);
  const shown = jobs.filter((j) => filter === "all" || j.status === filter);
  const finishingJob = jobs.find((j) => j.id === finishing);

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Quotes you've sent" title="Jobs." />

      <MoneyHero jobs={jobs} />

      {jobs.length > 0 && (
        <div role="tablist" aria-label="Show" className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => {
            const count = f.value === "all" ? jobs.length : jobs.filter((j) => j.status === f.value).length;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm font-bold ${
                  filter === f.value ? "bg-stone-900 text-stone-100" : "border border-stone-300 bg-white text-stone-700"
                }`}
              >
                {f.label} <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">
          Quotes show up here when you text or copy them. Mark them booked and done to see what you make each month.
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">Nothing here right now.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((job) => (
            <JobCard key={job.id} job={job} settings={settings} onFinish={() => setFinishing(job.id)} />
          ))}
        </ul>
      )}

      <YourAccuracy jobs={jobs} settings={settings} />
      <NetworkLearning settings={settings} />

      {finishingJob && <DoneSheet key={finishingJob.id} job={finishingJob} onClose={() => setFinishing(null)} />}
    </div>
  );
}

const noSubscribe = () => () => {};

/** This month on the phone's clock. Unknown while the page is prerendered, so nothing reads the time then. */
function useThisMonth(): string | null {
  return useSyncExternalStore(noSubscribe, () => monthKey(new Date()), () => null);
}

function MoneyHero({ jobs }: { jobs: SavedJob[] }) {
  const current = useThisMonth();
  const [picked, setPicked] = useState<string | null>(null);
  if (!current) return <section className="h-[244px] rounded-3xl bg-stone-900" aria-hidden />;
  const month = picked ?? current;
  const setMonth = setPicked;
  const months = monthsWithJobs(jobs, current);
  const sum = summarizeMonth(jobs, month);
  const arrow = "flex h-11 w-11 items-center justify-center rounded-xl border border-stone-700 disabled:opacity-30";

  return (
    <section className="rounded-3xl bg-stone-900 p-5 text-stone-100" aria-label="Money made">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          className={arrow}
          disabled={month <= months[months.length - 1]}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <p className="text-xs font-bold tracking-[0.12em] text-stone-400 uppercase">{monthName(month)}</p>
        <button type="button" aria-label="Next month" className={arrow} disabled={month >= current} onClick={() => setMonth(shiftMonth(month, 1))}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <div className="mt-2 text-center">
        <p className="font-display text-[56px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{money(sum.made)}</p>
        <p className="mt-1 text-[15px] text-stone-300">
          {sum.jobs === 0 ? "No jobs marked done yet" : `made from ${sum.jobs} job${sum.jobs === 1 ? "" : "s"}`}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="You kept" value={money(sum.kept)} />
        <Stat label="Dump fees" value={money(sum.dumpFees)} />
        <Stat label={sum.bookedJobs === 1 ? "1 booked" : `${sum.bookedJobs} booked`} value={money(sum.booked)} accent />
      </div>
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-stone-800 px-3 py-2.5">
      <p className="text-xs text-stone-400">{label}</p>
      <p className={`text-lg font-extrabold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

const STATUS: Record<JobStatus, { label: string; className: string }> = {
  quoted: { label: "Quoted", className: "bg-stone-200 text-stone-800" },
  booked: { label: "Booked", className: "border border-accent-line bg-accent-soft text-accent-deep" },
  done: { label: "Done", className: "bg-[#e8f5ec] text-[#14532d]" },
  lost: { label: "Didn't book", className: "bg-stone-100 text-stone-500" },
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const dayDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function JobCard({ job, settings, onFinish }: { job: SavedJob; settings: Settings; onFinish: () => void }) {
  const status = STATUS[job.status];
  const price = job.status === "done" ? money(jobRevenue(job)) : job.sentPrice !== null ? money(job.sentPrice) : moneyRange(job.priceLow, job.priceHigh);
  const paidLabel = PAID_WITH.find((p) => p.value === job.paidWith)?.label;
  const when =
    job.status === "done" && job.doneAt
      ? `Done ${shortDate(job.doneAt)}${job.paidWith ? (job.paidWith === "unpaid" ? ", not paid yet" : `, paid by ${paidLabel?.toLowerCase()}`) : ""}`
      : job.status === "booked" && job.jobDate
        ? `Booked for ${dayDate(job.jobDate)}`
        : `Quoted ${shortDate(job.createdAt)}`;
  const thanks = buildThankYouMessage(settings, job.customerName, jobRevenue(job), job.paidWith !== null && job.paidWith !== "unpaid");
  const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-900 px-3 text-sm font-bold text-stone-100";
  const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700";

  return (
    <li className={`rounded-[20px] border border-stone-200 bg-white p-4 ${job.status === "lost" ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-stone-900">{job.customerName || "Customer"}</p>
          <p className="line-clamp-2 text-[13px] text-stone-500">{job.summary}</p>
          <p className="mt-0.5 text-[13px] text-stone-600">{when}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-base font-extrabold tabular-nums">{price}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${status.className}`}>{status.label}</span>
        </div>
      </div>

      {job.status === "booked" && (
        <label className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold text-stone-700">
          Job day
          <input
            type="date"
            value={job.jobDate ?? ""}
            onChange={(e) => updateJob(job.id, { jobDate: e.target.value || null })}
            className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900"
          />
        </label>
      )}

      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        {job.status === "quoted" && (
          <>
            <button type="button" className={primary} onClick={() => updateJob(job.id, { status: "booked" })}>
              They booked
            </button>
            <button
              type="button"
              className={secondary}
              onClick={() => logOutcome(job, { won: false, ...NO_OUTCOME }, { status: "lost" })}
            >
              Didn&apos;t book
            </button>
          </>
        )}
        {job.status === "booked" && (
          <>
            <button type="button" className={primary} onClick={onFinish}>
              Mark done
            </button>
            <button
              type="button"
              className={secondary}
              onClick={() => logOutcome(job, { won: false, ...NO_OUTCOME }, { status: "lost", jobDate: null })}
            >
              Didn&apos;t happen
            </button>
          </>
        )}
        {job.status === "done" && (
          <>
            <a className={primary} href={smsHref(job.customerPhone, thanks)}>
              Send thank-you
            </a>
            <button type="button" className={secondary} onClick={onFinish}>
              Edit
            </button>
          </>
        )}
        {job.status === "lost" && (
          <button
            type="button"
            className={`${secondary} col-span-2`}
            onClick={() => updateJob(job.id, { status: "quoted", outcome: null })}
          >
            Undo
          </button>
        )}
        <button
          type="button"
          aria-label={`Delete ${job.customerName || "this"} job`}
          className="flex min-h-11 w-11 items-center justify-center rounded-xl text-stone-500 active:bg-stone-100"
          onClick={() => {
            if (window.confirm("Delete this job?")) deleteJob(job.id);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
          </svg>
        </button>
      </div>
    </li>
  );
}

const SIZE_RATINGS: { value: JobRating; label: string }[] = [
  { value: "smaller", label: "Smaller" },
  { value: "about_right", label: "About right" },
  { value: "bigger", label: "Bigger" },
];

/** After the job: what you charged, how you were paid, the dump fee, and (for photo quotes) how big it really was. */
function DoneSheet({ job, onClose }: { job: SavedJob; onClose: () => void }) {
  const [price, setPrice] = useState(job.finalPrice ?? quotedPrice(job));
  const [paidWith, setPaidWith] = useState<PaidWith | null>(job.paidWith);
  const [dumpFee, setDumpFee] = useState<number | null>(job.dumpFeePaid);
  const [rating, setRating] = useState<JobRating | null>(job.outcome?.rating ?? null);
  const kept = jobKept(job, price, dumpFee);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    logOutcome(
      job,
      { won: true, rating, actualCubicYards: null, finalPrice: price, dumpWeightLbs: null },
      {
        status: "done",
        doneAt: job.doneAt ?? new Date().toISOString(),
        finalPrice: price,
        paidWith,
        dumpFeePaid: dumpFee,
      },
    );
    onClose();
  }

  const chip = (on: boolean) =>
    `min-h-12 rounded-xl px-1 text-sm font-bold ${on ? "bg-stone-900 text-stone-100" : "border border-stone-300 bg-stone-50 text-stone-700"}`;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-stone-900/50" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Job done: ${job.customerName || "customer"}`}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-stone-300" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-stone-500 uppercase">Job done</p>
            <h2 className="font-display text-[30px] leading-none font-extrabold">{job.customerName || "Customer"}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <NumberField
            big
            label="What did you charge?"
            prefix="$"
            value={price}
            onChange={setPrice}
            inputMode="numeric"
            hint={`You quoted ${job.sentPrice !== null ? money(job.sentPrice) : moneyRange(job.priceLow, job.priceHigh)}`}
          />

          <div>
            <p className="mb-1.5 text-sm font-semibold text-stone-700">Paid with</p>
            <div role="radiogroup" aria-label="Paid with" className="grid grid-cols-4 gap-1.5">
              {PAID_WITH.map((p) => (
                <button key={p.value} type="button" role="radio" aria-checked={paidWith === p.value} onClick={() => setPaidWith(p.value)} className={chip(paidWith === p.value)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <NumberField
            label="Dump fee you paid"
            prefix="$"
            value={dumpFee ?? 0}
            format={(n) => (n > 0 ? String(n) : "")}
            onChange={(n) => setDumpFee(n > 0 ? n : null)}
            hint={`Optional. Leave it blank to use your rough ${money(job.estCosts.dump)}.`}
          />

          {job.source === "photos" && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-stone-700">How big was it, compared to the quote?</p>
              <div role="radiogroup" aria-label="Size compared to the quote" className="grid grid-cols-3 gap-1.5">
                {SIZE_RATINGS.map((r) => (
                  <button key={r.value} type="button" role="radio" aria-checked={rating === r.value} onClick={() => setRating(r.value)} className={chip(rating === r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-stone-500">Optional. This is how estimates get better.</p>
            </div>
          )}

          <button type="button" className={`${buttonClass.primary} min-h-14 w-full text-lg`} onClick={save}>
            Save. You kept about {money(kept)}
          </button>
        </div>
      </section>
    </div>
  );
}

function YourAccuracy({ jobs, settings }: { jobs: SavedJob[]; settings: Settings }) {
  const own = calibrate(
    jobs
      .filter((j) => j.source === "photos" && j.outcome?.won)
      .map((j) => ({
        aiCubicYards: j.aiCubicYards,
        quotedCubicYards: j.quotedCubicYards,
        calibrationPct: j.calibrationPct ?? 0,
        actualCubicYards: j.outcome!.actualCubicYards,
        rating: j.outcome!.rating,
        dumpWeightLbs: j.outcome!.dumpWeightLbs,
      })),
  );
  const current = settings.calibrationPct;
  const setCalibration = (pct: number | null) => saveSettings({ ...settings, calibrationPct: pct });
  if (own.jobs === 0 && current === null) return null;

  return (
    <Card title="Your estimates">
      {own.jobs > 0 && (
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            {own.jobs} finished job{own.jobs > 1 ? "s" : ""} rated.
            {own.suggestedPct === null
              ? ` Rate ${MIN_JOBS_FOR_CALIBRATION - own.jobs} more to see a pattern.`
              : own.suggestedPct === 0
                ? " Your jobs have come in about as estimated."
                : ` Your jobs have run about ${Math.abs(own.suggestedPct)}% ${own.suggestedPct > 0 ? "bigger" : "smaller"} than estimated.`}
          </p>
          {own.suggestedPct !== null && own.suggestedPct !== current && (
            <button type="button" className={`${buttonClass.primary} w-full`} onClick={() => setCalibration(own.suggestedPct)}>
              Use my own {own.suggestedPct > 0 ? "+" : ""}
              {own.suggestedPct}% correction
            </button>
          )}
        </div>
      )}
      {current !== null && (
        <p className={`text-xs text-stone-500 ${own.jobs > 0 ? "mt-2" : ""}`}>
          Applying your own {current > 0 ? "+" : ""}
          {current}% correction to new quotes.{" "}
          <button type="button" className="font-bold text-accent-deep" onClick={() => setCalibration(null)}>
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

  const scopes = Object.entries(model?.scopeCalibration ?? {});
  // Nothing to show until there's something learned.
  if (!model?.enabled || (model.items.length === 0 && scopes.length === 0)) return null;

  // Small differences are noise; the prompt skips them too.
  const corrected = model.items.filter((i) => Math.abs(i.biasPct) >= 5);
  const confirmed = model.items.length - corrected.length;
  const scopeLabel = { few_items: "Single items", single_area: "One room or pile", multi_area: "Multi-room cleanouts" };
  return (
    <Card
      title="Learning from all owners"
      subtitle={`${plural(model.jobs, "quote")} from ${plural(model.owners, "owner")} so far.`}
    >
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
                      {i.perUnitCubicYards !== null && `${i.perUnitCubicYards} yd³ each, `}
                      AI was {Math.abs(i.biasPct)}% {i.biasPct > 0 ? "low" : "high"}
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
                    {c!.pct}% from {c!.owners} owners
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
    </Card>
  );
}

const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
