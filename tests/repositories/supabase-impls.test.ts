import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Wave 1 Slice D — Supabase repository impls (real PostgREST queries).
 *
 * Tests verify the four Supabase repository implementations make the correct
 * PostgREST HTTP calls (URL, method, headers, body) and correctly map responses
 * between Postgres row shapes (snake_case, cents, ISO timestamps) and TS
 * domain types (camelCase, dollars, Date objects).
 *
 * `global.fetch` is mocked — no real Supabase instance is needed. The env vars
 * are stubbed so the impls read real-looking values for URL + key.
 */

const SUPABASE_URL = "https://test.supabase.co";
const SUPABASE_KEY = "test-service-key";

/** Build a mock Response object for fetch. */
function mockResponse(
  body: unknown,
  opts: { status?: number; ok?: boolean } = {},
): Response {
  const status = opts.status ?? 200;
  const ok = opts.ok ?? status < 400;
  const text = body === undefined ? "" : JSON.stringify(body);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
  } as Response;
}

/** Capture fetch calls for assertion. */
type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function setupFetchMock(
  responses: Response[] | ((call: FetchCall) => Response),
): { calls: FetchCall[]; spy: ReturnType<typeof vi.spyOn> } {
  const calls: FetchCall[] = [];
  const responseQueue: Response[] = Array.isArray(responses) ? [...responses] : [];
  const spy = vi.spyOn(global, "fetch").mockImplementation(((
    input: URL | string,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers,
      body: init?.body as string | undefined,
    });
    if (typeof responses === "function") {
      return Promise.resolve(responses(calls[calls.length - 1]));
    }
    return Promise.resolve(responseQueue.shift() ?? mockResponse([]));
  }) as typeof fetch);
  return { calls, spy };
}

describe("Supabase repository impls (PostgREST)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_KEY);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  // ---------------------------------------------------------------------------
  // Submissions
  // ---------------------------------------------------------------------------
  describe("SupabaseSubmissionRepository", () => {
    it("create: POST to submissions with snake_case body, returns mapped Submission", async () => {
      const { calls } = setupFetchMock([
        mockResponse({
          id: "sub-123",
          coach_slug: "marcus-reed",
          parent_email: "p@e.com",
          player_age: 12,
          swing_type: "baseball",
          notes: "fixing load",
          video_url: null,
          video_file_name: null,
          status: "pending_payment",
          follow_up_for: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      const sub = await repo.create({
        coachSlug: "marcus-reed",
        parentEmail: "p@e.com",
        playerAge: 12,
        swingType: "baseball",
        notes: "fixing load",
      });
      expect(sub.id).toBe("sub-123");
      expect(sub.coachSlug).toBe("marcus-reed");
      expect(sub.parentEmail).toBe("p@e.com");
      expect(sub.playerAge).toBe(12);
      expect(sub.status).toBe("pending_payment");
      expect(sub.createdAt).toBeInstanceOf(Date);
      // Verify the POST call
      expect(calls[0].method).toBe("POST");
      expect(calls[0].url).toContain("/rest/v1/submissions");
      const body = JSON.parse(calls[0].body!);
      expect(body.coach_slug).toBe("marcus-reed");
      expect(body.parent_email).toBe("p@e.com");
      expect(body.status).toBe("pending_payment");
      // Headers include service-role API key
      expect(calls[0].headers.apikey).toBe(SUPABASE_KEY);
      expect(calls[0].headers.Authorization).toBe(`Bearer ${SUPABASE_KEY}`);
    });

    it("create: includes optional video + followUpFor fields when provided", async () => {
      const { calls } = setupFetchMock([
        mockResponse({
          id: "sub-fu",
          coach_slug: "c",
          parent_email: "p@e.com",
          player_age: 10,
          swing_type: "softball",
          notes: "",
          video_url: "https://cdn/video.mp4",
          video_file_name: "v.mp4",
          status: "pending_payment",
          follow_up_for: "orig-123",
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      await repo.create({
        coachSlug: "c",
        parentEmail: "p@e.com",
        playerAge: 10,
        swingType: "softball",
        notes: "",
        videoUrl: "https://cdn/video.mp4",
        videoFileName: "v.mp4",
        followUpFor: "orig-123",
      });
      const body = JSON.parse(calls[0].body!);
      expect(body.video_url).toBe("https://cdn/video.mp4");
      expect(body.video_file_name).toBe("v.mp4");
      expect(body.follow_up_for).toBe("orig-123");
    });

    it("create: rejects invalid input (bad email, age out of range)", async () => {
      setupFetchMock([]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      await expect(
        repo.create({
          coachSlug: "c",
          parentEmail: "not-an-email",
          playerAge: 25,
          swingType: "baseball",
          notes: "",
        }),
      ).rejects.toThrow(/Invalid submission/);
    });

    it("getById: GET with id filter, returns mapped submission", async () => {
      const { calls } = setupFetchMock([
        mockResponse({
          id: "sub-1",
          coach_slug: "c",
          parent_email: "p@e.com",
          player_age: 10,
          swing_type: "baseball",
          notes: "n",
          video_url: null,
          video_file_name: null,
          status: "paid",
          follow_up_for: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      const sub = await repo.getById("sub-1");
      expect(sub?.status).toBe("paid");
      expect(calls[0].url).toContain("id=eq.sub-1");
    });

    it("getById: returns undefined when not found (406 single-object response)", async () => {
      // PostgREST returns 406 in single-object mode when no row matches.
      // The client treats this as "not found" and returns undefined.
      setupFetchMock([mockResponse(null, { status: 406 })]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      const result = await repo.getById("not-found");
      expect(result).toBeUndefined();
    });

    it("getForCoach: GET with coach_slug filter + order, returns array", async () => {
      const { calls } = setupFetchMock([
        mockResponse([
          {
            id: "sub-2",
            coach_slug: "marcus-reed",
            parent_email: "a@b.com",
            player_age: 14,
            swing_type: "baseball",
            notes: "n2",
            video_url: null,
            video_file_name: null,
            status: "completed",
            follow_up_for: null,
            created_at: "2026-06-20T12:00:00Z",
            updated_at: "2026-06-20T12:00:00Z",
          },
          {
            id: "sub-1",
            coach_slug: "marcus-reed",
            parent_email: "c@d.com",
            player_age: 10,
            swing_type: "baseball",
            notes: "n1",
            video_url: null,
            video_file_name: null,
            status: "paid",
            follow_up_for: null,
            created_at: "2026-06-21T12:00:00Z",
            updated_at: "2026-06-21T12:00:00Z",
          },
        ]),
      ]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      const subs = await repo.getForCoach("marcus-reed");
      expect(subs).toHaveLength(2);
      expect(subs[0].id).toBe("sub-2");
      expect(calls[0].url).toContain("coach_slug=eq.marcus-reed");
      expect(calls[0].url).toContain("order=created_at.desc");
    });

    it("markPaid: GET then PATCH, transitions pending_payment → paid", async () => {
      const { calls } = setupFetchMock([
        // First call: GET current row
        mockResponse({
          id: "sub-1",
          coach_slug: "c",
          parent_email: "p@e.com",
          player_age: 10,
          swing_type: "baseball",
          notes: "",
          video_url: null,
          video_file_name: null,
          status: "pending_payment",
          follow_up_for: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
        // Second call: PATCH
        mockResponse({
          id: "sub-1",
          coach_slug: "c",
          parent_email: "p@e.com",
          player_age: 10,
          swing_type: "baseball",
          notes: "",
          video_url: null,
          video_file_name: null,
          status: "paid",
          follow_up_for: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:01:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      const sub = await repo.markPaid("sub-1");
      expect(sub.status).toBe("paid");
      expect(calls).toHaveLength(2);
      expect(calls[0].method).toBe("GET");
      expect(calls[1].method).toBe("PATCH");
      const patchBody = JSON.parse(calls[1].body!);
      expect(patchBody.status).toBe("paid");
    });

    it("markPaid: throws if submission not found", async () => {
      // PostgREST single-object 406 → non-ok → throws
      setupFetchMock([mockResponse(null, { status: 406 })]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      await expect(repo.markPaid("nope")).rejects.toThrow();
    });

    it("markInReview: throws 'already in review' if status is in_review", async () => {
      setupFetchMock([
        mockResponse({
          id: "sub-1",
          coach_slug: "c",
          parent_email: "p@e.com",
          player_age: 10,
          swing_type: "baseball",
          notes: "",
          video_url: null,
          video_file_name: null,
          status: "in_review",
          follow_up_for: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      await expect(repo.markInReview("sub-1")).rejects.toThrow(
        /already in review/,
      );
    });

    it("markInReview: throws 'not paid' if status is pending_payment", async () => {
      setupFetchMock([
        mockResponse({
          id: "sub-1",
          coach_slug: "c",
          parent_email: "p@e.com",
          player_age: 10,
          swing_type: "baseball",
          notes: "",
          video_url: null,
          video_file_name: null,
          status: "pending_payment",
          follow_up_for: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-submissions");
      const repo = new mod.SupabaseSubmissionRepository();
      await expect(repo.markInReview("sub-1")).rejects.toThrow(/not paid/);
    });
  });

  // ---------------------------------------------------------------------------
  // Coaches
  // ---------------------------------------------------------------------------
  describe("SupabaseCoachRepository", () => {
    it("getBySlug: GET with slug filter, maps price_usd_cents → priceUsd dollars", async () => {
      const { calls } = setupFetchMock([
        mockResponse({
          slug: "marcus-reed",
          name: "Marcus Reed",
          title: "Hitting Coach",
          bio: "bio",
          location: "Austin, TX",
          price_usd_cents: 4900,
          turnaround: "PT24H",
          highlights: ["a", "b"],
          testimonials: [{ author: "Dana", quote: "great" }],
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-coaches");
      const repo = new mod.SupabaseCoachRepository();
      const coach = await repo.getBySlug("marcus-reed");
      expect(coach?.priceUsd).toBe(49); // 4900 cents → $49
      expect(coach?.highlights).toEqual(["a", "b"]);
      expect(coach?.testimonials[0].author).toBe("Dana");
      expect(calls[0].url).toContain("slug=eq.marcus-reed");
    });

    it("getAllSlugs: GET with select=slug, returns string array", async () => {
      const { calls } = setupFetchMock([
        mockResponse([
          { slug: "marcus-reed" },
          { slug: "priya-anand" },
        ]),
      ]);
      const mod = await import("@/lib/repositories/supabase-coaches");
      const repo = new mod.SupabaseCoachRepository();
      const slugs = await repo.getAllSlugs();
      expect(slugs).toEqual(["marcus-reed", "priya-anand"]);
      expect(calls[0].url).toContain("select=slug");
    });

    it("upsert (update path): PATCH existing coach, maps price dollars → cents", async () => {
      const { calls } = setupFetchMock([
        // First: getBySlug to check existence
        mockResponse({
          slug: "marcus-reed",
          name: "Marcus Reed",
          title: "Hitting Coach",
          bio: "bio",
          location: "Austin, TX",
          price_usd_cents: 4900,
          turnaround: "PT24H",
          highlights: ["a"],
          testimonials: [],
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
        // Second: PATCH
        mockResponse({
          slug: "marcus-reed",
          name: "Marcus Reed II",
          title: "Senior Coach",
          bio: "new bio",
          location: "Dallas, TX",
          price_usd_cents: 5500,
          turnaround: "PT12H",
          highlights: ["x"],
          testimonials: [],
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-22T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-coaches");
      const repo = new mod.SupabaseCoachRepository();
      const coach = await repo.upsert({
        name: "Marcus Reed II",
        title: "Senior Coach",
        bio: "new bio",
        location: "Dallas, TX",
        priceUsd: 55,
        turnaround: "PT12H",
        highlights: ["x"],
        existingSlug: "marcus-reed",
      });
      expect(coach.priceUsd).toBe(55); // 5500 cents → $55
      expect(coach.name).toBe("Marcus Reed II");
      // Verify PATCH body has price in cents
      const patchBody = JSON.parse(calls[1].body!);
      expect(patchBody.price_usd_cents).toBe(5500);
      expect(calls[1].method).toBe("PATCH");
    });

    it("upsert (create path): POST new coach with disambiguated slug", async () => {
      // First call: nextAvailableSlug queries for existing slugs
      // Second call: POST the new coach
      const { calls } = setupFetchMock((call) => {
        if (call.url.includes("like.")) {
          return mockResponse([{ slug: "marcus-reed" }]); // base slug taken
        }
        return mockResponse({
          slug: "marcus-reed-2",
          name: "Marcus Reed",
          title: "Hitting Coach",
          bio: "bio",
          location: "Austin, TX",
          price_usd_cents: 4900,
          turnaround: "PT24H",
          highlights: ["a"],
          testimonials: [],
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        });
      });
      const mod = await import("@/lib/repositories/supabase-coaches");
      const repo = new mod.SupabaseCoachRepository();
      const coach = await repo.upsert({
        name: "Marcus Reed",
        title: "Hitting Coach",
        bio: "bio",
        location: "Austin, TX",
        priceUsd: 49,
        turnaround: "PT24H",
        highlights: ["a"],
      });
      expect(coach.slug).toBe("marcus-reed-2"); // disambiguated
      // Verify POST
      const postCall = calls.find((c) => c.method === "POST");
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall!.body!);
      expect(body.slug).toBe("marcus-reed-2");
      expect(body.price_usd_cents).toBe(4900);
      expect(body.testimonials).toEqual([]);
    });

    it("upsert: rejects invalid input (empty name, price < $1)", async () => {
      setupFetchMock([]);
      const mod = await import("@/lib/repositories/supabase-coaches");
      const repo = new mod.SupabaseCoachRepository();
      await expect(
        repo.upsert({
          name: "",
          title: "t",
          bio: "b",
          location: "l",
          priceUsd: 0,
          turnaround: "PT24H",
          highlights: [],
        }),
      ).rejects.toThrow(/Invalid coach input/);
    });
  });

  // ---------------------------------------------------------------------------
  // Earnings
  // ---------------------------------------------------------------------------
  describe("SupabaseEarningRepository", () => {
    it("record: idempotent — returns existing earning if one exists for submission", async () => {
      const { calls } = setupFetchMock([
        mockResponse({
          id: "earn-1",
          submission_id: "sub-1",
          coach_slug: "marcus-reed",
          amount_usd_cents: 4900,
          parent_email: "p@e.com",
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-earnings");
      const repo = new mod.SupabaseEarningRepository();
      const earning = await repo.record({
        submissionId: "sub-1",
        coachSlug: "marcus-reed",
        amountUsd: 49,
        parentEmail: "p@e.com",
      });
      expect(earning.id).toBe("earn-1");
      expect(earning.amountUsd).toBe(49); // 4900 cents → $49
      // Only the GET (check existing) — no POST since existing found
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe("GET");
    });

    it("record: POST new earning when none exists, maps dollars → cents", async () => {
      const { calls } = setupFetchMock((call) => {
        if (call.method === "GET") return mockResponse(null, { status: 406 });
        // POST response
        return mockResponse({
          id: "earn-new",
          submission_id: "sub-2",
          coach_slug: "marcus-reed",
          amount_usd_cents: 4900,
          parent_email: "p@e.com",
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        });
      });
      const mod = await import("@/lib/repositories/supabase-earnings");
      const repo = new mod.SupabaseEarningRepository();
      const earning = await repo.record({
        submissionId: "sub-2",
        coachSlug: "marcus-reed",
        amountUsd: 49,
        parentEmail: "p@e.com",
      });
      expect(earning.amountUsd).toBe(49);
      const postCall = calls.find((c) => c.method === "POST");
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall!.body!);
      expect(body.amount_usd_cents).toBe(4900);
      expect(body.id).toMatch(/^earn_/);
    });

    it("record: rejects invalid input (amount < $1, empty slug)", async () => {
      setupFetchMock([]);
      const mod = await import("@/lib/repositories/supabase-earnings");
      const repo = new mod.SupabaseEarningRepository();
      await expect(
        repo.record({
          submissionId: "s1",
          coachSlug: "",
          amountUsd: 49,
          parentEmail: "p@e.com",
        }),
      ).rejects.toThrow(/Coach slug is required/);
      await expect(
        repo.record({
          submissionId: "s1",
          coachSlug: "c",
          amountUsd: 0,
          parentEmail: "p@e.com",
        }),
      ).rejects.toThrow(/Earning amount must be at least \$1/);
    });

    it("getForCoach: returns array sorted by created_at desc, maps cents → dollars", async () => {
      setupFetchMock([
        mockResponse([
          {
            id: "earn-2",
            submission_id: "sub-2",
            coach_slug: "marcus-reed",
            amount_usd_cents: 4900,
            parent_email: "a@b.com",
            created_at: "2026-06-22T12:00:00Z",
            updated_at: "2026-06-22T12:00:00Z",
          },
          {
            id: "earn-1",
            submission_id: "sub-1",
            coach_slug: "marcus-reed",
            amount_usd_cents: 3900,
            parent_email: "c@d.com",
            created_at: "2026-06-21T12:00:00Z",
            updated_at: "2026-06-21T12:00:00Z",
          },
        ]),
      ]);
      const mod = await import("@/lib/repositories/supabase-earnings");
      const repo = new mod.SupabaseEarningRepository();
      const earnings = await repo.getForCoach("marcus-reed");
      expect(earnings).toHaveLength(2);
      expect(earnings[0].amountUsd).toBe(49);
      expect(earnings[1].amountUsd).toBe(39);
    });

    it("getTotalForCoach: sums all earning amounts in dollars", async () => {
      setupFetchMock([
        mockResponse([
          {
            id: "e1",
            submission_id: "s1",
            coach_slug: "c",
            amount_usd_cents: 5000,
            parent_email: "p@e.com",
            created_at: "2026-06-21T12:00:00Z",
            updated_at: "2026-06-21T12:00:00Z",
          },
          {
            id: "e2",
            submission_id: "s2",
            coach_slug: "c",
            amount_usd_cents: 3000,
            parent_email: "p@e.com",
            created_at: "2026-06-22T12:00:00Z",
            updated_at: "2026-06-22T12:00:00Z",
          },
        ]),
      ]);
      const mod = await import("@/lib/repositories/supabase-earnings");
      const repo = new mod.SupabaseEarningRepository();
      const total = await repo.getTotalForCoach("c");
      expect(total).toBe(80); // $50 + $30
    });
  });

  // ---------------------------------------------------------------------------
  // Playback manifests
  // ---------------------------------------------------------------------------
  describe("SupabasePlaybackManifestRepository", () => {
    const sampleManifest = {
      videoUrl: "https://cdn/video.mp4",
      notes: [
        {
          id: "note-1",
          timecode: 5.5,
          audioUrl: "https://cdn/audio.mp3",
          audioDuration: 10.5,
          annotations: [],
          createdAt: 1234567890,
        },
      ],
      createdAt: 1234567890,
      status: "draft" as const,
      version: 1,
    };

    it("getForSubmission: GET, returns manifest with submissionId merged from column", async () => {
      const { calls } = setupFetchMock([
        mockResponse({
          id: "man-1",
          submission_id: "sub-1",
          coach_slug: "marcus-reed",
          parent_email: "p@e.com",
          delivery_token_id: null,
          manifest: sampleManifest,
          version: 1,
          status: "draft",
          processed_at: null,
          ai_summary: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        }),
      ]);
      const mod = await import("@/lib/repositories/supabase-playback");
      const repo = new mod.SupabasePlaybackManifestRepository();
      const stored = await repo.getForSubmission("sub-1");
      expect(stored?.submissionId).toBe("sub-1"); // from the column, not the JSONB
      expect(stored?.videoUrl).toBe("https://cdn/video.mp4");
      expect(stored?.notes).toHaveLength(1);
      expect(calls[0].url).toContain("submission_id=eq.sub-1");
    });

    it("save (new): POST with manifest as JSONB + denormalized columns", async () => {
      const { calls } = setupFetchMock((call) => {
        // First call: GET (check existing) → not found (406)
        if (call.method === "GET") return mockResponse(null, { status: 406 });
        // Second call: POST → return the created row
        return mockResponse({
          id: "man-new",
          submission_id: "sub-2",
          coach_slug: "marcus-reed",
          parent_email: "p@e.com",
          delivery_token_id: "tok-1",
          manifest: { ...sampleManifest, coachSlug: "marcus-reed", parentEmail: "p@e.com", deliveryTokenId: "tok-1" },
          version: 1,
          status: "draft",
          processed_at: null,
          ai_summary: null,
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-21T12:00:00Z",
        });
      });
      const mod = await import("@/lib/repositories/supabase-playback");
      const repo = new mod.SupabasePlaybackManifestRepository();
      const stored = await repo.save("sub-2", {
        ...sampleManifest,
        coachSlug: "marcus-reed",
        parentEmail: "p@e.com",
        deliveryTokenId: "tok-1",
      });
      expect(stored.submissionId).toBe("sub-2");
      const postCall = calls.find((c) => c.method === "POST");
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall!.body!);
      expect(body.submission_id).toBe("sub-2");
      expect(body.coach_slug).toBe("marcus-reed");
      expect(body.parent_email).toBe("p@e.com");
      expect(body.delivery_token_id).toBe("tok-1");
      expect(body.manifest.videoUrl).toBe("https://cdn/video.mp4");
      expect(body.version).toBe(1);
      expect(body.status).toBe("draft");
    });

    it("save (update): PATCH existing manifest when one already exists", async () => {
      const { calls } = setupFetchMock((call) => {
        // First: GET → existing found
        if (call.method === "GET") {
          return mockResponse({
            id: "man-1",
            submission_id: "sub-1",
            coach_slug: "marcus-reed",
            parent_email: "p@e.com",
            delivery_token_id: null,
            manifest: sampleManifest,
            version: 1,
            status: "draft",
            processed_at: null,
            ai_summary: null,
            created_at: "2026-06-21T12:00:00Z",
            updated_at: "2026-06-21T12:00:00Z",
          });
        }
        // Second: PATCH → updated row
        return mockResponse({
          id: "man-1",
          submission_id: "sub-1",
          coach_slug: "marcus-reed",
          parent_email: "p@e.com",
          delivery_token_id: "tok-9",
          manifest: { ...sampleManifest, status: "processed", version: 2 },
          version: 2,
          status: "processed",
          processed_at: "2026-06-22T12:00:00Z",
          ai_summary: "AI summary",
          created_at: "2026-06-21T12:00:00Z",
          updated_at: "2026-06-22T12:00:00Z",
        });
      });
      const mod = await import("@/lib/repositories/supabase-playback");
      const repo = new mod.SupabasePlaybackManifestRepository();
      const stored = await repo.save("sub-1", {
        ...sampleManifest,
        status: "processed",
        version: 2,
        coachSlug: "marcus-reed",
        parentEmail: "p@e.com",
        deliveryTokenId: "tok-9",
        aiSummary: "AI summary",
        processedAt: 1718124000000,
      });
      expect(stored.status).toBe("processed");
      expect(stored.version).toBe(2);
      expect(stored.submissionId).toBe("sub-1");
      const patchCall = calls.find((c) => c.method === "PATCH");
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall!.body!);
      expect(body.status).toBe("processed");
      expect(body.version).toBe(2);
      expect(body.delivery_token_id).toBe("tok-9");
      expect(body.ai_summary).toBe("AI summary");
      // PATCH should NOT include id or submission_id (those don't change)
      expect(body.id).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-cutting: headers always include service-role key
  // ---------------------------------------------------------------------------
  describe("PostgREST headers (all impls)", () => {
    it("every request includes apikey + Bearer Authorization headers", async () => {
      const { calls } = setupFetchMock([
        mockResponse([]), // submissions GET
      ]);
      const subMod = await import("@/lib/repositories/supabase-submissions");
      const repo = new subMod.SupabaseSubmissionRepository();
      await repo.getForCoach("c");
      const headers = calls[0].headers;
      expect(headers.apikey).toBe(SUPABASE_KEY);
      expect(headers.Authorization).toBe(`Bearer ${SUPABASE_KEY}`);
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("every request URL starts with the PostgREST base path", async () => {
      const { calls } = setupFetchMock([mockResponse(null, { status: 406 })]);
      const subMod = await import("@/lib/repositories/supabase-submissions");
      const repo = new subMod.SupabaseSubmissionRepository();
      await repo.getById("x").catch(() => {});
      expect(calls[0].url).toBe(`${SUPABASE_URL}/rest/v1/submissions?id=eq.x`);
    });

    it("non-ok response throws a PostgREST error with status", async () => {
      setupFetchMock([mockResponse({ message: "violated constraint" }, { status: 500 })]);
      const subMod = await import("@/lib/repositories/supabase-submissions");
      const repo = new subMod.SupabaseSubmissionRepository();
      await expect(repo.getById("x")).rejects.toThrow(/PostgREST.*failed.*500/);
    });
  });
});
