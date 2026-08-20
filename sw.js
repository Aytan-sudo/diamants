const CACHE = 'diamants-v2';
const FICHIERS = [
  './',
  './index.html',
  './css/palettes.css',
  './css/plateau.css',
  './css/interface.css',
  './js/app.js',
  './js/moteur.js',
  './js/alea.js',
  './js/objectifs.js',
  './js/partage.js',
  './js/rendu.js',
  './js/son.js',
  './js/themes.js',
  './js/storage.js',
  './manifest.webmanifest',
  './assets/icon.svg',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((cle) => cle !== CACHE).map((cle) => caches.delete(cle))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evenement) => {
  if (evenement.request.method !== 'GET') return;
  if (new URL(evenement.request.url).origin !== self.location.origin) return;

  evenement.respondWith(
    caches.match(evenement.request).then((garde) => garde || fetch(evenement.request).then((reponse) => {
      if (!reponse || reponse.status !== 200 || reponse.type === 'opaque') return reponse;
      const copie = reponse.clone();
      caches.open(CACHE).then((cache) => cache.put(evenement.request, copie));
      return reponse;
    })),
  );
});
