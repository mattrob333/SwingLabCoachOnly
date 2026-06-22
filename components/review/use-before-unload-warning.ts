"use client";

/**
 * Wave 3 — Review Studio safe recovery (slice 1: the beforeunload hook).
 *
 * `useBeforeUnloadWarning` registers a `beforeunload` listener that triggers
 * the browser's built-in "Are you sure you want to leave?" dialog when the
 * coach has unsaved work (notes that haven't been processed into a lesson yet).
 *
 * The autosave localStorage draft is the recovery mechanism — if the coach
 * confirms leaving, their notes are already in localStorage and will be
 * restored when they return. This hook is the "are you sure" guard that
 * prevents accidental tab-close / navigation from interrupting the review
 * session.
 *
 * Design notes:
 * - The listener is only attached when `shouldWarn` is true, and removed
 *   when it goes false — no double-add across re-renders.
 * - The handler calls both `preventDefault()` and sets `returnValue` (legacy
 *   Firefox) for cross-browser coverage.
 * - Ref-backed handler avoids stale-closure traps with once-set-up listeners.
 */

import { useEffect, useRef } from "react";

export function useBeforeUnloadWarning(shouldWarn: boolean): void {
  const shouldWarnRef = useRef(shouldWarn);
  useEffect(() => {
    shouldWarnRef.current = shouldWarn;
  }, [shouldWarn]);

  useEffect(() => {
    if (!shouldWarn) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Setting returnValue to any non-empty string triggers the prompt in
      // browsers that ignore preventDefault (legacy Firefox).
      e.returnValue = "You have unsaved coach notes. Leave anyway?";
    };

    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [shouldWarn]);
}
