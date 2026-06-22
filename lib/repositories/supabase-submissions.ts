/**
 * Supabase submission repository (Wave 1 Slice D).
 *
 * Real PostgREST queries against the `submissions` table. Maps between the
 * TypeScript `Submission` domain type (camelCase) and the Postgres row shape
 * (snake_case). IDs are TEXT (client-generated UUIDs). Status is a Postgres
 * enum (`submission_status`) that maps 1:1 to the TS `SubmissionStatus` union.
 *
 * The factory only returns this impl when `isLive("database")` is true.
 */

import { randomUUID } from "node:crypto";
import { asObject, asArray, postgrestRequest } from "./supabase-client";
import {
  validateSubmissionInput,
  type Submission,
  type SubmissionInput,
  type SubmissionRepository,
  type SubmissionStatus,
} from "./types";

/** Postgres row shape for the `submissions` table (snake_case). */
type SubmissionRow = {
  id: string;
  coach_slug: string;
  parent_email: string;
  player_age: number;
  swing_type: string;
  notes: string;
  video_url: string | null;
  video_file_name: string | null;
  status: SubmissionStatus;
  follow_up_for: string | null;
  created_at: string;
  updated_at: string;
};

/** Map a Postgres row to the TS domain type. */
function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    coachSlug: row.coach_slug,
    parentEmail: row.parent_email,
    playerAge: row.player_age,
    swingType: row.swing_type,
    notes: row.notes,
    ...(row.video_url ? { videoUrl: row.video_url } : {}),
    ...(row.video_file_name ? { videoFileName: row.video_file_name } : {}),
    status: row.status,
    createdAt: new Date(row.created_at),
    ...(row.follow_up_for ? { followUpFor: row.follow_up_for } : {}),
  };
}

/** Map a SubmissionInput to a Postgres insert row (without the id). */
function inputToRow(input: SubmissionInput): Record<string, unknown> {
  return {
    id: randomUUID(),
    coach_slug: input.coachSlug,
    parent_email: input.parentEmail,
    player_age: input.playerAge,
    swing_type: input.swingType,
    notes: input.notes,
    status: "pending_payment",
    ...(input.videoUrl ? { video_url: input.videoUrl } : {}),
    ...(input.videoFileName ? { video_file_name: input.videoFileName } : {}),
    ...(input.followUpFor ? { follow_up_for: input.followUpFor } : {}),
  };
}

export class SupabaseSubmissionRepository implements SubmissionRepository {
  readonly mode = "live" as const;

  async create(input: SubmissionInput): Promise<Submission> {
    const errors = validateSubmissionInput(input);
    if (errors.length > 0) {
      throw new Error(`Invalid submission: ${errors.join("; ")}`);
    }
    const row = inputToRow(input);
    const result = await postgrestRequest("submissions", {
      method: "POST",
      body: row,
      single: true,
    });
    const created = asObject<SubmissionRow>(result);
    if (!created) {
      throw new Error("[supabase-submissions] create returned no row");
    }
    return rowToSubmission(created);
  }

  async getById(id: string): Promise<Submission | undefined> {
    const result = await postgrestRequest("submissions", {
      method: "GET",
      query: { id: `eq.${id}` },
      single: true,
    });
    const row = asObject<SubmissionRow>(result);
    return row ? rowToSubmission(row) : undefined;
  }

  async getFollowUpsFor(originalId: string): Promise<Submission[]> {
    const result = await postgrestRequest("submissions", {
      method: "GET",
      query: {
        follow_up_for: `eq.${originalId}`,
        order: "created_at.desc",
      },
    });
    return asArray<SubmissionRow>(result).map(rowToSubmission);
  }

  async getForCoach(coachSlug: string): Promise<Submission[]> {
    const result = await postgrestRequest("submissions", {
      method: "GET",
      query: {
        coach_slug: `eq.${coachSlug}`,
        order: "created_at.desc",
      },
    });
    return asArray<SubmissionRow>(result).map(rowToSubmission);
  }

  /** Fetch a submission by ID and verify its current status before transitioning. */
  private async fetchAndCheck(
    id: string,
    expectedStatus: SubmissionStatus,
  ): Promise<SubmissionRow> {
    const result = await postgrestRequest("submissions", {
      method: "GET",
      query: { id: `eq.${id}` },
      single: true,
    });
    const row = asObject<SubmissionRow>(result);
    if (!row) {
      throw new Error(`Submission not found: ${id}`);
    }
    if (row.status !== expectedStatus) {
      throw new Error(
        `Submission ${id} is not ${expectedStatus} (current: ${row.status})`,
      );
    }
    return row;
  }

  async markPaid(id: string): Promise<Submission> {
    await this.fetchAndCheck(id, "pending_payment");
    const result = await postgrestRequest("submissions", {
      method: "PATCH",
      query: { id: `eq.${id}` },
      body: { status: "paid" },
      single: true,
    });
    const row = asObject<SubmissionRow>(result);
    if (!row) throw new Error(`Submission not found: ${id}`);
    return rowToSubmission(row);
  }

  async markInReview(id: string): Promise<Submission> {
    const result = await postgrestRequest("submissions", {
      method: "GET",
      query: { id: `eq.${id}` },
      single: true,
    });
    const row = asObject<SubmissionRow>(result);
    if (!row) throw new Error(`Submission not found: ${id}`);
    if (row.status === "in_review") {
      throw new Error(`Submission ${id} is already in review`);
    }
    if (row.status !== "paid") {
      throw new Error(
        `Submission ${id} is not paid (current: ${row.status})`,
      );
    }
    const patched = await postgrestRequest("submissions", {
      method: "PATCH",
      query: { id: `eq.${id}` },
      body: { status: "in_review" },
      single: true,
    });
    const updated = asObject<SubmissionRow>(patched);
    if (!updated) throw new Error(`Submission not found: ${id}`);
    return rowToSubmission(updated);
  }

  async markRendering(id: string): Promise<Submission> {
    await this.fetchAndCheck(id, "in_review");
    const result = await postgrestRequest("submissions", {
      method: "PATCH",
      query: { id: `eq.${id}` },
      body: { status: "rendering" },
      single: true,
    });
    const row = asObject<SubmissionRow>(result);
    if (!row) throw new Error(`Submission not found: ${id}`);
    return rowToSubmission(row);
  }

  async markCompleted(id: string): Promise<Submission> {
    await this.fetchAndCheck(id, "rendering");
    const result = await postgrestRequest("submissions", {
      method: "PATCH",
      query: { id: `eq.${id}` },
      body: { status: "completed" },
      single: true,
    });
    const row = asObject<SubmissionRow>(result);
    if (!row) throw new Error(`Submission not found: ${id}`);
    return rowToSubmission(row);
  }
}
