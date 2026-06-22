import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { LessonApprovalForm } from "@/components/coach/lesson-approval-form";
import { AiReviewPanel } from "@/components/coach/ai-review-panel";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import { getSubmissionById } from "@/lib/submissions";
import { getDraftForSubmission } from "@/lib/ai/lesson-draft-store";
import { getPlaybackManifestForSubmission } from "@/lib/lesson/playback-store";

export const metadata = {
  title: "Review lesson draft",
  description: "Review and approve the AI-generated lesson draft.",
};

/**
 * Phase 7 (build order #15) — Coach lesson approval screen.
 *
 * The coach reviews the AI-generated lesson draft, edits coach notes, and
 * approves or rejects it. Only accessible to the coach who owns the
 * submission, and only when the submission is `completed` (review + render
 * done) and a draft exists.
 *
 * Guardrail: AI assists coach only — approval is an explicit coach action.
 */
export default async function LessonApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth gate
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    notFound();
  }

  const coach = await getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

  const submission = await getSubmissionById(id);
  if (
    !submission ||
    submission.coachSlug !== coach.slug ||
    submission.status === "pending_payment"
  ) {
    notFound();
  }

  const draft = getDraftForSubmission(id);
  const manifest = await getPlaybackManifestForSubmission(id);

  // Neither the old lesson draft nor the new playback manifest exists —
  // the lesson hasn't been generated yet.
  if (!draft && !manifest) {
    notFound();
  }

  return (
    <Container className="py-8 sm:py-12">
      {/* Back link */}
      <a
        href={`/coach/submission/${submission.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to submission
      </a>

      <div className="mt-6 mb-8">
        <p className="text-sm font-medium text-muted-foreground">
          Lesson Review
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Review &amp; Approve Lesson
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review the AI-generated lesson below. Edit the summary and moment
          titles, then approve to deliver the lesson to the parent via a secure
          magic link.
        </p>
      </div>

      {/* Wave 4 — AI review panel (primary flow).
          Rendered when a packaged playback manifest with AI output exists. */}
      {manifest && manifest.aiSummary && (
        <div className="space-y-6">
          <AiReviewPanel submissionId={submission.id} manifest={manifest} />
        </div>
      )}

      {/* Legacy Phase 7 draft approval form (coexists for submissions that
          used the older lesson-draft flow without a playback manifest). */}
      {draft && (
        <div className={manifest && manifest.aiSummary ? "mt-10 border-t border-border pt-8" : ""}>
          <LessonApprovalForm submissionId={submission.id} draft={draft} />
        </div>
      )}

      {/* Link to the parent-facing lesson page (preview) */}
      <div className="mt-8 border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          Preview the parent-facing lesson page:
        </p>
        <a href={`/lesson/${submission.id}`} className="mt-2 inline-block">
          <Button variant="outline" size="sm">
            Open lesson preview
          </Button>
        </a>
      </div>
    </Container>
  );
}
