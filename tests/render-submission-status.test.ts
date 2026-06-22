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

  it("transitions in_review → rendering", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const updated = await markSubmissionRendering(sub.id);
    expect(updated.status).toBe("rendering");
    expect((await getSubmissionById(sub.id))?.status).toBe("rendering");
  });

  it("transitions rendering → completed", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await markSubmissionRendering(sub.id);
    const updated = await markSubmissionCompleted(sub.id);
    expect(updated.status).toBe("completed");
    expect((await getSubmissionById(sub.id))?.status).toBe("completed");
  });

  it("throws when transitioning to rendering from a non-in_review state", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    // still "paid"
    await expect(markSubmissionRendering(sub.id)).rejects.toThrow(/not in review/i);
  });

  it("throws when transitioning to completed from a non-rendering state", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    // still "in_review"
    await expect(markSubmissionCompleted(sub.id)).rejects.toThrow(/not rendering/i);
  });

  it("throws when marking a nonexistent submission as rendering", async () => {
    await expect(markSubmissionRendering("nope")).rejects.toThrow(/not found/i);
  });

  it("throws when marking a nonexistent submission as completed", async () => {
    await expect(markSubmissionCompleted("nope")).rejects.toThrow(/not found/i);
  });

  it("allows in_review → rendering even if already rendering is rejected", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await markSubmissionRendering(sub.id);
    // Cannot go rendering → rendering
    await expect(markSubmissionRendering(sub.id)).rejects.toThrow(/not in review/i);
  });
});
