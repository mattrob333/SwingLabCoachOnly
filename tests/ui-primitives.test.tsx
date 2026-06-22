import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";

/**
 * Render/smoke tests for the shared UI primitives (UX Polish task #1).
 *
 * These verify each primitive mounts without crashing, renders the expected
 * DOM structure with the expected `data-slot` attributes, and applies the
 * design-token classes. They are NOT visual regression tests — they guard
 * against accidental removal of required structure and against className
 * regressions when the token system evolves.
 */
describe("shared UI primitives (UX Polish task #1)", () => {
  describe("Card", () => {
    it("renders a card with the card data-slot and token classes", () => {
      const { container } = render(<Card data-testid="c">body</Card>);
      const card = container.querySelector('[data-slot="card"]');
      expect(card).not.toBeNull();
      expect(card?.className).toContain("rounded-xl");
      expect(card?.className).toContain("bg-card");
      expect(card?.className).toContain("border-border");
      expect(card?.textContent).toBe("body");
    });

    it("composes header/title/description/content/footer sub-slots", () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Body</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>,
      );
      expect(container.querySelector('[data-slot="card-header"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="card-title"]')?.textContent).toBe("Title");
      expect(container.querySelector('[data-slot="card-description"]')?.textContent).toBe("Description");
      expect(container.querySelector('[data-slot="card-content"]')?.textContent).toBe("Body");
      expect(container.querySelector('[data-slot="card-footer"]')?.textContent).toBe("Footer");
    });
  });

  describe("Badge", () => {
    it("renders a span with the badge data-slot", () => {
      const { container } = render(<Badge>Paid</Badge>);
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("Paid");
      expect(badge?.className).toContain("rounded-full");
    });

    it("applies the success variant classes (semantic token)", () => {
      const { container } = render(<Badge variant="success">Completed</Badge>);
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge?.className).toContain("bg-success");
      expect(badge?.className).toContain("text-success");
    });

    it("applies the primary variant (clay accent)", () => {
      const { container } = render(<Badge variant="primary">New</Badge>);
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge?.className).toContain("bg-primary");
      expect(badge?.className).toContain("text-primary-foreground");
    });

    it("applies the info variant (navy/ink)", () => {
      const { container } = render(<Badge variant="info">3 items</Badge>);
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge?.className).toContain("bg-info");
      expect(badge?.className).toContain("text-info");
      expect(badge?.textContent).toBe("3 items");
    });

    it("applies the warning variant (amber, semantic token)", () => {
      const { container } = render(<Badge variant="warning">Pending</Badge>);
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge?.className).toContain("bg-warning");
      expect(badge?.className).toContain("text-warning");
    });

    it("badgeVariants exports the full variant set", () => {
      const cv = badgeVariants;
      // Each variant produces a class string containing "rounded-full".
      for (const v of ["default", "primary", "success", "warning", "info", "destructive", "outline"] as const) {
        expect(cv({ variant: v })).toContain("rounded-full");
      }
    });
  });

  describe("Skeleton", () => {
    it("renders a pulsing muted block with aria-hidden", () => {
      const { container } = render(<Skeleton className="h-4 w-32" />);
      const skel = container.querySelector('[data-slot="skeleton"]');
      expect(skel).not.toBeNull();
      expect(skel?.className).toContain("animate-pulse");
      expect(skel?.className).toContain("bg-muted");
      expect(skel?.getAttribute("aria-hidden")).toBe("true");
      expect(skel?.className).toContain("h-4");
      expect(skel?.className).toContain("w-32");
    });
  });

  describe("EmptyState", () => {
    it("renders title + description + action", () => {
      const { container } = render(
        <EmptyState
          title="No submissions yet"
          description="Share your coach link to get your first swing."
          action={<button type="button">Copy link</button>}
        />,
      );
      const es = container.querySelector('[data-slot="empty-state"]');
      expect(es).not.toBeNull();
      expect(es?.textContent).toContain("No submissions yet");
      expect(es?.textContent).toContain("Share your coach link");
      expect(es?.querySelector("button")?.textContent).toBe("Copy link");
    });

    it("renders an optional icon container when icon prop is provided", () => {
      const { container } = render(
        <EmptyState title="Empty" icon={<span>ICN</span>} />,
      );
      const es = container.querySelector('[data-slot="empty-state"]');
      // The icon wrapper is the rounded-full muted container.
      const iconWrapper = es?.querySelector(".rounded-full.bg-muted");
      expect(iconWrapper?.textContent).toBe("ICN");
    });

    it("omits the icon container when icon prop is absent", () => {
      const { container } = render(<EmptyState title="Empty" />);
      const es = container.querySelector('[data-slot="empty-state"]');
      expect(es?.querySelector(".rounded-full.bg-muted")).toBeNull();
    });
  });

  describe("Avatar", () => {
    it("renders fallback initials when no src is provided", () => {
      const { container } = render(<Avatar fallback="MR" />);
      const av = container.querySelector('[data-slot="avatar"]');
      expect(av).not.toBeNull();
      expect(av?.textContent).toBe("MR");
      expect(av?.querySelector("img")).toBeNull();
    });

    it("renders an img when src is provided", () => {
      const { container } = render(
        <Avatar src="/img/coach.png" alt="Coach Marcus" fallback="MR" />,
      );
      const av = container.querySelector('[data-slot="avatar"]');
      const img = av?.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe("/img/coach.png");
      expect(img?.getAttribute("alt")).toBe("Coach Marcus");
    });

    it("applies size classes", () => {
      const { container } = render(<Avatar fallback="MR" size="lg" />);
      const av = container.querySelector('[data-slot="avatar"]');
      expect(av?.className).toContain("size-12");
    });

    it("default size is size-9", () => {
      const { container } = render(<Avatar fallback="MR" />);
      const av = container.querySelector('[data-slot="avatar"]');
      expect(av?.className).toContain("size-9");
    });
  });
});

// Silence React import lint (React namespace used for JSX transform + types).
void React;
