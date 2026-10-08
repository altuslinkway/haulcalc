import { FeedbackRequestSchema } from "@/lib/ai/schemas";
import { getFeedbackStore } from "@/lib/learning/server";

/** Pooled, anonymous corrections from owners: a sent quote, then later how the job went. */
export async function POST(request: Request) {
  const store = getFeedbackStore();
  if (!store) {
    return Response.json({ error: "Shared learning isn't set up on this server." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const parsed = FeedbackRequestSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.quote && !parsed.data.outcome)) {
    return Response.json({ error: "Invalid feedback." }, { status: 400 });
  }

  const { id, deviceId, quote, outcome } = parsed.data;
  try {
    await store.upsert(id, deviceId, { ...quote, ...(outcome ? { outcome } : {}) });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Couldn't save feedback", err);
    return Response.json({ error: "Couldn't save feedback." }, { status: 500 });
  }
}
