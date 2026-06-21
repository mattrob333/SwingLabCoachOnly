import { randomUUID } from "node:crypto";

/**
 * Phase 8 — Mock Stripe Connect (MVP, no real API keys).
 *
 * Stands in for the Stripe PaymentIntent + Connect flow. The real integration
 * (when Stripe keys are provisioned) will swap these stubs for
 * `stripe.paymentIntents.create` / `.confirm`, with the coach's connected
 * account as the destination. The interface is intentionally Stripe-shaped so
 * the swap is mechanical.
 *
 * Guardrail: payment before review. A submission's PaymentIntent must be
 * confirmed (status `succeeded`) before the submission transitions to `paid`.
 */

export type PaymentIntentStatus =
  | "requires_confirmation"
  | "succeeded"
  | "canceled";

export type PaymentIntent = {
  id: string;
  /** USD amount in whole dollars (MVP — no cents math needed). */
  amountUsd: number;
  coachSlug: string;
  submissionId: string;
  parentEmail: string;
  status: PaymentIntentStatus;
  createdAt: Date;
  confirmedAt: Date | null;
};

export type CreatePaymentIntentInput = {
  amountUsd: number;
  coachSlug: string;
  submissionId: string;
  parentEmail: string;
};

/** In-memory store. Resets on deploy — fine for MVP. */
export const PAYMENT_INTENTS: PaymentIntent[] = [];

/**
 * Create a PaymentIntent for a submission. Starts as `requires_confirmation`.
 * Throws on invalid input (non-positive amount, missing coach).
 */
export function createPaymentIntent(
  input: CreatePaymentIntentInput,
): PaymentIntent {
  if (!input.coachSlug || input.coachSlug.trim().length === 0) {
    throw new Error("Coach slug is required for payment intent");
  }
  if (!input.amountUsd || input.amountUsd < 1) {
    throw new Error("Payment amount must be at least $1");
  }

  const intent: PaymentIntent = {
    id: `pi_${randomUUID()}`,
    amountUsd: input.amountUsd,
    coachSlug: input.coachSlug,
    submissionId: input.submissionId,
    parentEmail: input.parentEmail,
    status: "requires_confirmation",
    createdAt: new Date(),
    confirmedAt: null,
  };
  PAYMENT_INTENTS.push(intent);
  return intent;
}

/** Look up a PaymentIntent by id. Returns `undefined` when not found. */
export function getPaymentIntent(id: string): PaymentIntent | undefined {
  return PAYMENT_INTENTS.find((i) => i.id === id);
}

/**
 * Confirm a PaymentIntent. Transitions `requires_confirmation` → `succeeded`.
 * Throws if the intent doesn't exist or is not in a confirmable state.
 */
export function confirmPaymentIntent(id: string): PaymentIntent {
  const intent = getPaymentIntent(id);
  if (!intent) {
    throw new Error(`Payment intent not found: ${id}`);
  }
  if (intent.status === "succeeded") {
    throw new Error(`Payment intent ${id} has already succeeded`);
  }
  if (intent.status === "canceled") {
    throw new Error(`Payment intent ${id} was canceled and cannot be confirmed`);
  }
  intent.status = "succeeded";
  intent.confirmedAt = new Date();
  return intent;
}
