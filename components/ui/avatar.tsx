import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Avatar — shared primitive for coach/parent initials or image thumbnails.
 *
 * Renders a circular container. When `src` is provided and loads successfully,
 * the image fills the container. Otherwise, the `fallback` (typically
 * initials) is shown on a muted surface.
 *
 * Sizes: `sm` (28px), `default` (36px), `lg` (48px) — all touch-adequate on
 * mobile when used as a tap target.
 *
 * Implementation note: uses a plain `<img>` with an `onError` fallback rather
 * than base-ui's Avatar to keep the primitive dependency-free and SSR-safe.
 */
const sizeClasses = {
  sm: "size-7 text-xs",
  default: "size-9 text-sm",
  lg: "size-12 text-base",
} as const;

type AvatarSize = keyof typeof sizeClasses;

function Avatar({
  className,
  src,
  alt = "",
  fallback,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  src?: string;
  alt?: string;
  /** Initials or short text shown when no image / image fails to load. */
  fallback?: React.ReactNode;
  size?: AvatarSize;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground select-none",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="truncate px-1">{fallback}</span>
      )}
    </div>
  );
}

export { Avatar };
