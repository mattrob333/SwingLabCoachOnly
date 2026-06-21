# Decisions

## 2026-06-21 — Initial Stack Decision
**Decision:** Use Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui as the primary frontend stack.
**Context:** PRD explicitly recommends this stack for responsive web + PWA support.
**Options considered:** Next.js vs Remix vs plain Vite + React.
**Chosen direction:** Next.js 15 App Router.
**Reason:** Best ecosystem for auth, API routes, server components, and PWA.
**Tradeoffs:** Slightly heavier than Vite, but better long-term DX and deployment.
**Date:** 2026-06-21

## 2026-06-21 — Backend & Auth
**Decision:** Start with Supabase (Postgres + Auth + Storage) as default backend.
**Context:** PRD recommends Supabase or similar.
**Chosen direction:** Supabase for MVP speed.
**Date:** 2026-06-21
