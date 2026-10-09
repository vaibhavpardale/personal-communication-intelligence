// Heed's service worker. It does not cache anything (mail must always be live); it exists so the
// browser treats Heed as an installable app, and is the place web-push handling will go.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
