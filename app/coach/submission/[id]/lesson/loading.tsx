import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the lesson approval page.
 *
 * Mirrors the layout: back link, header, AI review panel cards, and action area.
 */
export function LessonApprovalSkeleton() {
  return (
    <Container className="py-8 sm:py-12">
      {/* Back link */}
      <Skeleton className="h-4 w-36" />

      {/* Header */}
      <div className="mt-6 mb-8 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* AI review panel cards */}
      <div className="space-y-6">
        <Card className="p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-4 h-10 w-44 rounded-lg" />
        </Card>
      </div>
    </Container>
  );
}

export default LessonApprovalSkeleton;
