# Open Questions

**Last synced:** 2026-06-22

## Question: Provision real service keys for pilot?
**Why it matters:** All integrations (Supabase, Stripe, Deepgram, OpenAI, Resend) are built but run in mock mode. A real pilot needs at least Supabase (persistence + storage).
**Possible options:** (a) keep building on mocks; (b) provision Supabase only; (c) provision all.
**Recommended default:** Provision Supabase first when ready for a real pilot test; others can follow per-wave.
**Needs user decision:** yes (deferred — currently building on mocks by user choice)

## Question: MP4 export — ever needed?
**Why it matters:** v1 lesson format is interactive playback (manifest). MP4 export is deferred.
**Recommended default:** Defer until a coach/parent explicitly needs a downloadable file.
**Needs user decision:** no (revisit post-pilot)

## Question: Deployment target
**Why it matters:** Wave 6 includes deploy checks.
**Recommended default:** Vercel (Next.js native) + Supabase.
**Needs user decision:** no (default stands unless changed)

## Resolved
- Backend = Supabase (Postgres + Storage). ✅
- Parent delivery = magic link, no parent accounts. ✅
- Transcription = Deepgram; packaging = OpenAI (post-transcript, coach voice preserved). ✅
- Interactive playback is v1; MP4 deferred. ✅
