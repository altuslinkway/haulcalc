"use client";

import { useSyncExternalStore } from "react";

// A value kept in this browser's localStorage that React components can
// subscribe to. Everything lives on one device for now; swap this for an
// API-backed store once there are accounts.

export function createLocalStore<T>(
  key: string,
  fallback: T,
  normalize: (saved: unknown) => T = (s) => s as T,
  /** Read an older version's data when nothing's saved under this key yet. */
  migrate: () => T | null = () => null,
) {
  const listeners = new Set<() => void>();
  let cache: T | null = null;

  function read(): T {
    if (cache !== null) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? normalize(JSON.parse(raw)) : (migrate() ?? fallback);
    } catch {
      cache = fallback;
    }
    return cache;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
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

  function save(value: T) {
    cache = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode or storage full: keep working for this session.
    }
    listeners.forEach((l) => l());
  }

  function use(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { read, save, use };
}
