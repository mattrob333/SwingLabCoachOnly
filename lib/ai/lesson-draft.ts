import { randomUUID } from "node:crypto";
import type { RenderManifest } from "@/lib/render/pipeline";
import { getDrillsForSwingType, type Drill } from "@/lib/drills";

/**
 * Phase 6 (build order #13) — AI lesson draft generator.
 *
 * Takes the coach's review session (render manifest + submission context) and
 * produces a structured LessonDraft. The draft is a starting point that the
 * coach reviews, edits, and approves before the lesson is delivered to the
 * parent.
 *
 * Guardrail: AI assists coach only. The draft is always status "draft" until
 * the coach explicitly approves it.
 *
 * MVP: rule-based/template generation — no external AI API call. The structure
 * IS the deliverable. A future version would call an LLM to enrich the text.
 */

export type LessonDraftStatus = "draft" | "approved" | "rejected";

export type KeyPoint = {
  /** Video timestamp (seconds) where this point was annotated. */
  timecode: number;
  /** Short label (e.g. "Annotation at 0:07"). */
  label: string;
  /** Description of what the coach marked. */
  description: string;
};

export type LessonDraft = {
  id: string;
  submissionId: string;
  title: string;
  summary: string;
  keyPoints: KeyPoint[];
  drills: Drill[];
  coachNotes: string;
  generatedAt: number;
  status: LessonDraftStatus;
};

export type LessonDraftInput = {
  submissionId: string;
  swingType: string;
  manifest: RenderManifest;
};

/** Format seconds as M:SS. */
function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Capitalize the first letter of a string. */
function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generate a lesson draft from a render manifest and submission context.
 * Pure function — no side effects.
 */
export function generateLessonDraft(input: LessonDraftInput): LessonDraft {
  const { submissionId, swingType, manifest } = input;

  const swingLabel = capitalize(swingType || "swing");
  const title = `${swingLabel} Swing Review — Lesson Draft`;

  const annotationCount = manifest.annotationLayers.length;
  const segmentCount = manifest.audioLayers.length;

  const summaryParts: string[] = [];
  summaryParts.push(
    `This lesson covers your ${swingType || "swing"} review with ${annotationCount} annotation${annotationCount === 1 ? "" : "s"} and ${segmentCount} voiceover segment${segmentCount === 1 ? "" : "s"}.`,
  );
  if (annotationCount > 0) {
    summaryParts.push(
      `The coach marked ${annotationCount} key moment${annotationCount === 1 ? "" : "s"} in your swing for review.`,
    );
  }
  const summary = summaryParts.join(" ");

  const keyPoints: KeyPoint[] = manifest.annotationLayers.map((layer, i) => ({
    timecode: layer.timecode,
    label: `Key Moment ${i + 1} — ${formatTimecode(layer.timecode)}`,
    description: `Coach annotation at ${formatTimecode(layer.timecode)}. Review this section of the video for detailed feedback.`,
  }));

  const drills = getDrillsForSwingType(swingType);

  return {
    id: randomUUID(),
    submissionId,
    title,
    summary,
    keyPoints,
    drills,
    coachNotes: "",
    generatedAt: Date.now(),
    status: "draft",
  };
}
