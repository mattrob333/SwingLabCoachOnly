import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the submission detail page.
 *
 * Mirrors the submission detail layout: back link, header with status badge,
 * detail fields grid, parent notes, and action area.
 */
export function SubmissionDetailSkeleton() {
  return (
    <Container className="py-8 sm:py-12">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />

      {/* Header */}
      <div className="mt-6 flex items-center gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-4 w-48" />

      {/* Detail fields */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-4 w-32" />
          </Card>
        ))}
      </section>

      {/* Action area */}
      <section className="mt-8">
        <Card className="p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-64" />
          <Skeleton className="mt-4 h-10 w-40 rounded-lg" />
        </Card>
      </section>
    </Container>
  );
}

export default SubmissionDetailSkeleton;
