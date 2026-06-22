import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";
import {
  createSubmission,
  markSubmissionPaid,
  getSubmissionById,
  type SubmissionInput,
  SUBMISSIONS,
} from "@/lib/submissions";
import { MOCK_CHECKOUT_SESSIONS } from "@/lib/payments/mock-payment";
import { NextRequest } from "next/server";

function validInput(): SubmissionInput {
  return {
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
    playerAge: 12,
    swingType: "baseball",
    notes: "Help with load.",
  };
}

/**
 * Build a mock NextRequest with a raw body and Stripe-Signature header.
 * In mock mode the adapter's constructWebhookEvent ignores the signature
 * and parses the JSON body directly.
 */
function makeWebhookRequest(
  body: object,
  signature = "t=0,v1=mock",
): NextRequest {
  const rawBody = JSON.stringify(body);
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: rawBody,
  });
}

function checkoutCompletedEvent(submissionId: string) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_mock_abc",
        client_reference_id: submissionId,
        payment_intent: "pi_mock_abc",
        amount_total: 4900,
      },
    },
  };
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    MOCK_CHECKOUT_SESSIONS.length = 0;
  });

  it("marks a pending submission as paid on checkout.session.completed", async () => {
    const sub = await createSubmission(validInput());
    const req = makeWebhookRequest(checkoutCompletedEvent(sub.id));
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.status).toBe("paid");
    expect((await getSubmissionById(sub.id))?.status).toBe("paid");
  });

  it("returns 200 idempotent when the submission is already paid (replay-safe)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);

    const req = makeWebhookRequest(checkoutCompletedEvent(sub.id));
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.idempotent).toBe(true);
  });

  it("returns 400 when Stripe-Signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutCompletedEvent("sub-1")),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 (received) for non-completion event types", async () => {
    const req = makeWebhookRequest({
      type: "checkout.session.expired",
      data: { object: { id: "cs_mock_abc", client_reference_id: "sub-1" } },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.type).toBe("checkout.session.expired");
  });

  it("returns 400 when submissionId (client_reference_id) is missing", async () => {
    const req = makeWebhookRequest({
      type: "checkout.session.completed",
      data: { object: { id: "cs_mock_abc" } },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the submission does not exist", async () => {
    const req = makeWebhookRequest(
      checkoutCompletedEvent("nonexistent-submission"),
    );
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
