import { describe, it, expect, beforeEach } from "vitest";
import {
  createSubmission,
  markSubmissionPaid,
  markSubmissionInReview,
  markSubmissionRendering,
  markSubmissionCompleted,
  getSubmissionById,
  SUBMISSIONS,
  type SubmissionInput,
} from "@/lib/submissions";

function validInput(): SubmissionInput {
  return {
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
    playerAge: 12,
    swingType: "baseball",
    notes: "Help with load.",
  };
}

describe("submission status transitions: rendering + completed", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("transitions in_review → rendering", () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);
    const updated = markSubmissionRendering(sub.id);
    expect(updated.status).toBe("rendering");
    expect(getSubmissionById(sub.id)?.status).toBe("rendering");
  });

  it("transitions rendering → completed", () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);
    markSubmissionRendering(sub.id);
    const updated = markSubmissionCompleted(sub.id);
    expect(updated.status).toBe("completed");
    expect(getSubmissionById(sub.id)?.status).toBe("completed");
  });

  it("throws when transitioning to rendering from a non-in_review state", () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    // still "paid"
    expect(() => markSubmissionRendering(sub.id)).toThrow(/not in review/i);
  });

  it("throws when transitioning to completed from a non-rendering state", () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);
    // still "in_review"
    expect(() => markSubmissionCompleted(sub.id)).toThrow(/not rendering/i);
  });

  it("throws when marking a nonexistent submission as rendering", () => {
    expect(() => markSubmissionRendering("nope")).toThrow(/not found/i);
  });

  it("throws when marking a nonexistent submission as completed", () => {
    expect(() => markSubmissionCompleted("nope")).toThrow(/not found/i);
  });

  it("allows in_review → rendering even if already rendering is rejected", () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);
    markSubmissionRendering(sub.id);
    // Cannot go rendering → rendering
    expect(() => markSubmissionRendering(sub.id)).toThrow(/not in review/i);
  });
});
