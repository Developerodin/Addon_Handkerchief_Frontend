/* Addon PWA install worker. Network stays the source of truth. */
const SW_VERSION = "addon-pwa-1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  /* Empty on purpose. Chromium requires a fetch handler before it will install the app. */
});

void SW_VERSION;
