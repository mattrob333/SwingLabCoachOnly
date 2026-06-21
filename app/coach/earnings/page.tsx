import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";
import {
  getEarningsForCoach,
  getTotalEarningsForCoach,
  type Earning,
} from "@/lib/earnings";

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

  const coach = getCoachBySlug(session.coachSlug);
  if (!coach) {
    notFound();
  }

  const earnings = getEarningsForCoach(coach.slug);
  const total = getTotalEarningsForCoach(coach.slug);

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Earnings</p>
          <h1 className="text-2xl font-semibold tracking-tight">{coach.name}</h1>
        </div>
        <a
          href="/coach/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
        >
          Back to dashboard
        </a>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total earnings
          </p>
          <p className="mt-2 text-4xl font-semibold">${total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            From {earnings.length} completed{" "}
            {earnings.length === 1 ? "review" : "reviews"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Per-review price
          </p>
          <p className="mt-2 text-4xl font-semibold">${coach.priceUsd}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your listed swing review price
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Breakdown</h2>
        {earnings.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No earnings yet. When you complete a swing review, the payment
              will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Parent</th>
                  <th className="px-4 py-3 font-medium">Submission</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {earnings.map((e) => (
                  <EarningRow key={e.id} earning={e} />
                ))}
              </tbody>
              <tfoot className="bg-muted/50">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    ${total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}

function EarningRow({ earning }: { earning: Earning }) {
  return (
    <tr className="bg-card">
      <td className="px-4 py-3">{earning.parentEmail}</td>
      <td className="px-4 py-3">
        <a
          href={`/coach/submission/${earning.submissionId}`}
          className="text-primary hover:underline"
        >
          {earning.submissionId.slice(0, 8)}…
        </a>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {earning.createdAt.toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right font-medium">
        ${earning.amountUsd}
      </td>
    </tr>
  );
}
