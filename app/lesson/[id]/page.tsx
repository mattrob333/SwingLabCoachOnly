import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { LessonPlaybackPlayer } from "@/components/lesson/lesson-playback-player";
import { getSubmissionById } from "@/lib/submissions";
import { getDraftForSubmission } from "@/lib/ai/lesson-draft-store";
import { getPlaybackManifestForSubmission } from "@/lib/lesson/playback-store";
import { verifyLessonAccess, type LessonAccessDeniedReason } from "@/lib/lesson/access";

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
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
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
    return (
      <Container className="py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-medium text-muted-foreground">
              Your SwingLab Lesson
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Interactive swing review
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Play the swing. When the video reaches a coach note, it pauses on
              the marked frame, shows the annotations, plays the voiceover, then
              continues.
            </p>
          </div>

          <LessonPlaybackPlayer manifest={playbackManifest} />

          <section className="mt-8 rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center">
            <h2 className="text-lg font-semibold">Ready for a follow-up?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Work on the feedback, then submit a new swing so your coach can
              review your progress.
            </p>
            <a
              href={`/upload?followUpFor=${submission.id}`}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Submit a follow-up swing
            </a>
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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {draft.title}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {draft.summary}
          </p>
        </div>

        {draft.keyPoints.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Key Moments</h2>
            <div className="space-y-3">
              {draft.keyPoints.map((kp, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{kp.label}</h3>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatTimecode(kp.timecode)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {kp.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {draft.drills.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Practice Drills</h2>
            <div className="space-y-3">
              {draft.drills.map((drill, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{drill.name}</h3>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {drill.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {drill.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {draft.coachNotes && draft.coachNotes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Coach Notes</h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="whitespace-pre-wrap text-sm">{draft.coachNotes}</p>
            </div>
          </section>
        )}

        {draft.status !== "approved" && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              This lesson is currently in <strong>{draft.status}</strong> status.
              Your coach will finalize it shortly.
            </p>
          </div>
        )}

        {draft.status === "approved" && (
          <section className="mb-8 rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center">
            <h2 className="text-lg font-semibold">Ready for a follow-up?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Submit a new swing and your coach will review your progress against
              this lesson.
            </p>
            <a
              href={`/upload?followUpFor=${submission.id}`}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Submit a follow-up swing
            </a>
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
