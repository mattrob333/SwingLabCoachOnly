import { NextRequest, NextResponse } from "next/server";
import {
  createSubmission,
  validateSubmissionInput,
  type SubmissionInput,
} from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";

/**
 * Phase 3 — Create a new swing review submission.
 *
 * POST /api/submissions
 * Accepts a SubmissionInput JSON body from the parent upload form.
 * Validates that the coach exists and the input is well-formed.
 * Returns the new submission id + status (pending_payment).
 *
 * Guardrail: payment before review — the submission starts as pending_payment
 * and only advances after the payment flow (Phase 3 #4).
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input: SubmissionInput = {
    coachSlug: String(body.coachSlug ?? ""),
    parentEmail: String(body.parentEmail ?? ""),
    playerAge: Number(body.playerAge ?? 0),
    swingType: String(body.swingType ?? "baseball"),
    notes: String(body.notes ?? ""),
  };

  // Verify the coach exists before creating a submission.
  if (input.coachSlug && !getCoachBySlug(input.coachSlug)) {
    return NextResponse.json(
      { error: "Selected coach not found" },
      { status: 404 },
    );
  }

  const errors = validateSubmissionInput(input);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 422 },
    );
  }

  try {
    const submission = createSubmission(input);
    return NextResponse.json(
      {
        id: submission.id,
        status: submission.status,
        coachSlug: submission.coachSlug,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create submission" },
      { status: 500 },
    );
  }
}
