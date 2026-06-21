# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 3 — upload done, payment flow next)

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD, guardrails checks, drift detection. Read-only.

## Phases
1. [x] Bootstrap repo + seed all 16 /docs/ artifacts (Rounds 1–2)
2. [x] Phase 1a: Web Foundation — shell, landing, coach profiles, test harness (Round 3)
3. [x] Phase 1b: Sync engine core — phase model + frame mapping (Round 4)
4. [x] Phase 2: Coach auth + onboarding — auth scaffold (Round 5), onboarding form (Round 6)
5. [~] Phase 3: Parent upload + payment — upload done (Round 7), payment flow next
6. [ ] Phase 4: Review Studio (web player + scrubber + record + annotate)
7. [ ] Phase 5: Render pipeline
8. [ ] Phase 6: AI lesson pack
9. [ ] Phase 7: Lesson delivery + follow-up
10. [ ] Phase 8: Stripe Connect + earnings
11. [ ] Phase 9: PWA enhancements
12. [ ] Phase 10: Comparison mode

## Completed Tasks
- All 16 /docs/ artifacts seeded
- Next.js 16 + React 19 + Tailwind 4 + shadcn scaffold
- 7 app routes (landing, coaches, SSG profiles, upload, how-it-works, coach login)
- 4 layout components + shadcn Button
- lib/coaches.ts (read + write path: slugify, validateCoachInput, upsertCoach), lib/turnaround.ts, lib/sync/phases.ts, lib/sync/frameMapping.ts, lib/utils.ts
- Phase 2 coach auth: credentials (scrypt), sessions (HMAC-SHA256), login/logout API, middleware, login page, dashboard
- Phase 2 coach onboarding: 3-step form (Profile → Pricing → Highlights), onboarding API, dashboard edit link
- Phase 3 parent upload: lib/submissions.ts (Submission model, validateSubmissionInput, createSubmission, getSubmissionById, getSubmissionsForCoach), submissions API, upload form with video capture + progress, success state with payment CTA
- 84 tests across 10 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 3 (continued) — Payment / invite code flow (PRD §31 build order #4). Build the payment step that transitions a submission from `pending_payment` to `paid`:
- `app/pay/page.tsx` — payment page (reads `?submission=` param, shows coach price, payment form or invite code input)
- `app/api/submissions/[id]/pay/route.ts` — POST endpoint to mark submission as paid (mock payment for MVP; Stripe Connect lands in Phase 8)
- `lib/submissions.ts` — add `markSubmissionPaid(id)` function
- `lib/invite-codes.ts` — invite code model (code → coachSlug, redemption logic for comped reviews)
- `app/api/submissions/[id]/redeem-code/route.ts` — POST endpoint for invite code redemption
- PRD guardrail: payment before review — coach can't see submission in inbox until status is `paid`

## Open Issues
- Auth credential store is in-memory (resets on deploy) — fine for MVP; swap to Supabase Auth when provisioned.
- Submission store is in-memory — MVP-acceptable.
- No blockers

**Last Updated:** 2026-06-21 (Round 7 — Phase 3 parent upload complete)
