"use client";

import { useMemo, useRef, useState } from "react";
import { MAX_PHOTOS } from "@/lib/ai/limits";
import { postJson } from "@/lib/client/api";
import { sendFeedback, toFeedbackLines } from "@/lib/client/feedback";
import { saveJob } from "@/lib/client/jobsStore";
import { preparePhoto, type Photo } from "@/lib/client/photos";
import { useSettings } from "@/lib/client/settingsStore";
import { DEFAULT_DETAILS, trailerCubicYards } from "@/lib/pricing/defaults";
import { computeQuote, rangeFactors, sortedTiers, unseenPctFor } from "@/lib/pricing/engine";
import { scaleLoadTo } from "@/lib/pricing/estimate";
import { buildPhotoRequestMessage, buildQuoteMessage, type QuoteStyle } from "@/lib/pricing/message";
import type { JobDetails, JobEstimate, Quote, Settings } from "@/lib/pricing/types";
import { ItemsEditor } from "./ItemsEditor";
import {
  buttonClass,
  Card,
  money,
  moneyRange,
  NumberField,
  Segmented,
  Stepper,
  TextArea,
  TextField,
  Toggle,
} from "./ui";

export function QuoteFlow() {
  const settings = useSettings();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState<JobDetails>(DEFAULT_DETAILS);
  const [estimate, setEstimate] = useState<JobEstimate | null>(null);
  const [aiEstimate, setAiEstimate] = useState<JobEstimate | null>(null);
  const [quoteId, setQuoteId] = useState("");
  const [demo, setDemo] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [busy, setBusy] = useState<"photos" | "analyzing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const quote = useMemo(
    () => (estimate ? computeQuote(settings, estimate, details) : null),
    [settings, estimate, details],
  );
  const setDetail = <K extends keyof JobDetails>(key: K, value: JobDetails[K]) =>
    setDetails((d) => ({ ...d, [key]: value }));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy("photos");
    try {
      const room = MAX_PHOTOS - photos.length;
      const prepared = await Promise.all(Array.from(files).slice(0, room).map(preparePhoto));
      setPhotos((p) => [...p, ...prepared]);
      if (files.length > room) setError(`Only ${MAX_PHOTOS} photos per quote, so the first ${room} were kept.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function analyze() {
    setError(null);
    setBusy("analyzing");
    try {
      const res = await postJson<{ estimate: JobEstimate; demo?: boolean }>("/api/analyze", {
        photos: photos.map(({ mediaType, data }) => ({ mediaType, data })),
        customerNotes: notes,
        trailer: { name: settings.trailer.name, cubicYards: Math.round(trailerCubicYards(settings.trailer) * 10) / 10 },
        itemFees: settings.itemFees.map(({ id, name, hint, pricing }) => ({ id, name, hint, pricing })),
        prohibitedItems: settings.prohibitedItems,
      });
      setEstimate(res.estimate);
      setAiEstimate(res.estimate);
      setQuoteId(crypto.randomUUID());
      setDemo(Boolean(res.demo));
      setDetails((d) => ({ ...d, stairsFlights: null, unseenPct: null }));
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setPhotos([]);
    setNotes("");
    setDetails(DEFAULT_DETAILS);
    setEstimate(null);
    setAiEstimate(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Save the sent quote to Jobs and, if the owner shares data, send the AI's guess next to their corrections. */
  function recordSent(sentPrice: number | null) {
    if (!estimate || !quote || !aiEstimate) return;
    const totalCy = (e: JobEstimate) => e.lines.reduce((s, l) => s + l.cubicYards, 0);
    const shared = settings.learning.shareData;
    saveJob({
      id: quoteId,
      createdAt: new Date().toISOString(),
      customerName: details.customerName,
      summary: estimate.summary,
      priceLow: quote.total.low,
      priceHigh: quote.total.high,
      sentPrice,
      aiCubicYards: totalCy(aiEstimate),
      quotedCubicYards: totalCy(estimate),
      trailerCubicYards: trailerCubicYards(settings.trailer),
      calibrationPct: quote.volume.calibrationPct,
      shared,
      outcome: null,
    });
    if (shared) {
      sendFeedback({
        id: quoteId,
        quote: {
          scope: aiEstimate.scope,
          confidence: aiEstimate.confidence,
          trailerCubicYards: trailerCubicYards(settings.trailer),
          aiLines: toFeedbackLines(aiEstimate.lines),
          sentLines: toFeedbackLines(estimate.lines),
          calibrationPct: quote.volume.calibrationPct,
        },
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[32px] leading-none font-bold tracking-[-0.015em]">New quote</h1>
        <button
          type="button"
          aria-expanded={askOpen}
          onClick={() => setAskOpen((o) => !o)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 text-sm font-bold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h16v11H8l-4 4z" />
          </svg>
          Ask for photos
        </button>
      </div>
      {askOpen && <PhotoRequest settings={settings} />}

      <Card title="Customer photos" subtitle="Add the pictures your customer sent. More angles = better estimate.">
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-[14px] bg-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
              <img src={p.previewUrl} alt={`Customer photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}
                className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-stone-900/75 text-stone-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy !== null}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-stone-400 text-stone-600 active:bg-stone-50"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <path d="M12 10v6M9 13h6" />
              </svg>
              <span className="text-[13px] font-semibold">{busy === "photos" ? "Loading…" : "Add photos"}</span>
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
      </Card>

      <Card title="Job details">
        <div className="space-y-3">
          <TextArea
            label="What the customer said"
            placeholder="e.g. Everything in the garage plus a mattress upstairs. Easy driveway access."
            value={notes}
            onChange={setNotes}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Customer name"
              placeholder="Optional"
              value={details.customerName}
              onChange={(v) => setDetail("customerName", v)}
            />
            <NumberField
              label="Distance"
              suffix="mi"
              value={details.distanceMiles}
              onChange={(v) => setDetail("distanceMiles", v)}
              hint="One way from your base"
            />
            <NumberField
              label="Carry from truck"
              suffix="ft"
              value={details.carryFeet}
              onChange={(v) => setDetail("carryFeet", v)}
              hint={`First ${settings.charges.freeCarryFeet} ft included`}
            />
          </div>
          <details className="rounded-[14px] border border-stone-300 bg-white px-3.5 py-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-1.5">
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">Job options</span>
                <span className="text-[13px] text-stone-500">Same-day, after-hours, paid lead</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </summary>
            <div className="divide-y divide-stone-200">
              <Toggle
                label="Same-day service"
                hint={`+${money(settings.charges.sameDayFee)}`}
                checked={details.sameDay}
                onChange={(v) => setDetail("sameDay", v)}
              />
              <Toggle
                label="After-hours or weekend"
                hint={`+${settings.charges.afterHoursPct}%`}
                checked={details.afterHours}
                onChange={(v) => setDetail("afterHours", v)}
              />
              <Toggle
                label="Packed rooms / heavy sorting"
                hint={`Hoarder-style jobs, +${settings.charges.hoarderPct}%`}
                checked={details.hoarder}
                onChange={(v) => setDetail("hoarder", v)}
              />
              <Toggle
                label="Came from a paid lead"
                hint="Counts marketing cost in the profit check"
                checked={details.paidLead}
                onChange={(v) => setDetail("paidLead", v)}
              />
              <Toggle
                label="Shares a dump run with other jobs"
                hint="Small jobs on the same trip split the dump time"
                checked={details.sharedDumpRun}
                onChange={(v) => setDetail("sharedDumpRun", v)}
              />
            </div>
          </details>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        className={`${buttonClass.primary} min-h-[60px] w-full rounded-2xl text-lg`}
        disabled={photos.length === 0 || busy !== null}
        onClick={analyze}
      >
        {busy === "analyzing" ? (
          <>
            <Spinner /> Sizing up the job…
          </>
        ) : estimate ? (
          "Re-analyze photos"
        ) : (
          "Price this job"
        )}
      </button>
      {busy === "analyzing" && <p className="text-center text-sm text-stone-500">Usually takes 15–40 seconds.</p>}

      {estimate && quote && (
        <div ref={resultsRef} className="scroll-mt-20 space-y-4 pt-2">
          <PriceHero quote={quote} estimate={estimate} settings={settings} customerName={details.customerName} demo={demo} />
          {quote.warnings.length > 0 && <Warnings warnings={quote.warnings} />}
          <WhatWeSaw estimate={estimate} />
          <ItemsEditor
            settings={settings}
            estimate={estimate}
            onChange={setEstimate}
            onReset={
              aiEstimate
                ? () => {
                    setEstimate(aiEstimate);
                    setDetails((d) => ({ ...d, stairsFlights: null, unseenPct: null }));
                  }
                : undefined
            }
          />
          <Adjust settings={settings} estimate={estimate} onChange={setEstimate} details={details} onDetailsChange={setDetails} />
          <Breakdown quote={quote} settings={settings} />
          <CustomerMessage
            settings={settings}
            estimate={estimate}
            details={details}
            quote={quote}
            onSent={recordSent}
          />
          <button type="button" className={`${buttonClass.secondary} w-full`} onClick={reset}>
            Start a new quote
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />;
}

function CopyButton({ text, label = "Copy", onCopied }: { text: string; label?: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass.primary}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          onCopied?.();
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the text is still selectable in the box.
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function PhotoRequest({ settings }: { settings: Settings }) {
  const message = buildPhotoRequestMessage(settings);
  return (
    <section className="rounded-[20px] border border-stone-200 bg-white p-4">
      <h2 className="font-display text-xl font-bold">Text this to your customer</h2>
      <p className="mt-1 text-sm text-stone-600">
        Good photos and answers up front make the price hold on site. Edit the questions in My rates.
      </p>
      <pre className="mt-3 rounded-xl bg-stone-50 p-3 font-sans text-sm whitespace-pre-wrap text-stone-800">{message}</pre>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <CopyButton text={message} />
        <a className={buttonClass.secondary} href={`sms:?&body=${encodeURIComponent(message)}`}>
          Text it
        </a>
      </div>
    </section>
  );
}

const confidenceStyle = {
  high: "bg-[#ddf3e4] text-[#14532d]",
  medium: "bg-stone-100 text-stone-900",
  low: "bg-amber-200 text-amber-950",
};

function PriceHero({
  quote,
  estimate,
  settings,
  customerName,
  demo,
}: {
  quote: Quote;
  estimate: JobEstimate;
  settings: Settings;
  customerName: string;
  demo: boolean;
}) {
  const capacity = trailerCubicYards(settings.trailer);
  const fillLow = Math.min(1, quote.volume.totalCubicYards.low / capacity);
  const fillHigh = Math.min(1, quote.volume.totalCubicYards.high / capacity);
  const range = quote.total.low !== quote.total.high;
  const notes = [
    quote.volume.loads > 1 ? `About ${quote.volume.loads} trailer loads` : "",
    quote.volume.unseenPct > 0 ? `Includes +${quote.volume.unseenPct}% for things not in the photos` : "",
    quote.volume.calibrationPct !== 0
      ? `${quote.volume.calibrationPct > 0 ? "+" : ""}${quote.volume.calibrationPct}% learned from ${
          quote.volume.calibrationSource === "owner" ? "your" : "all owners'"
        } past jobs`
      : "",
    quote.minimumApplied ? "Raised to your minimum charge" : "",
  ].filter(Boolean);

  return (
    <section className="rounded-[22px] bg-stone-900 p-5 text-stone-100">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-stone-400">{customerName.trim() ? `Quote for ${customerName.trim()}` : "Quote"}</span>
        <div className="flex gap-1.5">
          {demo && <span className="rounded-full bg-sky-200 px-2.5 py-0.5 text-xs font-bold text-sky-950">Demo data</span>}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${confidenceStyle[estimate.confidence]}`}>
            {estimate.confidence[0].toUpperCase() + estimate.confidence.slice(1)} confidence
          </span>
        </div>
      </div>
      <p className="mt-1 text-[40px] leading-tight font-bold tracking-tight tabular-nums">
        {moneyRange(quote.total.low, quote.total.high)}
      </p>
      <p className="text-sm text-stone-300">
        {quote.volume.tierLabel || "Flat-rate items only"}
        {range && `, middle of the range ${money(quote.suggested)}`}
      </p>
      <div className="mt-4">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-stone-700" aria-hidden>
          <div className="absolute inset-y-0 left-0 bg-accent/45" style={{ width: `${fillHigh * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${fillLow * 100}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-stone-400">
          Trailer space {pct(quote.volume.totalCubicYards.low / capacity)}–{pct(quote.volume.totalCubicYards.high / capacity)}
        </p>
        {notes.map((n) => (
          <p key={n} className="text-xs text-stone-400">
            {n}
          </p>
        ))}
      </div>
    </section>
  );
}

const pct = (f: number) => `${Math.round(f * 100)}%`;

function Warnings({ warnings }: { warnings: string[] }) {
  return (
    <section className="rounded-[20px] border border-[#f0c36b] bg-[#fff1d6] p-4 text-[#4d3300]">
      <h2 className="mb-2 font-display text-lg font-bold">Heads up</h2>
      <ul className="space-y-2 text-sm leading-snug">
        {warnings.map((w) => (
          <li key={w} className="flex gap-2">
            <svg className="mt-px flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4l9 16H3z" />
              <path d="M12 10v4M12 17v.5" />
            </svg>
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WhatWeSaw({ estimate }: { estimate: JobEstimate }) {
  return (
    <Card title="What the AI saw">
      <p className="text-sm text-stone-700">{estimate.summary}</p>
      {estimate.accessNotes && <p className="mt-2 text-sm text-stone-500">Access: {estimate.accessNotes}</p>}
      {estimate.questionsForCustomer.length > 0 && (
        <div className="mt-3 rounded-lg bg-stone-50 p-3">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Worth asking the customer</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-stone-700">
            {estimate.questionsForCustomer.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Adjust({
  settings,
  estimate,
  onChange,
  details,
  onDetailsChange,
}: {
  settings: Settings;
  estimate: JobEstimate;
  onChange: (e: JobEstimate) => void;
  details: JobDetails;
  onDetailsChange: (d: JobDetails) => void;
}) {
  const capacity = trailerCubicYards(settings.trailer);
  const auto = unseenPctFor(settings, estimate, { ...details, unseenPct: null });
  const cushion = details.unseenPct === null ? "auto" : String(details.unseenPct);

  return (
    <Card title="Adjust the job" subtitle="Quick fixes. The price updates as you go.">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">It&apos;s really about…</p>
          <div className="flex flex-wrap gap-2">
            {sortedTiers(settings.loadTiers).map((t) => (
              <button
                key={t.id}
                type="button"
                className="min-h-11 rounded-full border border-stone-300 bg-white px-3.5 text-sm font-semibold text-stone-900 active:bg-stone-100"
                // The tier tapped becomes the top of the range, so the quote reads as that load size.
                onClick={() =>
                  onChange(scaleLoadTo(estimate, settings, (t.fraction * capacity) / rangeFactors(settings, estimate, details).high))
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Sets the top of the range to that load and resizes everything priced by the load. Flat-rate items stay as they are.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-900">Flights of stairs</p>
            <p className="text-xs text-stone-500">{details.stairsFlights === null ? "AI's read from the photos" : "Set by you"}</p>
          </div>
          <Stepper
            label="flights of stairs"
            value={details.stairsFlights ?? estimate.stairsFlights}
            onChange={(stairsFlights) => onDetailsChange({ ...details, stairsFlights })}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">Cushion for things not in the photos</p>
          <Segmented
            label="Cushion for unseen items"
            value={cushion}
            onChange={(v) => onDetailsChange({ ...details, unseenPct: v === "auto" ? null : Number(v) })}
            options={[
              { value: "auto", label: `Auto (${auto}%)` },
              { value: "0", label: "None" },
              { value: "10", label: "10%" },
              { value: "20", label: "20%" },
            ]}
          />
          <p className="mt-1 text-xs text-stone-500">Raises the top of the range only. Auto uses more for multi-room jobs and unclear photos.</p>
        </div>

        {estimate.prohibitedItems.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-stone-700">Flagged as prohibited</p>
            <ul className="space-y-1.5">
              {estimate.prohibitedItems.map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2">
                  <span className="text-sm text-red-900">{p.name}</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-700"
                    onClick={() =>
                      onChange({ ...estimate, prohibitedItems: estimate.prohibitedItems.filter((_, j) => j !== i) })
                    }
                  >
                    Not an issue
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function Breakdown({ quote, settings }: { quote: Quote; settings: Settings }) {
  const row = "flex justify-between gap-3 py-1.5 text-sm";
  const { costs } = settings;
  return (
    <Card title="Price breakdown">
      <ul className="divide-y divide-stone-100">
        {quote.lines.map((l, i) => (
          <li key={`${l.label}-${i}`} className={row}>
            <div className="min-w-0">
              <p className="text-stone-900">{l.label}</p>
              <p className="text-xs text-stone-500">{l.detail}</p>
            </div>
            <span className="whitespace-nowrap tabular-nums">{moneyRange(l.amount.low, l.amount.high)}</span>
          </li>
        ))}
        {quote.minimumApplied && (
          <li className={row}>
            <span className="text-stone-600">Raised to your minimum charge</span>
            <span className="tabular-nums">{money(settings.charges.minimumCharge)}</span>
          </li>
        )}
        <li className={`${row} font-semibold`}>
          <span>Total (rounded to $5)</span>
          <span className="tabular-nums">{moneyRange(quote.total.low, quote.total.high)}</span>
        </li>
      </ul>

      <details className="mt-4 rounded-xl bg-stone-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-stone-800">
          Profit check: {moneyRange(quote.profit.low, quote.profit.high)} ({Math.round(quote.margin.low)}–
          {Math.round(quote.margin.high)}%)
        </summary>
        <ul className="mt-2 divide-y divide-stone-200 text-sm">
          <CostRow
            label={costs.dumpFeeMethod === "per_ton" ? "Dump fees (by weight)" : "Dump fees (by volume)"}
            value={quote.cost.dump}
          />
          <CostRow
            label={`Crew: ${costs.crewSize} × ${hoursText(quote.truckHours)} incl. drive & dump run`}
            value={quote.cost.labor}
          />
          <CostRow label="Truck & fuel" value={quote.cost.vehicle} />
          {quote.cost.disposal > 0 && <CostRow label="Item disposal fees" value={quote.cost.disposal} />}
          <CostRow label={`Card fees (${costs.cardFeePct}%)`} value={quote.cost.cardFees} />
          <CostRow label="Overhead" value={quote.cost.overhead} />
          {quote.cost.marketing > 0 && <CostRow label="Marketing (paid lead)" value={quote.cost.marketing} />}
          <li className="flex justify-between py-1.5 font-semibold">
            <span>Your cost</span>
            <span className="tabular-nums">{moneyRange(quote.cost.total.low, quote.cost.total.high)}</span>
          </li>
          <li className="flex justify-between py-1.5">
            <span className="text-stone-700">Revenue per truck-hour</span>
            <span className="tabular-nums">
              {moneyRange(quote.revenuePerTruckHour.low, quote.revenuePerTruckHour.high)}
            </span>
          </li>
        </ul>
        <p className="mt-2 text-xs text-stone-500">
          Based on the costs in My rates. Targets: {costs.targetMarginPct}% margin, {money(costs.targetRevenuePerTruckHour)} per
          truck-hour.
        </p>
      </details>
    </Card>
  );
}

const hoursText = (r: { low: number; high: number }) => {
  const f = (n: number) => (Math.round(n * 10) / 10).toString();
  return f(r.low) === f(r.high) ? `${f(r.low)} h` : `${f(r.low)}–${f(r.high)} h`;
};

function CostRow({ label, value }: { label: string; value: number | { low: number; high: number } }) {
  const r = typeof value === "number" ? { low: value, high: value } : value;
  return (
    <li className="flex justify-between gap-3 py-1.5">
      <span className="text-stone-700">{label}</span>
      <span className="whitespace-nowrap tabular-nums">{moneyRange(r.low, r.high)}</span>
    </li>
  );
}

function CustomerMessage({
  settings,
  estimate,
  details,
  quote,
  onSent,
}: {
  settings: Settings;
  estimate: JobEstimate;
  details: JobDetails;
  quote: Quote;
  onSent: (sentPrice: number | null) => void;
}) {
  const [style, setStyle] = useState<QuoteStyle>("range");
  const [price, setPrice] = useState<number | null>(null);
  // Hand edits stick until the generated message changes underneath them.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);

  const singlePrice = price ?? quote.suggested;
  const generated = buildQuoteMessage(settings, estimate, details, quote, style, singlePrice);
  const message = edit?.base === generated ? edit.text : generated;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const sent = () => onSent(style === "single" ? singlePrice : null);

  return (
    <Card title="Send the quote" subtitle="Edit anything before sending. Sent quotes are saved under Jobs.">
      <div className="space-y-3">
        <Segmented
          label="Quote style"
          value={style}
          onChange={setStyle}
          options={[
            { value: "range", label: "Price range" },
            { value: "single", label: "Single price" },
          ]}
        />
        {style === "single" && (
          <NumberField label="Price to quote" prefix="$" value={singlePrice} onChange={setPrice} inputMode="numeric" />
        )}
        <TextArea label="Message" value={message} onChange={(text) => setEdit({ base: generated, text })} rows={9} />
        <div className="grid grid-cols-2 gap-2">
          <CopyButton text={message} onCopied={sent} />
          {canShare ? (
            <button
              type="button"
              className={buttonClass.secondary}
              onClick={() =>
                navigator
                  .share({ text: message })
                  .then(sent)
                  .catch(() => {})
              }
            >
              Share…
            </button>
          ) : (
            <a className={buttonClass.secondary} href={`sms:?&body=${encodeURIComponent(message)}`} onClick={sent}>
              Text it
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
