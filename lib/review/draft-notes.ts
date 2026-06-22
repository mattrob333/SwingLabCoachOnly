/**
 * Wave 3 — Review Studio autosave (slice 1: draft-notes storage module).
 *
 * Persists in-progress coach freeze-frame notes to localStorage so a page
 * refresh doesn't lose work. The payload is a small wrapper around the notes
 * array plus a savedAt timestamp. All functions are safe to call during SSR
 * (localStorage absent) — they no-op / return null instead of throwing.
 */

import type { FreezeFrameNote } from "@/lib/lesson/playback";

/** Key prefix for all draft-notes entries in localStorage. */
export const DRAFT_NOTES_PREFIX = "swinglab:draft-notes:";

/** The on-disk payload shape. */
export type DraftNotesPayload = {
  notes: FreezeFrameNote[];
  savedAt: number;
};

/**
 * Build the localStorage key for a given submission's draft notes.
 */
export function draftNotesKey(submissionId: string): string {
  return `${DRAFT_NOTES_PREFIX}${submissionId}`;
}

/**
 * Serialize and save draft notes for a submission. Overwrites any existing
 * draft. Safe during SSR (no localStorage → no-op).
 */
export function saveDraftNotes(
  submissionId: string,
  notes: FreezeFrameNote[],
): void {
  if (typeof localStorage === "undefined") return;
  const payload: DraftNotesPayload = {
    notes,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(draftNotesKey(submissionId), JSON.stringify(payload));
  } catch {
    // Quota exceeded or storage disabled — silently ignore; autosave is best-effort.
  }
}

/**
 * Load and validate draft notes for a submission. Returns null when no draft
 * exists, the JSON is corrupted, or the payload shape is invalid.
 */
export function loadDraftNotes(
  submissionId: string,
): DraftNotesPayload | null {
  if (typeof localStorage === "undefined") return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(draftNotesKey(submissionId));
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return validatePayload(parsed);
}

/**
 * Remove the draft notes for a submission. No-op if none exist.
 */
export function clearDraftNotes(submissionId: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(draftNotesKey(submissionId));
  } catch {
    // ignore
  }
}

// ── Validation ──────────────────────────────────────────────────────────────

function validatePayload(value: unknown): DraftNotesPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.notes)) return null;
  if (typeof obj.savedAt !== "number" || !Number.isFinite(obj.savedAt)) {
    return null;
  }
  for (const note of obj.notes) {
    if (!isValidNote(note)) return null;
  }
  return { notes: obj.notes as FreezeFrameNote[], savedAt: obj.savedAt };
}

function isValidNote(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    typeof n.timecode === "number" &&
    typeof n.audioUrl === "string" &&
    typeof n.audioDuration === "number" &&
    typeof n.createdAt === "number" &&
    Array.isArray(n.annotations)
  );
}
