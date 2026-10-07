"use client";

import { useMemo, useRef, useState } from "react";
import { MAX_PHOTOS } from "@/lib/ai/limits";
import { postJson } from "@/lib/client/api";
import { preparePhoto, type Photo } from "@/lib/client/photos";
import { useSettings } from "@/lib/client/settingsStore";
import { computeQuote, sortedTiers } from "@/lib/pricing/engine";
import { buildQuoteMessage, type QuoteStyle } from "@/lib/pricing/message";
import type { JobDetails, JobEstimate, Quote, Settings } from "@/lib/pricing/types";
import { buttonClass, Card, money, moneyRange, NumberField, Segmented, Stepper, TextArea, TextField } from "./ui";

const EMPTY_DETAILS: JobDetails = { customerName: "", distanceMiles: 0, stairsFlights: null };

export function QuoteFlow() {
  const settings = useSettings();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState<JobDetails>(EMPTY_DETAILS);
  const [estimate, setEstimate] = useState<JobEstimate | null>(null);
  const [aiEstimate, setAiEstimate] = useState<JobEstimate | null>(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState<"photos" | "analyzing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const quote = useMemo(
    () => (estimate ? computeQuote(settings, estimate, details) : null),
    [settings, estimate, details],
  );

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy("photos");
    try {
      const room = MAX_PHOTOS - photos.length;
      const picked = Array.from(files).slice(0, room);
      const prepared = await Promise.all(picked.map(preparePhoto));
      setPhotos((p) => [...p, ...prepared]);
      if (files.length > room) setError(`Only ${MAX_PHOTOS} photos per quote — kept the first ${room}.`);
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
        trailer: settings.trailer,
        itemFees: settings.itemFees.map(({ id, name, hint }) => ({ id, name, hint })),
        prohibitedItems: settings.prohibitedItems,
      });
      setEstimate(res.estimate);
      setAiEstimate(res.estimate);
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
    setDetails(EMPTY_DETAILS);
    setEstimate(null);
    setAiEstimate(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <Card title="Customer photos" subtitle="Add the pictures your customer sent. More angles = better estimate.">
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
              <img src={p.previewUrl} alt={`Customer photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy !== null}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-stone-500 active:bg-stone-50"
            >
              <span className="text-3xl leading-none">+</span>
              <span className="text-xs font-medium">{busy === "photos" ? "Loading…" : "Add photos"}</span>
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
            placeholder="e.g. Everything in the garage plus a mattress upstairs. Ground floor, easy driveway access."
            value={notes}
            onChange={setNotes}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Customer name"
              placeholder="Optional"
              value={details.customerName}
              onChange={(customerName) => setDetails((d) => ({ ...d, customerName }))}
            />
            <NumberField
              label="Distance"
              suffix="mi"
              value={details.distanceMiles}
              onChange={(distanceMiles) => setDetails((d) => ({ ...d, distanceMiles }))}
              hint="One way from your base"
            />
          </div>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        className={`${buttonClass.primary} w-full`}
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
      {busy === "analyzing" && (
        <p className="text-center text-sm text-stone-500">Usually takes 15–40 seconds.</p>
      )}

      {estimate && quote && (
        <div ref={resultsRef} className="scroll-mt-20 space-y-4 pt-2">
          <PriceHero quote={quote} estimate={estimate} demo={demo} />
          {quote.warnings.length > 0 && <Warnings warnings={quote.warnings} />}
          <WhatWeSaw estimate={estimate} />
          <Adjust
            settings={settings}
            estimate={estimate}
            onChange={setEstimate}
            details={details}
            onDetailsChange={setDetails}
            onReset={aiEstimate ? () => {
              setEstimate(aiEstimate);
              setDetails((d) => ({ ...d, stairsFlights: null }));
            } : undefined}
          />
          <Breakdown quote={quote} settings={settings} />
          <CustomerMessage settings={settings} estimate={estimate} details={details} quote={quote} />
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

const confidenceStyle = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-800",
};

function PriceHero({ quote, estimate, demo }: { quote: Quote; estimate: JobEstimate; demo: boolean }) {
  const fill = Math.min(1, quote.volume.trailerFraction.high);
  const fillLow = Math.min(1, quote.volume.trailerFraction.low);
  return (
    <section className="rounded-2xl bg-stone-900 p-5 text-white shadow">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-300">Quote</span>
        <div className="flex gap-1.5">
          {demo && <span className="rounded-full bg-sky-200 px-2 py-0.5 text-xs font-semibold text-sky-900">Demo data</span>}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceStyle[estimate.confidence]}`}>
            {estimate.confidence} confidence
          </span>
        </div>
      </div>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{moneyRange(quote.total.low, quote.total.high)}</p>
      <p className="mt-1 text-sm text-stone-300">
        {quote.volume.tierLabel}
        {quote.total.low !== quote.total.high && <> · middle: {money(quote.suggested)}</>}
        {quote.minimumApplied && <> · minimum charge applied</>}
      </p>
      <div className="mt-4">
        <div className="relative h-3 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div className="absolute inset-y-0 left-0 bg-orange-500/50" style={{ width: `${fill * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-orange-500" style={{ width: `${fillLow * 100}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-stone-400">
          Trailer fill: {pct(quote.volume.trailerFraction.low)}–{pct(quote.volume.trailerFraction.high)}
          {quote.volume.loads > 1 && ` (${quote.volume.loads} loads)`}
        </p>
      </div>
    </section>
  );
}

const pct = (f: number) => `${Math.round(f * 100)}%`;

function Warnings({ warnings }: { warnings: string[] }) {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="mb-2 text-sm font-semibold text-amber-900">Heads up</h2>
      <ul className="space-y-1.5 text-sm text-amber-900">
        {warnings.map((w) => (
          <li key={w} className="flex gap-2">
            <span aria-hidden>⚠︎</span>
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
      {estimate.items.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {estimate.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3 py-1.5">
              <span className="text-stone-800">
                {item.quantity > 1 && <span className="font-semibold">{item.quantity}× </span>}
                {item.description}
              </span>
              <span className="whitespace-nowrap text-stone-500 tabular-nums">{round1(item.cubicYards)} yd³</span>
            </li>
          ))}
        </ul>
      )}
      {estimate.accessNotes && <p className="mt-3 text-sm text-stone-500">Access: {estimate.accessNotes}</p>}
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

const round1 = (n: number) => Math.round(n * 10) / 10;

function Adjust({
  settings,
  estimate,
  onChange,
  details,
  onDetailsChange,
  onReset,
}: {
  settings: Settings;
  estimate: JobEstimate;
  onChange: (e: JobEstimate) => void;
  details: JobDetails;
  onDetailsChange: (d: JobDetails) => void;
  onReset?: () => void;
}) {
  const set = (patch: Partial<JobEstimate>) => onChange({ ...estimate, ...patch });
  const qty = (id: string) => estimate.feeItems.find((f) => f.itemId === id)?.quantity ?? 0;
  const setQty = (id: string, quantity: number) => {
    const rest = estimate.feeItems.filter((f) => f.itemId !== id);
    set({ feeItems: quantity > 0 ? [...rest, { itemId: id, quantity, note: "" }] : rest });
  };
  const capacity = settings.trailer.cubicYards;

  return (
    <Card
      title="Adjust the estimate"
      subtitle="You know the job — fix anything the AI got wrong and the price updates."
      action={
        onReset && (
          <button type="button" className={buttonClass.ghost} onClick={onReset}>
            Undo edits
          </button>
        )
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">Set the load size</p>
          <div className="flex flex-wrap gap-2">
            {sortedTiers(settings.loadTiers).map((t) => (
              <button
                key={t.id}
                type="button"
                className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 active:bg-stone-100"
                onClick={() => {
                  const cy = round1(t.fraction * capacity);
                  const ratio = estimate.volumeCubicYardsHigh > 0 ? cy / estimate.volumeCubicYardsHigh : 1;
                  set({
                    volumeCubicYardsLow: cy,
                    volumeCubicYardsHigh: cy,
                    weightLbsLow: Math.round(estimate.weightLbsHigh * ratio),
                    weightLbsHigh: Math.round(estimate.weightLbsHigh * ratio),
                  });
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Volume (low)"
            suffix="yd³"
            value={round1(estimate.volumeCubicYardsLow)}
            onChange={(v) => set({ volumeCubicYardsLow: v, volumeCubicYardsHigh: Math.max(v, estimate.volumeCubicYardsHigh) })}
          />
          <NumberField
            label="Volume (high)"
            suffix="yd³"
            value={round1(estimate.volumeCubicYardsHigh)}
            onChange={(v) => set({ volumeCubicYardsHigh: v, volumeCubicYardsLow: Math.min(v, estimate.volumeCubicYardsLow) })}
          />
          <NumberField
            label="Weight (low)"
            suffix="lbs"
            value={Math.round(estimate.weightLbsLow)}
            onChange={(v) => set({ weightLbsLow: v, weightLbsHigh: Math.max(v, estimate.weightLbsHigh) })}
          />
          <NumberField
            label="Weight (high)"
            suffix="lbs"
            value={Math.round(estimate.weightLbsHigh)}
            onChange={(v) => set({ weightLbsHigh: v, weightLbsLow: Math.min(v, estimate.weightLbsLow) })}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">Extra-charge items</p>
          <ul className="divide-y divide-stone-100">
            {settings.itemFees.map((fee) => (
              <li key={fee.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className={`text-sm ${qty(fee.id) > 0 ? "font-semibold text-stone-900" : "text-stone-600"}`}>{fee.name}</p>
                  <p className="text-xs text-stone-500">
                    {fee.onSiteQuote ? "On-site quote" : fee.priceLow === fee.priceHigh ? `${money(fee.priceLow)} each` : `${money(fee.priceLow)}–${money(fee.priceHigh)} each`}
                  </p>
                </div>
                <Stepper label={fee.name} value={qty(fee.id)} onChange={(v) => setQty(fee.id, v)} />
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm text-stone-900">Flights of stairs</p>
                <p className="text-xs text-stone-500">
                  {details.stairsFlights === null ? "AI's read from the photos" : "Set by you"}
                </p>
              </div>
              <Stepper
                label="flights of stairs"
                value={details.stairsFlights ?? estimate.stairsFlights}
                onChange={(stairsFlights) => onDetailsChange({ ...details, stairsFlights })}
              />
            </li>
          </ul>
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
                    onClick={() => set({ prohibitedItems: estimate.prohibitedItems.filter((_, j) => j !== i) })}
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
  return (
    <Card title="Price breakdown">
      <ul className="divide-y divide-stone-100">
        {quote.lines.map((l) => (
          <li key={l.label} className={row}>
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
          Profit check: {moneyRange(quote.profit.low, quote.profit.high)} ({Math.round(quote.margin.low)}–{Math.round(quote.margin.high)}%)
        </summary>
        <ul className="mt-2 divide-y divide-stone-200 text-sm">
          <CostRow label={settings.costs.dumpFeeMethod === "per_ton" ? "Dump fees (by weight)" : "Dump fees (by volume)"} low={quote.cost.dump.low} high={quote.cost.dump.high} />
          <CostRow label={`Labor (${settings.costs.crewSize}-person crew, incl. drive)`} low={quote.cost.labor.low} high={quote.cost.labor.high} />
          <CostRow label="Truck & fuel" low={quote.cost.vehicle} high={quote.cost.vehicle} />
          {quote.cost.disposal.high > 0 && <CostRow label="Item disposal fees" low={quote.cost.disposal.low} high={quote.cost.disposal.high} />}
          <CostRow label="Overhead" low={quote.cost.overhead} high={quote.cost.overhead} />
          <li className="flex justify-between py-1.5 font-semibold">
            <span>Your cost</span>
            <span className="tabular-nums">{moneyRange(quote.cost.total.low, quote.cost.total.high)}</span>
          </li>
        </ul>
        <p className="mt-2 text-xs text-stone-500">Based on the costs in My rates. Target margin: {settings.costs.targetMarginPct}%.</p>
      </details>
    </Card>
  );
}

function CostRow({ label, low, high }: { label: string; low: number; high: number }) {
  return (
    <li className="flex justify-between gap-3 py-1.5">
      <span className="text-stone-700">{label}</span>
      <span className="whitespace-nowrap tabular-nums">{moneyRange(low, high)}</span>
    </li>
  );
}

function CustomerMessage({
  settings,
  estimate,
  details,
  quote,
}: {
  settings: Settings;
  estimate: JobEstimate;
  details: JobDetails;
  quote: Quote;
}) {
  const [style, setStyle] = useState<QuoteStyle>("range");
  const [price, setPrice] = useState<number | null>(null);
  // Hand edits stick until the generated message changes underneath them.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const singlePrice = price ?? quote.suggested;
  const generated = buildQuoteMessage(settings, estimate, details, quote, style, singlePrice);
  const message = edit?.base === generated ? edit.text : generated;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is still selectable in the box.
    }
  }

  return (
    <Card title="Send the quote" subtitle="Edit anything before sending.">
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
          <button type="button" className={buttonClass.primary} onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {canShare ? (
            <button type="button" className={buttonClass.secondary} onClick={() => navigator.share({ text: message }).catch(() => {})}>
              Share…
            </button>
          ) : (
            <a className={buttonClass.secondary} href={`sms:?&body=${encodeURIComponent(message)}`}>
              Text it
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
