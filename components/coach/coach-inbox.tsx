"use client";

import * as React from "react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Submission, SubmissionStatus } from "@/lib/submissions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InboxFilter = "all" | "active" | "completed";

/** Serializable submission shape for client rendering (Date → ISO string). */
export type InboxSubmission = Omit<Submission, "createdAt"> & {
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpers (pure functions — unit-testable)
// ---------------------------------------------------------------------------

/**
 * Map a SubmissionStatus to the Badge variant that conveys its semantic state.
 * - paid → primary (new, needs attention)
 * - in_review → warning (in progress)
 * - rendering → warning (in progress)
 * - completed → success
 * - pending_payment → default (shouldn't appear in inbox, but handled)
 */
export function statusBadgeVariant(
  status: SubmissionStatus,
):
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "outline" {
  switch (status) {
    case "paid":
      return "primary";
    case "in_review":
    case "rendering":
      return "warning";
    case "completed":
      return "success";
    default:
      return "default";
  }
}

/**
 * Human-readable label for each submission status.
 */
export function statusLabel(status: SubmissionStatus): string {
  switch (status) {
    case "paid":
      return "New";
    case "in_review":
      return "In review";
    case "rendering":
      return "Rendering";
    case "completed":
      return "Completed";
    case "pending_payment":
      return "Pending payment";
    default:
      return status;
  }
}

/**
 * Filter submissions by the selected inbox tab.
 * - "all": everything except pending_payment (those are gated behind paywall).
 * - "active": paid + in_review + rendering (needs coach action or is being processed).
 * - "completed": completed only.
 */
export function filterSubmissions(
  submissions: InboxSubmission[],
  filter: InboxFilter,
): InboxSubmission[] {
  switch (filter) {
    case "active":
      return submissions.filter(
        (s) =>
          s.status === "paid" ||
          s.status === "in_review" ||
          s.status === "rendering",
      );
    case "completed":
      return submissions.filter((s) => s.status === "completed");
    case "all":
    default:
      return submissions.filter((s) => s.status !== "pending_payment");
  }
}

/**
 * Count submissions per filter for the tab badges.
 */
export function countByFilter(
  submissions: InboxSubmission[],
): Record<InboxFilter, number> {
  return {
    all: filterSubmissions(submissions, "all").length,
    active: filterSubmissions(submissions, "active").length,
    completed: filterSubmissions(submissions, "completed").length,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FILTER_LABELS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export function CoachInbox({ submissions }: { submissions: InboxSubmission[] }) {
  const [filter, setFilter] = React.useState<InboxFilter>("all");
  const counts = React.useMemo(
    () => countByFilter(submissions),
    [submissions],
  );
  const filtered = React.useMemo(
    () => filterSubmissions(submissions, filter),
    [submissions, filter],
  );

  return (
    <section className="mt-8" aria-label="Coach inbox">
      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Filter submissions"
        className="flex gap-1 rounded-lg border border-border bg-card p-1"
      >
        {FILTER_LABELS.map(({ value, label }) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {label}
            {counts[value] > 0 && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                  filter === value
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Submission list */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            title={
              submissions.length === 0
                ? "No submissions yet"
                : "No submissions in this category"
            }
            description={
              submissions.length === 0
                ? "When a parent uploads a swing and pays, it will appear here."
                : "Try switching to a different filter to see more submissions."
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SubmissionCard({ submission }: { submission: InboxSubmission }) {
  const created = new Date(submission.createdAt);

  return (
    <Link href={`/coach/submission/${submission.id}`} className="block">
      <Card className="cursor-pointer transition-colors hover:border-ring hover:shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {submission.parentEmail}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Age {submission.playerAge} · {submission.swingType} ·{" "}
              {created.toLocaleDateString()}
            </p>
          </div>
          <Badge variant={statusBadgeVariant(submission.status)}>
            {statusLabel(submission.status)}
          </Badge>
        </div>
        {submission.notes && (
          <p className="truncate border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-6">
            {submission.notes}
          </p>
        )}
      </Card>
    </Link>
  );
}
