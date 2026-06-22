/**
 * Payment adapter factory.
 *
 * Returns the live Stripe adapter when STRIPE_SECRET_KEY +
 * STRIPE_WEBHOOK_SECRET + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY are present,
 * otherwise the mock adapter. Env-gated so the app runs in mock mode by
 * default and flips live when the user adds Stripe credentials to `.env`.
 */

import { isLive } from "@/lib/env";
import { MockPaymentAdapter } from "./mock-payment";
import { StripePaymentAdapter } from "./stripe-payment";
import type { PaymentAdapter } from "./types";

let cached: PaymentAdapter | null = null;

export function getPaymentAdapter(): PaymentAdapter {
  if (cached) return cached;
  if (isLive("payments")) {
    cached = new StripePaymentAdapter();
  } else {
    cached = new MockPaymentAdapter();
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`[payments] using ${cached.mode} adapter`);
  }
  return cached;
}

/** Test-only: reset the cached adapter (so mode switches take effect). */
export function _resetPaymentAdapterForTests(): void {
  cached = null;
}

export type {
  PaymentAdapter,
  CheckoutSession,
  CheckoutSessionStatus,
  CreateCheckoutInput,
  WebhookEvent,
} from "./types";
