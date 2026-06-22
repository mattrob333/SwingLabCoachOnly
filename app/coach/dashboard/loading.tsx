import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the coach dashboard.
 *
 * Next.js shows this automatically while the server component fetches the
 * coach record and submissions. It mirrors the dashboard layout: header row
 * (avatar + name/title), stat cards, filter tabs, and submission list rows.
 */
export function CoachDashboardSkeleton() {
  return (
    <Container className="py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stat cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
          </Card>
        ))}
      </section>

      {/* Filter tabs placeholder */}
      <div className="mt-8 flex gap-1 rounded-lg border border-border bg-card p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      {/* Submission list rows */}
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
}

export default CoachDashboardSkeleton;
