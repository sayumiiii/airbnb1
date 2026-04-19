const CACHE = 'careerkit-v1';
const ASSETS = [
  '/airbnb1/careerkit/',
  '/airbnb1/careerkit/index.html',
  '/airbnb1/careerkit/journal.html',
  '/airbnb1/careerkit/generate.html',
  '/airbnb1/careerkit/decoder.html',
  '/airbnb1/careerkit/css/app.css',
  '/airbnb1/careerkit/js/app.js',
  '/airbnb1/careerkit/js/decoder-data.js',
  '/airbnb1/careerkit/manifest.json',
  '/airbnb1/careerkit/icons/icon-192.png',
  '/airbnb1/careerkit/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/airbnb1/careerkit/index.html'))));
});
