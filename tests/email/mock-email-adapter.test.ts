import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockEmailAdapter, MOCK_SENT_EMAILS } from "@/lib/email/mock-email";

describe("MockEmailAdapter", () => {
  beforeEach(() => {
    MOCK_SENT_EMAILS.length = 0;
  });

  it("has mode 'mock'", () => {
    const adapter = new MockEmailAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("sends a lesson delivery email and returns success", async () => {
    const adapter = new MockEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      parentName: "Jane",
      coachName: "Marcus Reed",
      lessonUrl: "https://swinglab.app/lesson/sub-1?token=abc123",
      submissionId: "sub-1",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("mock");
    expect(result.messageId).toBeNull();
  });

  it("stores the sent email in MOCK_SENT_EMAILS for inspection", async () => {
    const adapter = new MockEmailAdapter();
    await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      parentName: "Jane",
      coachName: "Marcus Reed",
      lessonUrl: "https://swinglab.app/lesson/sub-1?token=abc123",
      submissionId: "sub-1",
    });

    expect(MOCK_SENT_EMAILS).toHaveLength(1);
    expect(MOCK_SENT_EMAILS[0].to).toBe("parent@example.com");
    expect(MOCK_SENT_EMAILS[0].parentName).toBe("Jane");
    expect(MOCK_SENT_EMAILS[0].coachName).toBe("Marcus Reed");
    expect(MOCK_SENT_EMAILS[0].lessonUrl).toBe(
      "https://swinglab.app/lesson/sub-1?token=abc123",
    );
    expect(MOCK_SENT_EMAILS[0].submissionId).toBe("sub-1");
    expect(MOCK_SENT_EMAILS[0].sentAt).toBeGreaterThan(0);
  });

  it("logs to console when sending", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const adapter = new MockEmailAdapter();
    await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      coachName: "Marcus Reed",
      lessonUrl: "https://swinglab.app/lesson/sub-1?token=abc123",
      submissionId: "sub-1",
    });

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("[email:mock]");
    expect(joined).toContain("parent@example.com");
    logSpy.mockRestore();
  });

  it("works without parentName (optional field)", async () => {
    const adapter = new MockEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      coachName: "Marcus Reed",
      lessonUrl: "https://swinglab.app/lesson/sub-1?token=abc123",
      submissionId: "sub-1",
    });

    expect(result.success).toBe(true);
    expect(MOCK_SENT_EMAILS[0].parentName).toBeUndefined();
  });

  it("returns failure when recipient email is empty", async () => {
    const adapter = new MockEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "",
      coachName: "Marcus Reed",
      lessonUrl: "https://swinglab.app/lesson/sub-1?token=abc123",
      submissionId: "sub-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Recipient email");
    expect(MOCK_SENT_EMAILS).toHaveLength(0);
  });

  it("returns failure when lesson URL is empty", async () => {
    const adapter = new MockEmailAdapter();
    const result = await adapter.sendLessonDeliveryEmail({
      to: "parent@example.com",
      coachName: "Marcus Reed",
      lessonUrl: "",
      submissionId: "sub-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Lesson URL");
    expect(MOCK_SENT_EMAILS).toHaveLength(0);
  });

  it("accumulates multiple sent emails in the store", async () => {
    const adapter = new MockEmailAdapter();
    await adapter.sendLessonDeliveryEmail({
      to: "parent1@example.com",
      coachName: "Coach A",
      lessonUrl: "https://swinglab.app/lesson/s1?t=1",
      submissionId: "s1",
    });
    await adapter.sendLessonDeliveryEmail({
      to: "parent2@example.com",
      coachName: "Coach B",
      lessonUrl: "https://swinglab.app/lesson/s2?t=2",
      submissionId: "s2",
    });

    expect(MOCK_SENT_EMAILS).toHaveLength(2);
    expect(MOCK_SENT_EMAILS[0].to).toBe("parent1@example.com");
    expect(MOCK_SENT_EMAILS[1].to).toBe("parent2@example.com");
  });
});
