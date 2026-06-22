import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FreezeFrameNote } from "@/lib/lesson/playback";
import {
  draftNotesKey,
  saveDraftNotes,
  loadDraftNotes,
  clearDraftNotes,
  DRAFT_NOTES_PREFIX,
} from "@/lib/review/draft-notes";

/**
 * Wave 3 — Review Studio autosave (slice 1: draft-notes storage module).
 *
 * These tests verify the localStorage-backed serialize/deserialize layer that
 * persists in-progress coach notes so a refresh doesn't lose work. The browser
 * localStorage is mocked via vi.stubGlobal since vitest runs in jsdom.
 */

function makeNote(overrides: Partial<FreezeFrameNote> = {}): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 5.2,
    audioUrl: "blob:https://example.com/audio-1",
    audioDuration: 3.5,
    transcript: "",
    transcriptStatus: "pending",
    annotations: [],
    createdAt: 1700000000000,
    ...overrides,
  };
}

describe("draftNotesKey", () => {
  it("produces a namespaced key containing the submission id", () => {
    const key = draftNotesKey("sub-123");
    expect(key).toBe(`${DRAFT_NOTES_PREFIX}sub-123`);
  });

  it("produces different keys for different submissions", () => {
    expect(draftNotesKey("sub-a")).not.toBe(draftNotesKey("sub-b"));
  });
});

describe("saveDraftNotes / loadDraftNotes", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    });
  });

  it("round-trips a single note through localStorage", () => {
    const note = makeNote();
    saveDraftNotes("sub-1", [note]);
    const loaded = loadDraftNotes("sub-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.notes).toHaveLength(1);
    expect(loaded!.notes[0].id).toBe("note-1");
    expect(loaded!.notes[0].timecode).toBe(5.2);
  });

  it("round-trips multiple notes preserving order", () => {
    const notes = [
      makeNote({ id: "note-a", timecode: 10 }),
      makeNote({ id: "note-b", timecode: 2 }),
      makeNote({ id: "note-c", timecode: 30 }),
    ];
    saveDraftNotes("sub-1", notes);
    const loaded = loadDraftNotes("sub-1");
    expect(loaded!.notes.map((n) => n.id)).toEqual([
      "note-a",
      "note-b",
      "note-c",
    ]);
  });

  it("preserves all note fields including annotations and thumbnail", () => {
    const note = makeNote({
      id: "note-full",
      thumbnailUrl: "data:image/jpeg;base64,abc",
      transcript: "Keep your elbow up",
      transcriptStatus: "ready",
      transcriptRaw: "keep your elbow up",
      transcriptEdited: "Keep your elbow up",
      annotations: [
        {
          id: "ann-1",
          tool: "circle",
          timecode: 5.2,
          color: "#ff0000",
          points: [{ x: 10, y: 20 }],
          canvasWidth: 640,
          canvasHeight: 360,
        },
      ],
    });
    saveDraftNotes("sub-1", [note]);
    const loaded = loadDraftNotes("sub-1");
    expect(loaded!.notes[0]).toEqual(note);
  });

  it("includes a savedAt timestamp in the payload", () => {
    const before = Date.now();
    saveDraftNotes("sub-1", [makeNote()]);
    const after = Date.now();
    const loaded = loadDraftNotes("sub-1");
    expect(loaded!.savedAt).toBeGreaterThanOrEqual(before);
    expect(loaded!.savedAt).toBeLessThanOrEqual(after);
  });

  it("returns null when no draft exists for the submission", () => {
    expect(loadDraftNotes("sub-nonexistent")).toBeNull();
  });

  it("returns null for corrupted JSON in localStorage", () => {
    localStorage.setItem(draftNotesKey("sub-corrupt"), "{not valid json");
    expect(loadDraftNotes("sub-corrupt")).toBeNull();
  });

  it("returns null when payload is valid JSON but wrong shape", () => {
    localStorage.setItem(draftNotesKey("sub-wrong"), JSON.stringify({ foo: "bar" }));
    expect(loadDraftNotes("sub-wrong")).toBeNull();
  });

  it("returns null when notes array contains an item missing required fields", () => {
    const badPayload = JSON.stringify({
      notes: [{ id: "x" }],
      savedAt: Date.now(),
    });
    localStorage.setItem(draftNotesKey("sub-badnote"), badPayload);
    expect(loadDraftNotes("sub-badnote")).toBeNull();
  });

  it("overwrites previous draft on re-save", () => {
    saveDraftNotes("sub-1", [makeNote({ id: "old" })]);
    saveDraftNotes("sub-1", [makeNote({ id: "new" })]);
    const loaded = loadDraftNotes("sub-1");
    expect(loaded!.notes).toHaveLength(1);
    expect(loaded!.notes[0].id).toBe("new");
  });
});

describe("clearDraftNotes", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    });
  });

  it("removes the draft for the given submission", () => {
    saveDraftNotes("sub-1", [makeNote()]);
    expect(loadDraftNotes("sub-1")).not.toBeNull();
    clearDraftNotes("sub-1");
    expect(loadDraftNotes("sub-1")).toBeNull();
  });

  it("is a no-op when no draft exists", () => {
    expect(() => clearDraftNotes("sub-none")).not.toThrow();
  });

  it("only clears the specified submission's draft", () => {
    saveDraftNotes("sub-a", [makeNote({ id: "a" })]);
    saveDraftNotes("sub-b", [makeNote({ id: "b" })]);
    clearDraftNotes("sub-a");
    expect(loadDraftNotes("sub-a")).toBeNull();
    expect(loadDraftNotes("sub-b")).not.toBeNull();
  });
});

describe("saveDraftNotes (no localStorage available)", () => {
  it("does not throw when localStorage is undefined (SSR / unsupported)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveDraftNotes("sub-1", [makeNote()])).not.toThrow();
  });
});

describe("loadDraftNotes (no localStorage available)", () => {
  it("returns null when localStorage is undefined (SSR / unsupported)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadDraftNotes("sub-1")).toBeNull();
  });
});
