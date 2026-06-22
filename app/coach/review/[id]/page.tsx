import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { ReviewStudioClient } from "@/components/review/review-studio-client";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import { getSubmissionById } from "@/lib/submissions";

export const metadata = {
  title: "Review Studio",
  description: "SwingLab coach review studio.",
};

const SAMPLE_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default async function ReviewStudioPage({
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

  // Guard: submission must exist, belong to this coach, and be in_review.
  // Payment before review is enforced — paid submissions start review from
  // the detail page; completed submissions can also re-open the studio.
  if (
    !submission ||
    submission.coachSlug !== coach.slug ||
    (submission.status !== "in_review" && submission.status !== "completed")
  ) {
    notFound();
  }

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <a
            href={`/coach/submission/${submission.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-ring/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to submission
          </a>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Review Studio
            </h1>
            <Badge variant="info">{submission.swingType}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {submission.parentEmail} · Age {submission.playerAge}
          </p>
        </div>
      </div>

      {/* Video player + voiceover + annotation + event timeline */}
      <ReviewStudioClient
        submissionId={submission.id}
        videoUrl={submission.videoUrl ?? SAMPLE_VIDEO_URL}
      />
    </Container>
  );
}
