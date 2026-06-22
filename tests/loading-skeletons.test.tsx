import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";

import { CoachDashboardSkeleton } from "@/app/coach/dashboard/loading";
import { CoachEarningsSkeleton } from "@/app/coach/earnings/loading";
import { SubmissionDetailSkeleton } from "@/app/coach/submission/[id]/loading";
import { LessonApprovalSkeleton } from "@/app/coach/submission/[id]/lesson/loading";
import { CompareSkeleton } from "@/app/coach/compare/loading";
import { ReviewStudioSkeleton } from "@/app/coach/review/[id]/loading";

/**
 * Render/smoke tests for route-level loading skeletons (UX Polish task #9 —
 * micro-states: loading).
 *
 * Next.js convention: a `loading.tsx` in a route segment shows automatically
 * while the route's server component is fetching data. Each skeleton should
 * mirror the layout of its real page so the transition feels instant rather
 * than jarring.
 *
 * These tests verify:
 * - The skeleton renders without crashing.
 * - It uses the shared Skeleton primitive (data-slot="skeleton") — not bespoke
 *   divs — so the pulse animation + token colors are consistent.
 * - It contains enough skeleton blocks to plausibly fill the page (header,
 *   stat cards, list rows).
 * - It is aria-hidden (screen readers skip decorative skeletons).
 */
describe("route loading skeletons", () => {
  describe("CoachDashboardSkeleton", () => {
    it("renders without crashing", () => {
      const { container } = render(<CoachDashboardSkeleton />);
      expect(container.firstChild).not.toBeNull();
    });

    it("uses the shared Skeleton primitive (data-slot=skeleton)", () => {
      const { container } = render(<CoachDashboardSkeleton />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      // Should have enough skeletons to fill the page: avatar, header lines,
      // stat cards, filter tabs, and at least 3 submission card rows.
      expect(skeletons.length).toBeGreaterThanOrEqual(8);
    });

    it("all skeleton blocks are aria-hidden (decorative)", () => {
      const { container } = render(<CoachDashboardSkeleton />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      skeletons.forEach((s) => {
        expect(s.getAttribute("aria-hidden")).toBe("true");
      });
    });
  });

  describe("CoachEarningsSkeleton", () => {
    it("renders without crashing", () => {
      const { container } = render(<CoachEarningsSkeleton />);
      expect(container.firstChild).not.toBeNull();
    });

    it("uses the shared Skeleton primitive", () => {
      const { container } = render(<CoachEarningsSkeleton />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      // Header + 2 stat cards + breakdown rows.
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("SubmissionDetailSkeleton", () => {
    it("renders without crashing", () => {
      const { container } = render(<SubmissionDetailSkeleton />);
      expect(container.firstChild).not.toBeNull();
    });

    it("uses the shared Skeleton primitive", () => {
      const { container } = render(<SubmissionDetailSkeleton />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      // Back link + header + status badge + detail fields + action area.
      expect(skeletons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("LessonApprovalSkeleton", () => {
    it("renders without crashing", () => {
      const { container } = render(<LessonApprovalSkeleton />);
      expect(container.firstChild).not.toBeNull();
    });

    it("uses the shared Skeleton primitive", () => {
      const { container } = render(<LessonApprovalSkeleton />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      // Back link + header + 3 review panel cards with rows + action button.
      expect(skeletons.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("CompareSkeleton", () => {
    it("renders without crashing", () => {
      const { container } = render(<CompareSkeleton />);
      expect(container.firstChild).not.toBeNull();
    });

    it("uses the shared Skeleton primitive", () => {
      const { container } = render(<CompareSkeleton />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      // Back link + header + description + candidate list rows.
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("ReviewStudioSkeleton", () => {
    it("renders without crashing", () => {
      const { container } = render(<ReviewStudioSkeleton />);
      expect(container.firstChild).not.toBeNull();
    });

    it("uses the shared Skeleton primitive", () => {
      const { container } = render(<ReviewStudioSkeleton />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      // Back link + header + subtitle + video player area.
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
    });
  });
});

void React;
