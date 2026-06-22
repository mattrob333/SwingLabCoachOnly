import { describe, it, expect, beforeEach } from "vitest";
import { MockPaymentAdapter, MOCK_CHECKOUT_SESSIONS } from "@/lib/payments/mock-payment";

function validInput() {
  return {
    submissionId: "sub-123",
    coachSlug: "marcus-reed",
    amountUsd: 49,
    parentEmail: "parent@example.com",
    successUrl: "https://example.com/pay?submission=sub-123",
    cancelUrl: "https://example.com/pay?submission=sub-123&canceled=1",
  };
}

describe("MockPaymentAdapter", () => {
  beforeEach(() => {
    MOCK_CHECKOUT_SESSIONS.length = 0;
  });

  describe("createCheckoutSession", () => {
    it("creates a session with a mock id and a url derived from successUrl", async () => {
      const adapter = new MockPaymentAdapter();
      const session = await adapter.createCheckoutSession(validInput());

      expect(session.id).toMatch(/^cs_mock_/);
      expect(session.url).toBe(
        "https://example.com/pay?submission=sub-123?mock_checkout=1",
      );
      expect(session.submissionId).toBe("sub-123");
      expect(session.coachSlug).toBe("marcus-reed");
      expect(session.amountUsd).toBe(49);
      expect(session.parentEmail).toBe("parent@example.com");
      expect(session.status).toBe("open");
      expect(session.paymentIntentId).toBeNull();
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it("stores the session in the in-memory array", async () => {
      const adapter = new MockPaymentAdapter();
      await adapter.createCheckoutSession(validInput());
      expect(MOCK_CHECKOUT_SESSIONS).toHaveLength(1);
      expect(MOCK_CHECKOUT_SESSIONS[0].submissionId).toBe("sub-123");
    });

    it("throws when coachSlug is missing", async () => {
      const adapter = new MockPaymentAdapter();
      const input = validInput();
      input.coachSlug = "";
      await expect(adapter.createCheckoutSession(input)).rejects.toThrow(
        "Coach slug is required",
      );
    });

    it("throws when amount is less than $1", async () => {
      const adapter = new MockPaymentAdapter();
      const input = validInput();
      input.amountUsd = 0;
      await expect(adapter.createCheckoutSession(input)).rejects.toThrow(
        "at least $1",
      );
    });

    it("throws when submissionId is missing", async () => {
      const adapter = new MockPaymentAdapter();
      const input = validInput();
      input.submissionId = "";
      await expect(adapter.createCheckoutSession(input)).rejects.toThrow(
        "Submission ID is required",
      );
    });

    it("has mode 'mock'", () => {
      const adapter = new MockPaymentAdapter();
      expect(adapter.mode).toBe("mock");
    });
  });

  describe("constructWebhookEvent", () => {
    it("parses a mock webhook JSON body into a WebhookEvent", async () => {
      const adapter = new MockPaymentAdapter();
      const rawBody = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_mock_abc",
            client_reference_id: "sub-123",
            payment_intent: "pi_test_123",
            amount_total: 4900,
          },
        },
      });

      const event = await adapter.constructWebhookEvent(rawBody, "mock-sig");
      expect(event.type).toBe("checkout.session.completed");
      expect(event.submissionId).toBe("sub-123");
      expect(event.sessionId).toBe("cs_mock_abc");
      expect(event.paymentIntentId).toBe("pi_test_123");
      expect(event.amountReceivedUsd).toBe(49);
    });

    it("handles null payment_intent", async () => {
      const adapter = new MockPaymentAdapter();
      const rawBody = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_mock_abc",
            client_reference_id: "sub-123",
            payment_intent: null,
          },
        },
      });

      const event = await adapter.constructWebhookEvent(rawBody, "mock-sig");
      expect(event.paymentIntentId).toBeNull();
      expect(event.amountReceivedUsd).toBeNull();
    });

    it("defaults submissionId to empty string when client_reference_id is absent", async () => {
      const adapter = new MockPaymentAdapter();
      const rawBody = JSON.stringify({
        type: "checkout.session.completed",
        data: { object: { id: "cs_mock_abc" } },
      });

      const event = await adapter.constructWebhookEvent(rawBody, "mock-sig");
      expect(event.submissionId).toBe("");
    });
  });
});
