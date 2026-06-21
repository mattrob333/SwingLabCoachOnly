import Link from "next/link";
import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60">
      <Container className="flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} SwingLab. All rights reserved.</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/coaches" className="hover:text-foreground">
            Coaches
          </Link>
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
