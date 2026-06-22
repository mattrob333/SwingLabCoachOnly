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

export type FreezeFrameNote = {
  id: string;
  timecode: number;
  audioUrl: string;
  audioDuration: number;
  thumbnailUrl?: string;
  transcript?: string;
  annotations: PlaybackAnnotation[];
  createdAt: number;
};

export type LessonPlaybackManifest = {
  videoUrl: string;
  notes: FreezeFrameNote[];
  createdAt: number;
  status: "draft" | "processed";
};

export type LessonPlaybackInput = {
  videoUrl: string;
  notes: FreezeFrameNote[];
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
    };
  });

  return {
    videoUrl: input.videoUrl,
    notes: [...notes].sort((a, b) => a.timecode - b.timecode),
    createdAt,
    status: "processed",
  };
}
