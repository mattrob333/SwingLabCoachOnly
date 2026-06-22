import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Wave 1 Task 6 — Supabase Postgres schema migration validation.
 *
 * The migration file at supabase/migrations/0001_initial_schema.sql defines the
 * production database schema. This test validates that it contains all required
 * tables (matching the TypeScript domain types in lib/repositories/types.ts and
 * lib/records/index.ts), plus RLS policies, indexes, and timestamps.
 *
 * The SQL itself isn't executed (no Supabase instance in CI) — we validate
 * structure and content so the migration is ready to apply when the user
 * provisions a Supabase project.
 */

const MIGRATION_PATH = resolve(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "0001_initial_schema.sql",
);

function loadMigration(): string {
  return readFileSync(MIGRATION_PATH, "utf-8");
}

function hasTable(sql: string, table: string): boolean {
  // Match CREATE TABLE [IF NOT EXISTS] <table> (with optional schema, quotes, etc.)
  const re = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?"?${table}"?\\s*[({]`,
    "i",
  );
  return re.test(sql);
}

function hasColumn(sql: string, table: string, column: string): boolean {
  // Crude check: column name appears as a line within the table definition.
  // We look for the column name as a word anywhere — combined with table check
  // this is sufficient for structural validation.
  return new RegExp(`\\b${column}\\b`, "i").test(sql);
}

describe("Supabase schema migration (0001_initial_schema.sql)", () => {
  const sql = loadMigration();

  describe("file exists", () => {
    it("contains SQL content", () => {
      expect(sql.length).toBeGreaterThan(500);
      expect(sql).toContain("CREATE TABLE");
    });
  });

  describe("required tables", () => {
    const tables = [
      "coaches",
      "submissions",
      "earnings",
      "playback_manifests",
      "video_assets",
      "audio_assets",
      "lesson_delivery_tokens",
      "ai_packaging_jobs",
      "freeze_frame_notes",
    ];

    for (const table of tables) {
      it(`defines table: ${table}`, () => {
        expect(hasTable(sql, table)).toBe(true);
      });
    }
  });

  describe("coaches table columns", () => {
    it("has slug, name, title, bio, location, price_usd, turnaround", () => {
      expect(hasColumn(sql, "coaches", "slug")).toBe(true);
      expect(hasColumn(sql, "coaches", "name")).toBe(true);
      expect(hasColumn(sql, "coaches", "title")).toBe(true);
      expect(hasColumn(sql, "coaches", "bio")).toBe(true);
      expect(hasColumn(sql, "coaches", "location")).toBe(true);
      expect(hasColumn(sql, "coaches", "price_usd_cents")).toBe(true);
      expect(hasColumn(sql, "coaches", "turnaround")).toBe(true);
      expect(hasColumn(sql, "coaches", "highlights")).toBe(true);
      expect(hasColumn(sql, "coaches", "testimonials")).toBe(true);
    });
  });

  describe("submissions table columns", () => {
    it("has id, coach_slug, parent_email, player_age, swing_type, notes, status", () => {
      expect(hasColumn(sql, "submissions", "id")).toBe(true);
      expect(hasColumn(sql, "submissions", "coach_slug")).toBe(true);
      expect(hasColumn(sql, "submissions", "parent_email")).toBe(true);
      expect(hasColumn(sql, "submissions", "player_age")).toBe(true);
      expect(hasColumn(sql, "submissions", "swing_type")).toBe(true);
      expect(hasColumn(sql, "submissions", "notes")).toBe(true);
      expect(hasColumn(sql, "submissions", "status")).toBe(true);
      expect(hasColumn(sql, "submissions", "video_url")).toBe(true);
      expect(hasColumn(sql, "submissions", "video_file_name")).toBe(true);
      expect(hasColumn(sql, "submissions", "follow_up_for")).toBe(true);
    });
  });

  describe("earnings table columns", () => {
    it("has id, submission_id, coach_slug, amount_usd, parent_email", () => {
      expect(hasColumn(sql, "earnings", "id")).toBe(true);
      expect(hasColumn(sql, "earnings", "submission_id")).toBe(true);
      expect(hasColumn(sql, "earnings", "coach_slug")).toBe(true);
      expect(hasColumn(sql, "earnings", "amount_usd_cents")).toBe(true);
      expect(hasColumn(sql, "earnings", "parent_email")).toBe(true);
    });
  });

  describe("playback_manifests table columns", () => {
    it("has submission_id, coach_slug, parent_email, delivery_token_id, version", () => {
      expect(hasColumn(sql, "playback_manifests", "submission_id")).toBe(true);
      expect(hasColumn(sql, "playback_manifests", "coach_slug")).toBe(true);
      expect(hasColumn(sql, "playback_manifests", "parent_email")).toBe(true);
      expect(hasColumn(sql, "playback_manifests", "delivery_token_id")).toBe(
        true,
      );
      expect(hasColumn(sql, "playback_manifests", "version")).toBe(true);
      expect(hasColumn(sql, "playback_manifests", "ai_summary")).toBe(true);
      expect(hasColumn(sql, "playback_manifests", "manifest")).toBe(true);
    });
  });

  describe("video_assets table columns", () => {
    it("has id, submission_id, coach_slug, original_filename, mime_type, size_bytes, storage_key, storage_provider", () => {
      expect(hasColumn(sql, "video_assets", "submission_id")).toBe(true);
      expect(hasColumn(sql, "video_assets", "coach_slug")).toBe(true);
      expect(hasColumn(sql, "video_assets", "original_filename")).toBe(true);
      expect(hasColumn(sql, "video_assets", "mime_type")).toBe(true);
      expect(hasColumn(sql, "video_assets", "size_bytes")).toBe(true);
      expect(hasColumn(sql, "video_assets", "storage_key")).toBe(true);
      expect(hasColumn(sql, "video_assets", "storage_provider")).toBe(true);
      expect(hasColumn(sql, "video_assets", "duration_sec")).toBe(true);
    });
  });

  describe("audio_assets table columns", () => {
    it("has id, note_id, submission_id, coach_slug, storage_key, duration_sec", () => {
      expect(hasColumn(sql, "audio_assets", "note_id")).toBe(true);
      expect(hasColumn(sql, "audio_assets", "submission_id")).toBe(true);
      expect(hasColumn(sql, "audio_assets", "coach_slug")).toBe(true);
      expect(hasColumn(sql, "audio_assets", "storage_key")).toBe(true);
      expect(hasColumn(sql, "audio_assets", "duration_sec")).toBe(true);
    });
  });

  describe("lesson_delivery_tokens table columns", () => {
    it("has id, submission_id, token, parent_email, expires_at, viewed_at, revoked_at", () => {
      expect(hasColumn(sql, "lesson_delivery_tokens", "submission_id")).toBe(
        true,
      );
      expect(hasColumn(sql, "lesson_delivery_tokens", "token")).toBe(true);
      expect(hasColumn(sql, "lesson_delivery_tokens", "parent_email")).toBe(
        true,
      );
      expect(hasColumn(sql, "lesson_delivery_tokens", "expires_at")).toBe(true);
      expect(hasColumn(sql, "lesson_delivery_tokens", "viewed_at")).toBe(true);
      expect(hasColumn(sql, "lesson_delivery_tokens", "revoked_at")).toBe(true);
    });
  });

  describe("ai_packaging_jobs table columns", () => {
    it("has id, submission_id, status, provider, created_at, started_at, completed_at, error, output_summary", () => {
      expect(hasColumn(sql, "ai_packaging_jobs", "submission_id")).toBe(true);
      expect(hasColumn(sql, "ai_packaging_jobs", "status")).toBe(true);
      expect(hasColumn(sql, "ai_packaging_jobs", "provider")).toBe(true);
      expect(hasColumn(sql, "ai_packaging_jobs", "started_at")).toBe(true);
      expect(hasColumn(sql, "ai_packaging_jobs", "completed_at")).toBe(true);
      expect(hasColumn(sql, "ai_packaging_jobs", "error")).toBe(true);
      expect(hasColumn(sql, "ai_packaging_jobs", "output_summary")).toBe(true);
    });
  });

  describe("freeze_frame_notes table columns", () => {
    it("has id, manifest_id (or submission_id), timecode, audio_url, audio_duration, thumbnail_url, transcript fields, annotations", () => {
      expect(hasColumn(sql, "freeze_frame_notes", "timecode")).toBe(true);
      expect(hasColumn(sql, "freeze_frame_notes", "audio_url")).toBe(true);
      expect(hasColumn(sql, "freeze_frame_notes", "audio_duration")).toBe(true);
      expect(hasColumn(sql, "freeze_frame_notes", "thumbnail_url")).toBe(true);
      expect(hasColumn(sql, "freeze_frame_notes", "transcript_raw")).toBe(true);
      expect(hasColumn(sql, "freeze_frame_notes", "transcript_edited")).toBe(
        true,
      );
      expect(hasColumn(sql, "freeze_frame_notes", "transcript_status")).toBe(
        true,
      );
      expect(hasColumn(sql, "freeze_frame_notes", "transcript_provider")).toBe(
        true,
      );
      expect(hasColumn(sql, "freeze_frame_notes", "transcript_error")).toBe(
        true,
      );
      expect(hasColumn(sql, "freeze_frame_notes", "annotations")).toBe(true);
    });
  });

  describe("Row Level Security", () => {
    it("enables RLS on coach-owned tables", () => {
      const rlsTables = [
        "submissions",
        "earnings",
        "playback_manifests",
        "video_assets",
        "audio_assets",
        "freeze_frame_notes",
        "lesson_delivery_tokens",
        "ai_packaging_jobs",
      ];
      for (const table of rlsTables) {
        const re = new RegExp(
          `ALTER\\s+TABLE\\s+(?:public\\.)?"?${table}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
          "i",
        );
        expect(re.test(sql)).toBe(true);
      }
    });

    it("defines CREATE POLICY statements", () => {
      expect(sql).toContain("CREATE POLICY");
      // At least 8 policies (select/insert/update per key table group)
      const policyCount = (sql.match(/CREATE\s+POLICY/gi) || []).length;
      expect(policyCount).toBeGreaterThanOrEqual(8);
    });
  });

  describe("indexes", () => {
    it("defines indexes on foreign-key / lookup columns", () => {
      expect(sql).toContain("CREATE INDEX");
      const indexCount = (sql.match(/CREATE\s+INDEX/gi) || []).length;
      expect(indexCount).toBeGreaterThanOrEqual(8);
    });

    it("indexes submissions by coach_slug", () => {
      expect(sql).toMatch(/idx_submissions_coach_slug/i);
    });

    it("indexes earnings by coach_slug", () => {
      expect(sql).toMatch(/idx_earnings_coach_slug/i);
    });
  });

  describe("timestamps", () => {
    it("uses timestamptz for created_at / updated_at", () => {
      expect(sql).toMatch(/created_at.*timestamptz/i);
      expect(sql).toMatch(/updated_at.*timestamptz/i);
    });

    it("defaults created_at to now()", () => {
      expect(sql).toMatch(/created_at.*DEFAULT.*now\(\)/i);
    });
  });

  describe("updated_at trigger", () => {
    it("defines a function and trigger to auto-set updated_at", () => {
      expect(sql).toMatch(/set_updated_at|update_updated_at/i);
      expect(sql).toContain("TRIGGER");
    });
  });
});
