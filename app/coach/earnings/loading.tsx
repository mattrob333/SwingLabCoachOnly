import { Container } from "@/components/site/container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the coach earnings page.
 *
 * Mirrors the earnings layout: header, two stat cards, and breakdown rows.
 */
export function CoachEarningsSkeleton() {
  return (
    <Container className="py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stat cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="gap-0 p-6">
            <CardHeader className="px-0 pt-0">
              <Skeleton className="h-3 w-28" />
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Breakdown rows */}
      <section className="mt-8">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}

export default CoachEarningsSkeleton;
