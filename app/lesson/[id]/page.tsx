import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { LessonPlaybackPlayer } from "@/components/lesson/lesson-playback-player";
import { getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";
import { getDraftForSubmission } from "@/lib/ai/lesson-draft-store";
import { getPlaybackManifestForSubmission } from "@/lib/lesson/playback-store";
import { verifyLessonAccess, type LessonAccessDeniedReason } from "@/lib/lesson/access";
import { buildLessonPageCopy } from "@/lib/lesson/page-copy";

export const metadata = {
  title: "Your Lesson",
  description: "Your personalized swing review lesson from SwingLab.",
};

/** Human-readable copy for each access-denied reason. */
const ACCESS_DENIED_COPY: Record<
  LessonAccessDeniedReason,
  { title: string; body: string }
> = {
  missing: {
    title: "Access link required",
    body: "This lesson is private. Use the secure link from your coach's email to view it.",
  },
  not_found: {
    title: "Link not recognized",
    body: "We couldn't find a lesson for that link. Double-check the link from your coach's email, or request a new one.",
  },
  expired: {
    title: "Link expired",
    body: "This lesson link has expired. Reply to your coach's email to request a new one.",
  },
  revoked: {
    title: "Link revoked",
    body: "This lesson link is no longer valid. Reply to your coach's email to request a new one.",
  },
  mismatch: {
    title: "Link not valid for this lesson",
    body: "The access link doesn't match this lesson. Use the link from your coach's email.",
  },
};

function AccessDenied({
  reason,
}: {
  reason: keyof typeof ACCESS_DENIED_COPY;
}) {
  const copy = ACCESS_DENIED_COPY[reason];
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-3 text-base text-muted-foreground">{copy.body}</p>
      </div>
    </Container>
  );
}

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  // Verify the magic-link token before any lesson data is loaded. A valid
  // token grants access and is marked viewed (idempotent). Invalid/expired/
  // revoked/mismatched tokens render an access-denied screen; an unknown
  // token (not_found) falls through to notFound() (404) so probe requests
  // for arbitrary ids don't confirm whether a lesson exists.
  const access = await verifyLessonAccess({ submissionId: id, token });
  if (!access.ok) {
    if (access.reason === "not_found") {
      notFound();
    }
    return <AccessDenied reason={access.reason} />;
  }

  const submission = await getSubmissionById(id);
  if (!submission) {
    notFound();
  }

  const playbackManifest = await getPlaybackManifestForSubmission(id);
  const draft = getDraftForSubmission(id);

  if (!playbackManifest && !draft) {
    notFound();
  }

  if (playbackManifest) {
    const coach = await getCoachBySlug(submission.coachSlug);
    const pageCopy = buildLessonPageCopy({
      coachName: coach?.name,
      hasAiSummary: !!playbackManifest.aiSummary,
    });

    return (
      <Container className="py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-medium text-muted-foreground">
              Your SwingLab Lesson
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {pageCopy.headerTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              {pageCopy.headerSubtitle}
            </p>
          </div>

          {pageCopy.showSummarySection && playbackManifest.aiSummary && (
            <Card className="mb-6 p-5">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                Lesson Summary
              </h2>
              <p className="text-sm leading-relaxed">
                {playbackManifest.aiSummary}
              </p>
            </Card>
          )}

          <LessonPlaybackPlayer manifest={playbackManifest} />

          <section className="mt-8 rounded-xl border border-success/30 bg-success/5 p-6 text-center">
            <h2 className="text-lg font-bold">Ready for a follow-up?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {pageCopy.ctaText}
            </p>
            <Button
              variant="default"
              size="lg"
              className="mt-4"
              render={
                <a href={`/upload?followUpFor=${submission.id}`} />
              }
            >
              Submit a follow-up swing
              <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
            </Button>
          </section>
        </div>
      </Container>
    );
  }

  if (!draft) notFound();

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">
            Your SwingLab Lesson
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {draft.title}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {draft.summary}
          </p>
        </div>

        {draft.keyPoints.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold">Key Moments</h2>
            <div className="space-y-3">
              {draft.keyPoints.map((kp, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{kp.label}</h3>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatTimecode(kp.timecode)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {kp.description}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {draft.drills.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold">Practice Drills</h2>
            <div className="space-y-3">
              {draft.drills.map((drill, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{drill.name}</h3>
                    <Badge variant="info">{drill.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {drill.description}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {draft.coachNotes && draft.coachNotes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold">Coach Notes</h2>
            <Card className="p-4">
              <p className="whitespace-pre-wrap text-sm">{draft.coachNotes}</p>
            </Card>
          </section>
        )}

        {draft.status !== "approved" && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm text-warning-foreground">
              This lesson is currently in <strong>{draft.status}</strong> status.
              Your coach will finalize it shortly.
            </p>
          </div>
        )}

        {draft.status === "approved" && (
          <section className="mb-8 rounded-xl border border-success/30 bg-success/5 p-6 text-center">
            <h2 className="text-lg font-bold">Ready for a follow-up?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Submit a new swing and your coach will review your progress against
              this lesson.
            </p>
            <Button
              variant="default"
              size="lg"
              className="mt-4"
              render={
                <a href={`/upload?followUpFor=${submission.id}`} />
              }
            >
              Submit a follow-up swing
              <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
            </Button>
          </section>
        )}

        <div className="mt-12 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about your lesson? Reply to your coach&apos;s email.
          </p>
        </div>
      </div>
    </Container>
  );
}
