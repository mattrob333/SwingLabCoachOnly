import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mutable pathname so we can vary usePathname per test.
const mockPathname = { current: "/coach/dashboard" };

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
}));

import { CoachTopNav } from "@/components/coach/coach-top-nav";
import { ConditionalChrome } from "@/components/site/conditional-chrome";

// ---------------------------------------------------------------------------
// CoachTopNav
// ---------------------------------------------------------------------------

describe("CoachTopNav", () => {
  beforeEach(() => {
    mockPathname.current = "/coach/dashboard";
  });

  it("renders logo linking to /coach/dashboard", () => {
    render(<CoachTopNav />);
    const logo = screen.getByText("SwingLab").closest("a");
    expect(logo).toHaveAttribute("href", "/coach/dashboard");
  });

  it("renders Dashboard and Earnings nav links", () => {
    render(<CoachTopNav />);
    const dashboardLinks = screen.getAllByText("Dashboard");
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(dashboardLinks[0].closest("a")).toHaveAttribute(
      "href",
      "/coach/dashboard",
    );
    const earningsLinks = screen.getAllByText("Earnings");
    expect(earningsLinks.length).toBeGreaterThanOrEqual(1);
    expect(earningsLinks[0].closest("a")).toHaveAttribute(
      "href",
      "/coach/earnings",
    );
  });

  it("highlights Dashboard as active on /coach/dashboard", () => {
    mockPathname.current = "/coach/dashboard";
    render(<CoachTopNav />);
    const desktopNav = screen.getByTestId("desktop-nav");
    const dashboardLink = desktopNav.querySelector(
      'a[href="/coach/dashboard"]',
    );
    expect(dashboardLink?.className).toContain("bg-muted text-foreground");
  });

  it("highlights Dashboard as active on /coach/submission/sub-1", () => {
    mockPathname.current = "/coach/submission/sub-1";
    render(<CoachTopNav />);
    const desktopNav = screen.getByTestId("desktop-nav");
    const dashboardLink = desktopNav.querySelector(
      'a[href="/coach/dashboard"]',
    );
    expect(dashboardLink?.className).toContain("bg-muted text-foreground");
  });

  it("highlights Dashboard as active on /coach/review/sub-1", () => {
    mockPathname.current = "/coach/review/sub-1";
    render(<CoachTopNav />);
    const desktopNav = screen.getByTestId("desktop-nav");
    const dashboardLink = desktopNav.querySelector(
      'a[href="/coach/dashboard"]',
    );
    expect(dashboardLink?.className).toContain("bg-muted text-foreground");
  });

  it("highlights Earnings as active on /coach/earnings", () => {
    mockPathname.current = "/coach/earnings";
    render(<CoachTopNav />);
    const desktopNav = screen.getByTestId("desktop-nav");
    const earningsLink = desktopNav.querySelector(
      'a[href="/coach/earnings"]',
    );
    expect(earningsLink?.className).toContain("bg-muted text-foreground");
  });

  it("does not highlight Earnings when on /coach/dashboard", () => {
    mockPathname.current = "/coach/dashboard";
    render(<CoachTopNav />);
    const desktopNav = screen.getByTestId("desktop-nav");
    const earningsLink = desktopNav.querySelector(
      'a[href="/coach/earnings"]',
    );
    expect(earningsLink?.className).not.toContain("bg-muted text-foreground");
  });

  it("renders a Sign out form posting to /api/auth/logout", () => {
    render(<CoachTopNav />);
    const form = document.querySelector(
      "form[action='/api/auth/logout']",
    );
    expect(form).not.toBeNull();
    expect(form?.getAttribute("method")).toBe("post");
  });

  it("mobile menu toggle starts closed (aria-expanded=false)", () => {
    render(<CoachTopNav />);
    const toggle = screen.getByLabelText("Toggle menu");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("mobile-menu")).toBeNull();
  });

  it("opens mobile menu on hamburger click (aria-expanded=true)", () => {
    render(<CoachTopNav />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("mobile-menu")).not.toBeNull();
  });

  it("closes mobile menu on second hamburger click", () => {
    render(<CoachTopNav />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle); // open
    fireEvent.click(toggle); // close
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("mobile-menu")).toBeNull();
  });

  it("closes mobile menu when a nav link is clicked", () => {
    render(<CoachTopNav />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle); // open
    const mobileMenu = screen.getByTestId("mobile-menu");
    const link = mobileMenu.querySelector('a[href="/coach/earnings"]');
    fireEvent.click(link!);
    expect(screen.queryByTestId("mobile-menu")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ConditionalChrome
// ---------------------------------------------------------------------------

describe("ConditionalChrome", () => {
  beforeEach(() => {
    mockPathname.current = "/";
  });

  it("renders marketing SiteHeader on / (home)", () => {
    mockPathname.current = "/";
    render(
      <ConditionalChrome>
        <div data-testid="page-content">Page</div>
      </ConditionalChrome>,
    );
    // SiteHeader has a "Find a coach" link.
    expect(screen.getByText("Find a coach")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("renders SiteFooter on / (home)", () => {
    mockPathname.current = "/";
    render(
      <ConditionalChrome>
        <div>Page</div>
      </ConditionalChrome>,
    );
    // SiteFooter has a Privacy link.
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("renders CoachTopNav on /coach/dashboard", () => {
    mockPathname.current = "/coach/dashboard";
    render(
      <ConditionalChrome>
        <div data-testid="page-content">Page</div>
      </ConditionalChrome>,
    );
    // CoachTopNav has Dashboard and Earnings links.
    expect(screen.getByTestId("desktop-nav")).toBeInTheDocument();
    expect(screen.queryByText("Find a coach")).toBeNull();
  });

  it("does NOT render SiteFooter on /coach/dashboard", () => {
    mockPathname.current = "/coach/dashboard";
    render(
      <ConditionalChrome>
        <div>Page</div>
      </ConditionalChrome>,
    );
    expect(screen.queryByText("Privacy")).toBeNull();
  });

  it("renders marketing SiteHeader on /coach/login (login is public)", () => {
    mockPathname.current = "/coach/login";
    render(
      <ConditionalChrome>
        <div>Page</div>
      </ConditionalChrome>,
    );
    expect(screen.getByText("Find a coach")).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-nav")).toBeNull();
  });

  it("renders CoachTopNav on /coach/submission/sub-1", () => {
    mockPathname.current = "/coach/submission/sub-1";
    render(
      <ConditionalChrome>
        <div>Page</div>
      </ConditionalChrome>,
    );
    expect(screen.getByTestId("desktop-nav")).toBeInTheDocument();
    expect(screen.queryByText("Find a coach")).toBeNull();
  });

  // Accessibility — skip-to-content link + main landmark id
  it("renders a skip-to-content link pointing to #main-content", () => {
    mockPathname.current = "/";
    render(
      <ConditionalChrome>
        <div>Page</div>
      </ConditionalChrome>,
    );
    const skipLink = screen.getByText(/skip to content/i);
    expect(skipLink.tagName).toBe("A");
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("renders main element with id=\"main-content\" on marketing routes", () => {
    mockPathname.current = "/";
    render(
      <ConditionalChrome>
        <div>Page</div>
      </ConditionalChrome>,
    );
    const main = document.querySelector("main");
    expect(main).toHaveAttribute("id", "main-content");
  });

  it("renders main element with id=\"main-content\" on coach routes", () => {
    mockPathname.current = "/coach/dashboard";
    render(
      <ConditionalChrome>
        <div>Page</div>
      </ConditionalChrome>,
    );
    const main = document.querySelector("main");
    expect(main).toHaveAttribute("id", "main-content");
  });
});
