import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("ResendEmailAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("has mode 'live'", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("throws when constructed without RESEND_API_KEY", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    expect(() => new ResendEmailAdapter()).toThrow("RESEND_API_KEY");
  });

  it("sends an email via Resend API and returns success with messageId", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "SwingLab <noreply@example.com>");

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "msg_123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      parentName: "Jane",
      coachName: "Marcus Reed",
      lessonUrl: "https://swinglab.app/lesson/sub-1?token=abc123",
      submissionId: "sub-1",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("live");
    expect(result.messageId).toBe("msg_123");

    // Verify the fetch call
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(opts?.method).toBe("POST");
    const headers = opts?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer re_test_key");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts?.body as string);
    expect(body.from).toBe("SwingLab <noreply@example.com>");
    expect(body.to).toEqual(["parent@example.com"]);
    expect(body.subject).toContain("Marcus Reed");
    expect(body.html).toContain("https://swinglab.app/lesson/sub-1?token=abc123");
  });

  it("uses default from address when EMAIL_FROM is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    delete process.env.EMAIL_FROM;

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "msg_456" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      coachName: "Coach",
      lessonUrl: "https://swinglab.app/lesson/s1?t=1",
      submissionId: "s1",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.from).toBe("SwingLab <onboarding@resend.dev>");
  });

  it("returns failure on API error response", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response('{"error":"Invalid API key"}', {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      coachName: "Coach",
      lessonUrl: "https://swinglab.app/lesson/s1?t=1",
      submissionId: "s1",
    });

    expect(result.success).toBe(false);
    expect(result.mode).toBe("live");
    expect(result.messageId).toBeNull();
    expect(result.error).toContain("401");
  });

  it("returns failure when recipient email is empty", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "",
      coachName: "Coach",
      lessonUrl: "https://swinglab.app/lesson/s1?t=1",
      submissionId: "s1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Recipient email");
  });

  it("returns failure when lesson URL is empty", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      coachName: "Coach",
      lessonUrl: "",
      submissionId: "s1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Lesson URL");
  });

  it("includes parentName in greeting when provided", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "msg_789" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      parentName: "Jane",
      coachName: "Coach",
      lessonUrl: "https://swinglab.app/lesson/s1?t=1",
      submissionId: "s1",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.html).toContain("Hi Jane");
  });

  it("uses generic greeting when parentName is not provided", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "msg_000" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { ResendEmailAdapter } = await import("@/lib/email/resend-email");
    const adapter = new ResendEmailAdapter();
    await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      coachName: "Coach",
      lessonUrl: "https://swinglab.app/lesson/s1?t=1",
      submissionId: "s1",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.html).toContain("Hi,");
    expect(body.html).not.toContain("Hi Jane");
  });
});
