import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useDraftNotesAutosave } from "@/components/review/use-draft-notes-autosave";
import { draftNotesKey } from "@/lib/review/draft-notes";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

function makeNote(overrides: Partial<FreezeFrameNote> = {}): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 1.5,
    audioUrl: "blob:http://localhost/test",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    transcript: "",
    transcriptStatus: "pending",
    annotations: [],
    ...overrides,
  };
}

/**
 * Harness that mirrors real usage: notes are React state, the hook's
 * onRestoreDraft callback feeds back into setNotes so the save effect sees
 * the restored notes on re-render.
 */
function useTestHarness(
  submissionId: string,
  initialNotes: FreezeFrameNote[],
) {
  const [notes, setNotes] = useState<FreezeFrameNote[]>(initialNotes);
  const autosave = useDraftNotesAutosave(submissionId, notes, setNotes);
  return { notes, autosave, setNotes };
}

describe("useDraftNotesAutosave", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("restores draft notes on mount and reports hasDraft + savedAt", () => {
    const draftNotes = [makeNote({ id: "draft-1", timecode: 2.0 })];
    const savedAt = 1700000001000;
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: draftNotes, savedAt }),
    );

    const { result } = renderHook(() => useTestHarness("sub-1", []));

    // Restore effect fired → onRestoreDraft called → setNotes triggered re-render
    expect(result.current.notes).toEqual(draftNotes);
    expect(result.current.autosave.hasDraft).toBe(true);
    expect(result.current.autosave.savedAt).toBe(savedAt);
  });

  it("reports hasDraft=false and savedAt=null when no draft exists", () => {
    const { result } = renderHook(() => useTestHarness("sub-1", []));

    expect(result.current.notes).toEqual([]);
    expect(result.current.autosave.hasDraft).toBe(false);
    expect(result.current.autosave.savedAt).toBeNull();
  });

  it("does not save on mount when notes are empty (no draft)", () => {
    renderHook(() => useTestHarness("sub-1", []));

    expect(store.has(draftNotesKey("sub-1"))).toBe(false);
  });

  it("does not redundantly save restored notes back to localStorage", () => {
    const draftNotes = [makeNote({ id: "draft-1" })];
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: draftNotes, savedAt: 1700000001000 }),
    );

    renderHook(() => useTestHarness("sub-1", []));

    // Advance well past the debounce window — no write should have occurred
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // The stored payload should still be the original (savedAt unchanged)
    const raw = store.get(draftNotesKey("sub-1"));
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.savedAt).toBe(1700000001000);
  });

  it("debounces save when notes change (500ms) and updates savedAt", () => {
    const { result } = renderHook(() => useTestHarness("sub-1", []));

    const before = Date.now();
    act(() => {
      result.current.setNotes([makeNote({ id: "new-1" })]);
    });

    // Not saved yet (debounce pending)
    expect(store.has(draftNotesKey("sub-1"))).toBe(false);
    expect(result.current.autosave.savedAt).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now saved
    expect(store.has(draftNotesKey("sub-1"))).toBe(true);
    expect(result.current.autosave.hasDraft).toBe(true);
    expect(result.current.autosave.savedAt).toBeGreaterThanOrEqual(before);
  });

  it("does not save empty notes (clearing is handled on submit)", () => {
    const { result } = renderHook(() =>
      useTestHarness("sub-1", [makeNote({ id: "n1" })]),
    );

    // No draft in storage initially, and initial notes are non-empty.
    // Wait for the initial-save debounce to fire so we have a draft.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(store.has(draftNotesKey("sub-1"))).toBe(true);

    // Clear notes — should NOT write an empty payload
    act(() => {
      result.current.setNotes([]);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const raw = store.get(draftNotesKey("sub-1"));
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.notes).toHaveLength(1); // still the previous saved draft
  });

  it("skips save when notes are unchanged from the last saved state", () => {
    const draftNotes = [makeNote({ id: "draft-1" })];
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: draftNotes, savedAt: 1700000001000 }),
    );

    const { result } = renderHook(() => useTestHarness("sub-1", []));

    // Restored. Now set notes to the same content (new array, same data).
    act(() => {
      result.current.setNotes([...draftNotes]);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // savedAt should still be the original draft timestamp (no new write)
    expect(result.current.autosave.savedAt).toBe(1700000001000);
  });
});
