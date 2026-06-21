# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 5 in progress — video player done; mic recording next)

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD, guardrails checks, drift detection. Read-only.

## Phases
1. [x] Bootstrap repo + seed all 16 /docs/ artifacts (Rounds 1–2)
2. [x] Phase 1a: Web Foundation (Round 3)
3. [x] Phase 1b: Sync engine core (Round 4)
4. [x] Phase 2: Coach auth + onboarding (Rounds 5–6)
5. [x] Phase 3: Parent upload + payment (Round 7)
6. [x] Phase 4: Coach inbox + submission detail (Round 8)
7. [~] Phase 5: Review Studio (Round 9 — video player + scrubber done; mic recording next)
8. [ ] Phase 6: Render pipeline
9. [ ] Phase 6: AI lesson pack
10. [ ] Phase 7: Lesson delivery + follow-up
11. [ ] Phase 8: Stripe Connect + earnings
12. [ ] Phase 9: PWA enhancements
13. [ ] Phase 10: Comparison mode

## Completed Tasks
- All 16 /docs/ artifacts seeded
- Next.js 16 + React 19 + Tailwind 4 + shadcn scaffold
- lib/coaches.ts, lib/turnaround.ts, lib/sync/phases.ts, lib/sync/frameMapping.ts, lib/utils.ts
- Phase 2: auth (scrypt + HMAC sessions), login/logout API, middleware, login + dashboard pages, onboarding form + API
- Phase 3: lib/submissions.ts, lib/invite-codes.ts, submissions/pay/redeem-code APIs, upload form, payment page
- Phase 4: Coach inbox (dashboard with stat cards + submission cards), submission detail page (/coach/submission/[id]), markSubmissionInReview, POST /api/submissions/[id]/review, StartReviewButton
- Phase 5 (partial): lib/review/timecode.ts (formatTimecode, parseTimecode, stepFrames, clampTime — frame-accurate at 30fps), VideoPlayer component (play/pause, frame step, click-to-seek scrubber, keyboard shortcuts), /coach/review/[id] Review Studio page (auth + ownership guarded)
- 124 tests across 13 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 5 continued — Microphone recording (PRD §31 build order #8). Build the coach's voice recording component:
- MediaRecorder API wrapper to capture coach voiceover during review
- Record / stop / playback controls integrated alongside the video player
- Store recorded audio as a blob URL for MVP (render pipeline in Phase 6 handles persistence)
- Tie recording start/stop to video timestamps for review event capture (#10)
- Add to the Review Studio page below the video player

After mic recording: annotation canvas (#9), then review event capture (#10).

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- No blockers

**Last Updated:** 2026-06-21 (Round 9 — Phase 5 video player + scrubber complete)
