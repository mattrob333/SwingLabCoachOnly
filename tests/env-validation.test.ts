import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We test the env validation module: it must report which integrations are
// "live" vs "mock" based on presence of their env keys, and emit a warning
// (not a crash) for any integration in mock mode.

describe("env validation module", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getIntegrationModes", () => {
    it("returns all integrations as 'mock' when no keys are set", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
      vi.stubEnv("DEEPGRAM_API_KEY", "");
      vi.stubEnv("OPENAI_API_KEY", "");
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
      vi.stubEnv("RESEND_API_KEY", "");

      const { getIntegrationModes } = await import("@/lib/env");
      const modes = getIntegrationModes();
      expect(modes.database).toBe("mock");
      expect(modes.storage).toBe("mock");
      expect(modes.transcription).toBe("mock");
      expect(modes.ai).toBe("mock");
      expect(modes.payments).toBe("mock");
      expect(modes.email).toBe("mock");
    });

    it("reports database as 'live' when Supabase URL + service role key are set", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
      const { getIntegrationModes } = await import("@/lib/env");
      const modes = getIntegrationModes();
      expect(modes.database).toBe("live");
    });

    it("reports database as 'mock' when only URL is set (key missing)", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
      const env = await import("@/lib/env");
      expect(env.getIntegrationModes().database).toBe("mock");
    });

    it("reports storage as 'live' when Supabase keys are present", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
      const { getIntegrationModes } = await import("@/lib/env");
      expect(getIntegrationModes().storage).toBe("live");
    });

    it("reports transcription as 'live' when DEEPGRAM_API_KEY is set", async () => {
      vi.stubEnv("DEEPGRAM_API_KEY", "dg-key");
      const { getIntegrationModes } = await import("@/lib/env");
      expect(getIntegrationModes().transcription).toBe("live");
    });

    it("reports ai as 'live' when OPENAI_API_KEY is set", async () => {
      vi.stubEnv("OPENAI_API_KEY", "sk-xxx");
      const { getIntegrationModes } = await import("@/lib/env");
      expect(getIntegrationModes().ai).toBe("live");
    });

    it("reports payments as 'live' only when all three Stripe keys are set", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
      const { getIntegrationModes } = await import("@/lib/env");
      expect(getIntegrationModes().payments).toBe("mock");

      vi.resetModules();
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
      vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
      const { getIntegrationModes: again } = await import("@/lib/env");
      expect(again().payments).toBe("live");
    });

    it("reports email as 'live' when RESEND_API_KEY is set", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_x");
      const { getIntegrationModes } = await import("@/lib/env");
      expect(getIntegrationModes().email).toBe("live");
    });
  });

  describe("logIntegrationModes", () => {
    it("warns once per integration in mock mode, never throws", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
      vi.stubEnv("DEEPGRAM_API_KEY", "");
      vi.stubEnv("OPENAI_API_KEY", "");
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
      vi.stubEnv("RESEND_API_KEY", "");

      const { logIntegrationModes } = await import("@/lib/env");
      expect(() => logIntegrationModes()).not.toThrow();
      // 6 integrations all in mock -> 6 warnings
      expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
      const joined = warnSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(joined).toContain("database (");
      expect(joined).toContain("storage (");
      expect(joined).toContain("transcription (");
      expect(joined).toContain("ai (");
      expect(joined).toContain("payments (");
      expect(joined).toContain("email (");
      warnSpy.mockRestore();
    });

    it("does not warn for integrations that are live", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("DEEPGRAM_API_KEY", "dg-key");
      vi.stubEnv("OPENAI_API_KEY", "sk-xxx");
      const { logIntegrationModes } = await import("@/lib/env");
      logIntegrationModes();
      const joined = warnSpy.mock.calls.map((c) => String(c[0])).join("\n");
      // Match the exact "transcription (" / "ai (" token from the warning
      // format, not bare substrings ("ai" appears inside "email").
      expect(joined).not.toContain("transcription (");
      expect(joined).not.toContain("ai (");
      expect(joined).toContain("database (");
      expect(joined).toContain("storage (");
      expect(joined).toContain("payments (");
      expect(joined).toContain("email (");
      warnSpy.mockRestore();
    });
  });

  describe("isLive / isMock helpers", () => {
    it("isLive('transcription') reflects key presence", async () => {
      vi.stubEnv("DEEPGRAM_API_KEY", "");
      const { isLive, isMock } = await import("@/lib/env");
      expect(isLive("transcription")).toBe(false);
      expect(isMock("transcription")).toBe(true);
    });

    it("rejects unknown integration names", async () => {
      const { isLive } = await import("@/lib/env");
      // @ts-expect-error -- intentionally invalid name (string not assignable to IntegrationName)
      expect(() => isLive("nope" as string)).toThrow();
    });
  });
});
