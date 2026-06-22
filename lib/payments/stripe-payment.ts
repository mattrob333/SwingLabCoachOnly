import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentAdapter,
  CheckoutSession,
  CreateCheckoutInput,
  WebhookEvent,
} from "./types";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

/** Tolerance for webhook timestamp drift (5 minutes, per Stripe docs). */
const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Real Stripe payment adapter — used when STRIPE_SECRET_KEY and
 * STRIPE_WEBHOOK_SECRET are present in env. Uses fetch() directly (no SDK
 * dependency) for consistency with the Supabase PostgREST pattern.
 *
 * createCheckoutSession creates a Stripe Checkout Session and returns the URL
 * the client should redirect to. constructWebhookEvent verifies the
 * Stripe-Signature header using HMAC-SHA256 and parses the event.
 */
export class StripePaymentAdapter implements PaymentAdapter {
  readonly mode = "live" as const;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY ?? "";
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    // Defense-in-depth: the factory already gates on isLive("payments"), but
    // constructing directly without keys should fail fast.
    if (!this.secretKey) {
      throw new Error(
        "StripePaymentAdapter requires STRIPE_SECRET_KEY",
      );
    }
    if (!this.webhookSecret) {
      throw new Error(
        "StripePaymentAdapter requires STRIPE_WEBHOOK_SECRET",
      );
    }
  }

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CheckoutSession> {
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("client_reference_id", input.submissionId);
    params.set("customer_email", input.parentEmail);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "usd");
    params.set(
      "line_items[0][price_data][unit_amount]",
      String(Math.round(input.amountUsd * 100)),
    );
    params.set(
      "line_items[0][price_data][product_data][name]",
      `Swing review with ${input.coachSlug}`,
    );
    params.set("success_url", input.successUrl);
    params.set("cancel_url", input.cancelUrl);

    const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Stripe Checkout Session creation failed: ${res.status} ${text}`,
      );
    }

    const data = (await res.json()) as {
      id: string;
      url: string | null;
      payment_intent: string | null;
      status: string;
    };

    return {
      id: data.id,
      url: data.url ?? input.successUrl,
      submissionId: input.submissionId,
      coachSlug: input.coachSlug,
      amountUsd: input.amountUsd,
      parentEmail: input.parentEmail,
      status: data.status as CheckoutSession["status"],
      paymentIntentId: data.payment_intent,
      createdAt: new Date(),
    };
  }

  async constructWebhookEvent(
    rawBody: string,
    signature: string,
  ): Promise<WebhookEvent> {
    // Parse the Stripe-Signature header: "t=<timestamp>,v1=<signature>"
    const parts = new Map<string, string>();
    for (const item of signature.split(",")) {
      const eq = item.indexOf("=");
      if (eq > 0) {
        parts.set(item.slice(0, eq).trim(), item.slice(eq + 1));
      }
    }
    const timestamp = parts.get("t") ?? "";
    const v1 = parts.get("v1") ?? "";

    if (!timestamp || !v1) {
      throw new Error(
        "Invalid Stripe-Signature header: missing t or v1",
      );
    }

    // Verify the HMAC-SHA256 signature.
    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(signedPayload, "utf8")
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(v1, "hex");
    if (
      expectedBuf.length !== actualBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      throw new Error("Invalid Stripe webhook signature");
    }

    // Reject replayed events outside the tolerance window.
    const tsNum = parseInt(timestamp, 10);
    if (Number.isNaN(tsNum)) {
      throw new Error("Invalid Stripe webhook timestamp");
    }
    const ageSeconds = Math.abs(Date.now() / 1000 - tsNum);
    if (ageSeconds > WEBHOOK_TOLERANCE_SECONDS) {
      throw new Error("Stripe webhook timestamp outside tolerance");
    }

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
