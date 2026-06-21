# Phase 1 — Web Foundation Implementation Plan

> **For Hermes:** Use senior-dev-autonomous-builder + subagent-driven-development to implement remaining phases task-by-task.

**Goal:** Ship a responsive web shell with a landing page, coach directory, and public coach profile pages — the visible MVP surface — on Next.js 16.

**Architecture:** Next.js App Router (static-first), Tailwind v4 + shadcn (base-nova), pure-TS domain data modules (testable, DB-ready), vitest + @testing-library harness.

**Tech Stack:** Next.js 16.2.9, React 19.2, TypeScript 5, Tailwind v4, shadcn (base-nova / @base-ui/react), vitest 4, @testing-library/react.

---

## Status: ✅ Complete (Round 3)

### Tasks delivered
1. Consolidate scaffold into canonical repo — done
2. Vitest harness + setup — done
3. lib/coaches.ts domain data + tests (RED→GREEN) — done (6 tests)
4. lib/turnaround.ts + tests (RED→GREEN) — done (5 tests)
5. Responsive shell (header/footer/container) — done
6. SwingLab brand tokens — done
7. Landing page — done
8. /coaches + /coaches/[slug] (SSG) — done
9. Stub routes (/how-it-works, /upload, /coach/login) — done
10. Quality gate (typecheck + lint + build) — green

## Verification
- `npm run typecheck` → OK
- `npm run lint` → OK (0 errors)
- `npm test` → 11 passed
- `npm run build` → 10 routes, 2 SSG coach pages (/coaches/marcus-reed, /coaches/priya-anand)

## Next phase (Phase 2 — preview)
- Coach auth (magic-link or OAuth)
- Coach onboarding form → creates coach profile
- Repository interface for coaches (swap sample data → DB later)
- Component test for SiteHeader
- Review Studio route scaffold
