import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the Review Studio page.
 *
 * Next.js shows this automatically while the server component fetches the
 * coach record + submission. Mirrors the studio layout: back link, header
 * with subtitle, and the video player + annotation area.
 */
export function ReviewStudioSkeleton() {
  return (
    <Container className="py-8">
      {/* Header */}
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-2 h-7 w-40" />
      <Skeleton className="mt-1 h-4 w-64" />

      {/* Video player + studio area */}
      <div className="mt-6 space-y-4">
        {/* Video player area */}
        <Card className="overflow-hidden">
          <Skeleton className="aspect-video w-full rounded-none" />
        </Card>

        {/* Studio controls / annotation toolbar */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </Card>
      </div>
    </Container>
  );
}

export default ReviewStudioSkeleton;
