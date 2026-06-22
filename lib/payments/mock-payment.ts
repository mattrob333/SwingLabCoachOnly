import { randomUUID } from "node:crypto";
import type {
  PaymentAdapter,
  CheckoutSession,
  CreateCheckoutInput,
  WebhookEvent,
} from "./types";

/** In-memory store of mock checkout sessions (for test inspection). */
export const MOCK_CHECKOUT_SESSIONS: CheckoutSession[] = [];

/**
 * Mock payment adapter — used when STRIPE_* env keys are absent.
 *
 * createCheckoutSession returns a session whose `url` points back to the
 * success URL (so the mock flow can simulate an immediate redirect). The pay
 * route in mock mode confirms synchronously and marks the submission paid
 * immediately, so the webhook is not exercised in mock mode. However
 * constructWebhookEvent is provided so the webhook route can be tested.
 */
export class MockPaymentAdapter implements PaymentAdapter {
  readonly mode = "mock" as const;

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CheckoutSession> {
    if (!input.coachSlug || input.coachSlug.trim().length === 0) {
      throw new Error("Coach slug is required for checkout session");
    }
    if (!input.amountUsd || input.amountUsd < 1) {
      throw new Error("Payment amount must be at least $1");
    }
    if (!input.submissionId) {
      throw new Error("Submission ID is required for checkout session");
    }

    const session: CheckoutSession = {
      id: `cs_mock_${randomUUID()}`,
      url: `${input.successUrl}?mock_checkout=1`,
      submissionId: input.submissionId,
      coachSlug: input.coachSlug,
      amountUsd: input.amountUsd,
      parentEmail: input.parentEmail,
      status: "open",
      paymentIntentId: null,
      createdAt: new Date(),
    };
    MOCK_CHECKOUT_SESSIONS.push(session);
    return session;
  }

  async constructWebhookEvent(
    rawBody: string,
    _signature: string,
  ): Promise<WebhookEvent> {
    // Mock mode: no signature verification — parse JSON directly.
    // This lets the webhook route be tested without real Stripe signatures.
    const body = JSON.parse(rawBody) as {
      type: string;
      data: {
        object: {
          id: string;
          client_reference_id?: string;
          payment_intent?: string | null;
          amount_total?: number;
        };
      };
    };
    const obj = body.data.object;
    return {
      type: body.type,
      submissionId: obj.client_reference_id ?? "",
      sessionId: obj.id,
      paymentIntentId: obj.payment_intent ?? null,
      amountReceivedUsd:
        obj.amount_total != null ? obj.amount_total / 100 : null,
    };
  }
}
