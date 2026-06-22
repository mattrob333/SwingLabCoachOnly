import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import type { ReviewEvent } from "@/lib/review/events";
import type { RecordingSegment } from "@/lib/review/recording";
import type { FreezeFrameNote } from "@/lib/lesson/playback";
import { draftNotesKey } from "@/lib/review/draft-notes";

// --- Mocks ---------------------------------------------------------------
// We need to capture the imperative handle so the test can assert that
// reRecordNote calls startRecording(timecode).
const startRecordingSpy = vi.fn();

// Keep a live reference to the latest onSegmentFinalized callback. The mock
// updates this on every render, so it always reflects the latest closure
// (including reRecordNoteId state changes).
const liveCallbacks: {
  onSegmentFinalized: ((s: RecordingSegment) => void) | null;
} = { onSegmentFinalized: null };

vi.mock("@/components/review/video-player", () => ({
  VideoPlayer: () => <div data-testid="video-player" />,
}));
vi.mock("@/components/review/voice-recorder", () => ({
  VoiceRecorder: (props: {
    ref?: React.Ref<{ startRecording: (t?: number) => void; stopRecording: () => void }>;
    onSegmentFinalized?: (s: RecordingSegment) => void;
    onSegmentsChange?: (s: RecordingSegment[]) => void;
    onEvent?: (e: ReviewEvent) => void;
  }) => {
    // Always update the live callback reference.
    liveCallbacks.onSegmentFinalized = props.onSegmentFinalized ?? null;

    // Capture the ref so the test can invoke startRecording.
    const handle = {
      startRecording: (t?: number) => startRecordingSpy(t),
      stopRecording: () => {},
    };
    if (props.ref) {
      if (typeof props.ref === "function") {
        props.ref(handle);
      } else if (props.ref && "current" in props.ref) {
        // @ts-expect-error — ref.current assignment in mock
        props.ref.current = handle;
      }
    }
    return <div data-testid="voice-recorder" />;
  },
}));
vi.mock("@/components/review/annotation-canvas", () => ({
  AnnotationCanvas: () => <div data-testid="annotation-canvas" />,
}));

// --- Helpers --------------------------------------------------------------
function makeNote(overrides: Partial<FreezeFrameNote> = {}): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 12.5,
    audioUrl: "blob:http://localhost/old-audio",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    transcript: "Keep your head still",
    transcriptStatus: "ready",
    annotations: [],
    ...overrides,
  };
}

function makeSegment(
  overrides: Partial<RecordingSegment> = {},
): RecordingSegment {
  return {
    id: "rec-1",
    startTime: 12.5,
    duration: 4.1,
    audioBlobUrl: "blob:http://localhost/new-audio",
    ...overrides,
  };
}

function seedDraft(store: Map<string, string>, submissionId: string, notes: FreezeFrameNote[]) {
  store.set(
    draftNotesKey(submissionId),
    JSON.stringify({ notes, savedAt: 1700000001000 }),
  );
}

function makeStore(): Map<string, string> {
  return new Map();
}

function stubLocalStorage(store: Map<string, string>) {
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
}

// We need to render the component with pre-existing notes. We seed them
// via the localStorage draft mechanism so `useDraftNotesAutosave` restores
// them on mount — this gives us notes with known IDs.
describe("ReviewStudioClient — re-record a coach note (Wave 3)", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = makeStore();
    stubLocalStorage(store);
    startRecordingSpy.mockReset();
    liveCallbacks.onSegmentFinalized = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a Re-record button for each note card", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote()]);
    const { findByLabelText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    const reRecordBtn = await findByLabelText("Re-record note 1");
    expect(reRecordBtn).toBeTruthy();
  });

  it("calls VoiceRecorder.startRecording with the note's timecode when Re-record is clicked", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote({ timecode: 12.5 })]);
    const { findByLabelText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    const reRecordBtn = await findByLabelText("Re-record note 1");
    fireEvent.click(reRecordBtn);

    expect(startRecordingSpy).toHaveBeenCalledTimes(1);
    expect(startRecordingSpy).toHaveBeenCalledWith(12.5);
  });

  it("replaces the note's audioUrl and audioDuration when a new segment is finalized after re-record", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [
      makeNote({ audioUrl: "blob:old", audioDuration: 3.2 }),
    ]);
    const { findByLabelText, getByLabelText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // Wait for the draft to restore (note appears)
    await findByLabelText("Re-record note 1");

    // Click re-record — this sets reRecordNoteId and triggers startRecording
    fireEvent.click(await findByLabelText("Re-record note 1"));

    // Flush state updates (reRecordNoteId change → new handleSegmentFinalized closure)
    await act(async () => {});

    // Simulate the new recording being finalized
    await act(async () => {
      liveCallbacks.onSegmentFinalized?.(
        makeSegment({ id: "rec-2", duration: 5.7, audioBlobUrl: "blob:new" }),
      );
    });

    // The audio element's src should now be the new blob URL
    const audio = getByLabelText("Playback coach note 1") as HTMLAudioElement;
    expect(audio.src).toBe("blob:new");
  });

  it("does not create a new note when re-recording (note count stays 1)", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote()]);
    const { findAllByLabelText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // Wait for the draft to restore
    await findAllByLabelText("Re-record note 1");

    // Click re-record
    const reRecordBtns = await findAllByLabelText("Re-record note 1");
    fireEvent.click(reRecordBtns[0]);

    // Flush state
    await act(async () => {});

    // Simulate new recording finalized
    await act(async () => {
      liveCallbacks.onSegmentFinalized?.(
        makeSegment({ id: "rec-2", duration: 5.0, audioBlobUrl: "blob:new" }),
      );
    });

    // Should still only have 1 note (Re-record note 1), not 2 (note 1 + note 2)
    const afterButtons = await findAllByLabelText(/Re-record note/);
    expect(afterButtons).toHaveLength(1);
  });

  it("disables Re-record and Delete buttons on all notes while re-recording is active", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote()]);
    const { findByLabelText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const reRecordBtn = await findByLabelText("Re-record note 1");
    fireEvent.click(reRecordBtn);

    // The re-record button itself should now be disabled
    expect(reRecordBtn).toHaveProperty("disabled", true);

    // The delete button should also be disabled
    const deleteBtn = await findByLabelText("Delete note 1");
    expect(deleteBtn).toHaveProperty("disabled", true);
  });

  it("preserves the note transcript when re-recording audio", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [
      makeNote({ transcript: "Hands too low" }),
    ]);
    const { findByLabelText, getByDisplayValue } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // Wait for the draft to restore with the transcript
    await findByLabelText("Re-record note 1");
    expect(getByDisplayValue("Hands too low")).toBeTruthy();

    // Click re-record
    fireEvent.click(await findByLabelText("Re-record note 1"));

    // Flush state
    await act(async () => {});

    // Simulate new recording finalized
    await act(async () => {
      liveCallbacks.onSegmentFinalized?.(
        makeSegment({ id: "rec-2", duration: 5.0, audioBlobUrl: "blob:new" }),
      );
    });

    // Transcript should be preserved
    const textareaAfter = getByDisplayValue("Hands too low") as HTMLTextAreaElement;
    expect(textareaAfter).toBeTruthy();
  });
});
