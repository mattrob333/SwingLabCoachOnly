import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/submissions/[id]/redeem-code/route";
import {
  createSubmission,
  markSubmissionPaid,
  markSubmissionInReview,
  getSubmissionById,
  type SubmissionInput,
  SUBMISSIONS,
} from "@/lib/submissions";
import { INVITE_CODES } from "@/lib/invite-codes";

function makeRequest(body: unknown) {
  return {
    json: async () => body,
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
    notes: "Help with load.",
  };
}

/** Reset the SWINGLAB-FREE invite code redemptions between tests. */
function resetInviteCode() {
  const code = INVITE_CODES.find((c) => c.code === "SWINGLAB-FREE");
  if (code) code.redemptions = 0;
}

describe("POST /api/submissions/[id]/redeem-code", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    resetInviteCode();
  });

  it("returns 404 when the submission does not exist", async () => {
    const res = await POST(
      makeRequest({ code: "SWINGLAB-FREE" }),
      makeParams("missing-id"),
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("not found");
  });

  it("returns 409 when the submission is already paid", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    const res = await POST(
      makeRequest({ code: "SWINGLAB-FREE" }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("already");
  });

  it("returns 409 when the submission is in review", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const res = await POST(
      makeRequest({ code: "SWINGLAB-FREE" }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 when the JSON body is invalid", async () => {
    const sub = await createSubmission(validInput());
    const badRequest = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Parameters<typeof POST>[0];
    const res = await POST(badRequest, makeParams(sub.id));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid JSON");
  });

  it("returns 422 when the code field is missing", async () => {
    const sub = await createSubmission(validInput());
    const res = await POST(makeRequest({}), makeParams(sub.id));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("required");
  });

  it("returns 422 when the code is an empty string", async () => {
    const sub = await createSubmission(validInput());
    const res = await POST(
      makeRequest({ code: "   " }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when the code does not exist", async () => {
    const sub = await createSubmission(validInput());
    const res = await POST(
      makeRequest({ code: "FAKE-CODE-123" }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("Invalid invite code");
  });

  it("returns 422 when the code is valid but for a different coach", async () => {
    const sub = await createSubmission({
      ...validInput(),
      coachSlug: "priya-anand",
    });
    const res = await POST(
      makeRequest({ code: "SWINGLAB-FREE" }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("different coach");
  });

  it("successfully redeems a valid code and marks submission as paid (comped)", async () => {
    const sub = await createSubmission(validInput());
    const res = await POST(
      makeRequest({ code: "SWINGLAB-FREE" }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(sub.id);
    expect(data.status).toBe("paid");
    expect(data.comped).toBe(true);

    // Verify the submission was actually marked paid in the store
    const updated = await getSubmissionById(sub.id);
    expect(updated?.status).toBe("paid");
  });

  it("trims whitespace from the code before redeeming", async () => {
    const sub = await createSubmission(validInput());
    const res = await POST(
      makeRequest({ code: "  SWINGLAB-FREE  " }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.comped).toBe(true);
  });
});
