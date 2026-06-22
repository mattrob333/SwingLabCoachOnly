import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CoachInbox, type InboxSubmission } from "@/components/coach/coach-inbox";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import { getSubmissionsForCoach } from "@/lib/submissions";

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

  const coach = await getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

  // Guardrail: payment before review — only show submissions that are past
  // the pending_payment stage.
  const allSubs = await getSubmissionsForCoach(coach.slug);
  const visibleSubs = allSubs.filter((s) => s.status !== "pending_payment");
  const pendingCount = visibleSubs.filter(
    (s) => s.status === "paid" || s.status === "in_review",
  ).length;
  const completedCount = visibleSubs.filter(
    (s) => s.status === "completed",
  ).length;

  // Serialize submissions for the client component (Date → ISO string).
  const inboxSubs: InboxSubmission[] = visibleSubs.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  // Coach initials for the avatar fallback.
  const initials = coach.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Container className="py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar fallback={initials} size="lg" />
          <div>
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {coach.name}
            </h1>
            <p className="text-sm text-muted-foreground">{coach.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/coach/earnings"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Earnings
          </a>
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

      {/* Stat cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending reviews" value={String(pendingCount)} />
        <StatCard label="Completed" value={String(completedCount)} />
        <StatCard
          label="Avg. turnaround"
          value={
            coach.turnaround === "PT24H"
              ? "24h"
              : coach.turnaround === "PT48H"
                ? "48h"
                : coach.turnaround === "PT12H"
                  ? "12h"
                  : "—"
          }
        />
      </section>

      {/* Inbox with filter tabs */}
      <CoachInbox submissions={inboxSubs} />
    </Container>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
