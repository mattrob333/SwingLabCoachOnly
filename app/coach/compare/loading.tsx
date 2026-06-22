import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the comparison page.
 *
 * Next.js shows this automatically while the server component fetches the
 * original submission + comparison candidates. Mirrors the page layout:
 * back link, header, description, and candidate list rows.
 */
export function CompareSkeleton() {
  return (
    <Container className="py-12">
      {/* Back link */}
      <Skeleton className="h-4 w-36" />

      {/* Header */}
      <Skeleton className="mt-6 h-7 w-48" />
      <Skeleton className="mt-1 h-4 w-72" />

      {/* Candidate list rows */}
      <div className="mt-8 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex items-center justify-between p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-24 rounded-md" />
          </Card>
        ))}
      </div>
    </Container>
  );
}

export default CompareSkeleton;
