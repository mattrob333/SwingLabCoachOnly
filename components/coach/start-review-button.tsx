"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";

type StartReviewButtonProps = {
  submissionId: string;
};

/**
 * Phase 4 — "Start review" button on the submission detail page.
 *
 * POSTs to /api/submissions/[id]/review which transitions the submission
 * from `paid` → `in_review`. On success, refreshes the page so the server
 * component re-renders with the new status (and a link to the Review Studio
 * once Phase 5 lands).
 */
export function StartReviewButton({ submissionId }: StartReviewButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const message = data.error ?? "Failed to start review";
        setError(message);
        showToast({
          title: "Failed to start review",
          description: message,
          variant: "error",
        });
        setLoading(false);
        return;
      }
      router.push(`/coach/review/${submissionId}`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      showToast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "error",
      });
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <form onSubmit={handleStart}>
        <Button type="submit" variant="default" size="lg" disabled={loading}>
          {loading ? "Starting…" : "Start review"}
        </Button>
      </form>
    </div>
  );
}
