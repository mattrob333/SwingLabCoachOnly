# AI Pipeline

**Status:** Wave 4 in progress — adapters + worker routes built (mock mode until keys added).
**Last synced:** 2026-06-22

## Role
AI is a **production assistant**, not a coach. It organizes and lightly cleans the coach's own words; it **never invents technical feedback**, never diagnoses, never overrides the coach. The coach is the final authority and must approve before anything is sent.

## Flow (as built)
```
Coach records voice notes in Review Studio
        ↓
POST /api/submissions/[id]/transcribe   → Deepgram (or mock) → transcriptRaw per note
        ↓
Coach may edit transcript (transcriptEdited, "Edited" badge)
        ↓
POST /api/submissions/[id]/package      → OpenAI (or mock) → aiSummary + aiNoteTitles on manifest
        ↓
PATCH /api/submissions/[id]/package     → coach edits AI summary / note titles
        ↓
POST /api/submissions/[id]/approve      → status "approved" → delivery token + email
```

## Components (code)
- `lib/transcription/` — `types.ts`, `mock-transcription.ts`, `deepgram-transcription.ts`, env-gated `index.ts` factory
- `lib/packaging/` — `types.ts`, `mock-packaging.ts`, `openai-packaging.ts` (guardrail-enforcing system prompt), env-gated `index.ts` factory
- Routes: `app/api/submissions/[id]/transcribe`, `.../package` (POST + PATCH), `.../approve`

## Guardrails (enforced in prompt + tests)
1. Use ONLY the coach transcript + submitted metadata.
2. Do not add swing flaws the coach did not mention.
3. Preserve the coach's wording; only clean obvious filler and organize.
4. Keep to ≤3 priorities; age-appropriate, encouraging tone.
5. No medical/injury claims.
6. Coach approval required before send; coach can edit every field.

## Data fields
- `FreezeFrameNote`: `transcriptRaw`, `transcriptEdited`, `transcriptStatus`, `transcriptProvider`, `transcriptError`
- `LessonPlaybackManifest`: `aiSummary`, `aiNoteTitles`, `processedAt`, status (`...→packaged→approved`)

## Pending
- Sub-slice 3c: coach-facing UI to review/edit AI output + "Approve & Send Lesson" button.
- Live mode requires `DEEPGRAM_API_KEY` and `OPENAI_API_KEY`.
