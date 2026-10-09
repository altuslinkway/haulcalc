"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { MAX_PHOTOS } from "@/lib/ai/limits";
import { postJson } from "@/lib/client/api";
import { sendFeedback, toFeedbackLines } from "@/lib/client/feedback";
import { saveJob, type SavedJob } from "@/lib/client/jobsStore";
import { preparePhoto, type Photo } from "@/lib/client/photos";
import { useSettings } from "@/lib/client/settingsStore";
import { DEFAULT_DETAILS, TRAILERS } from "@/lib/pricing/defaults";
import { capacityOf, computeQuote, LOAD_SIZES, loadPrice } from "@/lib/pricing/engine";
import { setLoadSize } from "@/lib/pricing/estimate";
import {
  buildPhotoRequestMessage,
  buildQuickQuoteMessage,
  buildQuoteMessage,
  smsHref,
  type QuoteStyle,
} from "@/lib/pricing/message";
import { EMPTY_PICK, quickEstimate, quickSummary, type QuickPick } from "@/lib/pricing/quick";
import type { JobDetails, JobEstimate, Quote, Settings } from "@/lib/pricing/types";
import { ItemsEditor } from "./ItemsEditor";
import { buttonClass, Card, money, moneyRange, NumberField, PageTitle, Segmented, Stepper, TextArea, TextField } from "./ui";

type Mode = "photos" | "quick";

const newId = () => crypto.randomUUID();
const mid = (r: { low: number; high: number }) => Math.round((r.low + r.high) / 2);

/** The parts of a saved job that are the same however it was priced. */
function jobBase(details: JobDetails, quote: Quote): Omit<SavedJob, "id" | "summary" | "source" | "sentPrice" | "aiCubicYards" | "quotedCubicYards" | "calibrationPct" | "shared" | "trailerCubicYards"> {
  return {
    createdAt: new Date().toISOString(),
    customerName: details.customerName.trim(),
    customerPhone: details.customerPhone.trim(),
    priceLow: quote.total.low,
    priceHigh: quote.total.high,
    estCosts: { dump: mid(quote.costs.dump), gas: mid(quote.costs.gas), helpers: mid(quote.costs.helpers) },
    status: "quoted",
    jobDate: null,
    doneAt: null,
    finalPrice: null,
    paidWith: null,
    dumpFeePaid: null,
    outcome: null,
  };
}

export function QuoteFlow() {
  const settings = useSettings();
  const [mode, setMode] = useState<Mode>("photos");
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
  const [pick, setPick] = useState<QuickPick>(EMPTY_PICK);
  // Made when the quick quote is first sent: random ids can't be made while the page is prerendered.
  const quickId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const quote = useMemo(
    () => (estimate ? computeQuote(settings, estimate, details) : null),
    [settings, estimate, details],
  );
  const quick = useMemo(() => {
    const e = quickEstimate(settings, pick);
    return { estimate: e, quote: computeQuote(settings, e, details), what: quickSummary(settings, pick) };
  }, [settings, pick, details]);
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
        trailer: {
          name: TRAILERS.find((t) => t.id === settings.trailer.preset)?.label.toLowerCase() ?? "trailer",
          cubicYards: capacityOf(settings),
        },
        flatItems: settings.flatItems.map(({ id, name }) => ({ id, name })),
        prohibitedItems: settings.prohibitedItems,
      });
      setEstimate(res.estimate);
      setAiEstimate(res.estimate);
      setQuoteId(newId());
      setDemo(Boolean(res.demo));
      setDetails((d) => ({ ...d, stairsFlights: null }));
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
    setPick(EMPTY_PICK);
    quickId.current = null;
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Save the sent quote to Jobs and, if the owner shares data, send the AI's guess next to their corrections. */
  function recordSent(sentPrice: number | null) {
    if (!estimate || !quote || !aiEstimate) return;
    const totalCy = (e: JobEstimate) => e.lines.reduce((s, l) => s + l.cubicYards, 0);
    const shared = settings.learning.shareData;
    saveJob({
      ...jobBase(details, quote),
      id: quoteId,
      summary: estimate.summary,
      source: "photos",
      sentPrice,
      aiCubicYards: totalCy(aiEstimate),
      quotedCubicYards: totalCy(estimate),
      trailerCubicYards: capacityOf(settings),
      calibrationPct: quote.volume.calibrationPct,
      shared,
    });
    if (shared) {
      sendFeedback({
        id: quoteId,
        quote: {
          scope: aiEstimate.scope,
          confidence: aiEstimate.confidence,
          trailerCubicYards: capacityOf(settings),
          aiLines: toFeedbackLines(aiEstimate.lines),
          sentLines: toFeedbackLines(estimate.lines),
          calibrationPct: quote.volume.calibrationPct,
        },
      });
    }
  }

  /** Quick quotes go to Jobs too. There's no AI guess in them, so nothing goes to shared learning. */
  function recordQuickSent(sentPrice: number | null) {
    const cy = quick.estimate.lines.reduce((s, l) => s + l.cubicYards, 0);
    saveJob({
      ...jobBase(details, quick.quote),
      id: (quickId.current ??= newId()),
      summary: `Quick quote: ${quick.what}`,
      source: "quick",
      sentPrice,
      aiCubicYards: 0,
      quotedCubicYards: cy,
      trailerCubicYards: capacityOf(settings),
      calibrationPct: 0,
      shared: false,
    });
  }

  const photoCard = (
    <Card
      title="Customer photos"
      subtitle="The pictures your customer sent. More angles, better price."
      action={photos.length > 0 && <span className="pt-1 text-sm whitespace-nowrap text-stone-500 tabular-nums">{photos.length} of {MAX_PHOTOS}</span>}
    >
      <div className="grid grid-cols-4 gap-2">
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
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-stone-400 bg-stone-50 text-stone-600 active:bg-stone-100 ${
              photos.length === 0 ? "col-span-4 aspect-auto min-h-28" : ""
            }`}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <path d="M12 10v6M9 13h6" />
            </svg>
            <span className="text-[13px] font-bold">{busy === "photos" ? "Loading…" : photos.length === 0 ? "Add the customer's photos" : "Add"}</span>
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
    </Card>
  );

  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="New quote"
        title="Price a job."
        action={
          <button
            type="button"
            aria-expanded={askOpen}
            onClick={() => setAskOpen((o) => !o)}
            className="mb-0.5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-stone-900 px-4 text-sm font-bold text-stone-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16v11H8l-4 4z" />
            </svg>
            Ask for photos
          </button>
        }
      />
      {askOpen && <PhotoRequest settings={settings} phone={details.customerPhone} onClose={() => setAskOpen(false)} />}

      <div role="radiogroup" aria-label="How to price it" className="grid grid-cols-2 gap-1 rounded-[14px] bg-stone-200/70 p-1">
        {(
          [
            { value: "photos", label: "From photos" },
            { value: "quick", label: "Quick quote" },
          ] as const
        ).map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            onClick={() => setMode(m.value)}
            className={`min-h-11 rounded-[11px] text-[15px] font-bold ${mode === m.value ? "bg-stone-900 text-stone-100" : "text-stone-700"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "photos" && photoCard}

      <Card>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Customer" placeholder="Name" value={details.customerName} onChange={(v) => setDetail("customerName", v)} />
            <TextField
              label="Phone"
              placeholder="To text the quote"
              inputMode="tel"
              value={details.customerPhone}
              onChange={(v) => setDetail("customerPhone", v)}
            />
          </div>
          <NumberField
            label="Miles away"
            suffix="mi"
            value={details.distanceMiles}
            onChange={(v) => setDetail("distanceMiles", v)}
            hint={settings.extras.perMile > 0 ? `First ${settings.extras.freeMiles} mi free, then ${money(settings.extras.perMile)} a mile` : undefined}
          />
          {mode === "photos" && (
            <TextArea
              label="What they said"
              placeholder="e.g. Everything in the garage plus a mattress upstairs."
              value={notes}
              onChange={setNotes}
              rows={2}
            />
          )}
        </div>
      </Card>

      {mode === "quick" ? (
        <QuickQuote
          settings={settings}
          pick={pick}
          onPick={setPick}
          details={details}
          onDetails={setDetails}
          estimate={quick.estimate}
          quote={quick.quote}
          what={quick.what}
          onSent={recordQuickSent}
          onReset={reset}
        />
      ) : (
        <>
          {!askOpen && (
            <button
              type="button"
              onClick={() => {
                setAskOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-accent-line bg-accent-soft px-4 py-2 text-left"
            >
              <span>
                <span className="block text-[15px] font-bold">
                  {settings.standardQuestions.length > 0
                    ? `Your ${settings.standardQuestions.length} customer question${settings.standardQuestions.length === 1 ? "" : "s"}`
                    : "Ask the customer for photos"}
                </span>
                <span className="block text-[13px] text-accent-deep">Sent with every photo request</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-accent-deep" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}

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
              <PriceHero
                quote={quote}
                estimate={estimate}
                settings={settings}
                customerName={details.customerName}
                demo={demo}
                onChange={setEstimate}
              />
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
                        setDetails((d) => ({ ...d, stairsFlights: null }));
                      }
                    : undefined
                }
              />
              <Adjust estimate={estimate} onChange={setEstimate} details={details} onDetailsChange={setDetails} />
              <Breakdown quote={quote} settings={settings} />
              <SendQuote
                key={quoteId}
                quote={quote}
                details={details}
                allowRange
                build={(style, price) => buildQuoteMessage(settings, estimate, details, quote, style, price)}
                onSent={recordSent}
              />
              <button type="button" className={`${buttonClass.secondary} w-full`} onClick={reset}>
                Start a new quote
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const QUICK_SIZES = [{ key: "none", label: "Items only", fraction: 0 }, ...LOAD_SIZES] as const;

function QuickQuote({
  settings,
  pick,
  onPick,
  details,
  onDetails,
  estimate,
  quote,
  what,
  onSent,
  onReset,
}: {
  settings: Settings;
  pick: QuickPick;
  onPick: (p: QuickPick) => void;
  details: JobDetails;
  onDetails: (d: JobDetails) => void;
  estimate: JobEstimate;
  quote: Quote;
  what: string;
  onSent: (sentPrice: number | null) => void;
  onReset: () => void;
}) {
  const setCount = (id: string, n: number) => onPick({ ...pick, items: { ...pick.items, [id]: Math.max(0, n) } });
  const empty = estimate.lines.length === 0;

  return (
    <>
      <Card title="How much junk?" subtitle="Charged by the load. Add flat-rate items below.">
        <div role="radiogroup" aria-label="Load size" className="grid grid-cols-5 gap-1.5">
          {QUICK_SIZES.map((size) => {
            const on = pick.fraction === size.fraction;
            return (
              <button
                key={size.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick({ ...pick, fraction: size.fraction })}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 ${
                  on ? "bg-stone-900 text-stone-100" : "border border-stone-300 bg-stone-50 text-stone-900 active:bg-stone-100"
                }`}
              >
                <span className={`font-extrabold ${size.fraction === 0 ? "text-[13px] leading-tight" : "text-[17px]"}`}>{size.label}</span>
                <span className={`text-xs font-semibold tabular-nums ${on ? "text-stone-300" : "text-stone-500"}`}>
                  {size.fraction === 0 ? "$0" : money(loadPrice(size.fraction, settings))}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Plus items">
        <ul className="divide-y divide-stone-100">
          {settings.flatItems.map((item) => (
            <li key={item.id} className="flex min-h-14 items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{item.name}</span>
                <span className="block text-[13px] text-stone-500">{money(item.price)} each</span>
              </span>
              <Stepper label={item.name} value={pick.items[item.id] ?? 0} onChange={(n) => setCount(item.id, n)} />
            </li>
          ))}
          <li className="flex min-h-14 items-center justify-between gap-3">
            <span>
              <span className="block text-[15px] font-semibold">Flights of stairs</span>
              <span className="block text-[13px] text-stone-500">{money(settings.extras.stairsPerFlight)} each</span>
            </span>
            <Stepper
              label="flights of stairs"
              value={details.stairsFlights ?? 0}
              onChange={(n) => onDetails({ ...details, stairsFlights: n })}
            />
          </li>
        </ul>
        {settings.flatItems.length === 0 && (
          <p className="text-sm text-stone-500">
            No flat-rate items yet.{" "}
            <Link href="/settings" className="font-bold text-accent-deep">
              Add some in My rates
            </Link>
          </p>
        )}
      </Card>

      <section className="rounded-3xl bg-stone-900 p-5 text-stone-100" aria-live="polite">
        <p className="text-xs font-bold tracking-[0.12em] text-stone-400 uppercase">Price</p>
        {empty ? (
          <p className="mt-1 text-[15px] text-stone-300">Pick a load size or some items.</p>
        ) : (
          <>
            <p className="mt-1 font-display text-[52px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
              {moneyRange(quote.total.low, quote.total.high)}
            </p>
            <p className="mt-1 text-[15px] text-stone-300">
              {what[0].toUpperCase() + what.slice(1)}
              {quote.minimumApplied ? ", your minimum" : ""}
            </p>
          </>
        )}
      </section>

      {!empty && (
        <>
          {quote.warnings.length > 0 && <Warnings warnings={quote.warnings} />}
          <Breakdown quote={quote} settings={settings} />
          <SendQuote
            quote={quote}
            details={details}
            allowRange={false}
            build={(_, price) => buildQuickQuoteMessage(settings, details, what, price)}
            onSent={onSent}
          />
          <button type="button" className={`${buttonClass.secondary} w-full`} onClick={onReset}>
            Start a new quote
          </button>
        </>
      )}
    </>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />;
}

function CopyButton({
  text,
  label = "Copy",
  onCopied,
  variant = "primary",
}: {
  text: string;
  label?: string;
  onCopied?: () => void;
  variant?: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass[variant]}
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

function PhotoRequest({ settings, phone, onClose }: { settings: Settings; phone: string; onClose: () => void }) {
  const message = buildPhotoRequestMessage(settings);
  return (
    <section className="rounded-[20px] border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] leading-tight font-bold">Ask for photos</h2>
          <p className="mt-0.5 text-sm text-stone-500">Good photos and answers up front mean the price holds on site.</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <p className="mt-3 ml-auto max-w-[94%] rounded-[22px_22px_6px_22px] bg-accent px-4 py-3 text-[15px] leading-snug whitespace-pre-wrap text-stone-900">
        {message}
      </p>
      <Link href="/settings" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-accent-deep">
        Edit your {settings.standardQuestions.length === 1 ? "question" : "questions"} in My rates
      </Link>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <CopyButton text={message} />
        <a className={buttonClass.secondary} href={smsHref(phone, message)}>
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
  onChange,
}: {
  quote: Quote;
  estimate: JobEstimate;
  settings: Settings;
  customerName: string;
  demo: boolean;
  onChange: (e: JobEstimate) => void;
}) {
  const capacity = capacityOf(settings);
  const fillLow = Math.min(1, quote.volume.totalCubicYards.low / capacity);
  const fillHigh = Math.min(1, quote.volume.totalCubicYards.high / capacity);
  const range = quote.total.low !== quote.total.high;
  const picked = estimate.sizedByOwner
    ? LOAD_SIZES.find((s) => Math.abs(quote.volume.trailerFraction.high - s.fraction) < 0.005)?.key
    : undefined;
  const notes = [
    quote.volume.loads > 1 ? `About ${quote.volume.loads} trailer loads` : "",
    quote.volume.calibrationPct !== 0
      ? `${quote.volume.calibrationPct > 0 ? "+" : ""}${quote.volume.calibrationPct}% learned from ${
          quote.volume.calibrationSource === "owner" ? "your" : "all owners'"
        } past jobs`
      : "",
    quote.minimumApplied ? "Raised to your minimum charge" : "",
  ].filter(Boolean);

  return (
    <section className="rounded-3xl bg-stone-900 p-5 text-stone-100">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-stone-400">{customerName.trim() ? `Quote for ${customerName.trim()}` : "Your price"}</span>
        <div className="flex gap-1.5">
          {demo && <span className="rounded-full bg-sky-200 px-2.5 py-0.5 text-xs font-bold text-sky-950">Demo data</span>}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${confidenceStyle[estimate.confidence]}`}>
            {estimate.confidence[0].toUpperCase() + estimate.confidence.slice(1)} confidence
          </span>
        </div>
      </div>
      <p className="mt-2 font-display text-[52px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
        {moneyRange(quote.total.low, quote.total.high)}
      </p>
      <p className="mt-1 text-[15px] text-stone-300">
        {quote.volume.sizeLabel || (estimate.lines.length > 0 ? "Flat-rate items only" : "Nothing listed yet")}
        {range && `, or quote one price: ${money(quote.suggested)}`}
      </p>
      <div className="mt-4">
        <div className="relative h-3 overflow-hidden rounded-full bg-stone-700" aria-hidden>
          <div className="absolute inset-y-0 left-0 bg-accent/45" style={{ width: `${fillHigh * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${fillLow * 100}%` }} />
        </div>
        <p className="mt-1.5 flex justify-between gap-2 text-xs text-stone-400">
          <span>
            {pct(quote.volume.totalCubicYards.low / capacity) === pct(quote.volume.totalCubicYards.high / capacity)
              ? `Trailer ${pct(quote.volume.totalCubicYards.high / capacity)} full`
              : `Trailer ${pct(quote.volume.totalCubicYards.low / capacity)} to ${pct(quote.volume.totalCubicYards.high / capacity)} full`}
          </span>
          {quote.volume.unseenPct > 0 && <span>Leaves room for {quote.volume.unseenPct}% more</span>}
        </p>
        {notes.map((n) => (
          <p key={n} className="text-xs text-stone-400">
            {n}
          </p>
        ))}
      </div>
      <div className="mt-4 border-t border-stone-700 pt-3">
        <p className="mb-2 text-sm font-semibold">Know better? It&apos;s really about a…</p>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Set the load size">
          {LOAD_SIZES.map((size) => (
            <button
              key={size.key}
              type="button"
              aria-pressed={picked === size.key}
              className={`min-h-12 rounded-xl text-[17px] font-extrabold ${
                picked === size.key
                  ? "border-2 border-accent bg-accent text-stone-900"
                  : "border border-stone-600 bg-stone-800 text-stone-100 active:bg-stone-700"
              }`}
              onClick={() => onChange(setLoadSize(estimate, settings, size.fraction))}
            >
              {size.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-stone-400">
          {estimate.sizedByOwner
            ? "Priced at exactly the size you picked. Flat-rate items keep their own price."
            : "Flat-rate items keep their own price."}
        </p>
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
      <p className="text-[15px] leading-relaxed text-stone-700">{estimate.summary}</p>
      {estimate.accessNotes && <p className="mt-2 text-sm text-stone-500">Access: {estimate.accessNotes}</p>}
      {estimate.questionsForCustomer.length > 0 && (
        <div className="mt-3 rounded-xl bg-stone-100 p-3">
          <p className="text-xs font-bold tracking-[0.1em] text-stone-500 uppercase">Worth asking</p>
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
  estimate,
  onChange,
  details,
  onDetailsChange,
}: {
  estimate: JobEstimate;
  onChange: (e: JobEstimate) => void;
  details: JobDetails;
  onDetailsChange: (d: JobDetails) => void;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-stone-900">Flights of stairs</p>
            <p className="text-xs text-stone-500">{details.stairsFlights === null ? "From the photos" : "Set by you"}</p>
          </div>
          <Stepper
            label="flights of stairs"
            value={details.stairsFlights ?? estimate.stairsFlights}
            onChange={(stairsFlights) => onDetailsChange({ ...details, stairsFlights })}
          />
        </div>

        {estimate.prohibitedItems.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-semibold text-stone-700">Flagged as something you won&apos;t take</p>
            <ul className="space-y-1.5">
              {estimate.prohibitedItems.map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-1">
                  <span className="text-sm text-red-900">{p.name}</span>
                  <button
                    type="button"
                    className="min-h-11 text-xs font-bold text-red-700"
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
  const row = "flex justify-between gap-3 py-2 text-[15px]";
  const { costs } = quote;
  return (
    <Card title="How the price adds up">
      <ul>
        {quote.lines.map((l, i) => (
          <li key={`${l.label}-${i}`} className={`${row} border-b border-stone-100`}>
            <div className="min-w-0">
              <p className="text-stone-900">{l.label}</p>
              <p className="text-xs text-stone-500">{l.detail}</p>
            </div>
            <span className="whitespace-nowrap tabular-nums">{moneyRange(l.amount.low, l.amount.high)}</span>
          </li>
        ))}
        {quote.minimumApplied && (
          <li className={`${row} border-b border-stone-100`}>
            <span className="text-stone-600">Raised to your minimum</span>
            <span className="tabular-nums">{money(settings.minimumCharge)}</span>
          </li>
        )}
        <li className={`${row} mt-1 border-t-2 border-stone-900 text-[17px] font-extrabold`}>
          <span>Total</span>
          <span className="tabular-nums">{moneyRange(quote.total.low, quote.total.high)}</span>
        </li>
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#e8f5ec] px-3.5 py-3 text-[#14532d]">
        <span>
          <span className="block text-sm font-semibold">You keep about</span>
          <span className="block text-xs text-[#2f6b46]">after dump fees, gas{settings.costs.helpers > 0 ? " and helper pay" : ""}</span>
        </span>
        <span className="font-display text-2xl font-extrabold whitespace-nowrap tabular-nums">{moneyRange(quote.keep.low, quote.keep.high)}</span>
      </div>
      <details className="mt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-accent-deep">Your costs on this job</summary>
        <ul className="divide-y divide-stone-100 text-sm">
          <CostRow label="Dump fees" value={costs.dump} />
          <CostRow label="Gas" value={costs.gas} />
          {settings.costs.helpers > 0 && (
            <CostRow label={settings.costs.helpers === 1 ? "Your helper" : `${settings.costs.helpers} helpers`} value={costs.helpers} />
          )}
        </ul>
        <p className="mt-1 text-xs text-stone-500">Rough numbers from Your costs in My rates.</p>
      </details>
    </Card>
  );
}

function CostRow({ label, value }: { label: string; value: { low: number; high: number } }) {
  return (
    <li className="flex justify-between gap-3 py-1.5">
      <span className="text-stone-700">{label}</span>
      <span className="whitespace-nowrap tabular-nums">{moneyRange(value.low, value.high)}</span>
    </li>
  );
}

function SendQuote({
  quote,
  details,
  allowRange,
  build,
  onSent,
}: {
  quote: Quote;
  details: JobDetails;
  /** Photo quotes can go out as a range; quick quotes are one price. */
  allowRange: boolean;
  build: (style: QuoteStyle, price: number) => string;
  onSent: (sentPrice: number | null) => void;
}) {
  const [style, setStyle] = useState<QuoteStyle>(allowRange ? "range" : "single");
  const [price, setPrice] = useState<number | null>(null);
  // Hand edits stick until the generated message changes underneath them.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);

  const singlePrice = price ?? quote.suggested;
  const generated = build(style, singlePrice);
  const message = edit?.base === generated ? edit.text : generated;
  const sent = () => onSent(style === "single" ? singlePrice : null);
  const name = details.customerName.trim();

  return (
    <Card title="Send the quote" subtitle="Edit anything before sending. Sent quotes are saved under Jobs.">
      <div className="space-y-3">
        {allowRange && (
          <Segmented
            label="Quote style"
            value={style}
            onChange={setStyle}
            options={[
              { value: "range", label: "Price range" },
              { value: "single", label: "Single price" },
            ]}
          />
        )}
        {style === "single" && (
          <NumberField label="Price to quote" prefix="$" value={singlePrice} onChange={setPrice} inputMode="numeric" />
        )}
        <TextArea label="Message" value={message} onChange={(text) => setEdit({ base: generated, text })} rows={8} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <a className={buttonClass.primary} href={smsHref(details.customerPhone, message)} onClick={sent}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12l16-8-6 16-3-7-7-1z" />
            </svg>
            {name && details.customerPhone.trim() ? `Text it to ${name}` : "Text it"}
          </a>
          <CopyButton text={message} onCopied={sent} variant="secondary" />
        </div>
      </div>
    </Card>
  );
}
