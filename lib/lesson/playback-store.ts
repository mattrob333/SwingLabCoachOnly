import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

export const PLAYBACK_MANIFESTS: Array<
  LessonPlaybackManifest & { submissionId: string }
> = [];

const STORE_PATH = join(process.cwd(), ".swinglab-data", "playback-manifests.json");
const USE_FILE_STORE = process.env.NODE_ENV !== "test";

function loadManifests(): void {
  if (!USE_FILE_STORE || !existsSync(STORE_PATH)) return;

  try {
    const stored = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Array<
      LessonPlaybackManifest & { submissionId: string }
    >;
    PLAYBACK_MANIFESTS.splice(0, PLAYBACK_MANIFESTS.length, ...stored);
  } catch {
    PLAYBACK_MANIFESTS.length = 0;
  }
}

function saveManifests(): void {
  if (!USE_FILE_STORE) return;

  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(PLAYBACK_MANIFESTS, null, 2), "utf8");
}

export function getPlaybackManifestForSubmission(
  submissionId: string,
): (LessonPlaybackManifest & { submissionId: string }) | undefined {
  loadManifests();
  return PLAYBACK_MANIFESTS.find((manifest) => manifest.submissionId === submissionId);
}

export function savePlaybackManifest(
  submissionId: string,
  manifest: LessonPlaybackManifest,
): LessonPlaybackManifest & { submissionId: string } {
  loadManifests();

  const existing = getPlaybackManifestForSubmission(submissionId);
  if (existing) {
    Object.assign(existing, manifest);
    saveManifests();
    return existing;
  }

  const stored = { ...manifest, submissionId };
  PLAYBACK_MANIFESTS.push(stored);
  saveManifests();
  return stored;
}
