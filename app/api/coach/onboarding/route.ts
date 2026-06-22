import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { upsertCoach, validateCoachInput, type CoachInput } from "@/lib/coaches";

/**
 * Phase 2 — Coach onboarding API.
 *
 * POST /api/coach/onboarding
 * Accepts a CoachInput JSON body, validates it, and upserts the coach profile.
 * The `existingSlug` is derived from the signed session so a logged-in coach
 * updates their own profile. If no coach record exists for that slug yet, a
 * new one is created.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input: CoachInput = {
    name: String(body.name ?? ""),
    title: String(body.title ?? ""),
    bio: String(body.bio ?? ""),
    location: String(body.location ?? ""),
    priceUsd: Number(body.priceUsd ?? 0),
    turnaround: String(body.turnaround ?? ""),
    highlights: Array.isArray(body.highlights)
      ? body.highlights.map(String)
      : [],
    existingSlug: session.coachSlug,
  };

  const errors = validateCoachInput(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });
  }

  try {
    const coach = await upsertCoach(input);
    return NextResponse.json({ slug: coach.slug, name: coach.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save profile" },
      { status: 500 },
    );
  }
}
