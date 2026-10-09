"use client";

import { DEFAULT_SETTINGS, TRAILERS } from "@/lib/pricing/defaults";
import { uniqueIds } from "@/lib/pricing/rateCard";
import type { Settings } from "@/lib/pricing/types";
import { createLocalStore } from "./localStore";

/** Fill in fields added since the settings were saved. */
export function withDefaults(saved: unknown): Settings {
  const s = (saved ?? {}) as Partial<Settings>;
  const d = DEFAULT_SETTINGS;
  return {
    ...d,
    ...s,
    trailer: { ...d.trailer, ...s.trailer },
    loadPrices: { ...d.loadPrices, ...s.loadPrices },
    flatItems: Array.isArray(s.flatItems) ? s.flatItems : d.flatItems,
    extras: { ...d.extras, ...s.extras },
    costs: { ...d.costs, ...s.costs },
    learning: { ...d.learning, ...s.learning },
    paymentInfo: typeof s.paymentInfo === "string" ? s.paymentInfo : "",
    calibrationPct: s.calibrationPct ?? null,
  };
}

/** The parts of the older, more detailed settings that still mean the same thing. */
interface SettingsV2 {
  businessName?: string;
  trailer?: { lengthFt: number; widthFt: number; sideHeightFt: number; payloadLbs: number };
  loadTiers?: { fraction: number; priceLow: number; priceHigh: number }[];
  itemFees?: { name: string; pricing: string; priceLow: number; priceHigh: number }[];
  prohibitedItems?: string[];
  standardQuestions?: string[];
  estimate?: { calibrationPct: number | null };
  learning?: Settings["learning"];
  charges?: {
    minimumCharge: number;
    freeTravelMiles: number;
    travelFeePerMile: number;
    stairsFeePerFlight: number;
    heavyFeePerTon: number;
  };
  costs?: { dumpFeePerTon: number; vehicleCostPerMile: number; crewSize: number; laborWagePerHour: number };
}

/** Carry an owner's rates over from the older settings, so an update doesn't wipe them. */
export function fromV2(old: SettingsV2): Settings {
  const s = structuredClone(DEFAULT_SETTINGS);
  if (old.businessName) s.businessName = old.businessName;

  if (old.trailer) {
    const cy = Math.round(((old.trailer.lengthFt * old.trailer.widthFt * old.trailer.sideHeightFt) / 27) * 10) / 10;
    const preset = TRAILERS.find((t) => Math.abs(t.cubicYards - cy) < 0.3);
    s.trailer = { preset: preset?.id ?? "custom", cubicYards: cy, payloadLbs: old.trailer.payloadLbs };
  }

  const at = (fraction: number) => old.loadTiers?.find((t) => Math.abs(t.fraction - fraction) < 0.01)?.priceHigh;
  s.loadPrices = {
    quarter: at(0.25) ?? s.loadPrices.quarter,
    half: at(0.5) ?? s.loadPrices.half,
    threeQuarter: at(0.75) ?? s.loadPrices.threeQuarter,
    full: at(1) ?? s.loadPrices.full,
  };

  const priced = (old.itemFees ?? []).filter((f) => f.pricing !== "onsite" && f.priceHigh > 0);
  if (priced.length > 0) {
    const ids = uniqueIds(priced.map((f) => f.name));
    s.flatItems = priced.map((f, i) => ({
      id: ids[i],
      name: f.name,
      price: Math.round((f.priceLow + f.priceHigh) / 2),
    }));
  }

  if (old.prohibitedItems) s.prohibitedItems = old.prohibitedItems;
  if (old.standardQuestions) s.standardQuestions = old.standardQuestions;
  if (old.learning) s.learning = old.learning;
  s.calibrationPct = old.estimate?.calibrationPct ?? null;

  if (old.charges) {
    s.minimumCharge = old.charges.minimumCharge;
    s.extras = {
      freeMiles: old.charges.freeTravelMiles,
      perMile: old.charges.travelFeePerMile,
      stairsPerFlight: old.charges.stairsFeePerFlight,
      heavyPerTon: old.charges.heavyFeePerTon,
    };
  }
  if (old.costs) {
    s.costs = {
      dumpFeePerTon: old.costs.dumpFeePerTon,
      gasPerMile: old.costs.vehicleCostPerMile,
      helpers: Math.max(0, old.costs.crewSize - 1),
      helperPerHour: old.costs.laborWagePerHour,
    };
  }
  return withDefaults(s);
}

function readV2(): Settings | null {
  try {
    const raw = window.localStorage.getItem("haulcalc.settings.v2");
    return raw ? fromV2(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

// v3: four load prices, a minimum and flat-rate items.
const store = createLocalStore<Settings>("haulcalc.settings.v3", DEFAULT_SETTINGS, withDefaults, readV2);

export const useSettings = store.use;
export const readSettings = store.read;
export const saveSettings = store.save;
