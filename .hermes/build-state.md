# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 2 start — waiting for inner loop to advance)

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD, guardrails checks, drift detection. Read-only.

## Phases
1. [x] Bootstrap repo + seed all 16 /docs/ artifacts (Rounds 1–2)
2. [x] Phase 1a: Web Foundation — shell, landing, coach profiles, test harness (Round 3)
3. [x] Phase 1b: Sync engine core — phase model + frame mapping (Round 4)
4. [ ] Phase 2: Coach auth + onboarding
5. [ ] Phase 3: Parent upload + payment
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
- 30 tests across 4 test files — all green
- Quality gate: typecheck ✓ lint ✓ build ✓

## Next Action (Inner Loop)
Phase 2 — Coach authentication scaffold. Suggested approach: Auth.js with credentials/magic-link provider (swappable to Supabase Auth later). Create:
- `lib/auth.ts` — auth config
- `app/api/auth/[...nextauth]/route.ts` — API route
- `app/coach/dashboard/page.tsx` — protected coach dashboard

## Open Issues
- Internal auth (Supabase not configured yet; use Auth.js with a JSON/local strategy for MVP speed)
- No blockers

**Last Updated:** 2026-06-21 (Two-tier loop activated)
