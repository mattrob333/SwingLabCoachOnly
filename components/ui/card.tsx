import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — shared presentational primitive.
 *
 * A surface container with the `card` background token, rounded corners, and
 * an optional border. Compose with `CardHeader`, `CardTitle`, `CardDescription`,
 * `CardContent`, `CardFooter` for structured layouts. Mobile-first: the base
 * padding is compact (p-4) and scales up at `sm` (sm:p-6) for desktop density.
 *
 * Design language: clean, professional, low-clutter. Uses the existing clay
 * token system (light + dark) — no bespoke colors.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm transition-shadow duration-200 sm:gap-5",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col gap-1.5 px-4 pt-4 sm:px-6 sm:pt-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-semibold leading-tight sm:text-lg", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 pb-4 sm:px-6 sm:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 px-4 pb-4 sm:px-6 sm:pb-6",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
