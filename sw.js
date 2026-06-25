/* OCTAGON service worker — strictly network-first.
   While online, the freshest app is ALWAYS fetched from the network and the cache is
   only used as an offline fallback. This guarantees users never get stuck on a stale
   build. skipWaiting + clients.claim make every update take effect immediately. */
const C = 'octagon-v4';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e && e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r, { cache: 'no-store' });
      if (res && res.ok) {
        const cp = res.clone();
        caches.open(C).then(c => { try { c.put(r, cp); } catch (_) {} });
      }
      return res;
    } catch (_) {
      const cached = await caches.match(r);
      return cached || Response.error();
    }
  })());
});
