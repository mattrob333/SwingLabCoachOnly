import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/submissions/[id]/review/route";
import {
  createSubmission,
  markSubmissionPaid,
  getSubmissionById,
  SUBMISSIONS,
  type SubmissionInput,
} from "@/lib/submissions";
import {
  signSession,
  createSessionPayload,
  SESSION_COOKIE,
} from "@/lib/auth/session";

function makeRequest(cookies: Record<string, string>) {
  return {
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
    },
  } as unknown as Parameters<typeof POST>[0];
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

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/submissions/[id]/review", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("transitions a paid submission to in_review for the owning coach", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("in_review");
    expect(getSubmissionById(sub.id)?.status).toBe("in_review");
  });

  it("returns 401 when not authenticated", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);

    const res = await POST(makeRequest({}), makeParams(sub.id));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the submission belongs to a different coach", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);

    // Signed in as a different coach
    const token = signSession(createSessionPayload("priya-anand"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the submission does not exist", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams("nonexistent-id"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when the submission is still pending_payment", async () => {
    const sub = createSubmission(validInput());
    // Not paid
    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(409);
  });
});
