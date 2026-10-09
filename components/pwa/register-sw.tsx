"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds only, so development stays easy to reason about. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* installability is a nicety; the app works without it */
      });
    }
  }, []);
  return null;
}
