import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import { getSubmissionsForCoach, type Submission } from "@/lib/submissions";

export const metadata = {
  title: "Coach dashboard",
  description: "SwingLab coach studio home.",
};

export default async function CoachDashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    notFound();
  }

  const coach = getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

  // Guardrail: payment before review — only show submissions that are past
  // the pending_payment stage.
  const allSubs = getSubmissionsForCoach(coach.slug);
  const visibleSubs = allSubs.filter((s) => s.status !== "pending_payment");
  const pendingCount = visibleSubs.filter(
    (s) => s.status === "paid" || s.status === "in_review",
  ).length;
  const completedCount = visibleSubs.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <h1 className="text-2xl font-semibold tracking-tight">{coach.name}</h1>
          <p className="text-sm text-muted-foreground">{coach.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/coach/onboarding"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Edit profile
          </a>
          <form action="/api/auth/logout" method="post">
            <Button variant="outline" size="lg" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending reviews" value={String(pendingCount)} />
        <StatCard label="Completed" value={String(completedCount)} />
        <StatCard label="Avg. turnaround" value={coach.turnaround === "PT24H" ? "24h" : coach.turnaround === "PT48H" ? "48h" : coach.turnaround === "PT12H" ? "12h" : "—"} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Inbox</h2>
        {visibleSubs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No submissions yet. When a parent uploads a swing and pays, it
              will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleSubs.map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} />
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SubmissionCard({ submission }: { submission: Submission }) {
  const statusColors: Record<string, string> = {
    paid: "bg-blue-100 text-blue-700",
    in_review: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
  };
  const statusLabel: Record<string, string> = {
    paid: "New",
    in_review: "In review",
    completed: "Completed",
  };

  return (
    <a
      href={`/coach/submission/${submission.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition hover:border-ring hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {submission.parentEmail}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Age {submission.playerAge} · {submission.swingType} ·{" "}
            {submission.createdAt.toLocaleDateString()}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[submission.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {statusLabel[submission.status] ?? submission.status}
        </span>
      </div>
      {submission.notes && (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {submission.notes}
        </p>
      )}
    </a>
  );
}
