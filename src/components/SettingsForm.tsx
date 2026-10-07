"use client";

import { useRef, useState } from "react";
import type { RateCard } from "@/lib/ai/schemas";
import { MAX_RATE_CARD_PHOTOS } from "@/lib/ai/limits";
import { postJson } from "@/lib/client/api";
import { preparePhoto } from "@/lib/client/photos";
import { saveSettings, useSettings } from "@/lib/client/settingsStore";
import { DEFAULT_SETTINGS } from "@/lib/pricing/defaults";
import { applyRateCard, slugify } from "@/lib/pricing/rateCard";
import type { Settings } from "@/lib/pricing/types";
import { buttonClass, Card, money, NumberField, Segmented, TextField } from "./ui";

export function SettingsForm() {
  const settings = useSettings();
  const update = (fn: (draft: Settings) => void) => {
    const next = structuredClone(settings);
    fn(next);
    saveSettings(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">My rates</h1>
        <p className="text-sm text-stone-500">Changes save automatically on this device.</p>
      </div>

      <RateCardImport settings={settings} />

      <Card title="Business">
        <div className="space-y-3">
          <TextField
            label="Business name"
            hint="Used to sign quotes you send customers."
            value={settings.businessName}
            onChange={(v) => update((s) => void (s.businessName = v))}
          />
          <div>
            <p className="mb-1 text-sm font-medium text-stone-700">How should jobs be priced?</p>
            <Segmented
              label="Pricing method"
              value={settings.pricingMethod}
              onChange={(v) => update((s) => void (s.pricingMethod = v))}
              options={[
                { value: "rate_card", label: "My rate card" },
                { value: "cost_plus", label: "Costs + margin" },
              ]}
            />
            <p className="mt-1 text-xs text-stone-500">
              {settings.pricingMethod === "rate_card"
                ? "Load size and item prices come from your rate card below. Your costs are used for the profit check."
                : "No rate card: price = your costs (below) marked up to your target margin."}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Trailer">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Name" value={settings.trailer.name} onChange={(v) => update((s) => void (s.trailer.name = v))} />
          <NumberField
            label="Capacity"
            suffix="yd³"
            value={settings.trailer.cubicYards}
            onChange={(v) => update((s) => void (s.trailer.cubicYards = v))}
            hint="L × W × H in feet ÷ 27"
          />
        </div>
      </Card>

      {settings.pricingMethod === "rate_card" && (
        <>
          <LoadTiers settings={settings} update={update} />
          <ItemFees settings={settings} update={update} />
        </>
      )}

      <Card title="Extra charges" subtitle="Added to the customer's price.">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Minimum charge"
            prefix="$"
            value={settings.charges.minimumCharge}
            onChange={(v) => update((s) => void (s.charges.minimumCharge = v))}
          />
          <NumberField
            label="Stairs, per flight"
            prefix="$"
            value={settings.charges.stairsFeePerFlight}
            onChange={(v) => update((s) => void (s.charges.stairsFeePerFlight = v))}
          />
          <NumberField
            label="Free travel radius"
            suffix="mi"
            value={settings.charges.freeTravelMiles}
            onChange={(v) => update((s) => void (s.charges.freeTravelMiles = v))}
          />
          <NumberField
            label="Travel fee past that"
            prefix="$"
            suffix="/ mi"
            value={settings.charges.travelFeePerMile}
            onChange={(v) => update((s) => void (s.charges.travelFeePerMile = v))}
          />
          <NumberField
            label="Weight included in a full load"
            suffix="lbs"
            value={settings.charges.includedLbsPerFullLoad}
            onChange={(v) => update((s) => void (s.charges.includedLbsPerFullLoad = v))}
          />
          <NumberField
            label="Heavy material charge"
            prefix="$"
            suffix="/ ton"
            value={settings.charges.overweightFeePerTon}
            onChange={(v) => update((s) => void (s.charges.overweightFeePerTon = v))}
            hint="For weight over what's included"
          />
        </div>
        {settings.pricingMethod === "cost_plus" && (
          <p className="mt-2 text-xs text-stone-500">With costs + margin pricing, only the minimum charge applies; travel, stairs and weight are already in your costs.</p>
        )}
      </Card>

      <Card title="Your costs" subtitle="What a job costs you. Used for the profit check.">
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium text-stone-700">Dump charges by</p>
            <Segmented
              label="Dump fee method"
              value={settings.costs.dumpFeeMethod}
              onChange={(v) => update((s) => void (s.costs.dumpFeeMethod = v))}
              options={[
                { value: "per_ton", label: "Weight (ton)" },
                { value: "per_cubic_yard", label: "Volume (yd³)" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {settings.costs.dumpFeeMethod === "per_ton" ? (
              <NumberField
                label="Dump fee"
                prefix="$"
                suffix="/ ton"
                value={settings.costs.dumpFeePerTon}
                onChange={(v) => update((s) => void (s.costs.dumpFeePerTon = v))}
              />
            ) : (
              <NumberField
                label="Dump fee"
                prefix="$"
                suffix="/ yd³"
                value={settings.costs.dumpFeePerCubicYard}
                onChange={(v) => update((s) => void (s.costs.dumpFeePerCubicYard = v))}
              />
            )}
            <NumberField
              label="Dump minimum / trip"
              prefix="$"
              value={settings.costs.dumpMinimumPerTrip}
              onChange={(v) => update((s) => void (s.costs.dumpMinimumPerTrip = v))}
            />
            <NumberField
              label="Wage per worker"
              prefix="$"
              suffix="/ hr"
              value={settings.costs.laborWagePerHour}
              onChange={(v) => update((s) => void (s.costs.laborWagePerHour = v))}
            />
            <NumberField
              label="Crew size"
              suffix="people"
              inputMode="numeric"
              value={settings.costs.crewSize}
              onChange={(v) => update((s) => void (s.costs.crewSize = v))}
            />
            <NumberField
              label="Hours to load a full trailer"
              suffix="hrs"
              value={settings.costs.hoursPerFullLoad}
              onChange={(v) => update((s) => void (s.costs.hoursPerFullLoad = v))}
            />
            <NumberField
              label="Truck cost"
              prefix="$"
              suffix="/ mi"
              value={settings.costs.vehicleCostPerMile}
              onChange={(v) => update((s) => void (s.costs.vehicleCostPerMile = v))}
              hint="Fuel, wear, insurance"
            />
            <NumberField
              label="Overhead per job"
              prefix="$"
              value={settings.costs.overheadPerJob}
              onChange={(v) => update((s) => void (s.costs.overheadPerJob = v))}
              hint="Ads, phone, software…"
            />
            <NumberField
              label="Target margin"
              suffix="%"
              value={settings.costs.targetMarginPct}
              onChange={(v) => update((s) => void (s.costs.targetMarginPct = Math.min(95, v)))}
            />
          </div>
        </div>
      </Card>

      <ProhibitedItems settings={settings} update={update} />

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
  );
}

type Update = (fn: (draft: Settings) => void) => void;

const FRACTIONS: [number, string][] = [
  [1 / 8, "1/8"],
  [1 / 6, "1/6"],
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [3 / 8, "3/8"],
  [1 / 2, "1/2"],
  [5 / 8, "5/8"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
  [7 / 8, "7/8"],
  [1, "Full"],
];

function formatFraction(f: number): string {
  return FRACTIONS.find(([v]) => Math.abs(v - f) < 0.001)?.[1] ?? `${Math.round(f * 100)}%`;
}

function parseFraction(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (t === "full") return 1;
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[2]) > 0 ? Number(frac[1]) / Number(frac[2]) : null;
  const pctMatch = t.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (pctMatch) return Number(pctMatch[1]) / 100;
  const n = Number(t);
  return t !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

function LoadTiers({ settings, update }: { settings: Settings; update: Update }) {
  return (
    <Card
      title="Load pricing"
      subtitle="Price range for each share of your trailer. Jobs in between are priced along the range."
      action={
        <button
          type="button"
          className={buttonClass.ghost}
          onClick={() =>
            update((s) =>
              void s.loadTiers.push({
                id: `tier-${crypto.randomUUID().slice(0, 8)}`,
                label: "New tier",
                fraction: 1,
                description: "",
                priceLow: 0,
                priceHigh: 0,
              }),
            )
          }
        >
          + Add
        </button>
      }
    >
      <ul className="space-y-3">
        {settings.loadTiers.map((tier, i) => (
          <li key={tier.id} className="rounded-xl border border-stone-200 p-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Name" value={tier.label} onChange={(v) => update((s) => void (s.loadTiers[i].label = v))} />
              <NumberField
                label="Share of trailer"
                value={tier.fraction}
                format={formatFraction}
                parse={parseFraction}
                inputMode="text"
                onChange={(v) => update((s) => void (s.loadTiers[i].fraction = v))}
                hint="e.g. 1/4, 3/8, 60%"
              />
              <NumberField label="Low" prefix="$" value={tier.priceLow} onChange={(v) => update((s) => void (s.loadTiers[i].priceLow = v))} />
              <NumberField label="High" prefix="$" value={tier.priceHigh} onChange={(v) => update((s) => void (s.loadTiers[i].priceHigh = v))} />
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className="flex-1">
                <TextField
                  label="Typical job"
                  value={tier.description}
                  onChange={(v) => update((s) => void (s.loadTiers[i].description = v))}
                />
              </div>
              <RemoveButton label={tier.label} onClick={() => update((s) => void s.loadTiers.splice(i, 1))} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ItemFees({ settings, update }: { settings: Settings; update: Update }) {
  return (
    <Card
      title="Item fees"
      subtitle="Charged on top of the load price. The AI counts these in photos."
      action={
        <button
          type="button"
          className={buttonClass.ghost}
          onClick={() =>
            update((s) =>
              void s.itemFees.push({
                id: `item-${crypto.randomUUID().slice(0, 8)}`,
                name: "New item",
                priceLow: 0,
                priceHigh: 0,
                onSiteQuote: false,
                disposalCost: 0,
                hint: "",
              }),
            )
          }
        >
          + Add
        </button>
      }
    >
      <ul className="space-y-3">
        {settings.itemFees.map((fee, i) => (
          <li key={fee.id} className="rounded-xl border border-stone-200 p-3">
            <div className="space-y-3">
              <TextField label="Item" value={fee.name} onChange={(v) => update((s) => void (s.itemFees[i].name = v))} />
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-orange-600"
                  checked={fee.onSiteQuote}
                  onChange={(e) => update((s) => void (s.itemFees[i].onSiteQuote = e.target.checked))}
                />
                Quote on site (flag it, don&apos;t price it)
              </label>
              {!fee.onSiteQuote && (
                <div className="grid grid-cols-3 gap-2">
                  <NumberField label="Low" prefix="$" value={fee.priceLow} onChange={(v) => update((s) => void (s.itemFees[i].priceLow = v))} />
                  <NumberField label="High" prefix="$" value={fee.priceHigh} onChange={(v) => update((s) => void (s.itemFees[i].priceHigh = v))} />
                  <NumberField
                    label="Your cost"
                    prefix="$"
                    value={fee.disposalCost}
                    onChange={(v) => update((s) => void (s.itemFees[i].disposalCost = v))}
                  />
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <TextField
                    label="What counts (helps the AI)"
                    value={fee.hint}
                    onChange={(v) => update((s) => void (s.itemFees[i].hint = v))}
                  />
                </div>
                <RemoveButton label={fee.name} onClick={() => update((s) => void s.itemFees.splice(i, 1))} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProhibitedItems({ settings, update }: { settings: Settings; update: Update }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    update((s) => void s.prohibitedItems.push(v));
    setDraft("");
  };
  return (
    <Card title="Items you won't take" subtitle="The AI flags these in photos so you can warn the customer.">
      <ul className="flex flex-wrap gap-2">
        {settings.prohibitedItems.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-center gap-1 rounded-full bg-red-50 py-1 pr-1 pl-3 text-sm text-red-900">
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-red-700 active:bg-red-100"
              onClick={() => update((s) => void s.prohibitedItems.splice(i, 1))}
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
          className="w-full min-w-0 rounded-lg border border-stone-300 px-3 py-2.5 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 focus:outline-none"
          placeholder="Add an item, e.g. tires"
          aria-label="Add a prohibited item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={`${buttonClass.secondary} py-2`}>
          Add
        </button>
      </form>
    </Card>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Remove ${label}`}
      onClick={onClick}
      className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-300 text-stone-500 active:bg-stone-100"
    >
      🗑
    </button>
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

  return (
    <Card
      title="Import from your rate card"
      subtitle={`Snap or upload up to ${MAX_RATE_CARD_PHOTOS} photos of your price sheet, trailer sign or flyer. You'll review before anything changes.`}
      className="border-orange-200 bg-orange-50/60"
    >
      <button
        type="button"
        className={`${buttonClass.primary} w-full`}
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        {busy ? "Reading your rate card…" : "Upload rate card photos"}
      </button>
      <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => read(e.target.files)} />
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {card && (
        <div className="mt-4 space-y-3 rounded-xl bg-white p-3 text-sm">
          <p className="font-semibold text-stone-900">Here&apos;s what I found:</p>
          {card.load_tiers.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Load pricing</p>
              <ul className="mt-1 space-y-0.5">
                {card.load_tiers.map((t) => (
                  <li key={`${t.label}-${t.fraction}`} className="flex justify-between gap-2">
                    <span>
                      {t.label} <span className="text-stone-500">({formatFraction(t.fraction)})</span>
                    </span>
                    <span className="tabular-nums">{priceText(t.price_low, t.price_high)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {card.item_fees.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Item fees</p>
              <ul className="mt-1 space-y-0.5">
                {card.item_fees.map((f) => (
                  <li key={slugify(f.name)} className="flex justify-between gap-2">
                    <span>{f.name}</span>
                    <span className="tabular-nums">{f.on_site_quote ? "On-site quote" : priceText(f.price_low, f.price_high)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {card.prohibited_items.length > 0 && (
            <p>
              <span className="font-medium">Won&apos;t take:</span> {card.prohibited_items.join(", ")}
            </p>
          )}
          {card.minimum_charge != null && (
            <p>
              <span className="font-medium">Minimum charge:</span> {money(card.minimum_charge)}
            </p>
          )}
          {card.notes.length > 0 && (
            <ul className="list-disc pl-5 text-stone-600">
              {card.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-stone-500">Applying replaces your load pricing, item fees and prohibited list. Your costs stay as they are.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={buttonClass.primary}
              onClick={() => {
                saveSettings({ ...applyRateCard(settings, card), pricingMethod: "rate_card" });
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
    </Card>
  );
}

const priceText = (low: number, high: number) => (low === high ? money(low) : `${money(low)}–${money(high)}`);
