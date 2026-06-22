import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";

/**
 * Tests for StripePaymentAdapter. Uses vi.stubEnv + dynamic import because
 * the adapter constructor reads env vars at construction time.
 *
 * createCheckoutSession tests mock global.fetch to verify the correct Stripe
 * API call. constructWebhookEvent tests use real HMAC-SHA256 to generate
 * valid signatures.
 */
function makeSignedPayload(rawBody: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function validCheckoutInput() {
  return {
    submissionId: "sub-123",
    coachSlug: "marcus-reed",
    amountUsd: 49,
    parentEmail: "parent@example.com",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
  };
}

describe("StripePaymentAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_abc");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test123");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("constructor", () => {
    it("throws when STRIPE_SECRET_KEY is absent", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      expect(() => new StripePaymentAdapter()).toThrow("STRIPE_SECRET_KEY");
    });

    it("throws when STRIPE_WEBHOOK_SECRET is absent", async () => {
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      expect(() => new StripePaymentAdapter()).toThrow("STRIPE_WEBHOOK_SECRET");
    });
  });

  describe("createCheckoutSession", () => {
    it("POSTs to Stripe Checkout Sessions API and returns the session URL", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "cs_test_abc",
            url: "https://checkout.stripe.com/c/pay/cs_test_abc",
            payment_intent: "pi_test_abc",
            status: "open",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      const session = await adapter.createCheckoutSession(validCheckoutInput());

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
      expect(opts.method).toBe("POST");
      expect((opts.headers as Record<string, string>).Authorization).toBe(
        "Bearer sk_test_abc",
      );

      // Verify the body includes key params (URLSearchParams encodes brackets).
      const body = String(opts.body);
      expect(body).toContain("mode=payment");
      expect(body).toContain("client_reference_id=sub-123");
      expect(body).toContain("customer_email=parent%40example.com");
      expect(body).toContain("4900"); // unit_amount = $49 * 100 cents
      expect(body).toContain("currency");
      expect(body).toContain("usd");
      expect(body).toContain("Swing+review+with+marcus-reed");
      expect(body).toContain("success_url");
      expect(body).toContain("cancel_url");

      // Verify the returned session.
      expect(session.id).toBe("cs_test_abc");
      expect(session.url).toBe("https://checkout.stripe.com/c/pay/cs_test_abc");
      expect(session.submissionId).toBe("sub-123");
      expect(session.amountUsd).toBe(49);
      expect(session.paymentIntentId).toBe("pi_test_abc");
      expect(session.status).toBe("open");
    });

    it("throws when Stripe returns a non-2xx response", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Invalid request" }), {
          status: 400,
        }),
      );

      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      await expect(
        adapter.createCheckoutSession(validCheckoutInput()),
      ).rejects.toThrow("Stripe Checkout Session creation failed: 400");
    });

    it("falls back to successUrl when session.url is null", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "cs_test_abc",
            url: null,
            payment_intent: null,
            status: "open",
          }),
          { status: 200 },
        ),
      );

      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      const session = await adapter.createCheckoutSession(validCheckoutInput());
      expect(session.url).toBe("https://example.com/success");
    });
  });

  describe("constructWebhookEvent", () => {
    it("verifies a valid signature and parses the event", async () => {
      const rawBody = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_abc",
            client_reference_id: "sub-123",
            payment_intent: "pi_test_abc",
            amount_total: 4900,
          },
        },
      });
      const signature = makeSignedPayload(rawBody, "whsec_test123");

      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      const event = await adapter.constructWebhookEvent(rawBody, signature);

      expect(event.type).toBe("checkout.session.completed");
      expect(event.submissionId).toBe("sub-123");
      expect(event.sessionId).toBe("cs_test_abc");
      expect(event.paymentIntentId).toBe("pi_test_abc");
      expect(event.amountReceivedUsd).toBe(49);
    });

    it("throws on an invalid signature", async () => {
      const rawBody = JSON.stringify({
        type: "checkout.session.completed",
        data: { object: { id: "cs_test_abc" } },
      });
      const signature = "t=1234567890,v1=deadbeef";

      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      await expect(
        adapter.constructWebhookEvent(rawBody, signature),
      ).rejects.toThrow("Invalid Stripe webhook signature");
    });

    it("throws when the signature header is missing t or v1", async () => {
      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      await expect(
        adapter.constructWebhookEvent("{}", "garbage"),
      ).rejects.toThrow("missing t or v1");
    });

    it("throws when the timestamp is outside tolerance", async () => {
      const rawBody = JSON.stringify({
        type: "checkout.session.completed",
        data: { object: { id: "cs_test_abc", client_reference_id: "sub-123" } },
      });
      // Timestamp 10 minutes ago — outside the 5-minute tolerance.
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signedPayload = `${oldTimestamp}.${rawBody}`;
      const signature = createHmac("sha256", "whsec_test123")
        .update(signedPayload, "utf8")
        .digest("hex");
      const sigHeader = `t=${oldTimestamp},v1=${signature}`;

      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      await expect(
        adapter.constructWebhookEvent(rawBody, sigHeader),
      ).rejects.toThrow("outside tolerance");
    });

    it("handles null payment_intent", async () => {
      const rawBody = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_abc",
            client_reference_id: "sub-123",
            payment_intent: null,
          },
        },
      });
      const signature = makeSignedPayload(rawBody, "whsec_test123");

      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      const event = await adapter.constructWebhookEvent(rawBody, signature);
      expect(event.paymentIntentId).toBeNull();
      expect(event.amountReceivedUsd).toBeNull();
    });
  });

  describe("mode", () => {
    it("is 'live'", async () => {
      const { StripePaymentAdapter } = await import("@/lib/payments/stripe-payment");
      const adapter = new StripePaymentAdapter();
      expect(adapter.mode).toBe("live");
    });
  });
});
