/**
 * Payment adapter interface.
 *
 * Env-gated: the factory (lib/payments/index.ts) returns the real Stripe
 * adapter when STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are present, and the
 * mock adapter otherwise. The pay route and webhook route consume this
 * interface so the backend is swappable with zero code changes.
 *
 * Design: Stripe Checkout Sessions (not raw PaymentIntents) so the parent is
 * redirected to Stripe's hosted checkout page. The webhook confirms payment
 * and transitions the submission `pending_payment → paid`.
 */

export type CheckoutSessionStatus = "open" | "complete" | "expired";

export type CheckoutSession = {
  /** Stripe session id (`cs_test_...`) or mock id (`cs_mock_...`). */
  id: string;
  /** URL the client should redirect to (Stripe Checkout or mock redirect). */
  url: string;
  submissionId: string;
  coachSlug: string;
  amountUsd: number;
  parentEmail: string;
  status: CheckoutSessionStatus;
  paymentIntentId: string | null;
  createdAt: Date;
};

export type CreateCheckoutInput = {
  submissionId: string;
  coachSlug: string;
  amountUsd: number;
  parentEmail: string;
  /** URL Stripe redirects to on successful payment. */
  successUrl: string;
  /** URL Stripe redirects to on cancellation. */
  cancelUrl: string;
};

/**
 * Normalised webhook event extracted from the raw Stripe payload.
 * The `submissionId` comes from `client_reference_id` set on the session.
 */
export type WebhookEvent = {
  type: string;
  submissionId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountReceivedUsd: number | null;
};

export interface PaymentAdapter {
  readonly mode: "live" | "mock";
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;
  /** Verify the webhook signature and parse the event. Throws on invalid sig. */
  constructWebhookEvent(rawBody: string, signature: string): Promise<WebhookEvent>;
}
