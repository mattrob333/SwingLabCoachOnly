import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

export type LessonChapter = {
  id: string;
  timecode: number;
  title: string;
  thumbnailUrl?: string;
  transcript?: string;
  audioDuration: number;
};

/**
 * Build a sorted list of chapters from a lesson playback manifest.
 * Each note becomes a chapter with a title (from aiNoteTitles or "Note N"),
 * optional thumbnail, and the best available transcript text.
 */
export function buildChapterList(
  manifest: LessonPlaybackManifest,
): LessonChapter[] {
  const titles = new Map<string, string>(
    (manifest.aiNoteTitles ?? []).map((t) => [t.noteId, t.title]),
  );

  const sorted = [...manifest.notes].sort((a, b) => a.timecode - b.timecode);

  return sorted.map((note, index) => {
    const title: string = titles.get(note.id) ?? `Note ${index + 1}`;
    const transcript =
      note.transcriptEdited ?? note.transcriptRaw ?? note.transcript;
    return {
      id: note.id,
      timecode: note.timecode,
      title,
      thumbnailUrl: note.thumbnailUrl,
      transcript: transcript || undefined,
      audioDuration: note.audioDuration,
    };
  });
}

/** Format seconds as M:SS (no leading zero on minutes). */
export function formatChapterTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
