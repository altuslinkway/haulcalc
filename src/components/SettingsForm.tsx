"use client";

import { useRef, useState } from "react";
import { MAX_RATE_CARD_PHOTOS } from "@/lib/ai/limits";
import type { RateCard } from "@/lib/ai/schemas";
import { postJson } from "@/lib/client/api";
import { preparePhoto } from "@/lib/client/photos";
import { saveSettings, useSettings } from "@/lib/client/settingsStore";
import { formatFraction, parseFraction } from "@/lib/format";
import { DEFAULT_SETTINGS, trailerCubicYards } from "@/lib/pricing/defaults";
import { applyRateCard, slugify } from "@/lib/pricing/rateCard";
import type { DensePolicy, ItemPricing, Settings } from "@/lib/pricing/types";
import { buttonClass, Card, money, NumberField, Segmented, Select, TextField, Toggle } from "./ui";

type Update = (fn: (draft: Settings) => void) => void;

const PRICING_OPTIONS: { value: ItemPricing; label: string }[] = [
  { value: "flat", label: "Flat rate (its space isn't charged)" },
  { value: "addon", label: "Add-on fee (still counts toward the load)" },
  { value: "onsite", label: "Quote on site" },
];

export function SettingsForm() {
  const settings = useSettings();
  const update: Update = (fn) => {
    const next = structuredClone(settings);
    fn(next);
    saveSettings(next);
  };
  const { charges, costs } = settings;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[32px] leading-none font-bold tracking-[-0.015em]">My rates</h1>
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
                ? "Load size and item prices come from your rates below. Your costs drive the profit check."
                : "Price = your costs (below) marked up to your target margin. Best for unusual jobs; it tends to overprice small loads and underprice full ones."}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Trailer" subtitle={`Holds about ${Math.round(trailerCubicYards(settings.trailer) * 10) / 10} yd³ (length × width × side height ÷ 27).`}>
        <div className="space-y-3">
          <TextField label="Name" value={settings.trailer.name} onChange={(v) => update((s) => void (s.trailer.name = v))} />
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Length" suffix="ft" value={settings.trailer.lengthFt} onChange={(v) => update((s) => void (s.trailer.lengthFt = v))} />
            <NumberField label="Width" suffix="ft" value={settings.trailer.widthFt} onChange={(v) => update((s) => void (s.trailer.widthFt = v))} />
            <NumberField label="Sides" suffix="ft" value={settings.trailer.sideHeightFt} onChange={(v) => update((s) => void (s.trailer.sideHeightFt = v))} />
          </div>
          <NumberField
            label="Payload"
            suffix="lbs"
            value={settings.trailer.payloadLbs}
            onChange={(v) => update((s) => void (s.trailer.payloadLbs = v))}
            hint="Weight rating minus the empty trailer. A 14k dump trailer carries about 9,500 lbs. Side boards add space, not payload."
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
          <NumberField label="Minimum charge" prefix="$" value={charges.minimumCharge} onChange={(v) => update((s) => void (s.charges.minimumCharge = v))} />
          <NumberField
            label="Stairs, per flight"
            prefix="$"
            value={charges.stairsFeePerFlight}
            onChange={(v) => update((s) => void (s.charges.stairsFeePerFlight = v))}
            hint="Doubled over half a load"
          />
          <NumberField label="Free travel radius" suffix="mi" value={charges.freeTravelMiles} onChange={(v) => update((s) => void (s.charges.freeTravelMiles = v))} />
          <NumberField label="Travel fee past that" prefix="$" suffix="/ mi" value={charges.travelFeePerMile} onChange={(v) => update((s) => void (s.charges.travelFeePerMile = v))} />
          <NumberField label="Carry included" suffix="ft" value={charges.freeCarryFeet} onChange={(v) => update((s) => void (s.charges.freeCarryFeet = v))} />
          <NumberField label="Long carry, per 50 ft" prefix="$" value={charges.longCarryFeePer50Ft} onChange={(v) => update((s) => void (s.charges.longCarryFeePer50Ft = v))} />
          <NumberField
            label="Weight included"
            suffix="lbs / yd³"
            value={charges.includedLbsPerCubicYard}
            onChange={(v) => update((s) => void (s.charges.includedLbsPerCubicYard = v))}
            hint="Household junk is about 200"
          />
          <NumberField
            label="Heavy material"
            prefix="$"
            suffix="/ ton"
            value={charges.heavyFeePerTon}
            onChange={(v) => update((s) => void (s.charges.heavyFeePerTon = v))}
            hint="Over the included weight. Never less than 2× your dump rate."
          />
        </div>
        <div className="mt-3">
          <Select<DensePolicy>
            label="Concrete, dirt, brick and rock"
            value={charges.densePolicy}
            onChange={(v) => update((s) => void (s.charges.densePolicy = v))}
            options={[
              { value: "quote", label: "Quote it (heavy-material charge applies)" },
              { value: "review", label: "Flag it for me to review" },
              { value: "decline", label: "I don't take it" },
            ]}
          />
        </div>
        {settings.pricingMethod === "cost_plus" && (
          <p className="mt-2 text-xs text-stone-500">
            With costs + margin pricing, only the minimum and the job options below apply; travel, stairs and weight are already in your costs.
          </p>
        )}
      </Card>

      <Card title="Job options" subtitle="Switched on per job when you quote.">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Same-day" prefix="$" value={charges.sameDayFee} onChange={(v) => update((s) => void (s.charges.sameDayFee = v))} />
          <NumberField label="After-hours" suffix="%" value={charges.afterHoursPct} onChange={(v) => update((s) => void (s.charges.afterHoursPct = v))} />
          <NumberField label="Packed rooms" suffix="%" value={charges.hoarderPct} onChange={(v) => update((s) => void (s.charges.hoarderPct = v))} />
        </div>
      </Card>

      <Card title="Photo estimates" subtitle="How the AI's read of the photos becomes a price range.">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Cushion for unseen items"
            suffix="%"
            value={settings.estimate.unseenPct}
            onChange={(v) => update((s) => void (s.estimate.unseenPct = v))}
            hint="Added to the top of the range"
          />
          <NumberField
            label="Cushion, big or unclear jobs"
            suffix="%"
            value={settings.estimate.unseenHighRiskPct}
            onChange={(v) => update((s) => void (s.estimate.unseenHighRiskPct = v))}
            hint="Multi-room, cleanouts, low confidence"
          />
        </div>
        <p className="mt-3 mb-1 text-sm font-medium text-stone-700">Range around what&apos;s visible, by AI confidence</p>
        <div className="grid grid-cols-3 gap-2">
          {(["high", "medium", "low"] as const).map((c) => (
            <NumberField
              key={c}
              label={`${c[0].toUpperCase()}${c.slice(1)}`}
              prefix="±"
              suffix="%"
              value={settings.estimate.spreadPct[c]}
              onChange={(v) => update((s) => void (s.estimate.spreadPct[c] = v))}
            />
          ))}
        </div>
      </Card>

      <Card title="Getting smarter" subtitle="Every corrected quote and rated job makes estimates better, for you and every owner.">
        <div className="divide-y divide-stone-100">
          <Toggle
            label="Share my corrections"
            hint="Item types, sizes, weights and how jobs turned out. Never photos, names, addresses or prices."
            checked={settings.learning.shareData}
            onChange={(v) => update((s) => void (s.learning.shareData = v))}
          />
          <Toggle
            label="Use what all owners have learned"
            hint="Better item sizes for the AI, and a correction for how far off similar jobs have run."
            checked={settings.learning.useNetwork}
            onChange={(v) => update((s) => void (s.learning.useNetwork = v))}
          />
        </div>
        <div className="mt-3">
          {settings.estimate.calibrationPct === null ? (
            <p className="text-sm text-stone-600">
              No correction of your own set.{" "}
              <button type="button" className="font-bold text-accent-deep" onClick={() => update((s) => void (s.estimate.calibrationPct = 0))}>
                Set my own
              </button>
            </p>
          ) : (
            <div className="space-y-1">
              <NumberField
                label="My own correction"
                suffix="%"
                value={settings.estimate.calibrationPct}
                parse={parseSigned}
                inputMode="text"
                onChange={(v) => update((s) => void (s.estimate.calibrationPct = v))}
                hint="Replaces the all-owners correction on your quotes. +10 means your jobs run 10% bigger than the AI guesses. Jobs suggests one from your rated jobs."
              />
              <button type="button" className="min-h-11 text-sm font-bold text-accent-deep" onClick={() => update((s) => void (s.estimate.calibrationPct = null))}>
                Clear it
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card title="Your costs" subtitle="What a job costs you. Drives the profit check.">
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium text-stone-700">Dump charges by</p>
            <Segmented
              label="Dump fee method"
              value={costs.dumpFeeMethod}
              onChange={(v) => update((s) => void (s.costs.dumpFeeMethod = v))}
              options={[
                { value: "per_ton", label: "Weight (ton)" },
                { value: "per_cubic_yard", label: "Volume (yd³)" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {costs.dumpFeeMethod === "per_ton" ? (
              <NumberField
                label="Dump fee"
                prefix="$"
                suffix="/ ton"
                value={costs.dumpFeePerTon}
                onChange={(v) => update((s) => void (s.costs.dumpFeePerTon = v))}
                hint="US landfills average ~$63; city transfer stations often $100–$245"
              />
            ) : (
              <NumberField label="Dump fee" prefix="$" suffix="/ yd³" value={costs.dumpFeePerCubicYard} onChange={(v) => update((s) => void (s.costs.dumpFeePerCubicYard = v))} />
            )}
            <NumberField label="Dump minimum / trip" prefix="$" value={costs.dumpMinimumPerTrip} onChange={(v) => update((s) => void (s.costs.dumpMinimumPerTrip = v))} />
          </div>
          <p className="text-sm font-medium text-stone-700">Dump rate vs household junk</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["construction", "Construction"],
                ["yard", "Yard waste"],
                ["dense", "Concrete/dirt"],
              ] as const
            ).map(([m, label]) => (
              <NumberField
                key={m}
                label={label}
                suffix="%"
                value={Math.round(costs.materialRateFactor[m] * 100)}
                onChange={(v) => update((s) => void (s.costs.materialRateFactor[m] = v / 100))}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Dump run time" suffix="min" value={costs.dumpTripMinutes} onChange={(v) => update((s) => void (s.costs.dumpTripMinutes = v))} hint="Detour, line and unloading" />
            <NumberField label="Dump run distance" suffix="mi" value={costs.dumpTripMiles} onChange={(v) => update((s) => void (s.costs.dumpTripMiles = v))} />
            <NumberField label="Wage per worker" prefix="$" suffix="/ hr" value={costs.laborWagePerHour} onChange={(v) => update((s) => void (s.costs.laborWagePerHour = v))} hint="Count yourself too" />
            <NumberField label="Payroll taxes & comp" suffix="%" value={costs.payrollBurdenPct} onChange={(v) => update((s) => void (s.costs.payrollBurdenPct = v))} />
            <NumberField label="Crew size" suffix="people" inputMode="numeric" value={costs.crewSize} onChange={(v) => update((s) => void (s.costs.crewSize = v))} />
            <NumberField label="Hours to load a full trailer" suffix="hrs" value={costs.hoursPerFullLoad} onChange={(v) => update((s) => void (s.costs.hoursPerFullLoad = v))} />
            <NumberField label="Truck & fuel" prefix="$" suffix="/ mi" value={costs.vehicleCostPerMile} onChange={(v) => update((s) => void (s.costs.vehicleCostPerMile = v))} hint="Fuel and wear. Payments go in overhead." />
            <NumberField label="Overhead per job" prefix="$" value={costs.overheadPerJob} onChange={(v) => update((s) => void (s.costs.overheadPerJob = v))} hint="Truck payments, insurance, phone, software" />
            <NumberField label="Marketing per paid lead" prefix="$" value={costs.marketingPerPaidLead} onChange={(v) => update((s) => void (s.costs.marketingPerPaidLead = v))} hint="Google, Thumbtack, Angi" />
            <NumberField label="Card fees" suffix="%" value={costs.cardFeePct} onChange={(v) => update((s) => void (s.costs.cardFeePct = v))} />
            <NumberField label="Target margin" suffix="%" value={costs.targetMarginPct} onChange={(v) => update((s) => void (s.costs.targetMarginPct = Math.min(90, v)))} />
            <NumberField label="Target per truck-hour" prefix="$" value={costs.targetRevenuePerTruckHour} onChange={(v) => update((s) => void (s.costs.targetRevenuePerTruckHour = v))} />
          </div>
        </div>
      </Card>

      <ListEditor
        title="Questions for every customer"
        subtitle="Sent with the photo request on the quote screen."
        items={settings.standardQuestions}
        placeholder="Add a question"
        onChange={(items) => update((s) => void (s.standardQuestions = items))}
      />

      <ListEditor
        title="Items you won't take"
        subtitle="The AI flags these in photos so you can warn the customer."
        items={settings.prohibitedItems}
        placeholder="Add an item, e.g. tires"
        chips
        onChange={(items) => update((s) => void (s.prohibitedItems = items))}
      />

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

function parseSigned(text: string): number | null {
  const n = Number(text.replace(/[%\s+]/g, ""));
  return text.trim() !== "" && text.trim() !== "-" && Number.isFinite(n) ? n : null;
}

function LoadTiers({ settings, update }: { settings: Settings; update: Update }) {
  return (
    <Card
      title="Load pricing"
      subtitle="Price range for each share of your trailer. Jobs in between are priced along the range. Charge more per yard on small loads: the trip costs the same."
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
                <TextField label="Typical job" value={tier.description} onChange={(v) => update((s) => void (s.loadTiers[i].description = v))} />
              </div>
              <IconButton label={`Remove ${tier.label}`} onClick={() => update((s) => void s.loadTiers.splice(i, 1))}>
                🗑
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ItemFees({ settings, update }: { settings: Settings; update: Update }) {
  const move = (i: number, by: number) =>
    update((s) => {
      const j = i + by;
      if (j < 0 || j >= s.itemFees.length) return;
      [s.itemFees[i], s.itemFees[j]] = [s.itemFees[j], s.itemFees[i]];
    });

  return (
    <Card
      title="Item pricing"
      subtitle="Flat rate: one price covers the item, like a fridge. Add-on: a fee on top while the item still counts toward the load, like a mattress."
      action={
        <button
          type="button"
          className={buttonClass.ghost}
          onClick={() =>
            update((s) =>
              void s.itemFees.push({
                id: `item-${crypto.randomUUID().slice(0, 8)}`,
                name: "New item",
                pricing: "flat",
                priceLow: 0,
                priceHigh: 0,
                disposalCost: 0,
                cubicYardsEach: 1,
                lbsEach: 100,
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
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField label="Item" value={fee.name} onChange={(v) => update((s) => void (s.itemFees[i].name = v))} />
                </div>
                <IconButton label={`Move ${fee.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </IconButton>
                <IconButton label={`Move ${fee.name} down`} disabled={i === settings.itemFees.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </IconButton>
              </div>
              <Select<ItemPricing>
                label="How it's charged"
                value={fee.pricing}
                options={PRICING_OPTIONS}
                onChange={(v) => update((s) => void (s.itemFees[i].pricing = v))}
              />
              {fee.pricing !== "onsite" && (
                <div className="grid grid-cols-3 gap-2">
                  <NumberField label="Low" prefix="$" value={fee.priceLow} onChange={(v) => update((s) => void (s.itemFees[i].priceLow = v))} />
                  <NumberField label="High" prefix="$" value={fee.priceHigh} onChange={(v) => update((s) => void (s.itemFees[i].priceHigh = v))} />
                  <NumberField label="Your cost" prefix="$" value={fee.disposalCost} onChange={(v) => update((s) => void (s.itemFees[i].disposalCost = v))} />
                </div>
              )}
              {fee.pricing !== "addon" && (
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Space each"
                    suffix="yd³"
                    value={fee.cubicYardsEach}
                    onChange={(v) => update((s) => void (s.itemFees[i].cubicYardsEach = v))}
                    hint="For trips, not price"
                  />
                  <NumberField label="Weight each" suffix="lbs" value={fee.lbsEach} onChange={(v) => update((s) => void (s.itemFees[i].lbsEach = v))} />
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
                <IconButton label={`Remove ${fee.name}`} onClick={() => update((s) => void s.itemFees.splice(i, 1))}>
                  🗑
                </IconButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
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
    <Card title={title} subtitle={subtitle}>
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
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-300 text-stone-500 active:bg-stone-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const PRICING_LABEL: Record<ItemPricing, string> = { flat: "flat", addon: "add-on", onsite: "on site" };

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
      className="border-accent-line bg-accent-soft"
    >
      <button type="button" className={`${buttonClass.primary} w-full`} disabled={busy} onClick={() => fileInput.current?.click()}>
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
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Item pricing</p>
              <ul className="mt-1 space-y-0.5">
                {card.item_fees.map((f) => (
                  <li key={slugify(f.name)} className="flex justify-between gap-2">
                    <span>
                      {f.name} <span className="text-stone-500">({PRICING_LABEL[f.pricing]})</span>
                    </span>
                    <span className="tabular-nums">{f.pricing === "onsite" ? "On-site quote" : priceText(f.price_low, f.price_high)}</span>
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
          <p className="text-xs text-stone-500">
            Applying replaces your load pricing, item pricing and prohibited list. Your costs stay as they are. You can change any item from flat to add-on afterwards.
          </p>
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
