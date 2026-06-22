import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/submissions/[id]/audio/route";
import {
  createSubmission,
  markSubmissionInReview,
  markSubmissionPaid,
  SUBMISSIONS,
  type SubmissionInput,
} from "@/lib/submissions";
import {
  createSessionPayload,
  SESSION_COOKIE,
  signSession,
} from "@/lib/auth/session";

function makeRequest(cookies: Record<string, string>, form: FormData) {
  return {
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
    },
    formData: async () => form,
  } as unknown as Parameters<typeof POST>[0];
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function validInput(): SubmissionInput {
  return {
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
    playerAge: 12,
    swingType: "baseball",
    notes: "",
  };
}

describe("POST /api/submissions/[id]/audio", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("requires coach authentication", async () => {
    const sub = createSubmission(validInput());
    const form = new FormData();

    const res = await POST(makeRequest({}, form), makeParams(sub.id));

    expect(res.status).toBe(401);
  });

  it("rejects missing audio files", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));
    const form = new FormData();

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, form),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
  });

  it("rejects non-audio uploads", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));
    const form = new FormData();
    form.set("audio", new File(["not audio"], "note.txt", { type: "text/plain" }));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, form),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
  });
});
