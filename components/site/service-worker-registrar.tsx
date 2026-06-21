"use client";

import { useEffect } from "react";

/**
 * Phase 9 — Registers the SwingLab service worker for offline app-shell
 * caching (PRD §31 build order #19). Renders nothing.
 *
 * Guarded by `serviceWorker in navigator` so SSR and browsers without SW
 * support are no-ops. Only registered in production (`next build` output) to
 * avoid caching stale dev assets during local development.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure is non-fatal — the app still works online.
      });
    };

    // Defer until after load so it doesn't compete with first paint.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
