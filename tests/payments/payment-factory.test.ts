import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("payment adapter factory (getPaymentAdapter)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns a mock adapter when Stripe keys are absent", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");

    const {
      getPaymentAdapter,
      _resetPaymentAdapterForTests,
    } = await import("@/lib/payments");
    _resetPaymentAdapterForTests();
    const adapter = getPaymentAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("returns a live (Stripe) adapter when all Stripe keys are present", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_abc");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test");

    const {
      getPaymentAdapter,
      _resetPaymentAdapterForTests,
    } = await import("@/lib/payments");
    _resetPaymentAdapterForTests();
    const adapter = getPaymentAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("returns a mock adapter when only some keys are present", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_abc");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test");

    const {
      getPaymentAdapter,
      _resetPaymentAdapterForTests,
    } = await import("@/lib/payments");
    _resetPaymentAdapterForTests();
    const adapter = getPaymentAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("caches the adapter instance across calls", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");

    const {
      getPaymentAdapter,
      _resetPaymentAdapterForTests,
    } = await import("@/lib/payments");
    _resetPaymentAdapterForTests();
    const a = getPaymentAdapter();
    const b = getPaymentAdapter();
    expect(a).toBe(b);
  });

  it("returns a new instance after _resetPaymentAdapterForTests", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");

    const mod = await import("@/lib/payments");
    mod._resetPaymentAdapterForTests();
    const a = mod.getPaymentAdapter();
    mod._resetPaymentAdapterForTests();
    const b = mod.getPaymentAdapter();
    expect(a).not.toBe(b);
  });
});
