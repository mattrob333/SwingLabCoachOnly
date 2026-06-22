"use client";

import { useEffect } from "react";

/**
 * Global error boundary.
 *
 * This component replaces the ENTIRE app (including the root layout) when an
 * error occurs at the root level. It must include its own <html> and <body>
 * tags because the root layout is not rendered when this boundary activates.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#666" }}>
            Something went wrong
          </p>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginTop: "0.5rem",
            }}
          >
            Application Error
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#666",
              marginTop: "0.5rem",
            }}
          >
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#0a0a0a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
