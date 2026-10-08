import { AnalysisError, analyzePhotos } from "@/lib/ai/claude";
import { DEMO_ESTIMATE, demoDelay, isDemoMode } from "@/lib/ai/demo";
import { AnalyzeRequestSchema } from "@/lib/ai/schemas";
import { getLearnedModel } from "@/lib/learning/server";
import type { JobEstimate } from "@/lib/pricing/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Add at least one photo (up to 10) and try again." }, { status: 400 });
  }

  // What all owners' corrections have taught the app: item sizes go into the
  // AI's instructions, and the whole-job correction for this kind of job
  // comes back with the estimate.
  const learned = await getLearnedModel();
  const withLearning = (estimate: JobEstimate): JobEstimate => ({
    ...estimate,
    networkCalibrationPct: learned.scopeCalibration[estimate.scope]?.pct ?? 0,
  });

  if (isDemoMode()) {
    await demoDelay();
    return Response.json({ estimate: withLearning(DEMO_ESTIMATE), demo: true });
  }

  try {
    const estimate = await analyzePhotos(parsed.data, learned);
    return Response.json({ estimate: withLearning(estimate) });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
