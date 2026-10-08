import postgres from "postgres";
import { EMPTY_MODEL, learn, type LearnedModel } from "./learn";
import { createFileStore, createPostgresStore, type FeedbackStore } from "./store";

// Server-only: picks the feedback store from the environment and keeps the
// learned model in memory for a few minutes so every photo analysis doesn't
// re-read the whole table.

let store: FeedbackStore | null | undefined;

export function getFeedbackStore(): FeedbackStore | null {
  if (store !== undefined) return store;
  if (process.env.DATABASE_URL) {
    // prepare: false keeps it working behind transaction poolers (Neon, Supabase).
    const sql = postgres(process.env.DATABASE_URL, { max: 3, prepare: false, onnotice: () => {} });
    store = createPostgresStore({ query: (text, params) => sql.unsafe(text, (params ?? []) as never[]) });
  } else if (process.env.HAULCALC_FEEDBACK_FILE || process.env.NODE_ENV === "development") {
    store = createFileStore(process.env.HAULCALC_FEEDBACK_FILE || ".data/feedback.json");
  } else {
    store = null;
  }
  return store;
}

const TTL_MS = Number(process.env.HAULCALC_LEARNING_TTL_MS ?? 10 * 60_000);
let cached: { at: number; model: LearnedModel } | null = null;

export async function getLearnedModel(): Promise<LearnedModel> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.model;
  const s = getFeedbackStore();
  if (!s) return EMPTY_MODEL;
  try {
    const model = learn(await s.recent());
    cached = { at: Date.now(), model };
    return model;
  } catch (err) {
    // Learning is a bonus: a database hiccup must never block a quote.
    console.error("Couldn't load learned model", err);
    return cached?.model ?? EMPTY_MODEL;
  }
}
