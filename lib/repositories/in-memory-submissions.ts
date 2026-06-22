/**
 * In-memory submission repository (Wave 1 Task 5).
 *
 * Wraps the existing in-memory array + file-store persistence logic that
 * previously lived in lib/submissions.ts. The array is exported so tests
 * can reset it (SUBMISSIONS.length = 0) — the same reference the facade
 * in lib/submissions.ts re-exports, so mutations are visible to the
 * singleton instance returned by the factory.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  validateSubmissionInput,
  type Submission,
  type SubmissionInput,
  type SubmissionRepository,
} from "./types";

/** In-memory store. Resets on deploy — fine for MVP. Exported for test reset. */
export const SUBMISSIONS: Submission[] = [];

const STORE_PATH = join(process.cwd(), ".swinglab-data", "submissions.json");
const USE_FILE_STORE = process.env.NODE_ENV !== "test";

type StoredSubmission = Omit<Submission, "createdAt"> & {
  createdAt: string;
};

function serialize(s: Submission): StoredSubmission {
  return { ...s, createdAt: s.createdAt.toISOString() };
}

function deserialize(s: StoredSubmission): Submission {
  return { ...s, createdAt: new Date(s.createdAt) };
}

function load(): void {
  if (!USE_FILE_STORE || !existsSync(STORE_PATH)) return;
  try {
    const stored = JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoredSubmission[];
    SUBMISSIONS.splice(0, SUBMISSIONS.length, ...stored.map(deserialize));
  } catch {
    SUBMISSIONS.length = 0;
  }
}

function save(): void {
  if (!USE_FILE_STORE) return;
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(
    STORE_PATH,
    JSON.stringify(SUBMISSIONS.map(serialize), null, 2),
    "utf8",
  );
}

export class InMemorySubmissionRepository implements SubmissionRepository {
  readonly mode = "mock" as const;

  create(input: SubmissionInput): Submission {
    load();
    const errors = validateSubmissionInput(input);
    if (errors.length > 0) {
      throw new Error(`Invalid submission: ${errors.join("; ")}`);
    }
    const submission: Submission = {
      id: randomUUID(),
      coachSlug: input.coachSlug,
      parentEmail: input.parentEmail,
      playerAge: input.playerAge,
      swingType: input.swingType,
      notes: input.notes,
      ...(input.videoUrl ? { videoUrl: input.videoUrl } : {}),
      ...(input.videoFileName ? { videoFileName: input.videoFileName } : {}),
      status: "pending_payment",
      createdAt: new Date(),
      ...(input.followUpFor ? { followUpFor: input.followUpFor } : {}),
    };
    SUBMISSIONS.push(submission);
    save();
    return submission;
  }

  getById(id: string): Submission | undefined {
    load();
    return SUBMISSIONS.find((s) => s.id === id);
  }

  getFollowUpsFor(originalId: string): Submission[] {
    load();
    return SUBMISSIONS.map((s, index) => ({ s, index }))
      .filter(({ s }) => s.followUpFor === originalId)
      .sort((a, b) => {
        const dt = b.s.createdAt.getTime() - a.s.createdAt.getTime();
        if (dt !== 0) return dt;
        return b.index - a.index; // later insertion = newer
      })
      .map(({ s }) => s);
  }

  getForCoach(coachSlug: string): Submission[] {
    load();
    return SUBMISSIONS.filter((s) => s.coachSlug === coachSlug).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  markPaid(id: string): Submission {
    const submission = this.getById(id);
    if (!submission) {
      throw new Error(`Submission not found: ${id}`);
    }
    if (submission.status !== "pending_payment") {
      throw new Error(
        `Submission ${id} is not pending payment (current: ${submission.status})`,
      );
    }
    submission.status = "paid";
    save();
    return submission;
  }

  markInReview(id: string): Submission {
    const submission = this.getById(id);
    if (!submission) {
      throw new Error(`Submission not found: ${id}`);
    }
    if (submission.status === "in_review") {
      throw new Error(`Submission ${id} is already in review`);
    }
    if (submission.status !== "paid") {
      throw new Error(
        `Submission ${id} is not paid (current: ${submission.status})`,
      );
    }
    submission.status = "in_review";
    save();
    return submission;
  }

  markRendering(id: string): Submission {
    const submission = this.getById(id);
    if (!submission) {
      throw new Error(`Submission not found: ${id}`);
    }
    if (submission.status !== "in_review") {
      throw new Error(
        `Submission ${id} is not in review (current: ${submission.status})`,
      );
    }
    submission.status = "rendering";
    save();
    return submission;
  }

  markCompleted(id: string): Submission {
    const submission = this.getById(id);
    if (!submission) {
      throw new Error(`Submission not found: ${id}`);
    }
    if (submission.status !== "rendering") {
      throw new Error(
        `Submission ${id} is not rendering (current: ${submission.status})`,
      );
    }
    submission.status = "completed";
    save();
    return submission;
  }
}
