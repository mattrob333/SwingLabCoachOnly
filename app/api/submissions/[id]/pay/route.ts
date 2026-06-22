import { NextRequest, NextResponse } from "next/server";
import { markSubmissionPaid, getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";
import { getPaymentAdapter } from "@/lib/payments";
import { isLive } from "@/lib/env";
import {
  createPaymentIntent,
  confirmPaymentIntent,
} from "@/lib/stripe-mock";

/**
 * Phase 3 + Wave 2 — Payment / Checkout endpoint.
 *
 * POST /api/submissions/[id]/pay
 *
 * Two modes (env-gated):
 * - Mock (no STRIPE_* keys): synchronous — creates + confirms a mock
 *   PaymentIntent, marks the submission paid immediately. Returns
 *   { id, status, amountPaid, paymentIntentId }. Existing contract preserved.
 * - Live (STRIPE_* keys present): creates a Stripe Checkout Session and
 *   returns { url, sessionId }. The client redirects to Stripe Checkout.
 *   Payment confirmation + markSubmissionPaid happens asynchronously via
 *   the webhook (POST /api/stripe/webhook).
 *
 * Guardrail: payment before review. Only pending_payment → paid.
 */
export async function POST(
  request: NextRequest,
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
    if (isLive("payments")) {
      // Live Stripe Checkout flow — redirect the client to Stripe.
      const adapter = getPaymentAdapter();
      const origin = request.nextUrl.origin;
      const session = await adapter.createCheckoutSession({
        submissionId: submission.id,
        coachSlug: coach.slug,
        amountUsd: coach.priceUsd,
        parentEmail: submission.parentEmail,
        successUrl: `${origin}/pay?submission=${submission.id}`,
        cancelUrl: `${origin}/pay?submission=${submission.id}&canceled=1`,
      });
      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
      });
    }

    // Mock flow — synchronous confirm (existing contract preserved).
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
