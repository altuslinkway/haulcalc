import { AnalysisError, analyzePhotos } from "@/lib/ai/claude";
import { DEMO_ESTIMATE, demoDelay, isDemoMode } from "@/lib/ai/demo";
import { AnalyzeRequestSchema } from "@/lib/ai/schemas";

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

  if (isDemoMode()) {
    await demoDelay();
    return Response.json({ estimate: DEMO_ESTIMATE, demo: true });
  }

  try {
    const estimate = await analyzePhotos(parsed.data);
    return Response.json({ estimate });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
