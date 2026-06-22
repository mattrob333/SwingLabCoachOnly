import { createReviewId } from "@/lib/review/ids";

/**
 * Durable record types for Wave 1+ persistence.
 * These describe the canonical shapes stored in the database (Supabase) and
 * referenced by repository interfaces. Factory functions validate inputs and
 * default timestamps/IDs so callers can't construct invalid records.
 */

export type StorageProvider = "mock" | "supabase" | "s3";

export type VideoAsset = {
  id: string;
  submissionId: string;
  coachSlug: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: StorageProvider;
  durationSec?: number;
  uploadedAt: number;
};

export type AudioAsset = {
  id: string;
  noteId: string;
  submissionId: string;
  coachSlug: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: StorageProvider;
  durationSec: number;
  uploadedAt: number;
};

export type LessonDeliveryToken = {
  id: string;
  submissionId: string;
  /** Opaque URL-safe token used in the magic-link. Distinct from id. */
  token: string;
  parentEmail: string;
  createdAt: number;
  expiresAt: number;
  viewedAt?: number;
  revokedAt?: number;
};

export type AiPackagingJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type AiPackagingProvider = "openai";

export type AiPackagingJob = {
  id: string;
  submissionId: string;
  status: AiPackagingJobStatus;
  provider: AiPackagingProvider;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  inputTranscriptCount?: number;
  outputSummary?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_TTL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function assertNonEmpty(value: string, field: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
}

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
}

/**
 * Generate an opaque URL-safe token. Uses web crypto when available, with a
 * timestamp+random fallback for older runtimes.
 */
function generateOpaqueToken(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export type CreateVideoAssetInput = {
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

export function createVideoAsset(input: CreateVideoAssetInput): VideoAsset {
  assertNonEmpty(input.submissionId, "submissionId");
  assertNonEmpty(input.coachSlug, "coachSlug");
  assertNonEmpty(input.originalFilename, "originalFilename");
  assertNonEmpty(input.mimeType, "mimeType");
  assertNonEmpty(input.storageKey, "storageKey");
  assertPositive(input.sizeBytes, "sizeBytes");
  if (input.durationSec !== undefined) {
    assertPositive(input.durationSec, "durationSec");
  }

  return {
    id: createReviewId("vid"),
    submissionId: input.submissionId,
    coachSlug: input.coachSlug,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
    storageProvider: input.storageProvider,
    durationSec: input.durationSec,
    uploadedAt: input.uploadedAt ?? Date.now(),
  };
}

export type CreateAudioAssetInput = {
  noteId: string;
  submissionId: string;
  coachSlug: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: StorageProvider;
  durationSec: number;
  uploadedAt?: number;
};

export function createAudioAsset(input: CreateAudioAssetInput): AudioAsset {
  assertNonEmpty(input.noteId, "noteId");
  assertNonEmpty(input.submissionId, "submissionId");
  assertNonEmpty(input.coachSlug, "coachSlug");
  assertNonEmpty(input.mimeType, "mimeType");
  assertNonEmpty(input.storageKey, "storageKey");
  assertPositive(input.sizeBytes, "sizeBytes");
  assertPositive(input.durationSec, "durationSec");

  return {
    id: createReviewId("aud"),
    noteId: input.noteId,
    submissionId: input.submissionId,
    coachSlug: input.coachSlug,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
    storageProvider: input.storageProvider,
    durationSec: input.durationSec,
    uploadedAt: input.uploadedAt ?? Date.now(),
  };
}

export type CreateLessonDeliveryTokenInput = {
  submissionId: string;
  parentEmail: string;
  ttlDays?: number;
  createdAt?: number;
};

export function createLessonDeliveryToken(
  input: CreateLessonDeliveryTokenInput,
): LessonDeliveryToken {
  assertNonEmpty(input.submissionId, "submissionId");
  if (!EMAIL_RE.test(input.parentEmail)) {
    throw new Error("parentEmail must be a valid email address");
  }

  const createdAt = input.createdAt ?? Date.now();
  const ttlDays = input.ttlDays ?? DEFAULT_TTL_DAYS;
  return {
    id: createReviewId("tok"),
    submissionId: input.submissionId,
    token: generateOpaqueToken(),
    parentEmail: input.parentEmail,
    createdAt,
    expiresAt: createdAt + ttlDays * MS_PER_DAY,
  };
}

export type CreateAiPackagingJobInput = {
  submissionId: string;
  provider: AiPackagingProvider;
  createdAt?: number;
};

export function createAiPackagingJob(
  input: CreateAiPackagingJobInput,
): AiPackagingJob {
  assertNonEmpty(input.submissionId, "submissionId");
  const knownProviders: AiPackagingProvider[] = ["openai"];
  if (!knownProviders.includes(input.provider)) {
    throw new Error(`provider must be one of: ${knownProviders.join(", ")}`);
  }

  return {
    id: createReviewId("aijob"),
    submissionId: input.submissionId,
    status: "queued",
    provider: input.provider,
    createdAt: input.createdAt ?? Date.now(),
  };
}
