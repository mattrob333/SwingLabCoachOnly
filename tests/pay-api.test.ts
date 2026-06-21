import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/submissions/[id]/pay/route";
import {
  createSubmission,
  markSubmissionPaid,
  getSubmissionById,
  type SubmissionInput,
  SUBMISSIONS,
} from "@/lib/submissions";
import { PAYMENT_INTENTS } from "@/lib/stripe-mock";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function validInput(): SubmissionInput {
  return {
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
    playerAge: 12,
    swingType: "baseball",
    notes: "Help with load.",
  };
}

describe("POST /api/submissions/[id]/pay", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    PAYMENT_INTENTS.length = 0;
  });

  it("confirms a mock payment intent and marks the submission paid", async () => {
    const sub = createSubmission(validInput());
    const res = await POST({} as never, makeParams(sub.id));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("paid");
    expect(data.amountPaid).toBe(49);
    expect(data.paymentIntentId).toMatch(/^pi_/);
    expect(getSubmissionById(sub.id)?.status).toBe("paid");
    expect(PAYMENT_INTENTS).toHaveLength(1);
    expect(PAYMENT_INTENTS[0].status).toBe("succeeded");
  });

  it("returns 404 when the submission does not exist", async () => {
    const res = await POST({} as never, makeParams("missing-id"));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the submission is already paid", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    const res = await POST({} as never, makeParams(sub.id));
    expect(res.status).toBe(409);
  });
});
