"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    href: "/coach/dashboard",
    label: "Dashboard",
    activePrefixes: [
      "/coach/dashboard",
      "/coach/submission",
      "/coach/review",
      "/coach/compare",
    ],
  },
  {
    href: "/coach/earnings",
    label: "Earnings",
    activePrefixes: ["/coach/earnings"],
  },
] as const;

function isActive(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Context-aware top navigation for authenticated coach pages.
 * Renders a sticky bar with Dashboard / Earnings links (active-state
 * highlighting via usePathname) and a Sign out form.  On mobile a hamburger
 * toggle reveals a dropdown menu.
 */
export function CoachTopNav() {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Link
          href="/coach/dashboard"
          className="flex items-center gap-2 font-semibold transition-colors hover:text-primary"
        >
          <span
            aria-hidden
            className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs shadow-sm"
          >
            SL
          </span>
          <span className="text-base tracking-tight">SwingLab</span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-1 sm:flex"
          data-testid="desktop-nav"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive(pathname, item.activePrefixes)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Desktop sign out */}
          <form
            action="/api/auth/logout"
            method="post"
            className="hidden sm:block"
          >
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav
          className="border-t border-border/70 bg-background sm:hidden"
          data-testid="mobile-menu"
        >
          <Container className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive(pathname, item.activePrefixes)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <form action="/api/auth/logout" method="post">
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start"
              >
                Sign out
              </Button>
            </form>
          </Container>
        </nav>
      )}
    </header>
  );
}
