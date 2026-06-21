import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { getSubmissionById } from "@/lib/submissions";
import { getDraftForSubmission } from "@/lib/ai/lesson-draft-store";

export const metadata = {
  title: "Your Lesson",
  description: "Your personalized swing review lesson from SwingLab.",
};

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const submission = getSubmissionById(id);
  if (!submission) {
    notFound();
  }

  const draft = getDraftForSubmission(id);
  if (!draft) {
    notFound();
  }

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
