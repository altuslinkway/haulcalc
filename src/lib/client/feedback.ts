"use client";

import type { FeedbackRequest } from "@/lib/ai/schemas";
import type { FeedbackLine } from "@/lib/learning/learn";
import type { EstimateLine } from "@/lib/pricing/types";

// Sends anonymous corrections to the shared learning store. Fire and forget:
// a quote never waits on this, and failures (no database configured, offline)
// are ignored.

const DEVICE_KEY = "haulcalc.device";

/** A random id for this browser, so each owner's corrections count once. Not tied to any person. */
export function deviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Only what learning needs: no descriptions, which could hold customer details. */
export const toFeedbackLines = (lines: EstimateLine[]): FeedbackLine[] =>
  lines.map(({ id, category, quantity, cubicYards, weightLbs }) => ({
    id,
    category,
    quantity,
    cubicYards: Math.round(cubicYards * 100) / 100,
    weightLbs: Math.round(weightLbs),
  }));

export function sendFeedback(body: Omit<FeedbackRequest, "deviceId">) {
  void fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, deviceId: deviceId() }),
    keepalive: true,
  }).catch(() => {});
}
