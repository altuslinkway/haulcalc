"use client";

import { DEFAULT_SETTINGS } from "@/lib/pricing/defaults";
import type { Settings } from "@/lib/pricing/types";
import { createLocalStore } from "./localStore";

/** Fill in fields added since the settings were saved. */
function withDefaults(saved: unknown): Settings {
  const s = (saved ?? {}) as Partial<Settings>;
  const d = DEFAULT_SETTINGS;
  return {
    ...d,
    ...s,
    trailer: { ...d.trailer, ...s.trailer },
    estimate: { ...d.estimate, ...s.estimate, spreadPct: { ...d.estimate.spreadPct, ...s.estimate?.spreadPct } },
    charges: { ...d.charges, ...s.charges },
    costs: {
      ...d.costs,
      ...s.costs,
      materialRateFactor: { ...d.costs.materialRateFactor, ...s.costs?.materialRateFactor },
    },
  };
}

// v2: item pricing kinds and the research-based rates. v1 settings are left behind.
const store = createLocalStore<Settings>("haulcalc.settings.v2", DEFAULT_SETTINGS, withDefaults);

export const useSettings = store.use;
export const saveSettings = store.save;
