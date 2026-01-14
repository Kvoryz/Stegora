const CACHE_NAME = "stegora-v4.0";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/css/style.css",
  "/assets/iconste.png",
  "/assets/js/main.js",
  "/assets/js/app.js",
  "/assets/js/core/crypto.js",
  "/assets/js/core/steganography.js",
  "/assets/js/core/steganalysis.js",
  "/assets/js/features/hash-generator.js",
  "/assets/js/features/morse-code.js",
  "/assets/js/features/cipher.js",
  "/assets/js/ui/image-panel.js",
  "/assets/js/ui/audio-panel.js",
  "/assets/js/ui/image-tools.js",
  "/assets/js/ui/file-panel.js",
  "/assets/js/ui/crypto-panel.js",
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching all assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {});
    })
  );
});
