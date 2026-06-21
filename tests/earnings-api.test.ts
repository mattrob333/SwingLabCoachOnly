import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/coach/earnings/route";
import {
  recordEarning,
  EARNINGS,
  type EarningInput,
} from "@/lib/earnings";
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
  } as unknown as Parameters<typeof GET>[0];
}

function earning(overrides: Partial<EarningInput>): EarningInput {
  return {
    submissionId: "sub-1",
    coachSlug: "marcus-reed",
    amountUsd: 49,
    parentEmail: "parent@example.com",
    ...overrides,
  };
}

describe("GET /api/coach/earnings", () => {
  beforeEach(() => {
    EARNINGS.length = 0;
  });

  it("returns the coach's total and per-submission breakdown", async () => {
    recordEarning(earning({ submissionId: "sub-1", amountUsd: 49 }));
    recordEarning(earning({ submissionId: "sub-2", amountUsd: 39 }));

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await GET(makeRequest({ [SESSION_COOKIE]: token }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalUsd).toBe(88);
    expect(data.count).toBe(2);
    expect(data.earnings).toHaveLength(2);
    expect(data.earnings[0].submissionId).toBe("sub-2"); // newest-first
    expect(data.earnings[1].submissionId).toBe("sub-1");
    expect(data.earnings[0].amountUsd).toBe(39);
    expect(typeof data.earnings[0].createdAt).toBe("string");
  });

  it("only returns the signed-in coach's earnings", async () => {
    recordEarning(earning({ submissionId: "sub-1", coachSlug: "marcus-reed" }));
    recordEarning(
      earning({ submissionId: "sub-2", coachSlug: "priya-anand" }),
    );

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await GET(makeRequest({ [SESSION_COOKIE]: token }));
    const data = await res.json();
    expect(data.count).toBe(1);
    expect(data.earnings[0].coachSlug).toBeUndefined(); // coachSlug not leaked
    expect(data.earnings[0].submissionId).toBe("sub-1");
  });

  it("returns totalUsd 0 and empty list when coach has no earnings", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await GET(makeRequest({ [SESSION_COOKIE]: token }));
    const data = await res.json();
    expect(data.totalUsd).toBe(0);
    expect(data.count).toBe(0);
    expect(data.earnings).toEqual([]);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(401);
  });
});
