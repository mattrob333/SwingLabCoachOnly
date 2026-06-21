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

## Task: Sync Engine Core — Phase Model + Frame Mapping (PRD §8–9)
**User story:** As the Review Studio compare screen, given a normalized scrubber value (0.0–1.0), I can compute the correct frame index for each swing so pro and player line up by movement stage.
**Scope:** lib/sync/phases.ts (7-phase model, normalized positions, validatePhaseMarkers) + lib/sync/frameMapping.ts (frameForProgress, framesForProgress)
**Dependencies:** Phase 1 web foundation
**Acceptance criteria:**
1. frameForProgress maps 0→stance frame, 1→finish frame; exact phase positions return exact marked frames; in-between progress interpolates linearly (PRD §9.2)
2. validatePhaseMarkers flags missing required phases, non-monotonic order, negative frames (PRD §6.2.4)
3. Works with the V1 minimum 5-phase set (stance/load/launch/contact/finish)
4. Never returns a frame outside [0, maxFrame]
**Test requirements:** tests/sync-phases.test.ts (8) + tests/sync-frameMapping.test.ts (11) — 19 tests
**Traceability:** PRD §8 (phase model), §9 (sync engine + §9.2 pseudocode), §21 (non-negotiable: frame-cache renderer, not MP4 seeking)
**Failure states:** Non-monotonic markers → validation problems list; empty markers → frame 0
**Status:** ✅ Complete (Round 4)

## Task: Phase 2 — Synced Scrubber Spike (M1, PRD §21.1)
**User story:** As a coach, I drag one master scrubber and both pro/player frame viewers update smoothly with no video seeking.
**Scope:** Two prebuilt frame sets + phase marker JSON + stacked 1:1 viewer + normalized scrubber consuming frameForProgress (PRD §10, §21.1)
**Dependencies:** Sync engine core
**Acceptance criteria:** Dragging scrubber renders cached frames for both swings via framesForProgress; no buffering/loading spinner under normal conditions
**Status:** Pending (next round)

(Additional tasks will be added in future rounds following the exact good task format.)
