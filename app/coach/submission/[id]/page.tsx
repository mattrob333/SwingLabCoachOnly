import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StartReviewButton } from "@/components/coach/start-review-button";
import { SubmissionDangerActions } from "@/components/coach/submission-danger-actions";
import { statusBadgeVariant } from "@/components/coach/coach-inbox";
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

  const coach = await getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

  const submission = await getSubmissionById(id);

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
  const comparisonCandidates = await listComparisonCandidates(submission.id);

  const statusLabel: Record<string, string> = {
    paid: "New — awaiting review",
    in_review: "In review",
    rendering: "Rendering lesson",
    completed: "Completed",
  };

  return (
    <Container className="py-8 sm:py-12">
      {/* Back link */}
      <a
        href="/coach/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-ring/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-md"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to inbox
      </a>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Submission
            </h1>
            <Badge variant={statusBadgeVariant(submission.status)}>
              {statusLabel[submission.status] ?? submission.status}
            </Badge>
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
          <Card className="mt-2 p-4">
            <p className="whitespace-pre-wrap text-sm">{submission.notes}</p>
          </Card>
        </section>
      )}

      {/* Action area */}
      <section className="mt-8">
        {submission.status === "paid" && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Ready to review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This submission has been paid. Start the review to open the Review
              Studio.
            </p>
            <div className="mt-4">
              <StartReviewButton submissionId={submission.id} />
            </div>
          </Card>
        )}

        {submission.status === "in_review" && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Review in progress</h2>
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
          </Card>
        )}

        {submission.status === "rendering" && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Rendering lesson</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The review has been submitted and the render pipeline is composing
              the final lesson. This page will update when rendering completes.
            </p>
          </Card>
        )}

        {submission.status === "completed" && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Review complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This submission has been processed into an interactive lesson the
              player can watch.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`/lesson/${submission.id}`}>
                <Button variant="default" size="lg">
                  Open player lesson
                </Button>
              </a>
              <a href={`/coach/review/${submission.id}`}>
                <Button variant="outline" size="lg">
                  Re-open Review Studio
                </Button>
              </a>
            </div>
          </Card>
        )}
      </section>

      {/* Comparison mode — show when there are comparable follow-ups */}
      {comparisonCandidates.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold">Compare swings</h2>
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
        </Card>
      )}

      {/* Privacy controls — revoke delivery link + delete submission (PRD §25) */}
      <div className="mt-6">
        <SubmissionDangerActions
          submissionId={submission.id}
          canRevoke={submission.status === "completed"}
          canDelete={true}
        />
      </div>
    </Container>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </Card>
  );
}
