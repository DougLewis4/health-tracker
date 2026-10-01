// Service worker: keeps a copy of the app's files on the device so it opens without signal.
// Your workout data is cached separately by Firebase; this only handles the app itself.
const CACHE = "vitruvius-app-v1";

// Hosts whose files make up the app (page, code, fonts, charting). Firebase's database and
// sign-in traffic, and WHOOP, are deliberately not listed — those must always go to the network.
const STATIC_HOSTS = [self.location.host, "www.gstatic.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!STATIC_HOSTS.includes(url.host)) return;

  // The page itself: always try for the newest version first (skipping the browser's
  // 10-minute cache), and fall back to the saved copy when offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-cache" });
        const cache = await caches.open(CACHE);
        cache.put("./", fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Everything else: serve the saved copy instantly and refresh it in the background
  const network = (async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch(req);
    // Fonts CSS and the chart library load without CORS, so they come back "opaque" (unreadable
    // but still usable); keep those too or the app would open offline without them
    if (res.ok || res.type === "opaque") {
      // Drop older versions of the same file (e.g. app.js?v=7 once app.js?v=8 arrives)
      if (url.host === self.location.host) {
        for (const old of await cache.keys()) {
          const o = new URL(old.url);
          if (o.pathname === url.pathname && o.search !== url.search) await cache.delete(old);
        }
      }
      await cache.put(req, res.clone());
    }
    return res;
  })();
  event.waitUntil(network.catch(() => {}));
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try { return await network; } catch (e) { return Response.error(); }
  })());
});
