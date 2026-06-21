import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { StartReviewButton } from "@/components/coach/start-review-button";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import { getSubmissionById } from "@/lib/submissions";
import { listComparisonCandidates } from "@/lib/comparison";

export const metadata = {
  title: "Submission detail",
  description: "SwingLab submission detail.",
};

export default async function SubmissionDetailPage({
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

  const coach = getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

  const submission = getSubmissionById(id);

  // Guardrail: payment before review. Don't expose pending_payment submissions
  // to the coach, and don't reveal submissions owned by other coaches.
  if (
    !submission ||
    submission.coachSlug !== coach.slug ||
    submission.status === "pending_payment"
  ) {
    notFound();
  }

  // Phase 10 — follow-up swings with completed lessons available for comparison.
  const comparisonCandidates = listComparisonCandidates(submission.id);

  const statusLabel: Record<string, string> = {
    paid: "New — awaiting review",
    in_review: "In review",
    rendering: "Rendering lesson",
    completed: "Completed",
  };

  const statusColors: Record<string, string> = {
    paid: "bg-blue-100 text-blue-700",
    in_review: "bg-amber-100 text-amber-700",
    rendering: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <Container className="py-12">
      {/* Back link */}
      <a
        href="/coach/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to inbox
      </a>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Submission
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[submission.status] ?? "bg-muted text-muted-foreground"}`}
            >
              {statusLabel[submission.status] ?? submission.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {submission.createdAt.toLocaleDateString()} at{" "}
            {submission.createdAt.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Details grid */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <DetailField label="Parent email" value={submission.parentEmail} />
        <DetailField label="Player age" value={String(submission.playerAge)} />
        <DetailField label="Swing type" value={submission.swingType} />
        <DetailField label="Coach" value={coach.name} />
      </section>

      {submission.notes && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            Parent notes
          </h2>
          <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm">
            {submission.notes}
          </p>
        </section>
      )}

      {/* Action area */}
      <section className="mt-8">
        {submission.status === "paid" && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-medium">Ready to review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This submission has been paid. Start the review to open the Review
              Studio.
            </p>
            <div className="mt-4">
              <StartReviewButton submissionId={submission.id} />
            </div>
          </div>
        )}

        {submission.status === "in_review" && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-medium">Review in progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ve started reviewing this submission. Open the Review
              Studio to annotate the swing and record your feedback.
            </p>
            <div className="mt-4">
              <a href={`/coach/review/${submission.id}`}>
                <Button variant="default" size="lg">
                  Open Review Studio
                </Button>
              </a>
            </div>
          </div>
        )}

        {submission.status === "rendering" && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-medium">Rendering lesson</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The review has been submitted and the render pipeline is composing
              the final lesson. This page will update when rendering completes.
            </p>
          </div>
        )}

        {submission.status === "completed" && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-medium">Review complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This submission has been reviewed and rendered. Review and approve
              the AI-generated lesson draft to deliver it to the parent.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`/coach/submission/${submission.id}/lesson`}>
                <Button variant="default" size="lg">
                  Review lesson draft
                </Button>
              </a>
              <a href={`/coach/review/${submission.id}`}>
                <Button variant="outline" size="lg">
                  Re-open Review Studio
                </Button>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* Comparison mode — show when there are comparable follow-ups */}
      {comparisonCandidates.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-medium">Compare swings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {comparisonCandidates.length} follow-up swing
            {comparisonCandidates.length === 1 ? "" : "s"} with a completed
            lesson can be compared side by side with this original.
          </p>
          <div className="mt-4">
            <a href={`/coach/compare?original=${submission.id}`}>
              <Button variant="outline" size="lg">
                Open comparison
              </Button>
            </a>
          </div>
        </section>
      )}
    </Container>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
