import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";

export const metadata = {
  title: "Coach dashboard",
  description: "SwingLab coach studio home.",
};

export default async function CoachDashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  // Middleware should guarantee a session, but double-check defensively.
  if (!session) {
    notFound();
  }

  const coach = getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

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

      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Inbox</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No submissions yet. The coach inbox lands in Phase 5 (PRD §31).
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending reviews" value="0" />
        <StatCard label="Completed this week" value="0" />
        <StatCard label="Avg. turnaround" value="—" />
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
