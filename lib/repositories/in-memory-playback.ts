/**
 * In-memory playback manifest repository (Wave 1 Task 5).
 *
 * Wraps the existing in-memory manifest array + file-store persistence that
 * previously lived in lib/lesson/playback-store.ts. The array is exported
 * for test reset.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  PlaybackManifestRepository,
  StoredPlaybackManifest,
} from "./types";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

/** In-memory store. Exported for test reset. */
export const PLAYBACK_MANIFESTS: StoredPlaybackManifest[] = [];

const STORE_PATH = join(
  process.cwd(),
  ".swinglab-data",
  "playback-manifests.json",
);
const USE_FILE_STORE = process.env.NODE_ENV !== "test";

function load(): void {
  if (!USE_FILE_STORE || !existsSync(STORE_PATH)) return;
  try {
    const stored = JSON.parse(
      readFileSync(STORE_PATH, "utf8"),
    ) as StoredPlaybackManifest[];
    PLAYBACK_MANIFESTS.splice(0, PLAYBACK_MANIFESTS.length, ...stored);
  } catch {
    PLAYBACK_MANIFESTS.length = 0;
  }
}

function save(): void {
  if (!USE_FILE_STORE) return;
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(
    STORE_PATH,
    JSON.stringify(PLAYBACK_MANIFESTS, null, 2),
    "utf8",
  );
}

export class InMemoryPlaybackManifestRepository
  implements PlaybackManifestRepository
{
  readonly mode = "mock" as const;

  getForSubmission(
    submissionId: string,
  ): StoredPlaybackManifest | undefined {
    load();
    return PLAYBACK_MANIFESTS.find(
      (m) => m.submissionId === submissionId,
    );
  }

  save(
    submissionId: string,
    manifest: LessonPlaybackManifest,
  ): StoredPlaybackManifest {
    load();
    const existing = this.getForSubmission(submissionId);
    if (existing) {
      Object.assign(existing, manifest);
      save();
      return existing;
    }
    const stored: StoredPlaybackManifest = { ...manifest, submissionId };
    PLAYBACK_MANIFESTS.push(stored);
    save();
    return stored;
  }
}
