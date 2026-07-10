const CACHE = 'kharcha-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

// Precache the whole app on install so it works with no signal from then on.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Drop old versions when a new one activates.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // The live exchange-rate API is another origin — never cache, just try the network.
  // If offline it fails quietly and the app keeps using its last saved rate.
  if (url.origin !== location.origin) return;

  // Opening the app (a navigation): serve the saved copy from the phone INSTANTLY,
  // and quietly refresh it in the background for next time. Works fully offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(cached => {
        const fresh = fetch(req).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Everything else (icons, manifest): from cache first, refresh in background.
  e.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
