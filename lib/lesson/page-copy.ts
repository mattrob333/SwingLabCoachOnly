export type LessonPageCopyInput = {
  coachName?: string;
  hasAiSummary: boolean;
};

export type LessonPageCopy = {
  headerTitle: string;
  headerSubtitle: string;
  ctaText: string;
  showSummarySection: boolean;
};

/**
 * Build display copy for the parent-facing lesson page.
 * Personalizes with the coach's name when available.
 */
export function buildLessonPageCopy(
  input: LessonPageCopyInput,
): LessonPageCopy {
  const coachName = input.coachName?.trim();

  const headerTitle = coachName
    ? `Your Lesson from Coach ${coachName}`
    : "Your SwingLab Lesson";

  const headerSubtitle =
    "Play the swing. When the video reaches a coach note, it pauses on the marked frame, shows the annotations, plays the voiceover, then continues.";

  const ctaText = coachName
    ? `Work on the feedback from Coach ${coachName}, then submit a new swing so they can review your progress.`
    : "Work on the feedback, then submit a new swing so your coach can review your progress.";

  return {
    headerTitle,
    headerSubtitle,
    ctaText,
    showSummarySection: input.hasAiSummary,
  };
}
