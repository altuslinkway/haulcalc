"use client";

import { useId, useState, type ReactNode } from "react";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-stone-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <input id={id} className={inputClass} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <textarea
          id={id}
          rows={rows}
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

/**
 * A number input that lets people clear it and retype without it snapping
 * back to 0, while still following outside changes to `value`.
 */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
  parse = parseNumber,
  format = String,
  inputMode = "decimal",
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  parse?: (text: string) => number | null;
  format?: (v: number) => string;
  inputMode?: "decimal" | "numeric" | "text";
}) {
  const [text, setText] = useState(format(value));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(format(value));
  }

  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
          {prefix && <span className="pl-3 text-stone-500">{prefix}</span>}
          <input
            id={id}
            inputMode={inputMode}
            className="w-full min-w-0 rounded-lg bg-transparent px-2 py-2.5 text-base text-stone-900 focus:outline-none"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const n = parse(e.target.value);
              if (n !== null) {
                setShown(n);
                onChange(n);
              }
            }}
            onBlur={() => setText(format(value))}
          />
          {suffix && <span className="pr-3 text-sm whitespace-nowrap text-stone-500">{suffix}</span>}
        </div>
      )}
    </Field>
  );
}

function parseNumber(text: string): number | null {
  const n = Number(text.replace(/[$,\s]/g, ""));
  return text.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  label: string;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-semibold text-stone-700 active:bg-stone-100 disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="w-6 text-center text-base font-semibold tabular-nums">{value}</span>
      <button type="button" className={btn} aria-label={`More ${label}`} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-stone-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            o.value === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-base font-semibold text-white shadow-sm active:bg-orange-700 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base font-semibold text-stone-800 active:bg-stone-100 disabled:opacity-50",
  ghost: "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-orange-700 active:bg-orange-50",
};

export { money, moneyRange } from "@/lib/format";

/** A labeled on/off switch row. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm text-stone-900">{label}</span>
        {hint && <span className="block text-xs text-stone-500">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-stone-300 transition peer-checked:bg-orange-600 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/40 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
