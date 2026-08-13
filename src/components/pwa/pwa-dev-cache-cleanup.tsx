"use client";

import { useEffect } from "react";

const STALE_RUNTIME_CACHE_NAMES = new Set(["offlineCache", "offlineCache-v2"]);

/**
 * Remove a service worker/runtime cache left by an older production build when
 * running the local app. next-pwa disables registration in development, but it
 * cannot remove a registration that was created by a previous build.
 */
export function PwaDevCacheCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (cancelled) return;

      await Promise.all(
        registrations
          .filter((registration) => {
            try {
              return (
                new URL(registration.scope).origin === window.location.origin
              );
            } catch {
              return false;
            }
          })
          .map((registration) => registration.unregister()),
      );

      if (!("caches" in window)) return;
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => STALE_RUNTIME_CACHE_NAMES.has(name))
          .map((name) => caches.delete(name)),
      );
    })().catch(() => {
      // Cache cleanup is best effort and must not affect the application.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
