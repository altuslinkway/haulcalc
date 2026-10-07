import { AnalysisError, readRateCard } from "@/lib/ai/claude";
import { DEMO_RATE_CARD, demoDelay, isDemoMode } from "@/lib/ai/demo";
import { RateCardRequestSchema } from "@/lib/ai/schemas";

export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = RateCardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Add 1–4 photos of your rate card." }, { status: 400 });
  }

  if (isDemoMode()) {
    await demoDelay();
    return Response.json({ rateCard: DEMO_RATE_CARD, demo: true });
  }

  try {
    const rateCard = await readRateCard(parsed.data.photos);
    return Response.json({ rateCard });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
