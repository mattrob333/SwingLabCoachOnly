# Tasks

## Task: Bootstrap Repository & Initial Docs
**User story:** As the project, I need a clean GitHub repo with all required artifacts so engineers can start building the same system.
**Scope:** Create README, all 16 /docs/ files, .hermes/build-state.md, initial decisions/assumptions.
**Out of scope:** Actual Next.js code or features.
**Dependencies:** None
**Technical notes:** Use the exact required artifacts list from PRD.
**Acceptance criteria:**
1. All 16 docs exist in /docs/
2. README exists with links
3. Build state file exists
**Test requirements:** N/A (docs)
**Failure states:** Missing files
**Completion definition:** Repo has visible structure on GitHub

## Task: Initialize Next.js Project (Phase 1)
**User story:** As a developer, I can run `npm run dev` and see a responsive shell.
**Scope:** Next.js 15 + TS + Tailwind + shadcn/ui scaffold
**Dependencies:** Bootstrap task
**Acceptance criteria:** App runs locally with basic layout matching PRD breakpoints
**Status:** Pending

(Additional tasks will be added in future rounds following the exact good task format.)
