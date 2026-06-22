"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

type AiReviewPanelProps = {
  submissionId: string;
  manifest: LessonPlaybackManifest;
};

/**
 * Wave 4 Sub-slice 3c-i — Coach AI review panel.
 *
 * Displays the AI-generated lesson summary and per-note moment titles for the
 * coach to review and edit. Edits are saved via PATCH /api/submissions/[id]/package.
 *
 * Guardrail: AI assists, never invents. The coach explicitly reviews and edits
 * every piece of AI output before it reaches the parent. This panel does NOT
 * approve the lesson — that is a separate explicit action (Sub-slice 3c-ii).
 */
export function AiReviewPanel({ submissionId, manifest }: AiReviewPanelProps) {
  const [summary, setSummary] = useState(manifest.aiSummary ?? "");
  const [noteTitles, setNoteTitles] = useState(
    manifest.notes.map((note) => {
      const aiTitle = manifest.aiNoteTitles?.find(
        (t) => t.noteId === note.id,
      );
      return { noteId: note.id, title: aiTitle?.title ?? "" };
    }),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(manifest.status === "approved");
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  function handleTitleChange(noteId: string, value: string) {
    setNoteTitles((prev) =>
      prev.map((t) => (t.noteId === noteId ? { ...t, title: value } : t)),
    );
    setSaved(false);
  }

  function handleSummaryChange(value: string) {
    setSummary(value);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/package`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiSummary: summary,
          aiNoteTitles: noteTitles,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Failed to save AI review changes");
        setSaving(false);
        return;
      }
      setSaved(true);
      setSaving(false);
    } catch {
      setError("Network error — please try again.");
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setApproveError(
          data.error ?? "Failed to approve lesson — please try again.",
        );
        setApproving(false);
        return;
      }
      setApproved(true);
      setApproving(false);
    } catch {
      setApproveError("Network error — please try again.");
      setApproving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium">AI lesson summary</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Review and edit the AI-generated summary. This is shown to the parent
          as the lesson overview. The AI summarizes your coaching feedback — it
          never adds an independent diagnosis.
        </p>
        <textarea
          aria-label="AI lesson summary"
          value={summary}
          onChange={(e) => handleSummaryChange(e.target.value)}
          rows={5}
          className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Moment titles</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          AI-suggested titles for each coaching moment. Edit to match your
          intent before approving.
        </p>
        <div className="mt-4 space-y-3">
          {manifest.notes.map((note, index) => (
            <div key={note.id} className="space-y-1">
              <label
                htmlFor={`title-${note.id}`}
                className="text-xs font-medium text-muted-foreground"
              >
                Moment {index + 1} — {note.timecode.toFixed(1)}s
              </label>
              <input
                id={`title-${note.id}`}
                aria-label="Moment title"
                value={
                  noteTitles.find((t) => t.noteId === note.id)?.title ?? ""
                }
                onChange={(e) => handleTitleChange(note.id, e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="default"
          size="sm"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && (
          <span className="text-xs text-green-600">Saved.</span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── Approve & Send Lesson (Sub-slice 3c-ii) ── */}
      {approved ? (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-6">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            ✓ Lesson approved — the parent has been emailed a secure magic link
            to view the lesson.
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-medium">Approve &amp; send lesson</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Once you&apos;re happy with the summary and moment titles above,
            approve to deliver the lesson to the parent. They&apos;ll receive a
            secure magic link by email.
          </p>
          <div className="mt-4">
            <Button
              onClick={handleApprove}
              disabled={approving}
              variant="default"
            >
              {approving ? "Approving…" : "Approve & Send Lesson"}
            </Button>
          </div>
        </section>
      )}

      {approveError && (
        <p role="alert" className="text-sm text-destructive">
          {approveError}
        </p>
      )}
    </div>
  );
}
