import { NextRequest, NextResponse } from "next/server";
import { getPaymentAdapter } from "@/lib/payments";
import { getSubmissionById, markSubmissionPaid } from "@/lib/submissions";

/**
 * Wave 2 — Stripe webhook endpoint.
 *
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events, verifies the signature, and processes
 * `checkout.session.completed` events by marking the corresponding submission
 * as paid. Replay-safe: markSubmissionPaid only transitions
 * pending_payment → paid; a replay on an already-paid submission is caught
 * and returns 200 (idempotent).
 *
 * In mock mode this route is never called (the pay route confirms
 * synchronously), but it can be tested with the mock adapter.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("Stripe-Signature") ?? "";

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe-Signature header" },
      { status: 400 },
    );
  }

  let event;
  try {
    const adapter = getPaymentAdapter();
    event = await adapter.constructWebhookEvent(rawBody, signature);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook verification failed" },
      { status: 400 },
    );
  }

  // Only handle checkout completion — that's when payment is confirmed.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, type: event.type });
  }

  if (!event.submissionId) {
    return NextResponse.json(
      { error: "Webhook event missing submissionId (client_reference_id)" },
      { status: 400 },
    );
  }

  // Verify the submission exists.
  const submission = await getSubmissionById(event.submissionId);
  if (!submission) {
    return NextResponse.json(
      { error: `Submission not found: ${event.submissionId}` },
      { status: 404 },
    );
  }

  // Idempotent: if already paid, return 200 (replay-safe).
  if (submission.status !== "pending_payment") {
    return NextResponse.json({
      received: true,
      idempotent: true,
      status: submission.status,
    });
  }

  try {
    await markSubmissionPaid(event.submissionId);
    return NextResponse.json({
      received: true,
      submissionId: event.submissionId,
      status: "paid",
    });
  } catch (err) {
    // markSubmissionPaid throws if the status is not pending_payment.
    // This can happen in a race (two webhooks for the same submission).
    // Return 200 for idempotency.
    return NextResponse.json({
      received: true,
      idempotent: true,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
