import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mutable pathname so we can vary usePathname per test.
const mockPathname = { current: "/coach/dashboard" };

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Accessibility: focus-visible ring styles on raw <button> elements.
//
// The shadcn <Button> component already includes focus-visible ring styles.
// These tests verify that raw <button> elements (not using <Button>) also
// have visible focus indicators for keyboard users (WCAG 2.4.7).
// ---------------------------------------------------------------------------

describe("Accessibility: focus-visible rings on raw button elements", () => {
  beforeEach(() => {
    mockPathname.current = "/coach/dashboard";
  });

  // --- Error boundaries ---

  it("route error Try Again button has focus-visible ring", async () => {
    const { default: RouteErrorBoundary } = await import("@/app/error");
    render(<RouteErrorBoundary error={new Error("boom")} reset={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /try again/i });
    expect(btn.className).toContain("focus-visible:ring");
  });

  it("global error Try Again button has focus-visible ring", async () => {
    const { default: GlobalErrorBoundary } = await import("@/app/global-error");
    render(<GlobalErrorBoundary error={new Error("Fatal")} reset={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /try again/i });
    expect(btn.className).toContain("focus-visible:ring");
  });

  // --- CoachTopNav ---

  it("CoachTopNav desktop sign out button has focus-visible ring", async () => {
    const { CoachTopNav } = await import("@/components/coach/coach-top-nav");
    render(<CoachTopNav />);
    // Desktop sign out form has class "hidden sm:block"
    const forms = document.querySelectorAll(
      "form[action='/api/auth/logout']",
    );
    // First form is desktop, second (if menu open) is mobile
    const desktopBtn = forms[0]?.querySelector("button");
    expect(desktopBtn?.className).toContain("focus-visible:ring");
  });

  it("CoachTopNav hamburger toggle has focus-visible ring", async () => {
    const { CoachTopNav } = await import("@/components/coach/coach-top-nav");
    render(<CoachTopNav />);
    const toggle = screen.getByLabelText("Toggle menu");
    expect(toggle.className).toContain("focus-visible:ring");
  });

  it("CoachTopNav mobile sign out button has focus-visible ring", async () => {
    const { CoachTopNav } = await import("@/components/coach/coach-top-nav");
    render(<CoachTopNav />);
    // Open mobile menu to reveal mobile sign out
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    const mobileMenu = screen.getByTestId("mobile-menu");
    const btn = mobileMenu.querySelector("button");
    expect(btn?.className).toContain("focus-visible:ring");
  });

  // --- CoachInbox filter tabs ---

  it("CoachInbox filter tab buttons have focus-visible ring", async () => {
    const { CoachInbox } = await import("@/components/coach/coach-inbox");
    const submissions = [
      {
        id: "sub-1",
        athleteName: "Test Athlete",
        status: "submitted" as const,
        coachSlug: "coach-1",
        parentEmail: "parent@test.com",
        parentName: "Parent",
        videoUrl: "/test.mp4",
        priceUsd: 49,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ];
    render(<CoachInbox submissions={submissions} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThan(0);
    for (const tab of tabs) {
      expect(tab.className).toContain("focus-visible:ring");
    }
  });

  // --- PaymentForm toggle buttons ---

  it("PaymentForm pay/code toggle buttons have focus-visible ring", async () => {
    const { PaymentForm } = await import("@/components/pay/payment-form");
    const { container } = render(
      <PaymentForm
        submissionId="sub-1"
        coachName="Marcus Reed"
        priceUsd={49}
      />,
    );
    // Toggle buttons are the raw <button type="button"> in the toggle div
    const toggleDiv = container.querySelector(".flex.rounded-lg.border");
    const toggleBtns = toggleDiv?.querySelectorAll("button[type='button']");
    expect(toggleBtns?.length).toBe(2);
    for (const btn of toggleBtns ?? []) {
      expect(btn.className).toContain("focus-visible:ring");
    }
  });

  // --- Toaster dismiss button ---

  it("Toaster dismiss button has focus-visible ring", async () => {
    const { showToast } = await import("@/lib/toast");
    const { Toaster } = await import("@/components/ui/toaster");
    showToast({ title: "Test toast" });
    render(<Toaster />);
    const dismissBtn = screen.getByLabelText("Dismiss notification");
    expect(dismissBtn.className).toContain("focus-visible:ring");
  });
});
