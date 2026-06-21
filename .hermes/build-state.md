# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 2 complete; Phase 3 — parent upload next)

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD, guardrails checks, drift detection. Read-only.

## Phases
1. [x] Bootstrap repo + seed all 16 /docs/ artifacts (Rounds 1–2)
2. [x] Phase 1a: Web Foundation — shell, landing, coach profiles, test harness (Round 3)
3. [x] Phase 1b: Sync engine core — phase model + frame mapping (Round 4)
4. [x] Phase 2: Coach auth + onboarding — auth scaffold (Round 5), onboarding form (Round 6)
5. [~] Phase 3: Parent upload + payment — upload flow next
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
- 7 app routes (landing, coaches, SSG profiles, upload stub, how-it-works, coach login)
- 4 layout components + shadcn Button
- lib/coaches.ts, lib/turnaround.ts, lib/sync/phases.ts, lib/sync/frameMapping.ts, lib/utils.ts
- Phase 2 coach auth: lib/auth/credentials.ts (scrypt hashing + credential store), lib/auth/session.ts (HMAC-SHA256 signed session tokens), app/api/auth/login + /logout routes, middleware.ts (protects /coach/dashboard + /coach/onboarding), app/coach/login page (form + Suspense), app/coach/dashboard page (protected server component), components/auth/login-form.tsx, .env.example
- Phase 2 coach onboarding: lib/coaches.ts write path (CoachInput, slugify, validateCoachInput, upsertCoach with create + update via existingSlug), app/api/coach/onboarding/route.ts (POST with session auth + validation), app/coach/onboarding/page.tsx (protected, pre-fills from existing profile), components/coach/onboarding-form.tsx (3-step: Profile → Pricing → Highlights), dashboard Edit profile link
- 68 tests across 8 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 3 — Parent upload flow (PRD §31 build order #3). Build the parent-facing video upload experience:
- `app/upload/page.tsx` — replace stub with real upload form (select coach, enter parent email, video file capture)
- `lib/submissions.ts` — submission model (id, coachSlug, parentEmail, videoFileName, status, createdAt)
- `app/api/submissions/route.ts` — POST endpoint to create a submission record (in-memory store for MVP)
- Video upload progress indicator (client component)
- PRD guardrail: payment before review — upload creates a pending submission, payment flow comes next (#4)
- TDD: write tests for submission creation + validation first

## Open Issues
- Auth credential store is in-memory (resets on deploy) — fine for MVP; swap to Supabase Auth when provisioned. Swap points documented in docs/DECISIONS.md.
- Onboarding persistence: in-memory COACHES store — MVP-acceptable.
- No blockers

**Last Updated:** 2026-06-21 (Round 6 — Phase 2 onboarding form complete)
