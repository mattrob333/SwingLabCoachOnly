import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { ComparisonViewer } from "@/components/coach/comparison-viewer";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getSubmissionById } from "@/lib/submissions";
import {
  getComparisonPair,
  listComparisonCandidates,
} from "@/lib/comparison";

export const metadata = {
  title: "Compare swings",
  description: "SwingLab — compare an original and follow-up swing side by side.",
};

/**
 * Phase 10 — Comparison mode page (PRD §31 build order #20).
 *
 * /coach/compare?original=X           → list of comparable follow-ups (picker)
 * /coach/compare?original=X&followUp=Y → side-by-side comparison viewer
 *
 * Coach-only. The original submission must belong to the signed-in coach.
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ original?: string; followUp?: string }>;
}) {
  const { original: originalId, followUp: followUpId } = await searchParams;

  // Auth gate
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    notFound();
  }

  if (!originalId) {
    notFound();
  }

  const original = await getSubmissionById(originalId);
  if (!original || original.coachSlug !== session.coachSlug) {
    notFound();
  }

  // Pair mode
  if (followUpId) {
    let pair;
    try {
      pair = await getComparisonPair(originalId, followUpId);
    } catch {
      notFound();
    }

    return (
      <Container className="py-12">
        <a
          href={`/coach/submission/${originalId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to submission
        </a>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Swing comparison
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare the original review with the follow-up to assess progress.
        </p>
        <div className="mt-8">
          <ComparisonViewer
            originalUrl={pair.original.videoUrl}
            followUpUrl={pair.followUp.videoUrl}
            originalDate={pair.original.submission.createdAt.toISOString()}
            followUpDate={pair.followUp.submission.createdAt.toISOString()}
          />
        </div>
      </Container>
    );
  }

  // Candidate-list mode
  const candidates = await listComparisonCandidates(originalId);

  return (
    <Container className="py-12">
      <a
        href={`/coach/submission/${originalId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to submission
      </a>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Compare swings
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Select a follow-up swing to compare against the original review.
      </p>

      {candidates.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No completed follow-up swings are available to compare yet.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {candidates.map((c) => (
            <li
              key={c.submission.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">
                  Follow-up · {c.submission.swingType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.submission.createdAt).toLocaleString()}
                </p>
              </div>
              <a
                href={`/coach/compare?original=${originalId}&followUp=${c.submission.id}`}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Compare
              </a>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
