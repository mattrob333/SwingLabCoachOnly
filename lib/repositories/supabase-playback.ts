/**
 * Supabase playback manifest repository stub (Wave 1 Task 5 — async since Task 7).
 */

import type { LessonPlaybackManifest } from "@/lib/lesson/playback";
import type {
  PlaybackManifestRepository,
  StoredPlaybackManifest,
} from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-playback] ${method} not implemented — Wave 1 Slice D will add the impl`,
  );
}

export class SupabasePlaybackManifestRepository
  implements PlaybackManifestRepository
{
  readonly mode = "live" as const;

  async getForSubmission(
    _submissionId: string,
  ): Promise<StoredPlaybackManifest | undefined> {
    notImpl("getForSubmission");
  }
  async save(
    _submissionId: string,
    _manifest: LessonPlaybackManifest,
  ): Promise<StoredPlaybackManifest> {
    notImpl("save");
  }
}
