import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * EmptyState — shared primitive for "no data" screens.
 *
 * Renders a centered column with an optional icon, title, description, and
 * action. Use this wherever a list/detail view has zero items so the coach
 * sees a clear next action instead of a blank page (PRD §32: "the coach
 * should always know the next best action").
 *
 * Mobile-first: compact padding (py-10) scaling to `sm:py-16` on desktop.
 */
function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: React.ComponentProps<"div"> & {
  /** Optional leading icon element (rendered in a muted circular container). */
  icon?: React.ReactNode;
  /** Short, action-oriented heading (e.g. "No submissions yet"). */
  title: React.ReactNode;
  /** Supporting copy explaining what the coach can do next. */
  description?: React.ReactNode;
  /** Optional CTA (typically a Button). */
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-4 py-10 text-center sm:gap-4 sm:px-6 sm:py-16",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground sm:size-14">
          {icon}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground sm:text-lg">
          {title}
        </p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
