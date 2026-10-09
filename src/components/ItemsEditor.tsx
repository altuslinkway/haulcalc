"use client";

import { useState } from "react";
import { specialItem } from "@/lib/pricing/engine";
import { ITEM_CATEGORIES, type ItemCategoryId } from "@/lib/pricing/categories";
import {
  addLine,
  addOnQuantity,
  customLine,
  lineForCategory,
  lineForItem,
  removeLine,
  setAddOn,
  setLinePricing,
  setLineQuantity,
  updateLine,
} from "@/lib/pricing/estimate";
import type { EstimateLine, ItemFee, JobEstimate, Material, Settings } from "@/lib/pricing/types";
import { buttonClass, Card, money, NumberField, Select, Stepper, TextField } from "./ui";

const MATERIAL_OPTIONS: { value: Material; label: string }[] = [
  { value: "household", label: "Household junk" },
  { value: "construction", label: "Construction debris" },
  { value: "yard", label: "Yard waste" },
  { value: "dense", label: "Concrete, dirt, brick" },
];

const CATEGORY_OPTIONS = ITEM_CATEGORIES.map((c) => ({ value: c.id as ItemCategoryId, label: c.label }));

/** The item type for a hand-added pile, by what it's made of. */
const PILE_TYPE: Record<Material, ItemCategoryId> = {
  household: "mixed_pile",
  construction: "construction",
  yard: "yard_waste",
  dense: "dense",
};

const priceText = (f: ItemFee) => (f.priceLow === f.priceHigh ? money(f.priceLow) : `${money(f.priceLow)}–${money(f.priceHigh)}`);
const yd = (n: number) => `${Math.round(n * 10) / 10} yd³`;

/** Everything in the job, grouped by how it's priced. The owner can edit, add, remove and move items. */
export function ItemsEditor({
  settings,
  estimate,
  onChange,
  onReset,
}: {
  settings: Settings;
  estimate: JobEstimate;
  onChange: (e: JobEstimate) => void;
  onReset?: () => void;
}) {
  const pricingOf = (l: EstimateLine) => specialItem(l, settings)?.pricing ?? "load";
  const groups = [
    { key: "load", title: "Priced by the load", empty: "Nothing priced by the load yet." },
    { key: "flat", title: "Flat rate", empty: "" },
    { key: "onsite", title: "Quote on site", empty: "" },
  ] as const;
  const addOnFees = settings.itemFees.filter((f) => f.pricing === "addon");

  return (
    <Card
      title="Items"
      subtitle="Tap an item to fix it, or move it between the load and a flat rate."
      action={
        onReset && (
          <button type="button" className={buttonClass.ghost} onClick={onReset}>
            Undo edits
          </button>
        )
      }
    >
      <div className="space-y-4">
        {groups.map((g) => {
          const lines = estimate.lines.filter((l) => pricingOf(l) === g.key);
          if (lines.length === 0 && !g.empty) return null;
          const total = lines.reduce((s, l) => s + l.cubicYards, 0);
          return (
            <section key={g.key}>
              <h3 className="mb-1 flex justify-between text-xs font-semibold tracking-wide text-stone-500 uppercase">
                <span>{g.title}</span>
                {lines.length > 0 && <span className="normal-case tabular-nums">{yd(total)}</span>}
              </h3>
              {lines.length === 0 ? (
                <p className="text-sm text-stone-500">{g.empty}</p>
              ) : (
                <ul className="divide-y divide-stone-100 rounded-[14px] border border-stone-200">
                  {lines.map((line) => (
                    <LineRow key={line.id} line={line} settings={settings} estimate={estimate} onChange={onChange} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <AddItem settings={settings} onAdd={(line) => onChange(addLine(estimate, line))} />

        {addOnFees.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">Add-on fees</h3>
            <p className="mb-1 text-xs text-stone-500">Charged on top. These items still count toward the load.</p>
            <ul className="divide-y divide-stone-100">
              {addOnFees.map((fee) => {
                const qty = addOnQuantity(estimate, fee.id);
                return (
                  <li key={fee.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className={`text-sm ${qty > 0 ? "font-semibold text-stone-900" : "text-stone-600"}`}>{fee.name}</p>
                      <p className="text-xs text-stone-500">{priceText(fee)} each</p>
                    </div>
                    <Stepper label={fee.name} value={qty} onChange={(v) => onChange(setAddOn(estimate, fee.id, v))} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </Card>
  );
}

function LineRow({
  line,
  settings,
  estimate,
  onChange,
}: {
  line: EstimateLine;
  settings: Settings;
  estimate: JobEstimate;
  onChange: (e: JobEstimate) => void;
}) {
  const fee = specialItem(line, settings);
  const pricingOptions = [
    { value: "load", label: "By the load (trailer space)" },
    ...settings.itemFees
      .filter((f) => f.pricing !== "addon")
      .map((f) => ({
        value: f.id,
        label: f.pricing === "flat" ? `Flat rate: ${f.name} (${priceText(f)})` : `Quote on site: ${f.name}`,
      })),
  ];
  const tag = fee?.pricing === "flat" ? `${priceText(fee)} flat` : fee?.pricing === "onsite" ? "on site" : yd(line.cubicYards);

  return (
    <li>
      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
          <span className="min-w-0 text-sm text-stone-900">
            {line.quantity > 1 && <span className="font-semibold">{line.quantity}× </span>}
            {line.description}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm text-stone-500 tabular-nums">
            {tag}
            <span aria-hidden className="text-stone-400 transition group-open:rotate-90">
              ›
            </span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-stone-100 bg-stone-50 px-3 py-3">
          <Select
            label="How it's priced"
            value={fee ? fee.id : "load"}
            options={pricingOptions}
            onChange={(v) => onChange(setLinePricing(estimate, line.id, v === "load" ? null : v))}
          />
          <TextField
            label="What it is"
            value={line.description}
            onChange={(description) => onChange(updateLine(estimate, line.id, { description }))}
          />
          <Select<ItemCategoryId>
            label="Item type"
            value={line.category}
            options={CATEGORY_OPTIONS}
            onChange={(category) => onChange(updateLine(estimate, line.id, { category }))}
            hint="Helps the app learn typical sizes"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-stone-700">How many</span>
            <Stepper
              label={line.description}
              value={line.quantity}
              onChange={(q) => onChange(setLineQuantity(estimate, line.id, Math.max(1, q)))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Space, all of them"
              suffix="yd³"
              value={Math.round(line.cubicYards * 100) / 100}
              onChange={(cubicYards) => onChange(updateLine(estimate, line.id, { cubicYards }))}
            />
            <NumberField
              label="Weight, all of them"
              suffix="lbs"
              value={line.weightLbs}
              onChange={(weightLbs) => onChange(updateLine(estimate, line.id, { weightLbs }))}
            />
          </div>
          {!fee && (
            <Select
              label="Material"
              value={line.material}
              options={MATERIAL_OPTIONS}
              onChange={(material) => onChange(updateLine(estimate, line.id, { material }))}
            />
          )}
          <button
            type="button"
            className="text-sm font-semibold text-red-700"
            onClick={() => onChange(removeLine(estimate, line.id))}
          >
            Remove this item
          </button>
        </div>
      </details>
    </li>
  );
}

function AddItem({ settings, onAdd }: { settings: Settings; onAdd: (line: EstimateLine) => void }) {
  const [custom, setCustom] = useState<{ description: string; cubicYards: number; material: Material } | null>(null);
  const special = settings.itemFees.filter((f) => f.pricing !== "addon");

  if (custom) {
    return (
      <div className="space-y-3 rounded-[14px] border border-accent-line bg-accent-soft p-3">
        <TextField
          label="What it is"
          placeholder="e.g. Pile of boxes behind the door"
          value={custom.description}
          onChange={(description) => setCustom({ ...custom, description })}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Space"
            suffix="yd³"
            value={custom.cubicYards}
            onChange={(cubicYards) => setCustom({ ...custom, cubicYards })}
          />
          <Select
            label="Material"
            value={custom.material}
            options={MATERIAL_OPTIONS}
            onChange={(material) => setCustom({ ...custom, material })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={buttonClass.primary}
            disabled={!custom.description.trim() || custom.cubicYards <= 0}
            onClick={() => {
              onAdd(customLine(custom.description.trim(), custom.cubicYards, custom.material, PILE_TYPE[custom.material]));
              setCustom(null);
            }}
          >
            Add to the load
          </button>
          <button type="button" className={buttonClass.secondary} onClick={() => setCustom(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <select
      aria-label="Add an item"
      className="min-h-12 w-full rounded-[14px] border-[1.5px] border-dashed border-stone-400 bg-white px-3 py-2.5 text-base font-semibold text-stone-900"
      value=""
      onChange={(e) => {
        const v = e.target.value;
        if (v === "custom") setCustom({ description: "", cubicYards: 1, material: "household" });
        const fee = special.find((f) => `fee:${f.id}` === v);
        if (fee) onAdd(lineForItem(fee));
        if (v.startsWith("type:")) onAdd(lineForCategory(v.slice(5) as ItemCategoryId));
      }}
    >
      <option value="">+ Add an item the AI missed…</option>
      {special.length > 0 && (
        <optgroup label="Your flat-rate and on-site items">
          {special.map((f) => (
            <option key={f.id} value={`fee:${f.id}`}>
              {f.pricing === "flat" ? `${f.name}, ${priceText(f)} flat` : `${f.name}, quote on site`}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="By the load">
        {ITEM_CATEGORIES.filter((c) => c.unit === "each").map((c) => (
          <option key={c.id} value={`type:${c.id}`}>
            {c.label}
          </option>
        ))}
        <option value="custom">Something else / a pile…</option>
      </optgroup>
    </select>
  );
}
