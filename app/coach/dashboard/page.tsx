import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { CoachInbox, type InboxSubmission } from "@/components/coach/coach-inbox";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import { getSubmissionsForCoach } from "@/lib/submissions";
import { cn } from "@/lib/utils";

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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Coach
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {coach.name}
            </h1>
            <p className="text-sm text-muted-foreground">{coach.title}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="lg"
          render={
            <a href="/coach/onboarding">
              Edit profile
            </a>
          }
        />
      </div>

      {/* Stat cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending reviews"
          value={String(pendingCount)}
          accent="warning"
        />
        <StatCard
          label="Completed"
          value={String(completedCount)}
          accent="success"
        />
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
          accent="info"
        />
      </section>

      {/* Inbox with filter tabs */}
      <CoachInbox submissions={inboxSubs} />
    </Container>
  );
}

const accentClasses: Record<string, string> = {
  warning: "border-l-warning",
  success: "border-l-success",
  info: "border-l-info",
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "warning" | "success" | "info";
}) {
  return (
    <Card
      className={cn(
        "gap-0 border-l-4 p-5",
        accent ? accentClasses[accent] : undefined,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}
