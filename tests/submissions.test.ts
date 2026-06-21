import { describe, it, expect, beforeEach } from "vitest";
import {
  createSubmission,
  getSubmissionById,
  getSubmissionsForCoach,
  validateSubmissionInput,
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

  it("creates a submission with a unique id and pending status", () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "Help with load.",
    };
    const sub = createSubmission(input);

    expect(sub.id).toBeTruthy();
    expect(sub.id).toHaveLength(36); // UUID format
    expect(sub.coachSlug).toBe("marcus-reed");
    expect(sub.status).toBe("pending_payment");
    expect(sub.createdAt).toBeInstanceOf(Date);
    expect(getSubmissionById(sub.id)).toBe(sub);
  });

  it("creates unique ids for multiple submissions", () => {
    const input: SubmissionInput = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 10,
      swingType: "softball",
      notes: "",
    };
    const a = createSubmission(input);
    const b = createSubmission(input);
    expect(a.id).not.toBe(b.id);
  });

  it("throws on invalid input", () => {
    expect(() =>
      createSubmission({
        coachSlug: "",
        parentEmail: "",
        playerAge: 0,
        swingType: "",
        notes: "",
      }),
    ).toThrow();
  });
});

describe("getSubmissionsForCoach", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
  });

  it("returns only submissions for the given coach slug", () => {
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
    createSubmission(input);
    createSubmission(input2);

    const marcusSubs = getSubmissionsForCoach("marcus-reed");
    expect(marcusSubs).toHaveLength(1);
    expect(marcusSubs[0].coachSlug).toBe("marcus-reed");

    const priyaSubs = getSubmissionsForCoach("priya-anand");
    expect(priyaSubs).toHaveLength(1);
    expect(priyaSubs[0].coachSlug).toBe("priya-anand");
  });

  it("returns an empty array when no submissions exist for a coach", () => {
    expect(getSubmissionsForCoach("marcus-reed")).toEqual([]);
  });
});
