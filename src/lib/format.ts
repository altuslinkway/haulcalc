// Shared formatting for money and trailer fractions.

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const moneyRange = (low: number, high: number) =>
  Math.round(low) === Math.round(high) ? money(low) : `${money(low)} – ${money(high)}`;

const FRACTIONS: [number, string][] = [
  [1 / 16, "1/16"],
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

/** 0.25 → "1/4", 0.6 → "60%". */
export function formatFraction(f: number): string {
  return FRACTIONS.find(([v]) => Math.abs(v - f) < 0.001)?.[1] ?? `${Math.round(f * 100)}%`;
}

/** Accepts "1/4", "3/8", "60%", "0.5" or "full". */
export function parseFraction(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (t === "full") return 1;
  const frac = t.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?$/);
  if (frac && frac[2] && frac[3]) {
    const whole = frac[1] ? Number(frac[1]) : 0;
    return Number(frac[3]) > 0 ? whole + Number(frac[2]) / Number(frac[3]) : null;
  }
  const pct = t.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (pct) return Number(pct[1]) / 100;
  const n = Number(t);
  return t !== "" && Number.isFinite(n) && n > 0 ? n : null;
}
