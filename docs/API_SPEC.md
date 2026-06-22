# API Specification

**Source:** PRD Section 24 + Wave 1 implementation.

**Status:** Active — 22+ API route handlers implemented across Waves 1–6. All routes are Next.js App Router route handlers (`app/api/.../route.ts`).

---

## Authentication

Coach API routes require a valid session cookie (`swl_session`) signed with HMAC-SHA256. The session is verified via `lib/auth/session.ts` → `verifySession()`. Unauthenticated requests return `401 Unauthorized`.

Parent-facing routes (upload, pay) do not require auth — the payment gate is the barrier, not authentication. Lesson delivery uses magic-link tokens (no parent accounts).

## Routes

### Auth

#### POST /api/auth/login
Coach login. Validates credentials (scrypt-hashed) and sets a signed session cookie.

- **Body:** `{ slug: string, password: string }`
- **Response 200:** `{ ok: true }` — sets `swl_session` cookie (httpOnly, 7-day, sameSite=lax)
- **Response 401:** `{ error: "Invalid credentials" }`

#### POST /api/auth/logout
Clears the session cookie.

- **Response 200:** `{ ok: true }` — clears `swl_session` cookie

### Submissions

#### POST /api/submissions
Parent uploads a new swing review request. Creates a submission with status `pending_payment`.

- **Body:** `{ coachSlug: string, parentEmail: string, playerAge: number, swingType: string, notes: string, videoUrl?: string, videoFileName?: string, followUpFor?: string }`
- **Response 201:** `{ submission: Submission }`
- **Response 400:** `{ error: string, errors: string[] }` — validation errors
- **Auth:** None (parent-facing)

#### GET /api/submissions/[id]
Fetch a submission by ID. Used by coach submission detail page.

- **Response 200:** `{ submission: Submission }`
- **Response 404:** `{ error: "Submission not found" }`
- **Auth:** Coach session required (ownership enforced in Wave 2)

#### POST /api/submissions/[id]/pay
Mark a submission as paid (mock payment). In Wave 2, replaced by Stripe Checkout.

- **Response 200:** `{ submission: Submission }` — status transitions to `paid`
- **Response 400:** `{ error: string }` — not pending payment
- **Auth:** None (parent-facing)

#### POST /api/submissions/[id]/review
Start a review session. Transitions submission from `paid` → `in_review`.

- **Response 200:** `{ submission: Submission }`
- **Auth:** Coach session required

#### POST /api/submissions/[id]/audio
Upload a voice-over audio clip for a freeze-frame note.

- **Body:** `FormData { audio: Blob, noteId: string, timecode: number, duration: number }`
- **Response 201:** `{ audioUrl: string, noteId: string }`
- **Auth:** Coach session required

#### POST /api/submissions/[id]/render
Transition submission from `in_review` → `rendering`. Triggers the lesson build pipeline.

- **Response 200:** `{ submission: Submission }`
- **Auth:** Coach session required

#### POST /api/submissions/[id]/lesson-draft
Generate or fetch the AI lesson draft for a submission.

- **Response 200:** `{ draft: LessonDraft }`
- **Auth:** Coach session required

#### GET /api/submissions/[id]/lesson-draft
Fetch the existing lesson draft for a submission.

- **Response 200:** `{ draft: LessonDraft }`
- **Response 404:** `{ error: "No draft found" }`
- **Auth:** Coach session required

#### POST /api/submissions/[id]/lesson-playback
Save or update the freeze-frame playback manifest for a submission. Called during Review Studio to persist notes, annotations, and audio.

- **Body:** `{ videoUrl: string, notes: FreezeFrameNote[], submissionId?: string, coachSlug?: string, parentEmail?: string, deliveryTokenId?: string, aiSummary?: string }`
- **Response 200:** `{ manifest: StoredPlaybackManifest }`
- **Auth:** Coach session required

#### GET /api/submissions/[id]/lesson-playback
Fetch the freeze-frame playback manifest for a submission. Used by both the coach lesson page and the parent lesson player.

- **Response 200:** `{ manifest: StoredPlaybackManifest }`
- **Response 404:** `{ error: "No manifest found" }`
- **Auth:** Coach session (coach view) or magic-link token (parent view) — Wave 2

#### POST /api/submissions/[id]/redeem-code
Redeem a follow-up code to create a follow-up submission linked to the original.

- **Body:** `{ code: string, parentEmail: string }`
- **Response 201:** `{ submission: Submission }`
- **Auth:** None (parent-facing)

#### POST /api/submissions/[id]/transcribe
Transcribe a single voice-over note's audio (Wave 4 AI). Calls the transcription adapter (Deepgram when live, deterministic mock otherwise) and updates the note's `transcriptRaw`/`transcriptStatus`/`transcriptProvider`/`transcriptError` on the stored playback manifest, if one exists. Rate-limited (20 req / 10 min per IP).

- **Body:** `{ noteId: string, audioUrl: string, language?: string }`
- **Response 200:** `{ success: boolean, transcript?: string, provider: string, error?: string }`
- **Response 400:** `{ error: "noteId is required" | "audioUrl is required" | "Invalid JSON body" }`
- **Response 401:** `{ error: "Authentication required" }`
- **Response 403:** `{ error: "Forbidden" }` — submission belongs to a different coach
- **Response 404:** `{ error: "Submission not found" }`
- **Response 429:** Rate-limited (with `Retry-After` + `X-RateLimit-*` headers)
- **Auth:** Coach session required (ownership enforced — 403 on cross-coach)

#### POST /api/submissions/[id]/package
Run the OpenAI packaging worker on a submission's stored manifest (Wave 4 AI). Requires existing transcribed notes. Generates a parent-friendly `aiSummary` and per-note `aiNoteTitles`, then persists both onto the playback manifest. Preserves coach wording — only cleans obvious filler and organizes; never invents technical feedback (guardrail-enforced in the adapter system prompt). Rate-limited (20 req / 10 min per IP).

- **Body:** None (reads the stored manifest + coach display name)
- **Response 200:** `{ success: boolean, summary?: string, noteTitles?: Array<{ noteId: string, title: string }>, provider: string, error?: string }` — also persists `aiSummary` + `aiNoteTitles` on the manifest
- **Response 401:** `{ error: "Authentication required" }`
- **Response 403:** `{ error: "Forbidden" }` — cross-coach
- **Response 404:** `{ error: "Submission not found" | "No lesson manifest found for this submission" }`
- **Response 429:** Rate-limited
- **Response 500:** `{ success: false, error: string }` — packaging adapter failed
- **Auth:** Coach session required (ownership enforced — 403 on cross-coach)

#### PATCH /api/submissions/[id]/package
Coach edits the AI-generated `aiSummary` and/or `aiNoteTitles` previously persisted by a POST `/package` call (Wave 4 Sub-slice 3a — "review/edit AI output"). Partial update: only the fields present in the body are written; the other is preserved. `aiNoteTitles` entries are validated against the manifest's existing note IDs to prevent orphaned titles.

- **Body:** `{ aiSummary?: string, aiNoteTitles?: Array<{ noteId: string, title: string }> }`
- **Response 200:** `StoredPlaybackManifest` — the updated manifest (with new `aiSummary` / `aiNoteTitles`)
- **Response 400:** `{ error: "Invalid JSON body" | "aiNoteTitles contains unknown noteId: \"<id>\"" }` — empty `aiSummary` string is a valid "clear" intent
- **Response 401:** `{ error: "Authentication required" }`
- **Response 403:** `{ error: "Forbidden" }` — cross-coach
- **Response 404:** `{ error: "Submission not found" | "No lesson manifest found for this submission" }`
- **Auth:** Coach session required (ownership enforced — 403 on cross-coach). NOT rate-limited (edit-only, no external API call).

#### POST /api/submissions/[id]/approve
Coach approves the AI-packaged lesson and triggers parent delivery (Wave 4 Sub-slice 3b). Transitions the manifest status to `"approved"` and, on the FIRST approval only, creates a delivery token + sends the magic-link email to the parent. Subsequent calls are idempotent — no duplicate tokens/emails. Pre-condition: the manifest must have an `aiSummary` (packaging must have been run); returns 409 otherwise. Delivery side effects (token creation + email send) are non-fatal: if they fail, the approval still succeeds and the coach can re-trigger later. Rate-limited (20 req / 10 min per IP).

- **Body:** None
- **Response 200:** `StoredPlaybackManifest` — the manifest with `status: "approved"`
- **Response 401:** `{ error: "Authentication required" }`
- **Response 403:** `{ error: "Forbidden" }` — cross-coach
- **Response 404:** `{ error: "Submission not found" | "No lesson manifest found for this submission" }`
- **Response 409:** `{ error: "Manifest has not been packaged yet. Run packaging before approving." }` — pre-condition gate
- **Response 429:** Rate-limited
- **Auth:** Coach session required (ownership enforced — 403 on cross-coach)

#### POST /api/submissions/[id]/revoke-link
Privacy control (Wave 6 Task 4 — PRD §25). Lets a coach revoke all active delivery tokens for a submission, immediately invalidating the magic link sent to the parent. The parent can no longer access the lesson via any previously-issued link. The coach can re-approve later to issue a new token. Idempotent: returns `revokedCount: 0` if all tokens were already revoked.

- **Body:** None
- **Response 200:** `{ revokedCount: number }` — count of tokens that were active and are now revoked
- **Response 401:** `{ error: "Authentication required" }`
- **Response 403:** `{ error: "Forbidden" }` — cross-coach
- **Response 404:** `{ error: "Submission not found" }`
- **Auth:** Coach session required (ownership enforced — 403 on cross-coach). NOT rate-limited (privacy control, low abuse surface).

#### DELETE /api/submissions/[id]
Privacy control (Wave 6 Task 4 — PRD §25). Lets a coach permanently delete a submission AND all of its associated data:
- the submission record itself
- the playback manifest (notes, annotations, AI summary)
- all delivery tokens (magic links) for the submission
- all VideoAsset records for the submission
- the underlying video file in storage (best-effort, non-fatal)

This is distinct from the revoke-link flow (which only invalidates magic links but preserves the lesson data for re-delivery). Data deletion is irreversible and removes everything. Cascade strategy: each associated-data deletion is wrapped in its own try/catch so a failure in one cleanup step (e.g. storage adapter down) does not block the others. The submission record is deleted LAST — if any earlier step throws, the submission is preserved so the coach can retry. Storage-file deletion is non-fatal by design (the record deletion is the authoritative "forgotten" signal; orphaned storage objects can be GC'd later).

- **Body:** None
- **Response 200:** `{ ok: true, submissionId: string }`
- **Response 401:** `{ error: "Authentication required" }`
- **Response 403:** `{ error: "Forbidden" }` — cross-coach
- **Response 404:** `{ error: "Submission not found" }`
- **Auth:** Coach session required (ownership enforced — 403 on cross-coach). NOT rate-limited (privacy control, low abuse surface).

### Coach

#### POST /api/coach/onboarding
Create or update a coach profile during onboarding.

- **Body:** `{ name: string, title: string, bio: string, location: string, priceUsd: number, turnaround: string, highlights: string[], existingSlug?: string }`
- **Response 200:** `{ coach: Coach }`
- **Response 400:** `{ error: string, errors: string[] }`
- **Auth:** Coach session required

#### GET /api/coach/earnings
Fetch earnings summary for the authenticated coach.

- **Response 200:** `{ earnings: Earning[], total: number }`
- **Auth:** Coach session required

### Comparison

#### GET /api/comparison
Fetch submissions for side-by-side comparison (original + follow-up).

- **Query:** `?originalId=<id>`
- **Response 200:** `{ original: Submission, followUps: Submission[] }`
- **Auth:** Coach session required

## Upcoming Routes (Future Waves)

These routes are not yet implemented and may shift as the build evolves.

| Route | Method | Purpose | Wave |
|---|---|---|---|
| `/api/submissions/[id]/notes/[noteId]` | PUT | Autosave note edits | 2+ |
| `/api/submissions/[id]/process-lesson` | POST | Trigger lesson processing pipeline | 2+ |

## Response Conventions

- All responses are JSON (`Content-Type: application/json`).
- Error responses: `{ error: string, errors?: string[] }` where `errors` is the array of validation messages.
- Success responses: `{ <resource>: <T> }` or `{ ok: true }`.
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict — pre-condition gate, e.g. approve-before-package), 429 (Too Many Requests — rate-limited, with `Retry-After` + `X-RateLimit-*` headers), 500 (Internal Server Error).
