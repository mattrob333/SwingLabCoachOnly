/**
 * Repository factory (Wave 1 Task 5).
 *
 * Env-gated factory for all four domain repositories. Returns the in-memory
 * impl when `isLive("database")` is false (default), the Supabase impl stub
 * when true. Mirrors the storage adapter factory pattern in lib/storage/.
 *
 * The factory caches each repository instance (singleton per tick). Tests
 * can reset the cache via `_resetAllRepositoriesForTests()`.
 */

import { isLive } from "@/lib/env";
import type {
  CoachRepository,
  EarningRepository,
  PlaybackManifestRepository,
  SubmissionRepository,
} from "./types";
import { InMemorySubmissionRepository } from "./in-memory-submissions";
import { SupabaseSubmissionRepository } from "./supabase-submissions";
import { InMemoryCoachRepository } from "./in-memory-coaches";
import { SupabaseCoachRepository } from "./supabase-coaches";
import { InMemoryEarningRepository } from "./in-memory-earnings";
import { SupabaseEarningRepository } from "./supabase-earnings";
import { InMemoryPlaybackManifestRepository } from "./in-memory-playback";
import { SupabasePlaybackManifestRepository } from "./supabase-playback";

let submissionRepo: SubmissionRepository | null = null;
let coachRepo: CoachRepository | null = null;
let earningRepo: EarningRepository | null = null;
let playbackRepo: PlaybackManifestRepository | null = null;

export function getSubmissionRepository(): SubmissionRepository {
  if (submissionRepo) return submissionRepo;
  submissionRepo = isLive("database")
    ? new SupabaseSubmissionRepository()
    : new InMemorySubmissionRepository();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[repositories] submissions: ${submissionRepo.mode} adapter`);
  }
  return submissionRepo;
}

export function getCoachRepository(): CoachRepository {
  if (coachRepo) return coachRepo;
  coachRepo = isLive("database")
    ? new SupabaseCoachRepository()
    : new InMemoryCoachRepository();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[repositories] coaches: ${coachRepo.mode} adapter`);
  }
  return coachRepo;
}

export function getEarningRepository(): EarningRepository {
  if (earningRepo) return earningRepo;
  earningRepo = isLive("database")
    ? new SupabaseEarningRepository()
    : new InMemoryEarningRepository();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[repositories] earnings: ${earningRepo.mode} adapter`);
  }
  return earningRepo;
}

export function getPlaybackManifestRepository(): PlaybackManifestRepository {
  if (playbackRepo) return playbackRepo;
  playbackRepo = isLive("database")
    ? new SupabasePlaybackManifestRepository()
    : new InMemoryPlaybackManifestRepository();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[repositories] playback: ${playbackRepo.mode} adapter`);
  }
  return playbackRepo;
}

/** Test-only: reset all cached repositories so mode switches take effect. */
export function _resetAllRepositoriesForTests(): void {
  submissionRepo = null;
  coachRepo = null;
  earningRepo = null;
  playbackRepo = null;
}

export type {
  CoachRepository,
  EarningRepository,
  PlaybackManifestRepository,
  SubmissionRepository,
  StoredPlaybackManifest,
} from "./types";
