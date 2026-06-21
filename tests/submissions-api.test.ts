import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/submissions/route";
import { SUBMISSIONS } from "@/lib/submissions";

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

function validBody() {
  return {
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
    playerAge: 12,
    swingType: "baseball",
    notes: "Help with load timing.",
  };
}

describe("POST /api/submissions", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("creates a submission and returns 201", async () => {
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    expect(data.status).toBe("pending_payment");
    expect(data.coachSlug).toBe("marcus-reed");
  });

  it("returns 404 when the coach does not exist", async () => {
    const res = await POST(
      makeRequest({ ...validBody(), coachSlug: "nonexistent-coach" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 for an invalid email", async () => {
    const res = await POST(
      makeRequest({ ...validBody(), parentEmail: "bad" }),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toContain("Valid email is required");
  });

  it("returns 422 for an out-of-range age", async () => {
    const res = await POST(
      makeRequest({ ...validBody(), playerAge: 30 }),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toContain("Player age must be between 5 and 18");
  });

  it("returns 422 for a missing coach slug", async () => {
    const res = await POST(
      makeRequest({ ...validBody(), coachSlug: "" }),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toContain("Coach is required");
  });
});
