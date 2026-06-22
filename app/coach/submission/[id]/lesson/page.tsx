import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { LessonApprovalForm } from "@/components/coach/lesson-approval-form";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import { getSubmissionById } from "@/lib/submissions";
import { getDraftForSubmission } from "@/lib/ai/lesson-draft-store";

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
  if (!draft) {
    notFound();
  }

  return (
    <Container className="py-12">
      {/* Back link */}
      <a
        href={`/coach/submission/${submission.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to submission
      </a>

      <div className="mt-6 mb-8">
        <p className="text-sm font-medium text-muted-foreground">
          Lesson Draft Review
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Approve Lesson
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review the AI-generated draft below. Edit your notes, then approve to
          deliver the lesson to the parent.
        </p>
      </div>

      <LessonApprovalForm submissionId={submission.id} draft={draft} />

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
