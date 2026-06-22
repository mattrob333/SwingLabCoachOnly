import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton — shared loading placeholder primitive.
 *
 * Renders a muted, subtly-pulsing block that mirrors the shape of content
 * loading into view. Use `className` to size it (e.g. `h-4 w-32` for a line
 * of text, `size-10 rounded-full` for an avatar). The pulse animation is
 * Tailwind's `animate-pulse` — no heavy animation deps.
 *
 * Accessibility: skeletons are decorative; screen readers should ignore them.
 * The `aria-hidden` attribute is set by default.
 */
function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
