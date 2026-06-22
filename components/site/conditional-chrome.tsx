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
        <CoachTopNav />
        <main className="flex flex-1 flex-col">{children}</main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
