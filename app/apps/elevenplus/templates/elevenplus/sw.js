/* Service worker: makes the app installable and lets it work offline once it has been opened. */
const BASE = "{{ base }}";
const CACHE = "{{ cache_name }}";
const PRECACHE = {{ precache|safe }};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("spark-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (!url.pathname.startsWith(BASE + "/")) return;       // only handle this app, not the TinySpark hub
  if (url.pathname === BASE + "/healthz" || url.pathname === BASE + "/sw.js") return;

  if (req.mode === "navigate") {                       // pages: try the network, fall back to the cache
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, {ignoreVary: true}).then((hit) => hit || caches.match(BASE + "/stumble")))
    );
    return;
  }
  // Static responses vary on Accept-Encoding, but Cache Storage holds decoded bodies.
  // Ignore that transport-only variation so media and offline navigation find precached assets.
  // Media elements request byte ranges, including during offline playback and seeking.
  if (url.pathname.startsWith(BASE + '/static/audio/') && req.headers.has('range')) {
    event.respondWith(caches.match(req, {ignoreVary: true}).then(async (hit) => {
      if (!hit) return fetch(req);
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range'));
      if (!match || (!match[1] && !match[2])) return hit;
      const data = await hit.arrayBuffer(), size = data.byteLength;
      const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start >= size || start > end) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
      return new Response(data.slice(start, end + 1), {status: 206, headers: {
        'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes',
      }});
    }));
    return;
  }
  event.respondWith(                                    // versioned assets: cache first
    caches.match(req, {ignoreVary: true}).then((hit) => hit || fetch(req).then((res) => {
      if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
