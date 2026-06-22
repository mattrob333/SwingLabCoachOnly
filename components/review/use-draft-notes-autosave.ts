"use client";

/**
 * Wave 3 — Review Studio autosave (slice 2a: the React hook).
 *
 * `useDraftNotesAutosave` restores any saved draft notes for the given
 * submission on mount, then debounces (500ms) a save to localStorage
 * whenever the notes change. The parent component passes its `notes`
 * state and an `onRestoreDraft` callback (typically `setNotes`) so the
 * restored draft flows back into the component's state.
 *
 * Returns `{ savedAt, hasDraft }` for rendering an "Autosaved" indicator.
 *
 * Design notes:
 * - The initial draft is read via `useSyncExternalStore` with a no-op
 *   subscriber. This gives correct SSR hydration (server snapshot = null,
 *   client snapshot = localStorage read) without `setState` in an effect.
 * - `savedAt` and `hasDraft` are **derived** from the draft + `lastSaveTime`
 *   state, not set synchronously in an effect. `lastSaveTime` is only
 *   updated inside the debounced `setTimeout` callback (async), which the
 *   `react-hooks/set-state-in-effect` rule allows.
 * - `lastSavedNotesRef` tracks the serialized form of what's currently on
 *   disk. The save effect compares the current notes' serialized form
 *   against it and skips if they match — this prevents redundant writes
 *   after a restore (restored notes === on-disk notes) and after no-op
 *   re-renders (same data, new array reference).
 * - The empty-notes guard (`notes.length === 0 → return`) prevents saving
 *   an empty payload on mount when there's no draft. Clearing the draft
 *   is handled explicitly by the parent on successful "Process Lesson"
 *   (slice 2b) via `clearDraftNotes`.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FreezeFrameNote } from "@/lib/lesson/playback";
import type { DraftNotesPayload } from "@/lib/review/draft-notes";
import { loadDraftNotes, saveDraftNotes } from "@/lib/review/draft-notes";

const DEBOUNCE_MS = 500;

export type DraftNotesAutosaveState = {
  /** Epoch-ms of the last successful save, or null if nothing has been saved. */
  savedAt: number | null;
  /** Whether a draft (saved or in-progress) exists for this submission. */
  hasDraft: boolean;
};

function subscribeNoop() {
  return () => {};
}

export function useDraftNotesAutosave(
  submissionId: string,
  notes: FreezeFrameNote[],
  onRestoreDraft: (notes: FreezeFrameNote[]) => void,
): DraftNotesAutosaveState {
  // ── Read saved draft from localStorage (SSR-safe via useSyncExternalStore)
  // The snapshot is cached per submissionId so Object.is comparison is stable
  // across renders (loadDraftNotes returns a new object each call).
  const draftCacheRef = useRef<{
    id: string;
    draft: DraftNotesPayload | null;
  } | null>(null);
  const draft = useSyncExternalStore(
    subscribeNoop,
    () => {
      if (
        !draftCacheRef.current ||
        draftCacheRef.current.id !== submissionId
      ) {
        draftCacheRef.current = {
          id: submissionId,
          draft: loadDraftNotes(submissionId),
        };
      }
      return draftCacheRef.current.draft;
    },
    () => null, // server snapshot — no localStorage during SSR
  );

  const hasInitialDraft = draft !== null && draft.notes.length > 0;

  // Track the last save time (updated in debounced callback — async, not flagged
  // by react-hooks/set-state-in-effect).
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  // Derived state — no setState-in-effect needed.
  const savedAt = lastSaveTime ?? draft?.savedAt ?? null;
  const hasDraft = lastSaveTime !== null || hasInitialDraft;

  // Ref to the latest onRestoreDraft callback (stable identity pattern).
  const onRestoreRef = useRef(onRestoreDraft);
  useEffect(() => {
    onRestoreRef.current = onRestoreDraft;
  }, [onRestoreDraft]);

  // Serialized notes currently on disk — prevents redundant writes when
  // the notes haven't actually changed.
  const lastSavedNotesRef = useRef("");

  // ── Restore: feed draft notes back to parent when draft loads ───────────
  useEffect(() => {
    if (draft && draft.notes.length > 0) {
      lastSavedNotesRef.current = JSON.stringify(draft.notes);
      onRestoreRef.current(draft.notes);
    }
  }, [draft]);

  // ── Debounced save on notes change ─────────────────────────────────────
  useEffect(() => {
    const serialized = JSON.stringify(notes);
    if (serialized === lastSavedNotesRef.current) return;
    if (notes.length === 0) return;

    const timer = setTimeout(() => {
      saveDraftNotes(submissionId, notes);
      lastSavedNotesRef.current = serialized;
      setLastSaveTime(Date.now());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [submissionId, notes]);

  return { savedAt, hasDraft };
}
