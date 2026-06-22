"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { CoachTopNav } from "@/components/coach/coach-top-nav";

/**
 * Path-aware layout chrome.  Renders the coach top-nav (no footer) on
 * authenticated coach routes and the marketing SiteHeader + SiteFooter on
 * every other route (including /coach/login, which is a public page).
 */
export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isCoachArea =
    pathname.startsWith("/coach/") && !pathname.startsWith("/coach/login");

  if (isCoachArea) {
    return (
      <>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <CoachTopNav />
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
