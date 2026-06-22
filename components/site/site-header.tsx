import Link from "next/link";
import { Container } from "./container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/coaches", label: "Coaches" },
  { href: "/how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold transition-colors hover:text-primary">
          <span
            aria-hidden
            className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs shadow-sm"
          >
            SL
          </span>
          <span className="text-base tracking-tight">SwingLab</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/coach/login"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            Coach login
          </Link>
          <Link href="/coaches" className={cn(buttonVariants({ size: "sm" }))}>
            Find a coach
          </Link>
        </div>
      </Container>
    </header>
  );
}
