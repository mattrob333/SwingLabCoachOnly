import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import {
  createSubmission,
  validateSubmissionInput,
  type SubmissionInput,
} from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";
import { getStorageAdapter } from "@/lib/storage";
import { createVideoAssetRecord } from "@/lib/video-assets";
import type { StorageProvider } from "@/lib/records";

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

/**
 * Allowlist of video MIME types we will accept and store. Anything outside
 * this set is rejected with a 400 — even if the browser reports it as
 * `video/*`. This prevents storing a file with a mismatched extension (the
 * old behavior silently re-mapped unknown `video/*` types to `.mp4`) and
 * keeps the storage layer from holding files we can't safely play back.
 */
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

function safeVideoExtension(fileName: string, type: string): string {
  const ext = extname(fileName).toLowerCase();
  if ([".mp4", ".mov", ".m4v", ".webm"].includes(ext)) return ext;
  if (type === "video/mp4") return ".mp4";
  if (type === "video/quicktime") return ".mov";
  if (type === "video/webm") return ".webm";
  return ".mp4";
}

/** Map the storage adapter's runtime mode to the persisted StorageProvider. */
function providerFromMode(mode: "live" | "mock"): StorageProvider {
  return mode === "live" ? "supabase" : "mock";
}

/**
 * Upload a video file through the env-gated storage adapter (mock filesystem
 * by default, Supabase Storage when env keys are present). Returns the
 * fetchable URL, the storage key, and the asset metadata needed to persist a
 * VideoAsset record linked to the submission.
 */
async function saveUploadedVideo(file: File): Promise<{
  videoUrl: string;
  videoFileName: string;
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
  provider: StorageProvider;
}> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Please upload a video file");
  }
  if (!ALLOWED_VIDEO_MIME_TYPES.has(file.type)) {
    throw new Error(
      "Unsupported video format. Please upload an MP4, MOV, M4V, or WebM file.",
    );
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video file is too large for this local demo");
  }

  const adapter = getStorageAdapter();
  const extension = safeVideoExtension(file.name, file.type);
  const storageKey = `${randomUUID()}${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploaded = await adapter.upload("videos", storageKey, bytes, file.type);

  return {
    videoUrl: uploaded.url,
    videoFileName: file.name,
    storageKey: uploaded.key,
    sizeBytes: uploaded.size,
    mimeType: uploaded.contentType,
    provider: providerFromMode(adapter.mode),
  };
}

async function parseSubmissionRequest(request: NextRequest): Promise<SubmissionInput> {
  const contentType = request.headers?.get?.("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const video = form.get("video");
    const videoFields = video instanceof File ? await saveUploadedVideo(video) : null;

    return {
      coachSlug: String(form.get("coachSlug") ?? ""),
      parentEmail: String(form.get("parentEmail") ?? ""),
      playerAge: Number(form.get("playerAge") ?? 0),
      swingType: String(form.get("swingType") ?? "baseball"),
      notes: String(form.get("notes") ?? ""),
      ...(videoFields ? { videoUrl: videoFields.videoUrl, videoFileName: videoFields.videoFileName } : {}),
      ...(typeof form.get("followUpFor") === "string" && form.get("followUpFor")
        ? { followUpFor: String(form.get("followUpFor")) }
        : {}),
      // Stash the asset metadata on the input so the POST handler can persist
      // a VideoAsset record after the submission is created (the submission id
      // is needed to link the asset). These fields are not part of the
      // Submission type — they're transient handler-only metadata.
      ...(videoFields
        ? {
            __videoAsset: {
              storageKey: videoFields.storageKey,
              sizeBytes: videoFields.sizeBytes,
              mimeType: videoFields.mimeType,
              provider: videoFields.provider,
            },
          }
        : {}),
    } as SubmissionInput & { __videoAsset?: unknown };
  }

  const body = (await request.json()) as Record<string, unknown>;
  return {
    coachSlug: String(body.coachSlug ?? ""),
    parentEmail: String(body.parentEmail ?? ""),
    playerAge: Number(body.playerAge ?? 0),
    swingType: String(body.swingType ?? "baseball"),
    notes: String(body.notes ?? ""),
    ...(typeof body.videoUrl === "string" && body.videoUrl
      ? { videoUrl: body.videoUrl }
      : {}),
    ...(typeof body.videoFileName === "string" && body.videoFileName
      ? { videoFileName: body.videoFileName }
      : {}),
    ...(typeof body.followUpFor === "string" && body.followUpFor
      ? { followUpFor: body.followUpFor }
      : {}),
  };
}

/**
 * Phase 3 — Create a new swing review submission.
 *
 * POST /api/submissions
 * Accepts a SubmissionInput JSON body from the parent upload form.
 * Validates that the coach exists and the input is well-formed.
 * Returns the new submission id + status (pending_payment).
 *
 * Wave 2 Task 1: the video is uploaded through the env-gated storage adapter
 * (mock filesystem by default, Supabase Storage when keys present), and a
 * durable VideoAsset record is persisted alongside the submission.
 *
 * Guardrail: payment before review — the submission starts as pending_payment
 * and only advances after the payment flow (Phase 3 #4).
 */
export async function POST(request: NextRequest) {
  let input: SubmissionInput & { __videoAsset?: unknown };
  try {
    input = (await parseSubmissionRequest(request)) as SubmissionInput & {
      __videoAsset?: unknown;
    };
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid submission body" },
      { status: 400 },
    );
  }

  // Verify the coach exists before creating a submission.
  if (input.coachSlug && !await getCoachBySlug(input.coachSlug)) {
    return NextResponse.json(
      { error: "Selected coach not found" },
      { status: 404 },
    );
  }

  const errors = validateSubmissionInput(input);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 422 },
    );
  }

  try {
    // Strip the transient asset metadata before creating the submission —
    // the submission record only stores videoUrl + videoFileName.
    const { __videoAsset, ...submissionInput } = input;
    const submission = await createSubmission(submissionInput);

    // Persist a durable VideoAsset record linked to the submission. Best-effort:
    // if this fails (e.g. storage write error), the submission is still created
    // with its videoUrl — the asset record is metadata for the storage layer.
    if (__videoAsset && typeof __videoAsset === "object") {
      const assetMeta = __videoAsset as {
        storageKey: string;
        sizeBytes: number;
        mimeType: string;
        provider: StorageProvider;
      };
      try {
        await createVideoAssetRecord({
          submissionId: submission.id,
          coachSlug: submission.coachSlug,
          originalFilename: submission.videoFileName ?? "upload",
          mimeType: assetMeta.mimeType,
          sizeBytes: assetMeta.sizeBytes,
          storageKey: assetMeta.storageKey,
          storageProvider: assetMeta.provider,
        });
      } catch (assetErr) {
        console.error(
          "[submissions] failed to persist VideoAsset record:",
          assetErr instanceof Error ? assetErr.message : assetErr,
        );
      }
    }

    return NextResponse.json(
      {
        id: submission.id,
        status: submission.status,
        coachSlug: submission.coachSlug,
        videoUrl: submission.videoUrl,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create submission" },
      { status: 500 },
    );
  }
}
