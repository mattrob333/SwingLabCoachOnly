import { describe, it, expect, beforeEach } from "vitest";
import {
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentIntent,
  PAYMENT_INTENTS,
  type CreatePaymentIntentInput,
} from "@/lib/stripe-mock";

describe("stripe-mock", () => {
  beforeEach(() => {
    PAYMENT_INTENTS.length = 0;
  });

  describe("createPaymentIntent", () => {
    it("creates an intent with status requires_confirmation", () => {
      const input: CreatePaymentIntentInput = {
        amountUsd: 49,
        coachSlug: "marcus-reed",
        submissionId: "sub-1",
        parentEmail: "parent@example.com",
      };
      const intent = createPaymentIntent(input);

      expect(intent.id).toMatch(/^pi_/);
      expect(intent.status).toBe("requires_confirmation");
      expect(intent.amountUsd).toBe(49);
      expect(intent.coachSlug).toBe("marcus-reed");
      expect(intent.submissionId).toBe("sub-1");
      expect(intent.parentEmail).toBe("parent@example.com");
      expect(intent.createdAt).toBeInstanceOf(Date);
    });

    it("generates a unique id per intent", () => {
      const a = createPaymentIntent({
        amountUsd: 49,
        coachSlug: "marcus-reed",
        submissionId: "sub-1",
        parentEmail: "p@example.com",
      });
      const b = createPaymentIntent({
        amountUsd: 49,
        coachSlug: "marcus-reed",
        submissionId: "sub-2",
        parentEmail: "p@example.com",
      });
      expect(a.id).not.toBe(b.id);
    });

    it("throws on non-positive amount", () => {
      expect(() =>
        createPaymentIntent({
          amountUsd: 0,
          coachSlug: "marcus-reed",
          submissionId: "sub-1",
          parentEmail: "p@example.com",
        }),
      ).toThrow(/amount/i);
    });

    it("throws on missing coach slug", () => {
      expect(() =>
        createPaymentIntent({
          amountUsd: 49,
          coachSlug: "",
          submissionId: "sub-1",
          parentEmail: "p@example.com",
        }),
      ).toThrow(/coach/i);
    });
  });

  describe("confirmPaymentIntent", () => {
    it("transitions requires_confirmation -> succeeded", () => {
      const intent = createPaymentIntent({
        amountUsd: 49,
        coachSlug: "marcus-reed",
        submissionId: "sub-1",
        parentEmail: "p@example.com",
      });
      const confirmed = confirmPaymentIntent(intent.id);

      expect(confirmed.status).toBe("succeeded");
      expect(confirmed.confirmedAt).toBeInstanceOf(Date);
    });

    it("throws when intent not found", () => {
      expect(() => confirmPaymentIntent("pi_missing")).toThrow(/not found/i);
    });

    it("throws when already succeeded", () => {
      const intent = createPaymentIntent({
        amountUsd: 49,
        coachSlug: "marcus-reed",
        submissionId: "sub-1",
        parentEmail: "p@example.com",
      });
      confirmPaymentIntent(intent.id);
      expect(() => confirmPaymentIntent(intent.id)).toThrow(/already/i);
    });
  });

  describe("getPaymentIntent", () => {
    it("returns the intent by id", () => {
      const intent = createPaymentIntent({
        amountUsd: 39,
        coachSlug: "priya-anand",
        submissionId: "sub-9",
        parentEmail: "p@example.com",
      });
      expect(getPaymentIntent(intent.id)?.id).toBe(intent.id);
    });

    it("returns undefined for unknown id", () => {
      expect(getPaymentIntent("pi_unknown")).toBeUndefined();
    });
  });
});
