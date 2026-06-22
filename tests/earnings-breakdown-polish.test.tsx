import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EarningsBreakdown } from "@/components/coach/earnings-breakdown";
import type { Earning } from "@/lib/repositories/types";

function makeEarning(overrides: Partial<Earning> = {}): Earning {
  return {
    id: "ern-1",
    submissionId: "sub-abc12345",
    coachSlug: "marcus-reed",
    amountUsd: 49,
    parentEmail: "parent@example.com",
    createdAt: new Date("2026-06-15T10:00:00Z"),
    ...overrides,
  };
}

describe("EarningsBreakdown — UX polish task #6", () => {
  it("renders EmptyState primitive when no earnings", () => {
    const { container } = render(
      <EarningsBreakdown earnings={[]} total={0} />,
    );
    const emptyState = container.querySelector('[data-slot="empty-state"]');
    expect(emptyState).not.toBeNull();
    // Table should NOT be present
    expect(container.querySelector("table")).toBeNull();
  });

  it("renders table inside a Card primitive when earnings exist", () => {
    const earnings = [makeEarning()];
    const { container } = render(
      <EarningsBreakdown earnings={earnings} total={49} />,
    );
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector("table")).not.toBeNull();
  });

  it('shows a "Paid" Badge (variant=success) in each earning row', () => {
    const earnings = [
      makeEarning({ id: "ern-1" }),
      makeEarning({ id: "ern-2", submissionId: "sub-def67890" }),
    ];
    const { container, getAllByText } = render(
      <EarningsBreakdown earnings={earnings} total={98} />,
    );
    const badges = container.querySelectorAll('[data-slot="badge"]');
    expect(badges.length).toBe(2);
    // Each badge should have the success variant classes
    expect(badges[0].className).toContain("bg-success");
    expect(getAllByText("Paid").length).toBe(2);
  });

  it("renders parent email and submission link in each row", () => {
    const earnings = [
      makeEarning({ parentEmail: "mom@example.com", submissionId: "sub-xyz12345" }),
    ];
    const { getByText, container } = render(
      <EarningsBreakdown earnings={earnings} total={49} />,
    );
    expect(getByText("mom@example.com")).toBeTruthy();
    const link = container.querySelector(
      'a[href="/coach/submission/sub-xyz12345"]',
    );
    expect(link).not.toBeNull();
  });

  it("displays the total in the table footer", () => {
    const earnings = [makeEarning({ amountUsd: 49 }), makeEarning({ id: "ern-2", amountUsd: 49, submissionId: "sub-2" })];
    const { container } = render(
      <EarningsBreakdown earnings={earnings} total={98} />,
    );
    const tfoot = container.querySelector("tfoot");
    expect(tfoot).not.toBeNull();
    expect(tfoot?.textContent).toContain("98");
  });
});
