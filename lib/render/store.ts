import type { RenderManifest } from "@/lib/render/pipeline";

/**
 * Phase 6 — In-memory render manifest store (MVP).
 *
 * Stores the render manifest for each submission after the coach finalizes
 * their review. A future render worker would consume these to produce the
 * final lesson video. Resets on deploy — acceptable for MVP.
 */
export const RENDER_MANIFESTS: Array<RenderManifest & { submissionId: string }> =
  [];

/** Look up a render manifest by submission id. */
export function getManifestForSubmission(
  submissionId: string,
): (RenderManifest & { submissionId: string }) | undefined {
  return RENDER_MANIFESTS.find((m) => m.submissionId === submissionId);
}
