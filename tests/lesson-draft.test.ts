import { describe, it, expect } from "vitest";
import {
  generateLessonDraft,
  type LessonDraftInput,
} from "@/lib/ai/lesson-draft";
import type { RenderManifest } from "@/lib/render/pipeline";

function makeManifest(
  overrides: Partial<RenderManifest> = {},
): RenderManifest {
  return {
    videoUrl: "https://example.com/swing.mp4",
    audioLayers: [
      { type: "audio", startTime: 5, duration: 10, source: "blob:abc" },
    ],
    annotationLayers: [
      {
        type: "annotation",
        timecode: 7,
        color: "#ff0000",
        pointCount: 2,
        points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      },
      {
        type: "annotation",
        timecode: 15,
        color: "#00ff00",
        pointCount: 3,
        points: [{ x: 20, y: 20 }, { x: 40, y: 40 }, { x: 60, y: 60 }],
      },
    ],
    events: [
      { id: "e1", type: "play", timecode: 0, payload: null, wallClock: 1700000000000 },
      { id: "e2", type: "pause", timecode: 20, payload: null, wallClock: 1700000001000 },
    ],
    createdAt: 1700000000000,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<LessonDraftInput> = {},
): LessonDraftInput {
  return {
    submissionId: "sub-123",
    swingType: "baseball",
    manifest: makeManifest(),
    ...overrides,
  };
}

describe("generateLessonDraft", () => {
  it("generates a draft with a title, summary, key points, drills, and coach notes", () => {
    const draft = generateLessonDraft(makeInput());

    expect(draft.submissionId).toBe("sub-123");
    expect(draft.title).toBeTruthy();
    expect(draft.summary).toBeTruthy();
    expect(draft.keyPoints.length).toBeGreaterThan(0);
    expect(draft.drills.length).toBeGreaterThan(0);
    expect(draft.coachNotes).toBe("");
    expect(draft.status).toBe("draft");
    expect(draft.generatedAt).toBeGreaterThan(0);
  });

  it("derives key points from annotation strokes", () => {
    const draft = generateLessonDraft(makeInput());

    // 2 annotation layers → 2 key points
    expect(draft.keyPoints).toHaveLength(2);
    expect(draft.keyPoints[0].timecode).toBe(7);
    expect(draft.keyPoints[1].timecode).toBe(15);
  });

  it("handles a manifest with no annotations (empty key points)", () => {
    const manifest = makeManifest({ annotationLayers: [] });
    const draft = generateLessonDraft(makeInput({ manifest }));

    expect(draft.keyPoints).toEqual([]);
  });

  it("includes drills appropriate to the swing type", () => {
    const draft = generateLessonDraft(makeInput({ swingType: "baseball" }));

    expect(draft.drills.length).toBeGreaterThan(0);
    expect(draft.drills.every((d) => d.name.length > 0)).toBe(true);
  });

  it("falls back to generic drills for unknown swing types", () => {
    const draft = generateLessonDraft(makeInput({ swingType: "golf" }));

    expect(draft.drills.length).toBeGreaterThan(0);
  });

  it("generates a title that includes the swing type", () => {
    const draft = generateLessonDraft(makeInput({ swingType: "baseball" }));

    expect(draft.title.toLowerCase()).toContain("baseball");
  });

  it("includes a summary that references the number of annotations and voiceover segments", () => {
    const draft = generateLessonDraft(makeInput());

    expect(draft.summary).toContain("2");
    expect(draft.summary.toLowerCase()).toMatch(/annotation|mark/);
  });

  it("has a unique id", () => {
    const draft1 = generateLessonDraft(makeInput());
    const draft2 = generateLessonDraft(makeInput());

    expect(draft1.id).toBeTruthy();
    expect(draft2.id).toBeTruthy();
    expect(draft1.id).not.toBe(draft2.id);
  });

  it("each key point has a timecode, label, and description", () => {
    const draft = generateLessonDraft(makeInput());

    for (const kp of draft.keyPoints) {
      expect(kp.timecode).toBeGreaterThanOrEqual(0);
      expect(kp.label.length).toBeGreaterThan(0);
      expect(kp.description.length).toBeGreaterThan(0);
    }
  });

  it("each drill has a name, description, and category", () => {
    const draft = generateLessonDraft(makeInput());

    for (const drill of draft.drills) {
      expect(drill.name.length).toBeGreaterThan(0);
      expect(drill.description.length).toBeGreaterThan(0);
      expect(drill.category.length).toBeGreaterThan(0);
    }
  });
});
