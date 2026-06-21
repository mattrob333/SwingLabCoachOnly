"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
        setError(data.error ?? "Failed to update lesson draft");
        setLoading(false);
        return;
      }
      setStatus(nextStatus);
      setCoachNotes(notes);
      setSaved(true);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
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

  const statusColor: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[status] ?? "bg-muted text-muted-foreground"}`}
        >
          {statusLabel[status] ?? status}
        </span>
      </div>

      {/* Draft preview */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium">{draft.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{draft.summary}</p>

        {draft.keyPoints.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Key Moments
            </h3>
            <ul className="mt-2 space-y-1">
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
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recommended Drills
            </h3>
            <ul className="mt-2 space-y-1">
              {draft.drills.map((drill, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{drill.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 ml-2 text-xs text-muted-foreground">
                    {drill.category}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

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
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" size="sm" disabled={loading}>
            {loading ? "Saving…" : "Save notes"}
          </Button>
          {saved && (
            <span className="text-xs text-green-600">Notes saved.</span>
          )}
        </div>
      </form>

      {/* Approval actions */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium">Approve or reject this lesson</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Approving publishes the lesson to the parent via the delivery page.
          Rejecting sends it back for rework — the draft stays editable.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
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
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
