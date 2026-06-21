/**
 * SwingLab service worker — offline shell caching (Phase 9, PRD §31 #19).
 *
 * Strategy:
 * - On install: pre-cache the app shell (manifest, icon).
 * - On fetch: network-first for navigations (so users get fresh HTML when
 *   online, falling back to cached shell offline); cache-first for same-origin
 *   static assets; pass-through for cross-origin.
 * - On activate: clean up old cache versions.
 *
 * MVP: this is a progressive-enhancement shell. It does not cache dynamic API
 * responses or large media — those require explicit user action and would blow
 * the quota on a phone. The goal is "app opens and shows something offline,"
 * not full offline review.
 */

const CACHE_VERSION = "swinglab-v1";
const APP_SHELL = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Same-origin static assets: cache-first, then network + cache.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
