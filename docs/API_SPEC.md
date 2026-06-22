# API Specification

**Source:** PRD Section 24 + Wave 1 implementation.

**Status:** Active — 13 API route handlers implemented. All routes are Next.js App Router route handlers (`app/api/.../route.ts`).

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

## Upcoming Routes (Wave 2+)

| Route | Method | Purpose | Wave |
|---|---|---|---|
| `/api/submissions/[id]/notes/[noteId]` | PUT | Autosave note edits | 2 |
| `/api/submissions/[id]/process-lesson` | POST | Trigger lesson processing pipeline | 2 |
| `/api/lessons/deliver` | POST | Create delivery token + send magic-link email | 2 |
| `/api/lessons/[token]` | GET | Parent fetches lesson by magic-link token | 2 |
| `/api/submissions/[id]/transcribe` | POST | Retry transcription for a note | 4 |
| `/api/stripe/checkout` | POST | Create Stripe Checkout session | 2 |
| `/api/stripe/webhook` | POST | Stripe webhook handler (replay-safe) | 2 |

## Response Conventions

- All responses are JSON (`Content-Type: application/json`).
- Error responses: `{ error: string, errors?: string[] }` where `errors` is the array of validation messages.
- Success responses: `{ <resource>: <T> }` or `{ ok: true }`.
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Internal Server Error).
