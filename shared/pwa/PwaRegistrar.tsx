"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so Chromium treats the site as installable.
 * The worker does not cache responses.
 */
export default function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.error("PWA service worker registration failed", error);
      }
    };

    void register();
  }, []);

  return null;
}
