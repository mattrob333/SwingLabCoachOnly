# Acceptance Criteria

**Status:** MVP loop + Waves 1–2 met; Wave 4 AI in progress. Derived from PRD §29.
**Last synced:** 2026-06-22

Legend: ✅ met · 🚧 partial · ⬜ pending

## Parent upload
- ✅ Open coach link → select review type → enter player info → upload → pay or invite code → submit → confirmation
- ✅ Upload progress visible; submission appears in coach inbox; payment status correct
- 🚧 Failed-upload retry (UI present; oversized/type validation = Wave 6)

## Coach inbox
- ✅ Log in (mobile/desktop) · see new submissions · open detail · start review · request better video
- ✅ Ownership enforced (cross-coach → 403); copy public submission link

## Review Studio
- ✅ Play/pause/scrub · frame step · record voice-over · annotate (arrow/line/circle/freehand) · save frame · finish
- ✅ Events captured · draft notes autosaved (localStorage) · recovery on interrupt (beforeunload warning)
- ✅ Video error recovery · annotation-canvas fallback · mobile touch targets

## Rendering (v1 = interactive manifest)
- ✅ Manifest composes audio + annotations + freeze-frames + timecodes; attached to lesson
- ⬜ MP4 export deferred (interactive playback is v1)

## AI lesson generation
- ✅ Transcribe audio (Deepgram/mock) · generate package (OpenAI/mock) · coach edits all fields · approval gates send
- ✅ Draft based ONLY on coach transcript; AI never invents feedback
- ⏭️ Coach-facing review/approve UI (Sub-slice 3c)

## Lesson delivery
- ✅ Secure tokenized link · valid→view+mark-viewed · expired/revoked/mismatch→denied · not-found→404
- ✅ Approve → delivery token + email (magic link, no parent account)
- 🚧 Follow-up swing submission (wired; polish in Wave 5)

## Cross-browser / mobile
- 🚧 Mobile ergonomics largely done in Wave 3; full cross-browser QA pass = Wave 5/6
