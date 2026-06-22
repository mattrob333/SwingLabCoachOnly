"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { showToast } from "@/lib/toast";

type SubmissionDangerActionsProps = {
  submissionId: string;
  /** Show the revoke-link action (only meaningful for completed/approved submissions). */
  canRevoke: boolean;
  /** Show the delete action. */
  canDelete: boolean;
};

/**
 * UX Polish task #9 — toast wiring slice 2.
 *
 * Coach-facing UI for the Wave 6 privacy controls (PRD §25):
 * - **Revoke delivery link**: immediately invalidates all magic links sent to
 *   the parent. The lesson data is preserved — the coach can re-approve later
 *   to issue a new link.
 * - **Delete submission**: permanently removes the submission and ALL
 *   associated data (playback manifest, delivery tokens, video assets, storage
 *   file). Irreversible.
 *
 * Both actions use a two-step confirmation (button → confirm/cancel) and fire
 * success/error toasts as supplementary feedback alongside the inline state
 * changes (revoked banner, redirect to dashboard).
 */
export function SubmissionDangerActions({
  submissionId,
  canRevoke,
  canDelete,
}: SubmissionDangerActionsProps) {
  const router = useRouter();
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try {
      const res = await fetch(
        `/api/submissions/${submissionId}/revoke-link`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        showToast({
          title: "Couldn't revoke link",
          description: data.error ?? "Please try again.",
          variant: "error",
        });
        setRevoking(false);
        return;
      }
      const data = (await res.json()) as { revokedCount: number };
      showToast({
        title: "Delivery link revoked",
        description:
          data.revokedCount > 0
            ? `${data.revokedCount} link${data.revokedCount === 1 ? "" : "s"} invalidated. The parent can no longer access the lesson.`
            : "No active links found — already revoked.",
        variant: "success",
      });
      setConfirmingRevoke(false);
      setRevoking(false);
      router.refresh();
    } catch {
      showToast({
        title: "Network error",
        description: "Couldn't reach the server. Please try again.",
        variant: "error",
      });
      setRevoking(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        showToast({
          title: "Couldn't delete submission",
          description: data.error ?? "Please try again.",
          variant: "error",
        });
        setDeleting(false);
        return;
      }
      showToast({
        title: "Submission deleted",
        description: "All associated data has been permanently removed.",
        variant: "success",
      });
      setDeleting(false);
      router.push("/coach/dashboard");
      router.refresh();
    } catch {
      showToast({
        title: "Network error",
        description: "Couldn't reach the server. Please try again.",
        variant: "error",
      });
      setDeleting(false);
    }
  }

  // Nothing to render if neither action is available.
  if (!canRevoke && !canDelete) return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base">Privacy controls</CardTitle>
        <CardDescription>
          Manage or remove this submission&apos;s data (PRD §25).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revoke delivery link */}
        {canRevoke && !confirmingRevoke && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Revoke the magic link sent to the parent. They will immediately
              lose access. Lesson data is preserved for re-delivery.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingRevoke(true)}
            >
              Revoke delivery link
            </Button>
          </div>
        )}
        {canRevoke && confirmingRevoke && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-medium">
              Are you sure? The parent will immediately lose access to the
              lesson.
            </p>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleRevoke}
                disabled={revoking}
                aria-label="Confirm revoke"
              >
                {revoking ? "Revoking…" : "Confirm revoke"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingRevoke(false)}
                disabled={revoking}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Delete submission */}
        {canDelete && !confirmingDelete && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Permanently delete this submission and all associated data
              (video, notes, lesson, delivery tokens). This cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete submission
            </Button>
          </div>
        )}
        {canDelete && confirmingDelete && (
          <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Permanently delete this submission? This action is irreversible.
              All video, notes, lesson content, and delivery tokens will be
              removed.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Confirm delete"
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
