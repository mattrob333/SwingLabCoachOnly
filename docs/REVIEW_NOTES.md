# Review Notes

Running log of outer-loop alignment audits and reviewer-simulation findings.
**Last synced:** 2026-06-22

## 2026-06-22 — Docs realignment (manual)
- README, TASKS.md, and 9 stub docs were stale (said "Bootstrap Round 1–2" while code was at Wave 4, 681 tests). Brought all docs into alignment with actual code state. build-state.md header corrected (was "CURRENT WAVE: Wave 1" while body tracked Wave 4).
- No code changes; quality gate green (681 tests, build ✓).

## Standing reviewer guidance
- **Reviewer A (Product/UX):** Does recent work serve the pilot north star — one coach receives a real swing, reviews on mobile, generates an interactive lesson, delivers via magic link? Is the coach always one click from the next best action?
- **Reviewer B (Tech):** Tech debt? Missing tests? Security gaps (expired/revoked links, oversized uploads, replayed webhooks, cross-coach access)? Are env-gated adapters consistent (real-when-key, mock-when-absent, no crash)?

## Material-disagreement triggers (must fix next round)
Different MVP · different data model · different payment timing · different rendering behavior · different AI authority · different account ownership · mobile vs desktop disagreement · different definition of done.
