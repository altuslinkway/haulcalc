import { connection } from "next/server";
import { getFeedbackStore, getLearnedModel } from "@/lib/learning/server";

/** What the app has learned from all owners' jobs, for display. */
export async function GET() {
  // Always read live: learning changes as owners send feedback, so never prerender this.
  await connection();
  const enabled = getFeedbackStore() !== null;
  const model = await getLearnedModel();
  return Response.json({ enabled, ...model });
}
