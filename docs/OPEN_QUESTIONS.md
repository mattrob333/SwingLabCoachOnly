# Open Questions

## Question: Preferred backend (Supabase vs Firebase vs custom)
**Why it matters:** Affects data model, auth, storage, and real-time capabilities.
**Possible options:** Supabase (recommended in PRD), Firebase, Convex, custom Nest.js/Postgres.
**Recommended default:** Supabase.
**Needs user decision:** no (can proceed and adjust later)

## Question: Exact video storage + transcoding provider for MVP
**Why it matters:** Impacts media pipeline cost and complexity.
**Recommended default:** Supabase Storage + Mux or Cloudflare Stream for playback.
**Needs user decision:** no
