# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 4 complete; Phase 5 — Review Studio next)

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
7. [ ] Phase 5: Review Studio (web player + scrubber + record + annotate) — next
8. [ ] Phase 6: Render pipeline
9. [ ] Phase 6: AI lesson pack
10. [ ] Phase 7: Lesson delivery + follow-up
11. [ ] Phase 8: Stripe Connect + earnings
12. [ ] Phase 9: PWA enhancements
13. [ ] Phase 10: Comparison mode

## Completed Tasks
- All 16 /docs/ artifacts seeded
- Next.js 16 + React 19 + Tailwind 4 + shadcn scaffold
- lib/coaches.ts (read + write path), lib/turnaround.ts, lib/sync/phases.ts, lib/sync/frameMapping.ts, lib/utils.ts
- Phase 2: auth (scrypt + HMAC sessions), login/logout API, middleware, login + dashboard pages, onboarding form (3-step) + API
- Phase 3: lib/submissions.ts (Submission model, createSubmission, markSubmissionPaid, getSubmissionsForCoach), lib/invite-codes.ts (InviteCode, redeemInviteCode), submissions API, pay API, redeem-code API, upload form (video capture + progress), payment page (pay or invite code)
- Phase 4: Coach inbox (dashboard with stat cards + submission cards, payment-before-review filter, empty state), submission detail page (/coach/submission/[id] with auth + ownership guard, status-aware action area), markSubmissionInReview (paid → in_review), POST /api/submissions/[id]/review (auth + ownership guarded), StartReviewButton client component
- 104 tests across 12 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 5 — Web Review Studio (PRD §31 build order #7). Build the coach's web-based review studio:
- Video player with frame-accurate scrubber (PRD §31 #7)
- Microphone recording component (#8)
- Annotation canvas overlay (#9)
- Review event capture system (#10 — records annotations + voice markers tied to video timestamps)
- Start with the video player + scrubber as the first vertical slice
- Link from submission detail page when status is `in_review`
- The detail page already has a placeholder "Open Review Studio" button for `in_review` submissions

## Open Issues
- All stores in-memory — MVP-acceptable.
- No blockers

**Last Updated:** 2026-06-21 (Round 8 — Phase 4 coach inbox + submission detail complete)
