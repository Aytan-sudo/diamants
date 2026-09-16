// Réseau d'abord, cache en secours.
//
// Une mise à jour publiée arrive donc sans manœuvre du joueur, et le cache ne
// prend le relais que hors ligne. L'ordre inverse — cache d'abord — servait des
// fichiers périmés jusqu'à ce qu'on vide le stockage, et pire encore en local :
// tous les jeux partageant `localhost`, un service worker cache-first sert ses
// propres fichiers aux autres jeux de la même origine.
//
// Le nom du cache porte la version exacte de package.json : changer de version,
// c'est changer de cache, et l'ancien est purgé à l'activation.
const VERSION = 'diamants-1.3.2';
const COQUILLE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/palettes.css',
  'css/plateau.css',
  'css/interface.css',
  'js/app.js',
  'js/alea.js',
  'js/config.js',
  'js/moteur.js',
  'js/objectifs.js',
  'js/partage.js',
  'js/rendu.js',
  'js/son.js',
  'js/storage.js',
  'js/themes.js',
  'assets/icon.svg',
  'assets/icon-180.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((cle) => cle.startsWith('diamants-') && cle !== VERSION).map((cle) => caches.delete(cle))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evenement) => {
  if (evenement.request.method !== 'GET') return;
  evenement.respondWith(
    fetch(evenement.request)
      .then((reponse) => {
        if (reponse.ok && new URL(evenement.request.url).origin === location.origin) {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put(evenement.request, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(evenement.request).then((reponse) => reponse || caches.match('./'))),
  );
});
