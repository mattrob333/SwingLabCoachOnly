import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import {
  getEarningsForCoach,
  getTotalEarningsForCoach,
} from "@/lib/earnings";
import { EarningsBreakdown } from "@/components/coach/earnings-breakdown";

export const metadata = {
  title: "Coach earnings",
  description: "Your SwingLab earnings from completed reviews.",
};

export default async function CoachEarningsPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    notFound();
  }

  const coach = await getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

  const earnings = await getEarningsForCoach(coach.slug);
  const total = await getTotalEarningsForCoach(coach.slug);

  return (
    <Container className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Earnings</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {coach.name}
          </h1>
        </div>
        <a
          href="/coach/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
        >
          Back to dashboard
        </a>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="gap-0 p-6">
          <CardHeader className="px-0 pt-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total earnings
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <p className="text-4xl font-semibold">${total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              From {earnings.length} completed{" "}
              {earnings.length === 1 ? "review" : "reviews"}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 p-6">
          <CardHeader className="px-0 pt-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Per-review price
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <p className="text-4xl font-semibold">${coach.priceUsd}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your listed swing review price
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium">Breakdown</h2>
        <EarningsBreakdown earnings={earnings} total={total} />
      </section>
    </Container>
  );
}
