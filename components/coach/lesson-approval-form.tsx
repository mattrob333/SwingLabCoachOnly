"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast";
import type { LessonDraft } from "@/lib/ai/lesson-draft";

type LessonApprovalFormProps = {
  submissionId: string;
  draft: LessonDraft;
};

/**
 * Phase 7 (build order #15) — Coach lesson approval form.
 *
 * The coach reviews the AI-generated lesson draft, edits the coach notes, and
 * approves or rejects it before the lesson is delivered to the parent.
 *
 * Guardrail: AI assists coach only — the draft is never auto-approved. The
 * coach must explicitly click Approve. The PATCH API enforces coach auth +
 * ownership.
 */
export function LessonApprovalForm({
  submissionId,
  draft,
}: LessonApprovalFormProps) {
  const router = useRouter();
  const [coachNotes, setCoachNotes] = useState(draft.coachNotes);
  const [status, setStatus] = useState(draft.status);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function patchDraft(nextStatus: typeof status, notes: string) {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/lesson-draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachNotes: notes, status: nextStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const message = data.error ?? "Failed to update lesson draft";
        setError(message);
        showToast({
          title: "Couldn't save changes",
          description: message,
          variant: "error",
        });
        setLoading(false);
        return;
      }
      setStatus(nextStatus);
      setCoachNotes(notes);
      setSaved(true);
      setLoading(false);
      // Supplementary success toast — the inline Badge / status change is
      // the primary UI; the toast confirms the action transacted.
      if (nextStatus === "approved") {
        showToast({
          title: "Lesson approved & sent",
          description:
            "The parent has been emailed a secure magic link to view the lesson.",
          variant: "success",
        });
      } else if (nextStatus === "rejected") {
        showToast({
          title: "Lesson rejected",
          description: "The draft stays editable — rework and re-approve anytime.",
          variant: "success",
        });
      } else {
        showToast({
          title: "Notes saved",
          description: "Your coach notes are stored.",
          variant: "success",
        });
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      showToast({
        title: "Network error",
        description: "Couldn't reach the server. Please check your connection and try again.",
        variant: "error",
      });
      setLoading(false);
    }
  }

  async function handleSaveNotes(e: FormEvent) {
    e.preventDefault();
    await patchDraft(status, coachNotes);
  }

  async function handleApprove() {
    await patchDraft("approved", coachNotes);
  }

  async function handleReject() {
    await patchDraft("rejected", coachNotes);
  }

  const statusLabel: Record<string, string> = {
    draft: "Draft — awaiting review",
    approved: "Approved — lesson delivered",
    rejected: "Rejected — needs rework",
  };

  const statusBadgeVariant: Record<
    string,
    "default" | "success" | "warning" | "destructive" | "primary" | "outline"
  > = {
    draft: "warning",
    approved: "success",
    rejected: "destructive",
  };

  return (
    <div className="space-y-6">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <Badge variant={statusBadgeVariant[status] ?? "default"}>
          {statusLabel[status] ?? status}
        </Badge>
      </div>

      {/* Draft preview */}
      <Card>
        <CardHeader>
          <CardTitle>{draft.title}</CardTitle>
          <CardDescription>{draft.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.keyPoints.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key Moments
              </h3>
              <ul className="mt-2 space-y-1.5">
                {draft.keyPoints.map((kp, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{kp.label}</span>
                    <span className="text-muted-foreground">
                      {" "}— {kp.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draft.drills.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recommended Drills
              </h3>
              <ul className="mt-2 space-y-2">
                {draft.drills.map((drill, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{drill.name}</span>
                    <Badge variant="outline" size="sm">
                      {drill.category}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coach notes editor */}
      <form onSubmit={handleSaveNotes} className="space-y-3">
        <label
          htmlFor="coachNotes"
          className="text-sm font-medium"
        >
          Coach notes (shown to parent)
        </label>
        <textarea
          id="coachNotes"
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          rows={5}
          placeholder="Add personal notes for the player/parent — encouragement, focus areas, what to practice before the next swing."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" size="sm" disabled={loading}>
            {loading ? "Saving…" : "Save notes"}
          </Button>
          {saved && <Badge variant="success">Notes saved</Badge>}
        </div>
      </form>

      {/* Approval actions */}
      <Card>
        <CardHeader>
          <CardTitle>Approve or reject this lesson</CardTitle>
          <CardDescription>
            Approving publishes the lesson to the parent via the delivery page.
            Rejecting sends it back for rework — the draft stays editable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="default"
              size="lg"
              disabled={loading || status === "approved"}
              onClick={handleApprove}
            >
              {status === "approved" ? "Approved ✓" : "Approve lesson"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={loading || status === "rejected"}
              onClick={handleReject}
            >
              {status === "rejected" ? "Rejected" : "Reject"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
