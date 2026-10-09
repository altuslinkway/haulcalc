"use client";

import { useRef, useState } from "react";
import { MAX_RATE_CARD_PHOTOS } from "@/lib/ai/limits";
import type { RateCard } from "@/lib/ai/schemas";
import { postJson } from "@/lib/client/api";
import { preparePhoto } from "@/lib/client/photos";
import { saveSettings, useSettings } from "@/lib/client/settingsStore";
import { DEFAULT_SETTINGS, TRAILERS } from "@/lib/pricing/defaults";
import { LOAD_SIZES } from "@/lib/pricing/engine";
import { applyRateCard, freshId } from "@/lib/pricing/rateCard";
import type { Settings, TrailerPreset } from "@/lib/pricing/types";
import { buttonClass, Card, money, NumberField, PageTitle, Select, Stepper, TextField, Toggle } from "./ui";

type Update = (fn: (draft: Settings) => void) => void;

const TRAILER_OPTIONS: { value: TrailerPreset; label: string }[] = [
  ...TRAILERS.map((t) => ({ value: t.id, label: t.label })),
  { value: "custom", label: "Something else" },
];

export function SettingsForm() {
  const settings = useSettings();
  const update: Update = (fn) => {
    const next = structuredClone(settings);
    fn(next);
    saveSettings(next);
  };
  const { extras, costs } = settings;

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Saved on this phone" title="My rates." />

      <RateCardImport settings={settings} />

      <Card title="Load prices" subtitle="What you charge for part of your trailer. Sizes in between are priced in between.">
        <div className="grid grid-cols-2 gap-2.5">
          {LOAD_SIZES.map((size) => (
            <NumberField
              key={size.key}
              big
              label={`${size.label} load`}
              prefix="$"
              value={settings.loadPrices[size.key]}
              onChange={(v) => update((s) => void (s.loadPrices[size.key] = v))}
            />
          ))}
        </div>
        {LOAD_SIZES.some((size, i) => i > 0 && settings.loadPrices[size.key] < settings.loadPrices[LOAD_SIZES[i - 1].key]) && (
          <p className="mt-2 rounded-xl bg-[#fff1d6] px-3 py-2 text-sm text-[#4d3300]">
            A bigger load is priced lower than a smaller one. Quotes use the higher price until you fix it.
          </p>
        )}
        <div className="mt-3">
          <NumberField
            label="Minimum charge"
            prefix="$"
            hint="The least any job costs, like a single small item."
            value={settings.minimumCharge}
            onChange={(v) => update((s) => void (s.minimumCharge = v))}
          />
        </div>
        <div className="mt-3 space-y-3">
          <Select
            label="Your trailer or truck"
            value={settings.trailer.preset}
            options={TRAILER_OPTIONS}
            hint={settings.trailer.preset === "custom" ? undefined : `Holds about ${settings.trailer.cubicYards} cubic yards.`}
            onChange={(v) =>
              update((s) => {
                const preset = TRAILERS.find((t) => t.id === v);
                s.trailer = preset ? { preset: v, cubicYards: preset.cubicYards, payloadLbs: preset.payloadLbs } : { ...s.trailer, preset: v };
              })
            }
          />
          {settings.trailer.preset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Holds"
                suffix="yd³"
                hint="Length × width × height in feet, ÷ 27."
                value={settings.trailer.cubicYards}
                onChange={(v) => update((s) => void (s.trailer.cubicYards = v))}
              />
              <NumberField
                label="Weight limit"
                suffix="lbs"
                value={settings.trailer.payloadLbs}
                onChange={(v) => update((s) => void (s.trailer.payloadLbs = v))}
              />
            </div>
          )}
        </div>
      </Card>

      <FlatItems settings={settings} update={update} />

      <Card title="Extra charges" subtitle="Added to the price when they apply.">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Free travel"
            suffix="miles"
            value={extras.freeMiles}
            onChange={(v) => update((s) => void (s.extras.freeMiles = v))}
          />
          <NumberField
            label="Then per mile"
            prefix="$"
            value={extras.perMile}
            onChange={(v) => update((s) => void (s.extras.perMile = v))}
          />
          <NumberField
            label="Stairs, per flight"
            prefix="$"
            value={extras.stairsPerFlight}
            onChange={(v) => update((s) => void (s.extras.stairsPerFlight = v))}
          />
          <NumberField
            label="Heavy loads, per ton"
            prefix="$"
            value={extras.heavyPerTon}
            onChange={(v) => update((s) => void (s.extras.heavyPerTon = v))}
          />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Heavy loads are concrete, dirt, shingles and the like. Normal junk weight is included in your load prices.
        </p>
      </Card>

      <Card title="Your costs" subtitle="Rough numbers, so each quote shows what you'd keep.">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Dump fee, per ton"
            prefix="$"
            value={costs.dumpFeePerTon}
            onChange={(v) => update((s) => void (s.costs.dumpFeePerTon = v))}
          />
          <NumberField
            label="Gas, per mile"
            prefix="$"
            value={costs.gasPerMile}
            onChange={(v) => update((s) => void (s.costs.gasPerMile = v))}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-stone-700">Helpers you pay</p>
            <p className="text-xs text-stone-500">Not counting yourself.</p>
          </div>
          <Stepper label="helpers" value={costs.helpers} onChange={(v) => update((s) => void (s.costs.helpers = v))} />
        </div>
        {costs.helpers > 0 && (
          <div className="mt-3">
            <NumberField
              label="Helper pay, per hour"
              prefix="$"
              value={costs.helperPerHour}
              onChange={(v) => update((s) => void (s.costs.helperPerHour = v))}
            />
          </div>
        )}
      </Card>

      <Card>
        <ListEditor
          title="Questions for every customer"
          subtitle="Sent with every photo request (Ask for photos on the Quote screen)."
          items={settings.standardQuestions}
          placeholder="Add a question"
          onChange={(items) => update((s) => void (s.standardQuestions = items))}
        />
      </Card>

      <details className="group rounded-[20px] border border-stone-200 bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-display text-xl font-bold">
          More settings
          <span aria-hidden className="text-stone-500 transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-6 border-t border-stone-100 p-4">
          <TextField
            label="Business name"
            hint="Used to sign the quotes you text customers."
            value={settings.businessName}
            onChange={(v) => update((s) => void (s.businessName = v))}
          />

          <ListEditor
            title="Items you won't take"
            subtitle="Spotted in photos so you can warn the customer."
            items={settings.prohibitedItems}
            placeholder="Add an item, like tires"
            chips
            onChange={(items) => update((s) => void (s.prohibitedItems = items))}
          />

          <Learning settings={settings} update={update} />

          <button
            type="button"
            className={`${buttonClass.secondary} w-full`}
            onClick={() => {
              if (window.confirm("Reset all your rates and costs to the defaults?")) saveSettings(DEFAULT_SETTINGS);
            }}
          >
            Reset to defaults
          </button>
        </div>
      </details>
    </div>
  );
}

function FlatItems({ settings, update }: { settings: Settings; update: Update }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const add = () => {
    const n = name.trim();
    const p = Number(price.replace(/[$,\s]/g, ""));
    if (!n || !Number.isFinite(p) || p < 0) return;
    update((s) => void s.flatItems.push({ id: freshId(n, s.flatItems.map((i) => i.id)), name: n, price: Math.round(p) }));
    setName("");
    setPrice("");
  };

  return (
    <Card title="Flat-rate items" subtitle="One set price whatever the load, like $50 for a TV. Their space isn't charged again.">
      <ul className="space-y-2">
        {settings.flatItems.map((item, i) => (
          <li key={item.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                label={`Item ${i + 1}`}
                hideLabel
                value={item.name}
                onChange={(v) => update((s) => void (s.flatItems[i].name = v))}
              />
            </div>
            <div className="w-24 shrink-0">
              <NumberField
                label={`${item.name || `Item ${i + 1}`} price`}
                hideLabel
                prefix="$"
                value={item.price}
                onChange={(v) => update((s) => void (s.flatItems[i].price = v))}
              />
            </div>
            <button
              type="button"
              aria-label={`Remove ${item.name || "item"}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-500 active:bg-stone-100"
              onClick={() => update((s) => void s.flatItems.splice(i, 1))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          className="w-full min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2.5 text-base focus:border-stone-900 focus:ring-2 focus:ring-accent/40 focus:outline-none"
          placeholder="New item, like batteries"
          aria-label="New item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-20 shrink-0 rounded-xl border border-stone-300 px-3 py-2.5 text-base focus:border-stone-900 focus:ring-2 focus:ring-accent/40 focus:outline-none"
          placeholder="$"
          aria-label="New item price"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button type="submit" className={`${buttonClass.secondary} py-2`} disabled={!name.trim() || !price.trim()}>
          Add
        </button>
      </form>
    </Card>
  );
}

function Learning({ settings, update }: { settings: Settings; update: Update }) {
  return (
    <div>
      <h3 className="font-display text-lg font-bold">Getting smarter</h3>
      <p className="text-sm text-stone-500">Every corrected quote and rated job makes estimates better, for you and every owner.</p>
      <div className="mt-1 divide-y divide-stone-100">
        <Toggle
          label="Share my corrections"
          hint="Item types, sizes and how jobs turned out. Never photos, names, addresses or prices."
          checked={settings.learning.shareData}
          onChange={(v) => update((s) => void (s.learning.shareData = v))}
        />
        <Toggle
          label="Use what all owners have learned"
          hint="Better sizes for the AI, and a correction for how far off similar jobs have run."
          checked={settings.learning.useNetwork}
          onChange={(v) => update((s) => void (s.learning.useNetwork = v))}
        />
      </div>
      <div className="mt-2">
        {settings.calibrationPct === null ? (
          <p className="text-sm text-stone-600">
            No correction of your own.{" "}
            <button type="button" className="min-h-11 font-bold text-accent-deep" onClick={() => update((s) => void (s.calibrationPct = 0))}>
              Set my own
            </button>
          </p>
        ) : (
          <div className="space-y-1">
            <NumberField
              label="My own correction"
              suffix="%"
              value={settings.calibrationPct}
              parse={parseSigned}
              inputMode="text"
              onChange={(v) => update((s) => void (s.calibrationPct = v))}
              hint="+10 means your jobs run 10% bigger than the AI guesses. Jobs suggests one once you've rated a few."
            />
            <button type="button" className="min-h-11 text-sm font-bold text-accent-deep" onClick={() => update((s) => void (s.calibrationPct = null))}>
              Clear it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function parseSigned(text: string): number | null {
  const n = Number(text.replace(/[%\s+]/g, ""));
  return text.trim() !== "" && text.trim() !== "-" && Number.isFinite(n) ? n : null;
}

function ListEditor({
  title,
  subtitle,
  items,
  placeholder,
  chips = false,
  onChange,
}: {
  title: string;
  subtitle: string;
  items: string[];
  placeholder: string;
  chips?: boolean;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mb-2 text-sm text-stone-500">{subtitle}</p>
      <ul className={chips ? "flex flex-wrap gap-2" : "divide-y divide-stone-100"}>
        {items.map((item, i) => (
          <li
            key={`${item}-${i}`}
            className={
              chips
                ? "flex items-center gap-1 rounded-full bg-red-50 py-1 pr-1 pl-3 text-sm text-red-900"
                : "flex items-start justify-between gap-3 py-2 text-sm text-stone-800"
            }
          >
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-500 active:bg-stone-100"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          className="w-full min-w-0 rounded-xl border border-stone-300 px-3 py-2.5 text-base focus:border-stone-900 focus:ring-2 focus:ring-accent/40 focus:outline-none"
          placeholder={placeholder}
          aria-label={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={`${buttonClass.secondary} py-2`}>
          Add
        </button>
      </form>
    </div>
  );
}

function RateCardImport({ settings }: { settings: Settings }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<RateCard | null>(null);

  async function read(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setCard(null);
    setBusy(true);
    try {
      const photos = await Promise.all(Array.from(files).slice(0, MAX_RATE_CARD_PHOTOS).map(preparePhoto));
      const res = await postJson<{ rateCard: RateCard }>("/api/rate-card", {
        photos: photos.map(({ mediaType, data }) => ({ mediaType, data })),
      });
      setCard(res.rateCard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the rate card.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const next = card ? applyRateCard(settings, card) : null;
  const onCard = card
    ? { quarter: card.quarter_load, half: card.half_load, threeQuarter: card.three_quarter_load, full: card.full_load }
    : null;

  return (
    <section className="rounded-3xl bg-stone-900 p-4 text-stone-100">
      <h2 className="font-display text-[22px] leading-tight font-extrabold">Have a rate card?</h2>
      <p className="mt-0.5 mb-3 text-sm text-stone-300">
        Snap your price sheet, trailer sign or flyer. You check everything before it&apos;s saved.
      </p>
      <button type="button" className={`${buttonClass.primary} w-full`} disabled={busy} onClick={() => fileInput.current?.click()}>
        {busy ? "Reading your rate card…" : "Upload rate card photos"}
      </button>
      <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => read(e.target.files)} />
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {card && next && onCard && (
        <div className="mt-4 space-y-3 rounded-2xl bg-white p-3 text-sm text-stone-900">
          <p className="font-semibold">Here&apos;s what I found:</p>
          <ul className="space-y-0.5">
            {LOAD_SIZES.map((size) => (
              <li key={size.key} className="flex justify-between gap-2">
                <span>
                  {size.label} load
                  {onCard[size.key] == null && <span className="text-stone-500"> (not on the card, estimated)</span>}
                </span>
                <span className="tabular-nums">{money(next.loadPrices[size.key])}</span>
              </li>
            ))}
            <li className="flex justify-between gap-2">
              <span>Minimum charge</span>
              <span className="tabular-nums">{money(next.minimumCharge)}</span>
            </li>
          </ul>
          {card.items.length > 0 && (
            <ul className="space-y-0.5 border-t border-stone-100 pt-2">
              {next.flatItems.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span>{i.name}</span>
                  <span className="tabular-nums">{money(i.price)}</span>
                </li>
              ))}
            </ul>
          )}
          {card.prohibited_items.length > 0 && (
            <p>
              <span className="font-medium">Won&apos;t take:</span> {card.prohibited_items.join(", ")}
            </p>
          )}
          {card.notes.length > 0 && (
            <ul className="list-disc pl-5 text-stone-600">
              {card.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-stone-500">
            This replaces your load prices{card.items.length > 0 ? ", flat-rate items" : ""} and minimum. Your extra charges and costs stay as they are.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={buttonClass.primary}
              onClick={() => {
                saveSettings(next);
                setCard(null);
              }}
            >
              Use these rates
            </button>
            <button type="button" className={buttonClass.secondary} onClick={() => setCard(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
