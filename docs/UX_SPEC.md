# UX Specification

**Status:** Functional UI built across all coach + parent surfaces; dedicated UX/UI polish workstream not yet started.
**Last synced:** 2026-06-22

## Design language (target)
Clean, professional, **sport-specific** (not generic SaaS, not fitness-app). SwingLab "clay" brand tokens, consistent light + dark. Mobile-first with strong desktop layouts. Fast feel: skeletons, optimistic UI, snappy transitions. shadcn/ui + Tailwind composition over bespoke CSS. Principle (PRD §32): *the coach should always know the next best action.*

## Surfaces (built)
1. **Public**: landing (`/`), coach directory (`/coaches`), coach profile (`/coaches/[slug]`, SSG), how-it-works
2. **Parent**: upload (`/upload`), pay (`/pay`), lesson (`/lesson/[id]`, token-gated)
3. **Coach dashboard**: inbox (`/coach/dashboard`), submission detail (`/coach/submission/[id]`), lesson approval (`/coach/submission/[id]/lesson`), earnings (`/coach/earnings`), onboarding (`/coach/onboarding`), compare (`/coach/compare`)
4. **Review Studio**: `/coach/review/[id]` — video player, scrubber, mic recorder, annotation canvas, saved frames

## Breakpoints (PRD §21.5)
small mobile 360–430 · large mobile 431–767 · tablet 768–1023 · desktop 1024–1439 · large desktop 1440+

## Review Studio behavior (built, Wave 3 polish done)
- Mobile: large touch targets, annotation toolbar repositioned to avoid player-control overlap, icon-only Undo/Clear
- Thumbnails: retake (re-capture at timecode) + zoom lightbox (X/Escape/backdrop)
- Resilience: video error overlay + retry, annotation-canvas context fallback, beforeunload unsaved-changes warning, draft-note autosave

## Keyboard shortcuts (PRD §21.7 — target)
Space play/pause · ←/→ frame step · R record · A/L/C/D tools · S save frame · Z undo · Esc exit tool

## Pending — UX/UI Polish workstream (coach-first; see NEXT_STEPS_PLAN)
Design tokens + shared primitives → dashboard/inbox → submission detail → Review Studio chrome → onboarding → earnings → lesson approval → global shell/nav → micro-states → accessibility pass.
