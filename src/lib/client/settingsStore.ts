"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS } from "@/lib/pricing/defaults";
import type { Settings } from "@/lib/pricing/types";

// Settings live in this browser's localStorage for now — one owner, one phone.
// Swap this module for an API-backed store once there are accounts.

const KEY = "haulcalc.settings.v1";
const listeners = new Set<() => void>();
let cache: Settings | null = null;

/** Fill in fields added since the settings were saved. */
function withDefaults(saved: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    trailer: { ...DEFAULT_SETTINGS.trailer, ...saved.trailer },
    charges: { ...DEFAULT_SETTINGS.charges, ...saved.charges },
    costs: { ...DEFAULT_SETTINGS.costs, ...saved.costs },
  };
}

function read(): Settings {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? withDefaults(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    cache = DEFAULT_SETTINGS;
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveSettings(settings: Settings) {
  cache = settings;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private mode or storage full: keep working for this session.
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
}
