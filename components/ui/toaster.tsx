"use client";

import { useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  dismissToast,
  type ToastVariant,
} from "@/lib/toast";
import { cn } from "@/lib/utils";

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border bg-background text-foreground",
  success:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  warning:
    "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
};

const variantIcons: Record<ToastVariant, string> = {
  default: "",
  success: "✓",
  error: "✕",
  warning: "!",
};

/**
 * Toast notification renderer. Mount once (e.g. in the root layout).
 * Subscribes to the toast store via `useSyncExternalStore` — no effect-based
 * state syncing, so it's React Compiler friendly.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg max-w-sm",
            variantStyles[toast.variant],
          )}
          role={toast.variant === "error" ? "alert" : "status"}
          data-testid={`toast-${toast.id}`}
        >
          {variantIcons[toast.variant] && (
            <span
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              aria-hidden="true"
            >
              {variantIcons[toast.variant]}
            </span>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-sm opacity-90">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dismiss notification"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
