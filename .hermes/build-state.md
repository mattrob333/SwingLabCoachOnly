# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Round 3 complete — Phase 1 Web Foundation shipped)

## Phases
1. [x] Bootstrap repo + seed all 16 required /docs/ artifacts (Rounds 1–2)
2. [~] Phase 1: Web Foundation — shell, landing, coach profiles, test harness (Round 3 — MVP scope done; auth + DB deferred)
3. [ ] Phase 2: Coach auth + Review Studio scaffold
4. [ ] Phase 3: Parent upload flow (capture, transcode, payment)
5. [ ] Phase 4: AI lesson pack generation
6. [ ] Phase 5: Lesson delivery + follow-up loop
7. [ ] Phase 6+: Hardening, privacy, deploy

## Completed Tasks (Round 3)
- Consolidated Next.js 16 + React 19 + Tailwind 4 + shadcn (base-nova) scaffold into canonical repo (preserved docs history)
- `npm install` clean; baseline typecheck + lint green
- Vitest + @testing-library + jsdom harness wired (vitest.config.ts, tests/setup.ts, npm scripts)
- TDD: lib/coaches.ts (getCoachBySlug, getAllCoachSlugs) + 6 unit tests
- TDD: lib/turnaround.ts (ISO-8601 duration humanizer) + 5 unit tests — 11 tests green
- Responsive site shell: SiteHeader (sticky, nav, CTAs), SiteFooter, Container
- SwingLab brand clay tokens (primary) for light + dark
- Landing page (hero, how-it-works, featured coaches) replacing create-next-app template
- /coaches directory + /coaches/[slug] public profile (SSG via generateStaticParams, 2 sample coaches)
- /how-it-works, /upload, /coach/login stub routes
- Quality gate green: typecheck OK, lint OK, `next build` OK (10 routes, 2 SSG coach pages)
- Committed + pushed to GitHub (12d3c36..53b1fc7)

## Open Issues / Blockers
- None blocking. Auth, DB, and real coach data are Phase 2+ work (sample data used now).
- Vitest/React types excluded from app `tsc` (test infra type-resolution noise under `bundler` moduleResolution); tests run fine via vitest. Consider a `tsconfig.test.json` if strict test typechecking is desired later.
- `.hermes/build-state.md` previously existed in two places (swinglab/ and Projects/SwingLabCoachOnly/). Canonical is now `swinglab/.hermes/build-state.md`. The Projects/ copy is a stale local scaffold — safe to delete.

## Next Action (Round 4)
- Phase 2 start: coach authentication scaffold (NextAuth / Auth.js or magic-link) + coach onboarding form
- Replace sample coach data with a data layer stub (repository interface) ready for DB in Phase 2
- Add a component test (SiteHeader render) to exercise the React testing harness
- Flesh out docs/TECH_SPEC.md + docs/TASKS.md with Phase 2 bite-sized tasks + traceability

## Cost / Quality Notes
- All Round 3 work executed on GLM 5.2 (this cron model) — no Opus/GPT escalation needed.
- 11 unit tests, 0 lint errors, build green. No expensive-model review triggered (sample size < 5 tasks threshold for first audit).

**Last Run:** 2026-06-21 (Round 3 — Phase 1 Web Foundation)
