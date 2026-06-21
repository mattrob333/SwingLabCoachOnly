import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/coach/onboarding/route";
import { COACHES } from "@/lib/coaches";
import {
  createSessionPayload,
  signSession,
  SESSION_COOKIE,
} from "@/lib/auth/session";

// Helper: build a NextRequest-like object with a session cookie.
function makeRequest(body: unknown, cookie?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) {
    headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
  }
  return {
    cookies: {
      get: (name: string) =>
        name === SESSION_COOKIE ? { value: cookie ?? "" } : undefined,
    },
    headers,
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

function validBody() {
  return {
    name: "Test Coach",
    title: "Pitching Coach",
    bio: "A great coach.",
    location: "Denver, CO",
    priceUsd: 35,
    turnaround: "PT24H",
    highlights: ["Fast turnaround"],
  };
}

describe("POST /api/coach/onboarding", () => {
  const originalSlugs = COACHES.map((c) => c.slug);

  beforeEach(() => {
    for (const c of [...COACHES]) {
      if (!originalSlugs.includes(c.slug)) {
        const idx = COACHES.indexOf(c);
        if (idx !== -1) COACHES.splice(idx, 1);
      }
    }
  });

  it("returns 401 without a session cookie", async () => {
    const req = makeRequest(validBody());
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 422 for invalid input (missing name)", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const req = makeRequest({ ...validBody(), name: "" }, token);
    const res = await POST(req);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toContain("Name is required");
  });

  it("returns 422 for a zero price", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const req = makeRequest({ ...validBody(), priceUsd: 0 }, token);
    const res = await POST(req);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toContain("Price must be at least $1");
  });

  it("updates the existing coach when session slug matches", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const req = makeRequest(
      { ...validBody(), name: "Marcus Reed", title: "Updated Title" },
      token,
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slug).toBe("marcus-reed");
    const coach = COACHES.find((c) => c.slug === "marcus-reed");
    expect(coach?.title).toBe("Updated Title");
  });

  it("creates a new coach when session slug has no existing record", async () => {
    const token = signSession(createSessionPayload("new-coach-slug"));
    const req = makeRequest(validBody(), token);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slug).toBe("test-coach");
    expect(COACHES.some((c) => c.slug === "test-coach")).toBe(true);
  });
});
