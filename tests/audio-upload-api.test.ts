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
    const sub = await createSubmission(validInput());
    const form = new FormData();

    const res = await POST(makeRequest({}, form), makeParams(sub.id));

    expect(res.status).toBe(401);
  });

  it("returns 403 when the submission belongs to a different coach", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);

    // Signed in as a different coach than the submission's owner
    const token = signSession(createSessionPayload("priya-anand"));
    const form = new FormData();
    form.set("audio", new File(["audio bytes"], "note.webm", { type: "audio/webm" }));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, form),
      makeParams(sub.id),
    );

    expect(res.status).toBe(403);
  });

  it("rejects missing audio files", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));
    const form = new FormData();

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, form),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
  });

  it("rejects non-audio uploads", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));
    const form = new FormData();
    form.set("audio", new File(["not audio"], "note.txt", { type: "text/plain" }));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, form),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
  });

  it("rejects oversized audio files with a 400 (Wave 6 hardening)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    // Spoof .size to exceed the 50 MB limit without allocating 50 MB of memory.
    const file = new File([new Uint8Array(1024)], "big.webm", {
      type: "audio/webm",
    });
    Object.defineProperty(file, "size", {
      value: 50 * 1024 * 1024 + 1,
      configurable: true,
    });

    const form = new FormData();
    form.set("audio", file);

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, form),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/large|too big|size/i);
  });
});
