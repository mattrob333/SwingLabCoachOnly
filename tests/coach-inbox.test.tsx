import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";

import {
  CoachInbox,
  statusBadgeVariant,
  statusLabel,
  filterSubmissions,
  countByFilter,
  type InboxSubmission,
} from "@/components/coach/coach-inbox";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeSubmission(
  overrides: Partial<InboxSubmission> = {},
): InboxSubmission {
  return {
    id: "sub-1",
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
    playerAge: 12,
    swingType: "driver",
    notes: "",
    status: "paid",
    createdAt: "2026-06-20T12:00:00.000Z",
    ...overrides,
  };
}

// Silence React import (used for JSX transform).
void React;

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------

describe("statusBadgeVariant", () => {
  it("maps paid → primary", () => {
    expect(statusBadgeVariant("paid")).toBe("primary");
  });
  it("maps in_review → warning", () => {
    expect(statusBadgeVariant("in_review")).toBe("warning");
  });
  it("maps rendering → warning", () => {
    expect(statusBadgeVariant("rendering")).toBe("warning");
  });
  it("maps completed → success", () => {
    expect(statusBadgeVariant("completed")).toBe("success");
  });
  it("maps pending_payment → default", () => {
    expect(statusBadgeVariant("pending_payment")).toBe("default");
  });
});

describe("statusLabel", () => {
  it("labels paid as 'New'", () => {
    expect(statusLabel("paid")).toBe("New");
  });
  it("labels in_review as 'In review'", () => {
    expect(statusLabel("in_review")).toBe("In review");
  });
  it("labels rendering as 'Rendering'", () => {
    expect(statusLabel("rendering")).toBe("Rendering");
  });
  it("labels completed as 'Completed'", () => {
    expect(statusLabel("completed")).toBe("Completed");
  });
  it("labels pending_payment as 'Pending payment'", () => {
    expect(statusLabel("pending_payment")).toBe("Pending payment");
  });
});

describe("filterSubmissions", () => {
  const subs: InboxSubmission[] = [
    makeSubmission({ id: "s-paid", status: "paid" }),
    makeSubmission({ id: "s-review", status: "in_review" }),
    makeSubmission({ id: "s-render", status: "rendering" }),
    makeSubmission({ id: "s-done", status: "completed" }),
    makeSubmission({ id: "s-pending", status: "pending_payment" }),
  ];

  it("'all' returns everything except pending_payment", () => {
    const result = filterSubmissions(subs, "all");
    expect(result.map((s) => s.id)).toEqual([
      "s-paid",
      "s-review",
      "s-render",
      "s-done",
    ]);
  });

  it("'active' returns paid + in_review + rendering", () => {
    const result = filterSubmissions(subs, "active");
    expect(result.map((s) => s.id)).toEqual([
      "s-paid",
      "s-review",
      "s-render",
    ]);
  });

  it("'completed' returns only completed", () => {
    const result = filterSubmissions(subs, "completed");
    expect(result.map((s) => s.id)).toEqual(["s-done"]);
  });

  it("excludes pending_payment from all filters", () => {
    const all = filterSubmissions(subs, "all");
    expect(all.find((s) => s.status === "pending_payment")).toBeUndefined();
  });
});

describe("countByFilter", () => {
  it("counts submissions per filter category", () => {
    const subs: InboxSubmission[] = [
      makeSubmission({ id: "s1", status: "paid" }),
      makeSubmission({ id: "s2", status: "in_review" }),
      makeSubmission({ id: "s3", status: "completed" }),
      makeSubmission({ id: "s4", status: "pending_payment" }),
    ];
    const counts = countByFilter(subs);
    expect(counts.all).toBe(3);
    expect(counts.active).toBe(2);
    expect(counts.completed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Component render tests
// ---------------------------------------------------------------------------

describe("CoachInbox component", () => {
  it("renders filter tabs with counts", () => {
    const subs = [
      makeSubmission({ id: "s1", status: "paid" }),
      makeSubmission({ id: "s2", status: "completed" }),
    ];
    render(<CoachInbox submissions={subs} />);

    // Use role-based queries to distinguish tabs from badge labels
    const allTab = screen.getByRole("tab", { name: /All/ });
    const activeTab = screen.getByRole("tab", { name: /Active/ });
    const completedTab = screen.getByRole("tab", { name: /Completed/ });
    expect(allTab.textContent).toContain("2");
    expect(activeTab.textContent).toContain("1");
    expect(completedTab.textContent).toContain("1");
  });

  it("renders submission cards with parent email and status badge", () => {
    const subs = [
      makeSubmission({
        id: "s1",
        parentEmail: "parent@test.com",
        status: "paid",
      }),
    ];
    const { container } = render(<CoachInbox submissions={subs} />);

    expect(container.textContent).toContain("parent@test.com");
    expect(container.textContent).toContain("New");
    // Should have a badge with data-slot="badge"
    expect(container.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders EmptyState when no submissions exist", () => {
    const { container } = render(<CoachInbox submissions={[]} />);

    expect(container.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    expect(container.textContent).toContain("No submissions yet");
  });

  it("renders EmptyState when filter has no matches", () => {
    const subs = [makeSubmission({ id: "s1", status: "paid" })];
    const { container } = render(<CoachInbox submissions={subs} />);

    // Click "Completed" tab — no completed submissions
    fireEvent.click(screen.getByRole("tab", { name: /Completed/ }));

    expect(container.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    expect(container.textContent).toContain(
      "No submissions in this category",
    );
  });

  it("filters submissions when switching tabs", () => {
    const subs = [
      makeSubmission({
        id: "s1",
        parentEmail: "active@test.com",
        status: "paid",
      }),
      makeSubmission({
        id: "s2",
        parentEmail: "done@test.com",
        status: "completed",
      }),
    ];
    const { container } = render(<CoachInbox submissions={subs} />);

    // Both visible in "All"
    expect(container.textContent).toContain("active@test.com");
    expect(container.textContent).toContain("done@test.com");

    // Switch to "Active" — only the paid one
    fireEvent.click(screen.getByRole("tab", { name: /Active/ }));
    expect(container.textContent).toContain("active@test.com");
    expect(container.textContent).not.toContain("done@test.com");

    // Switch to "Completed" — only the completed one
    fireEvent.click(screen.getByRole("tab", { name: /Completed/ }));
    expect(container.textContent).not.toContain("active@test.com");
    expect(container.textContent).toContain("done@test.com");
  });

  it("renders submission notes when present", () => {
    const subs = [
      makeSubmission({
        id: "s1",
        notes: "Need help with backswing",
      }),
    ];
    const { container } = render(<CoachInbox submissions={subs} />);
    expect(container.textContent).toContain("Need help with backswing");
  });

  it("marks the active tab with aria-selected", () => {
    render(<CoachInbox submissions={[]} />);

    const allTab = screen.getByRole("tab", { name: /All/ });
    expect(allTab.getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("tab", { name: /Active/ }));
    const activeTab = screen.getByRole("tab", { name: /Active/ });
    expect(activeTab.getAttribute("aria-selected")).toBe("true");
    expect(allTab.getAttribute("aria-selected")).toBe("false");
  });

  it("links submission card to /coach/submission/[id]", () => {
    const subs = [makeSubmission({ id: "sub-abc" })];
    const { container } = render(<CoachInbox submissions={subs} />);

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/coach/submission/sub-abc");
  });
});
