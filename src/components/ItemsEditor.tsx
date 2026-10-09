"use client";

import { ITEM_CATEGORIES, type ItemCategoryId } from "@/lib/pricing/categories";
import { flatItemFor } from "@/lib/pricing/engine";
import { addLine, lineForCategory, lineForItem, removeLine, setLineItem, setLineQuantity } from "@/lib/pricing/estimate";
import type { EstimateLine, JobEstimate, Settings } from "@/lib/pricing/types";
import { buttonClass, Card, money, Select, Stepper } from "./ui";

/** Everything in the job, split by how it's charged. The owner can fix counts, add, remove and move items. */
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
  const loadLines = estimate.lines.filter((l) => !flatItemFor(l, settings));
  const flatLines = estimate.lines.filter((l) => flatItemFor(l, settings));

  return (
    <Card
      title="What's going"
      subtitle="Tap one to change the count, or charge it as a flat-rate item."
      action={
        onReset && (
          <button type="button" className={buttonClass.ghost} onClick={onReset}>
            Undo edits
          </button>
        )
      }
    >
      <div className="space-y-4">
        <Group title="In the load" lines={loadLines} empty="Nothing charged by the load." {...{ settings, estimate, onChange }} />
        {flatLines.length > 0 && <Group title="Flat-rate items" lines={flatLines} {...{ settings, estimate, onChange }} />}
        <AddItem settings={settings} onAdd={(line) => onChange(addLine(estimate, line))} />
      </div>
    </Card>
  );
}

function Group({
  title,
  lines,
  empty,
  settings,
  estimate,
  onChange,
}: {
  title: string;
  lines: EstimateLine[];
  empty?: string;
  settings: Settings;
  estimate: JobEstimate;
  onChange: (e: JobEstimate) => void;
}) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{title}</h3>
      {lines.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-[14px] border border-stone-200">
          {lines.map((line) => (
            <LineRow key={line.id} line={line} settings={settings} estimate={estimate} onChange={onChange} />
          ))}
        </ul>
      )}
    </section>
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
  const item = flatItemFor(line, settings);
  const options = [
    { value: "load", label: "In the load (by trailer space)" },
    ...settings.flatItems.map((i) => ({ value: i.id, label: `Flat rate: ${i.name}, ${money(i.price)}` })),
  ];

  return (
    <li>
      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
          <span className="min-w-0 text-sm text-stone-900">
            {line.quantity > 1 && <span className="font-semibold">{line.quantity}× </span>}
            {line.description}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm text-stone-500 tabular-nums">
            {item && <span className="font-bold text-stone-900">{money(item.price * line.quantity)}</span>}
            <span aria-hidden className="text-stone-400 transition group-open:rotate-90">
              ›
            </span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-stone-100 bg-stone-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-stone-700">How many</span>
            <Stepper
              label={line.description}
              value={line.quantity}
              min={1}
              onChange={(q) => onChange(setLineQuantity(estimate, line.id, q))}
            />
          </div>
          <Select
            label="How it's charged"
            value={item ? item.id : "load"}
            options={options}
            onChange={(v) => onChange(setLineItem(estimate, line.id, v === "load" ? null : v))}
          />
          <button
            type="button"
            className="min-h-11 text-sm font-semibold text-red-700"
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
  return (
    <select
      aria-label="Add an item"
      className="min-h-12 w-full rounded-[14px] border-[1.5px] border-dashed border-stone-400 bg-white px-3 py-2.5 text-base font-semibold text-stone-900"
      value=""
      onChange={(e) => {
        const v = e.target.value;
        const item = settings.flatItems.find((i) => `flat:${i.id}` === v);
        if (item) onAdd(lineForItem(item));
        if (v.startsWith("type:")) onAdd(lineForCategory(v.slice(5) as ItemCategoryId));
      }}
    >
      <option value="">+ Add something the AI missed…</option>
      {settings.flatItems.length > 0 && (
        <optgroup label="Your flat-rate items">
          {settings.flatItems.map((i) => (
            <option key={i.id} value={`flat:${i.id}`}>
              {i.name}, {money(i.price)}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="In the load">
        {ITEM_CATEGORIES.filter((c) => c.id !== "other").map((c) => (
          <option key={c.id} value={`type:${c.id}`}>
            {c.unit === "pile" ? `${c.label}, about 1 yd³` : c.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
