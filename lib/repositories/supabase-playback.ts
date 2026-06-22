/**
 * Supabase playback manifest repository stub (Wave 1 Task 5).
 */

import type { LessonPlaybackManifest } from "@/lib/lesson/playback";
import type {
  PlaybackManifestRepository,
  StoredPlaybackManifest,
} from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-playback] ${method} not implemented — Wave 1 Task 6+ will add the schema + impl`,
  );
}

export class SupabasePlaybackManifestRepository
  implements PlaybackManifestRepository
{
  readonly mode = "live" as const;

  getForSubmission(_submissionId: string): StoredPlaybackManifest | undefined {
    notImpl("getForSubmission");
  }
  save(
    _submissionId: string,
    _manifest: LessonPlaybackManifest,
  ): StoredPlaybackManifest {
    notImpl("save");
  }
}
