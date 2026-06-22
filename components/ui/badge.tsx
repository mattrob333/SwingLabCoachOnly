import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — shared presentational primitive for status chips, payment badges,
 * counts, and labels.
 *
 * Uses the clay token system. Variants map to semantic states:
 * - default: neutral (secondary surface)
 * - primary: clay accent (primary surface)
 * - success: forest-green tinted (for "paid", "completed", "approved")
 * - warning: amber tinted (for "pending", "in_review")
 * - info: navy/ink tinted (for neutral informational labels, counts)
 * - destructive: red tinted (for "expired", "revoked", errors)
 * - outline: bordered, transparent fill
 *
 * Mobile-first: compact height (h-5 / 20px) with `sm:h-6` (24px) on desktop.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-secondary text-secondary-foreground",
        primary:
          "border-transparent bg-primary text-primary-foreground",
        success:
          "border-transparent bg-success/15 text-success dark:bg-success/20 dark:text-success",
        warning:
          "border-transparent bg-warning/20 text-warning-foreground dark:bg-warning/20 dark:text-warning",
        info:
          "border-transparent bg-info/12 text-info dark:bg-info/20 dark:text-info",
        destructive:
          "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
        outline:
          "border-border text-foreground",
      },
      size: {
        default: "h-5 text-[0.7rem] sm:h-6 sm:text-xs",
        sm: "h-5 text-[0.65rem] px-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
