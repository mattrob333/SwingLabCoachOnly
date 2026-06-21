import type { LessonDraft } from "@/lib/ai/lesson-draft";

/**
 * Phase 6 — In-memory lesson draft store (MVP).
 *
 * Stores the AI-generated lesson draft for each submission. The coach reviews,
 * edits, and approves/rejects the draft. Resets on deploy — acceptable for MVP.
 */
export const LESSON_DRAFTS: Array<LessonDraft & { submissionId: string }> = [];

/** Get the lesson draft for a submission, if one exists. */
export function getDraftForSubmission(
  submissionId: string,
): (LessonDraft & { submissionId: string }) | undefined {
  return LESSON_DRAFTS.find((d) => d.submissionId === submissionId);
}

/** Save (upsert) a lesson draft for a submission. */
export function saveDraft(draft: LessonDraft): LessonDraft {
  const existing = getDraftForSubmission(draft.submissionId);
  if (existing) {
    Object.assign(existing, draft);
    return existing;
  }
  LESSON_DRAFTS.push(draft);
  return draft;
}
