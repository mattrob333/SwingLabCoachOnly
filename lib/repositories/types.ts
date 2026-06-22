/**
 * Wave 1 Task 5 — Repository interface layer.
 *
 * Defines the data-access contracts for the four domain stores that were
 * previously in-memory/file-backed (lib/submissions.ts, lib/coaches.ts,
 * lib/earnings.ts, lib/lesson/playback-store.ts). Each domain gets:
 *   - A repository interface (the contract both impls must satisfy).
 *   - An InMemory implementation (current behavior — exported array +
 *     optional file-store persistence).
 *   - A Supabase implementation stub (throws "not implemented" — Wave 1
 *     Task 6+ will add the real schema + queries).
 *   - An env-gated factory that picks the impl by `isLive("database")`,
 *     mirroring the storage adapter factory pattern.
 *
 * The original modules (lib/submissions.ts etc.) become thin facades that
 * re-export types + arrays and delegate free functions through the factory.
 * This keeps all 44 existing import sites and 267 tests working unchanged
 * while making the backend swappable to Supabase when env keys are added.
 *
 * Types live here (not in the original modules) to avoid circular imports:
 * the in-memory impls import types from this file, and the original modules
 * re-export types from this file. This file imports only from
 * @/lib/lesson/playback (a pure type module with no imports of its own).
 */

import type { LessonPlaybackManifest } from "@/lib/lesson/playback";
import type {
  VideoAsset,
  StorageProvider,
  LessonDeliveryToken,
} from "@/lib/records";

// ---------------------------------------------------------------------------
// Submission types
// ---------------------------------------------------------------------------

export type SubmissionStatus =
  | "pending_payment"
  | "paid"
  | "in_review"
  | "rendering"
  | "completed";

export type Submission = {
  id: string;
  coachSlug: string;
  parentEmail: string;
  playerAge: number;
  swingType: string;
  notes: string;
  videoUrl?: string;
  videoFileName?: string;
  status: SubmissionStatus;
  createdAt: Date;
  /** Optional reference to the original submission this swing follows up on. */
  followUpFor?: string;
};

export type SubmissionInput = {
  coachSlug: string;
  parentEmail: string;
  playerAge: number;
  swingType: string;
  notes: string;
  videoUrl?: string;
  videoFileName?: string;
  /** Optional — links this submission to an original lesson's submission id. */
  followUpFor?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate a submission input. Returns an array of human-readable error strings. */
export function validateSubmissionInput(input: SubmissionInput): string[] {
  const errors: string[] = [];
  if (!input.coachSlug || input.coachSlug.trim().length === 0) {
    errors.push("Coach is required");
  }
  if (!input.parentEmail || !EMAIL_RE.test(input.parentEmail)) {
    errors.push("Valid email is required");
  }
  if (input.playerAge < 5 || input.playerAge > 18) {
    errors.push("Player age must be between 5 and 18");
  }
  return errors;
}

export interface SubmissionRepository {
  readonly mode: "live" | "mock";
  create(input: SubmissionInput): Promise<Submission>;
  getById(id: string): Promise<Submission | undefined>;
  getFollowUpsFor(originalId: string): Promise<Submission[]>;
  getForCoach(coachSlug: string): Promise<Submission[]>;
  markPaid(id: string): Promise<Submission>;
  markInReview(id: string): Promise<Submission>;
  markRendering(id: string): Promise<Submission>;
  markCompleted(id: string): Promise<Submission>;
}

// ---------------------------------------------------------------------------
// Coach types
// ---------------------------------------------------------------------------

export type Coach = {
  slug: string;
  name: string;
  title: string;
  bio: string;
  location: string;
  /** USD price for a single swing review lesson. */
  priceUsd: number;
  /** ISO 8601 turnaround estimate, e.g. "PT24H". */
  turnaround: string;
  highlights: string[];
  /** Public testimonial snippets. */
  testimonials: { author: string; quote: string }[];
};

export type CoachInput = {
  name: string;
  title: string;
  bio: string;
  location: string;
  priceUsd: number;
  /** ISO 8601 turnaround estimate, e.g. "PT24H". */
  turnaround: string;
  highlights: string[];
  /**
   * Optional: the slug of an existing coach to update. When provided and the
   * slug exists, that coach record is updated in place. When omitted (or the
   * slug is not found) a new coach is created with a disambiguated slug.
   */
  existingSlug?: string;
};

/** Convert a human name into a URL-safe slug. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Validate a CoachInput. Returns an array of human-readable error strings. */
export function validateCoachInput(input: CoachInput): string[] {
  const errors: string[] = [];
  if (!input.name || input.name.trim().length === 0) {
    errors.push("Name is required");
  }
  if (!input.bio || input.bio.trim().length === 0) {
    errors.push("Bio is required");
  }
  if (input.priceUsd == null || input.priceUsd < 1) {
    errors.push("Price must be at least $1");
  }
  if (!input.turnaround || input.turnaround.trim().length === 0) {
    errors.push("Turnaround is required");
  }
  return errors;
}

export interface CoachRepository {
  readonly mode: "live" | "mock";
  getBySlug(slug: string): Promise<Coach | undefined>;
  getAllSlugs(): Promise<string[]>;
  upsert(input: CoachInput): Promise<Coach>;
}

// ---------------------------------------------------------------------------
// Earning types
// ---------------------------------------------------------------------------

export type Earning = {
  id: string;
  submissionId: string;
  coachSlug: string;
  /** USD amount paid by the parent for this review. */
  amountUsd: number;
  parentEmail: string;
  createdAt: Date;
};

export type EarningInput = {
  submissionId: string;
  coachSlug: string;
  amountUsd: number;
  parentEmail: string;
};

export interface EarningRepository {
  readonly mode: "live" | "mock";
  record(input: EarningInput): Promise<Earning>;
  getForSubmission(submissionId: string): Promise<Earning | undefined>;
  getForCoach(coachSlug: string): Promise<Earning[]>;
  getTotalForCoach(coachSlug: string): Promise<number>;
}

// ---------------------------------------------------------------------------
// Playback manifest types
// ---------------------------------------------------------------------------

export type StoredPlaybackManifest = LessonPlaybackManifest & {
  submissionId: string;
};

export interface PlaybackManifestRepository {
  readonly mode: "live" | "mock";
  getForSubmission(
    submissionId: string,
  ): Promise<StoredPlaybackManifest | undefined>;
  save(
    submissionId: string,
    manifest: LessonPlaybackManifest,
  ): Promise<StoredPlaybackManifest>;
}

// ---------------------------------------------------------------------------
// VideoAsset repository types (Wave 2 Task 1)
// ---------------------------------------------------------------------------

/**
 * Input for creating a VideoAsset record. Mirrors `CreateVideoAssetInput`
 * from `lib/records` but is declared here so callers can depend on the
 * repository contract without importing the records module directly.
 */
export type VideoAssetRecordInput = {
  submissionId: string;
  coachSlug: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: StorageProvider;
  durationSec?: number;
  uploadedAt?: number;
};

export interface VideoAssetRepository {
  readonly mode: "live" | "mock";
  /** Persist a new VideoAsset record linked to a submission. */
  create(input: VideoAssetRecordInput): Promise<VideoAsset>;
  /** Find the (first) video asset linked to a submission. */
  getForSubmission(submissionId: string): Promise<VideoAsset | undefined>;
  /** Fetch a VideoAsset by its record id. */
  getById(id: string): Promise<VideoAsset | undefined>;
  /** All video assets for a coach, newest-first by uploadedAt (insertion tiebreak). */
  listForCoach(coachSlug: string): Promise<VideoAsset[]>;
}

// ---------------------------------------------------------------------------
// Lesson delivery token repository types (Wave 2 Task 4 Sub-slice B)
// ---------------------------------------------------------------------------

/** Input for creating a delivery token record. */
export type DeliveryTokenCreateInput = {
  submissionId: string;
  parentEmail: string;
  /** TTL in days (default 30). */
  ttlDays?: number;
  /** Override the creation timestamp (epoch ms). Defaults to Date.now(). */
  createdAt?: number;
};

export interface DeliveryTokenRepository {
  readonly mode: "live" | "mock";
  /** Create and persist a new delivery token. */
  create(input: DeliveryTokenCreateInput): Promise<LessonDeliveryToken>;
  /** Look up a token record by its opaque token string. */
  getByToken(token: string): Promise<LessonDeliveryToken | undefined>;
  /** All tokens for a submission, newest-first by createdAt (insertion tiebreak). */
  getBySubmissionId(submissionId: string): Promise<LessonDeliveryToken[]>;
  /** Mark a token as viewed (sets viewedAt). Throws if not found. */
  markViewed(id: string): Promise<LessonDeliveryToken>;
  /** Revoke a token (sets revokedAt). Throws if not found. */
  revoke(id: string): Promise<LessonDeliveryToken>;
}

// ---------------------------------------------------------------------------
// Token verification logic (pure function — no I/O)
// ---------------------------------------------------------------------------

/** Result of verifying a delivery token. */
export type DeliveryTokenVerification = {
  valid: boolean;
  /** Present only when valid is false. */
  reason?: "expired" | "revoked";
};

/**
 * Verify a delivery token's validity against the current time.
 *
 * Returns `undefined` when the token record is null/undefined (i.e. not found
 * in the store) — the caller should treat this as a 404, distinct from an
 * invalid-but-found token which is a 403.
 *
 * A token is valid when:
 * - It exists (not null/undefined)
 * - `expiresAt` is strictly in the future (expiresAt > Date.now())
 * - `revokedAt` is not set
 */
export function verifyDeliveryToken(
  token: LessonDeliveryToken | null | undefined,
): DeliveryTokenVerification | undefined {
  if (token === null || token === undefined) {
    return undefined;
  }
  if (token.revokedAt !== undefined) {
    return { valid: false, reason: "revoked" };
  }
  if (token.expiresAt <= Date.now()) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true };
}

