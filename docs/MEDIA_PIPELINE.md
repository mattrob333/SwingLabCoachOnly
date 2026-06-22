# Media Pipeline

**Status:** Wave 2 complete (upload → storage + VideoAsset). Render = manifest composition (interactive playback is v1; MP4 export deferred).
**Last synced:** 2026-06-22

## Upload (built)
- Parent upload flow writes the video file through the **env-gated storage adapter** (`lib/storage/`: mock filesystem ↔ Supabase Storage) and creates a `VideoAsset` record on upload.
- `lib/video-assets.ts` facade + `lib/repositories/{in-memory,supabase}-video-assets.ts`.
- Audio voice notes upload via `POST /api/submissions/[id]/audio` → `AudioAsset`.

## Storage adapter
- `lib/storage/types.ts` — `StorageAdapter` interface (put/get/url/delete)
- `lib/storage/mock-storage.ts` — local dev fallback
- `lib/storage/supabase-storage.ts` — Supabase Storage (live when `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` present)
- `lib/storage/index.ts` — env-gated factory

## Review render (v1 = manifest, not MP4)
After a coach finishes a review, the **LessonPlaybackManifest** composes: original video reference, coach audio per note, freeze-frame thumbnails, annotation strokes, timecodes, AI summary/titles. The parent lesson page plays this interactively (`components/lesson/lesson-playback-player.tsx`). Per the consensus plan, full server-side MP4 rendering is **deferred** — interactive playback is the v1 lesson format.

- `lib/render/pipeline.ts`, `lib/render/store.ts` — manifest composition + status transitions (`rendering` → `completed`)
- `app/api/submissions/[id]/render` — render trigger

## Pending
- Wave 5 player polish (chapters, thumbnails, transcript, speed, jump-to-note).
- MP4 export (post-pilot, if proven necessary).
- Live storage requires Supabase keys; until then files persist via mock storage.
