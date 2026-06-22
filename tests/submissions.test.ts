import { describe, it, expect, beforeEach } from "vitest";
import {
  createSubmission,
  getSubmissionById,
  getSubmissionsForCoach,
  getFollowUpsForSubmission,
  validateSubmissionInput,
  markSubmissionPaid,
  markSubmissionInReview,
  type SubmissionInput,
  SUBMISSIONS,
} from "@/lib/submissions";

describe("validateSubmissionInput", () => {
  function validInput(): SubmissionInput {
    return {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "Looking for help with load timing.",
    };
  }

  it("accepts a valid input", () => {
    expect(validateSubmissionInput(validInput())).toEqual([]);
  });

  it("rejects an empty coach slug", () => {
    expect(
      validateSubmissionInput({ ...validInput(), coachSlug: "" }),
    ).toContain("Coach is required");
  });

  it("rejects an invalid email", () => {
    expect(
      validateSubmissionInput({ ...validInput(), parentEmail: "not-an-email" }),
    ).toContain("Valid email is required");
  });

  it("rejects an empty email", () => {
    expect(
      validateSubmissionInput({ ...validInput(), parentEmail: "" }),
    ).toContain("Valid email is required");
  });

  it("rejects a player age below 5", () => {
    expect(
      validateSubmissionInput({ ...validInput(), playerAge: 3 }),
    ).toContain("Player age must be between 5 and 18");
  });

  it("rejects a player age above 18", () => {
    expect(
      validateSubmissionInput({ ...validInput(), playerAge: 25 }),
    ).toContain("Player age must be between 5 and 18");
  });
});

describe("createSubmission", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("creates a submission with a unique id and pending status", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "Help with load.",
    };
    const sub = await createSubmission(input);

    expect(sub.id).toBeTruthy();
    expect(sub.id).toHaveLength(36); // UUID format
    expect(sub.coachSlug).toBe("marcus-reed");
    expect(sub.status).toBe("pending_payment");
    expect(sub.createdAt).toBeInstanceOf(Date);
    expect(await getSubmissionById(sub.id)).toBe(sub);
  });

  it("creates unique ids for multiple submissions", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 10,
      swingType: "softball",
      notes: "",
    };
    const a = await createSubmission(input);
    const b = await createSubmission(input);
    expect(a.id).not.toBe(b.id);
  });

  it("throws on invalid input", async () => {
    await expect(
      createSubmission({
        coachSlug: "",
        parentEmail: "",
        playerAge: 0,
        swingType: "",
        notes: "",
      }),
    ).rejects.toThrow();
  });
});

describe("getSubmissionsForCoach", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("returns only submissions for the given coach slug", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "a@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "",
    };
    const input2: SubmissionInput = {
      ...input,
      coachSlug: "priya-anand",
      parentEmail: "b@example.com",
    };
    await createSubmission(input);
    await createSubmission(input2);

    const marcusSubs = await getSubmissionsForCoach("marcus-reed");
    expect(marcusSubs).toHaveLength(1);
    expect(marcusSubs[0].coachSlug).toBe("marcus-reed");

    const priyaSubs = await getSubmissionsForCoach("priya-anand");
    expect(priyaSubs).toHaveLength(1);
    expect(priyaSubs[0].coachSlug).toBe("priya-anand");
  });

  it("returns an empty array when no submissions exist for a coach", async () => {
    expect(await getSubmissionsForCoach("marcus-reed")).toEqual([]);
  });
});

describe("markSubmissionPaid", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("transitions a pending_payment submission to paid", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "",
    };
    const sub = await createSubmission(input);
    expect(sub.status).toBe("pending_payment");

    const updated = await markSubmissionPaid(sub.id);
    expect(updated.status).toBe("paid");
    expect((await getSubmissionById(sub.id))?.status).toBe("paid");
  });

  it("throws when the submission does not exist", async () => {
    await expect(markSubmissionPaid("nonexistent-id")).rejects.toThrow(
      "Submission not found",
    );
  });

  it("throws when the submission is already paid", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "",
    };
    const sub = await createSubmission(input);
    await markSubmissionPaid(sub.id);

    await expect(markSubmissionPaid(sub.id)).rejects.toThrow("not pending payment");
  });
});

describe("markSubmissionInReview", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("transitions a paid submission to in_review", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "",
    };
    const sub = await createSubmission(input);
    await markSubmissionPaid(sub.id);

    const updated = await markSubmissionInReview(sub.id);
    expect(updated.status).toBe("in_review");
    expect((await getSubmissionById(sub.id))?.status).toBe("in_review");
  });

  it("throws when the submission does not exist", async () => {
    await expect(markSubmissionInReview("nonexistent-id")).rejects.toThrow(
      "Submission not found",
    );
  });

  it("throws when the submission is still pending_payment", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "",
    };
    const sub = await createSubmission(input);
    // Not paid yet
    await expect(markSubmissionInReview(sub.id)).rejects.toThrow(
      "not paid",
    );
  });

  it("throws when the submission is already in_review", async () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "",
    };
    const sub = await createSubmission(input);
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);

    await expect(markSubmissionInReview(sub.id)).rejects.toThrow(
      "already in review",
    );
  });
});

describe("follow-up submissions (build order #17)", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  function validInput(): SubmissionInput {
    return {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "",
    };
  }

  it("createSubmission persists followUpFor when provided", async () => {
    const original = await createSubmission(validInput());
    const followUp = await createSubmission({
      ...validInput(),
      followUpFor: original.id,
    });

    expect(followUp.followUpFor).toBe(original.id);
    expect(followUp.status).toBe("pending_payment");
  });

  it("createSubmission omits followUpFor when not provided", async () => {
    const sub = await createSubmission(validInput());
    expect(sub.followUpFor).toBeUndefined();
  });

  it("getFollowUpsForSubmission returns linked submissions newest-first", async () => {
    const original = await createSubmission(validInput());

    const first = await createSubmission({
      ...validInput(),
      followUpFor: original.id,
    });
    const second = await createSubmission({
      ...validInput(),
      followUpFor: original.id,
    });
    // An unrelated submission should not appear.
    await createSubmission(validInput());

    const followUps = await getFollowUpsForSubmission(original.id);
    expect(followUps).toHaveLength(2);
    expect(followUps[0].id).toBe(second.id);
    expect(followUps[1].id).toBe(first.id);
  });

  it("getFollowUpsForSubmission returns empty array when none exist", async () => {
    expect(await getFollowUpsForSubmission("nonexistent-id")).toEqual([]);
  });
});
