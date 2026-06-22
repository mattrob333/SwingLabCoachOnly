/**
 * Lightweight toast notification store.
 *
 * Uses a module-level external store + `useSyncExternalStore` in the Toaster
 * component (React Compiler friendly — no `useEffect + setState`).
 * `showToast` / `dismissToast` / `clearToasts` are plain functions callable
 * from event handlers, effects, or API callbacks.
 */

export type ToastVariant = "default" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Auto-dismiss delay in ms. 0 = persistent (no auto-dismiss). */
  duration: number;
}

export interface ShowToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms (default 5000). 0 = persistent. */
  duration?: number;
}

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

let toasts: Toast[] = [];
const EMPTY: Toast[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Subscribe to toast store changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Client snapshot — returns the current toast array reference. */
export function getSnapshot(): Toast[] {
  return toasts;
}

/** Server snapshot — always empty (toasts are client-only). */
export function getServerSnapshot(): Toast[] {
  return EMPTY;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

/** Show a toast. Returns the toast id (for manual dismiss). */
export function showToast(input: ShowToastInput): string {
  const id = generateId();
  const toast: Toast = {
    id,
    title: input.title,
    description: input.description,
    variant: input.variant ?? "default",
    duration: input.duration ?? 5000,
  };
  toasts = [...toasts, toast];
  emit();

  if (toast.duration > 0) {
    setTimeout(() => dismissToast(id), toast.duration);
  }

  return id;
}

/** Dismiss a toast by id. No-op if the id doesn't exist. */
export function dismissToast(id: string): void {
  const exists = toasts.some((t) => t.id === id);
  if (!exists) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Clear all toasts. */
export function clearToasts(): void {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
}

// ---------------------------------------------------------------------------
// Convenience hook
// ---------------------------------------------------------------------------

/**
 * Convenience hook — returns stable references to `showToast` and
 * `dismissToast`.  The functions themselves are module-level, so this hook
 * exists purely for ergonomic destructuring in components.
 */
export function useToast(): {
  toast: typeof showToast;
  dismiss: typeof dismissToast;
} {
  return { toast: showToast, dismiss: dismissToast };
}
