import Link from "next/link";

/**
 * Custom 404 page.
 *
 * Renders when Next.js cannot match a route. Provides clear navigation back to
 * the home page and coach dashboard so users are never stranded on a bare
 * "Not Found" screen.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        <p className="text-4xl font-bold tracking-tight text-primary">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Home
          </Link>
          <Link
            href="/coach/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Coach Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
