import { NextRequest, NextResponse } from "next/server";
import { markSubmissionPaid, getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";

/**
 * Phase 3 — Mock payment endpoint.
 *
 * POST /api/submissions/[id]/pay
 * Marks a submission as paid. For MVP this is a mock (no real charge).
 * Stripe Connect lands in Phase 8 — the interface stays the same.
 *
 * Guardrail: payment before review. Only pending_payment → paid.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submission = getSubmissionById(id);

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  if (submission.status !== "pending_payment") {
    return NextResponse.json(
      { error: `Submission is already ${submission.status}` },
      { status: 409 },
    );
  }

  const coach = getCoachBySlug(submission.coachSlug);
  if (!coach) {
    return NextResponse.json(
      { error: "Coach not found for this submission" },
      { status: 404 },
    );
  }

  try {
    const updated = markSubmissionPaid(id);
    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      amountPaid: coach.priceUsd,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment failed" },
      { status: 500 },
    );
  }
}
