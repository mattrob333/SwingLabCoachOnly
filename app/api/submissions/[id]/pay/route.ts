import { NextRequest, NextResponse } from "next/server";
import { markSubmissionPaid, getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";
import {
  createPaymentIntent,
  confirmPaymentIntent,
} from "@/lib/stripe-mock";

/**
 * Phase 3 + Phase 8 — Payment endpoint.
 *
 * POST /api/submissions/[id]/pay
 * Marks a submission as paid. For MVP this uses the mock Stripe Connect flow
 * (lib/stripe-mock.ts): a PaymentIntent is created and immediately confirmed.
 * When real Stripe keys are provisioned, only the internals of this route
 * change — the response contract stays the same.
 *
 * Guardrail: payment before review. Only pending_payment → paid.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submission = await getSubmissionById(id);

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

  const coach = await getCoachBySlug(submission.coachSlug);
  if (!coach) {
    return NextResponse.json(
      { error: "Coach not found for this submission" },
      { status: 404 },
    );
  }

  try {
    // MVP: create + confirm a mock PaymentIntent. Real Stripe integration
    // swaps these two calls for stripe.paymentIntents.create/confirm with the
    // coach's Connect account as the transfer destination.
    const intent = createPaymentIntent({
      amountUsd: coach.priceUsd,
      coachSlug: coach.slug,
      submissionId: submission.id,
      parentEmail: submission.parentEmail,
    });
    confirmPaymentIntent(intent.id);

    const updated = await markSubmissionPaid(id);
    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      amountPaid: coach.priceUsd,
      paymentIntentId: intent.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment failed" },
      { status: 500 },
    );
  }
}
