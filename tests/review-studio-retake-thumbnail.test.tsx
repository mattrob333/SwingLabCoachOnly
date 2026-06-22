import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import type { FreezeFrameNote } from "@/lib/lesson/playback";
import { draftNotesKey } from "@/lib/review/draft-notes";

// --- Mocks ---------------------------------------------------------------

// Mock video element injected via onVideoElementReady. Tests can access this
// to assert seek behaviour and fire the "seeked" event.
type MockVideo = {
  videoWidth: number;
  videoHeight: number;
  currentTime: number;
  clientWidth: number;
  clientHeight: number;
  pause: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  __listeners: Record<string, Array<() => void>>;
  __fire: (event: string) => void;
};

function makeMockVideo(): MockVideo {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    videoWidth: 1920,
    videoHeight: 1080,
    currentTime: 0,
    clientWidth: 640,
    clientHeight: 360,
    pause: vi.fn(),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: () => void) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((h) => h !== handler);
    }),
    __listeners: listeners,
    __fire: (event: string) => {
      (listeners[event] || []).forEach((h) => h());
    },
  };
}

let currentMockVideo: MockVideo | null = null;

vi.mock("@/components/review/video-player", () => ({
  VideoPlayer: (props: {
    onVideoElementReady?: (v: HTMLVideoElement | null) => void;
  }) => {
    // Inject the mock video element so the component's videoElementRef is set.
    if (props.onVideoElementReady && currentMockVideo) {
      props.onVideoElementReady(
        currentMockVideo as unknown as HTMLVideoElement,
      );
    }
    return <div data-testid="video-player" />;
  },
}));
vi.mock("@/components/review/voice-recorder", () => ({
  VoiceRecorder: () => <div data-testid="voice-recorder" />,
}));
vi.mock("@/components/review/annotation-canvas", () => ({
  AnnotationCanvas: () => <div data-testid="annotation-canvas" />,
}));

// --- Helpers --------------------------------------------------------------

function makeNote(overrides: Partial<FreezeFrameNote> = {}): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 12.5,
    audioUrl: "blob:http://localhost/audio",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    thumbnailUrl: "data:image/jpeg;base64,old-thumb",
    transcript: "Keep your head still",
    transcriptStatus: "ready",
    annotations: [],
    ...overrides,
  };
}

function makeStore(): Map<string, string> {
  return new Map();
}

function seedDraft(
  store: Map<string, string>,
  submissionId: string,
  notes: FreezeFrameNote[],
) {
  store.set(
    draftNotesKey(submissionId),
    JSON.stringify({ notes, savedAt: 1700000001000 }),
  );
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

// Stub canvas 2D context + toDataURL so captureVideoThumbnail works in jsdom.
function stubCanvas() {
  const stubCtx = {
    drawImage: vi.fn(),
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
    fillStyle: "",
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
  };
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => stubCtx,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => "data:image/jpeg;base64,new-thumb",
  ) as unknown as typeof HTMLCanvasElement.prototype.toDataURL;
  return () => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
    HTMLCanvasElement.prototype.toDataURL = origToDataURL;
  };
}

// --- Tests ----------------------------------------------------------------

describe("ReviewStudioClient — retake thumbnail (Wave 3)", () => {
  let store: Map<string, string>;
  let restoreCanvas: () => void;

  beforeEach(() => {
    store = makeStore();
    stubLocalStorage(store);
    currentMockVideo = null;
    restoreCanvas = () => {};
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restoreCanvas();
    currentMockVideo = null;
  });

  it("renders a Retake thumbnail button for each note card", async () => {
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
    const btn = await findByLabelText("Retake thumbnail for note 1");
    expect(btn).toBeTruthy();
  });

  it("disables the Retake thumbnail button while re-recording is active", async () => {
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

    // Click re-record to activate re-recording state
    const reRecordBtn = await findByLabelText("Re-record note 1");
    fireEvent.click(reRecordBtn);

    // Retake thumbnail button should now be disabled
    const retakeBtn = await findByLabelText("Retake thumbnail for note 1");
    expect(retakeBtn).toHaveProperty("disabled", true);
  });

  it("is a no-op when no video element is available (no crash, thumbnail unchanged)", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [
      makeNote({ thumbnailUrl: "data:image/jpeg;base64,original" }),
    ]);
    const { findByLabelText, queryByRole } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const retakeBtn = await findByLabelText("Retake thumbnail for note 1");
    // currentMockVideo is null → component has no video element ref
    fireEvent.click(retakeBtn);

    // Should not crash. The thumbnail image should still show the original src.
    const img = queryByRole("img") as HTMLImageElement | null;
    expect(img).toBeTruthy();
    expect(img!.src).toBe("data:image/jpeg;base64,original");
  });

  it("seeks the video to the note's timecode when clicked", async () => {
    currentMockVideo = makeMockVideo();
    restoreCanvas = stubCanvas();

    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote({ timecode: 15.3 })]);
    const { findByLabelText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const retakeBtn = await findByLabelText("Retake thumbnail for note 1");
    await act(async () => {
      fireEvent.click(retakeBtn);
    });

    expect(currentMockVideo.pause).toHaveBeenCalledTimes(1);
    expect(currentMockVideo.currentTime).toBe(15.3);
  });

  it("updates the thumbnail after the seeked event fires", async () => {
    currentMockVideo = makeMockVideo();
    restoreCanvas = stubCanvas();

    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [
      makeNote({ thumbnailUrl: "data:image/jpeg;base64,old-thumb" }),
    ]);
    const { findByLabelText, getByRole } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const retakeBtn = await findByLabelText("Retake thumbnail for note 1");
    await act(async () => {
      fireEvent.click(retakeBtn);
    });

    // Thumbnail hasn't changed yet (waiting for seeked)
    const imgBefore = getByRole("img") as HTMLImageElement;
    expect(imgBefore.src).toBe("data:image/jpeg;base64,old-thumb");

    // Fire the seeked event → capture runs → thumbnail updates
    await act(async () => {
      currentMockVideo!.__fire("seeked");
    });

    const imgAfter = getByRole("img") as HTMLImageElement;
    expect(imgAfter.src).toBe("data:image/jpeg;base64,new-thumb");
  });

  it("captures immediately when the video is already at the note's timecode", async () => {
    currentMockVideo = makeMockVideo();
    currentMockVideo.currentTime = 12.5; // same as note.timecode
    restoreCanvas = stubCanvas();

    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [
      makeNote({ timecode: 12.5, thumbnailUrl: "data:image/jpeg;base64,old" }),
    ]);
    const { findByLabelText, getByRole } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const retakeBtn = await findByLabelText("Retake thumbnail for note 1");
    await act(async () => {
      fireEvent.click(retakeBtn);
    });

    // Should NOT have registered a seeked listener (captured immediately)
    expect(currentMockVideo.addEventListener).not.toHaveBeenCalled();
    // Thumbnail should already be updated
    const img = getByRole("img") as HTMLImageElement;
    expect(img.src).toBe("data:image/jpeg;base64,new-thumb");
  });
});
