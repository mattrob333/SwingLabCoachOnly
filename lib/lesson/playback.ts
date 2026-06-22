export type PlaybackAnnotationTool = "pen" | "line" | "arrow" | "circle";

export type PlaybackPoint = {
  x: number;
  y: number;
};

export type PlaybackAnnotation = {
  id: string;
  tool: PlaybackAnnotationTool;
  timecode: number;
  color: string;
  points: PlaybackPoint[];
  canvasWidth?: number;
  canvasHeight?: number;
};

export type TranscriptStatus = "pending" | "transcribing" | "ready" | "error";

export type FreezeFrameNote = {
  id: string;
  timecode: number;
  audioUrl: string;
  audioDuration: number;
  thumbnailUrl?: string;
  /** Legacy raw transcript field — preserved for backward compat. Prefer transcriptRaw/transcriptEdited. */
  transcript?: string;
  transcriptRaw?: string;
  transcriptEdited?: string;
  transcriptStatus?: TranscriptStatus;
  transcriptProvider?: string;
  transcriptError?: string;
  annotations: PlaybackAnnotation[];
  createdAt: number;
};

export type LessonPlaybackManifest = {
  videoUrl: string;
  notes: FreezeFrameNote[];
  createdAt: number;
  status: "draft" | "processed";
  submissionId?: string;
  coachSlug?: string;
  parentEmail?: string;
  deliveryTokenId?: string;
  processedAt?: number;
  version: number;
  aiSummary?: string;
};

export type LessonPlaybackInput = {
  videoUrl: string;
  notes: FreezeFrameNote[];
  submissionId?: string;
  coachSlug?: string;
  parentEmail?: string;
  deliveryTokenId?: string;
  aiSummary?: string;
};

export function buildLessonPlaybackManifest(
  input: LessonPlaybackInput,
  createdAt: number = Date.now(),
): LessonPlaybackManifest {
  if (!input.videoUrl || input.videoUrl.trim().length === 0) {
    throw new Error("videoUrl is required");
  }
  if (!Array.isArray(input.notes) || input.notes.length === 0) {
    throw new Error("At least one freeze-frame note is required");
  }

  const notes = input.notes.map((note) => {
    if (!note.id || !note.audioUrl) {
      throw new Error("Each note needs an id and audioUrl");
    }
    if (note.timecode < 0 || note.audioDuration <= 0) {
      throw new Error("Each note needs a valid timecode and audioDuration");
    }
    return {
      ...note,
      annotations: Array.isArray(note.annotations) ? note.annotations : [],
      transcriptStatus: note.transcriptStatus ?? "pending",
    };
  });

  return {
    videoUrl: input.videoUrl,
    notes: [...notes].sort((a, b) => a.timecode - b.timecode),
    createdAt,
    status: "processed",
    submissionId: input.submissionId,
    coachSlug: input.coachSlug,
    parentEmail: input.parentEmail,
    deliveryTokenId: input.deliveryTokenId,
    processedAt: createdAt,
    version: 1,
    aiSummary: input.aiSummary,
  };
}
