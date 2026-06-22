"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary.
 *
 * Next.js automatically wraps each route segment in this component. When an
 * unhandled error occurs during rendering, server-side data fetching, or in a
 * Server Action, this component renders instead of the broken page.
 *
 * Must be a client component. Receives `error` (the caught Error) and `reset`
 * (a function that re-renders the error boundary's children).
 */
export default function RouteErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for development visibility. In production this is where
    // you'd send to an error monitoring service (Sentry, Vercel Observer, etc.).
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          We hit an unexpected error
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your work is safe. Try again, or head back to your dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try Again
          </button>
          <Link
            href="/coach/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
