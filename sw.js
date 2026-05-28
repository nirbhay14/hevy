// sw.js - Service Worker for Offline Gym Use
const CACHE_NAME = "hevy-clone-v5";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./db.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "https://unpkg.com/dexie@latest/dist/dexie.js",
  "https://unpkg.com/lucide@latest",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
];

// Install Event - Caching all core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First falling back to Cache strategy
self.addEventListener("fetch", (event) => {
  // 1. Only intercept GET requests (never intercept POST sync requests)
  if (event.request.method !== "GET") {
    return;
  }
  
  // 2. Do NOT intercept Google Apps Script sync API calls!
  if (event.request.url.includes("script.google.com") || event.request.url.includes("googleusercontent.com")) {
    return;
  }

  // 3. Avoid caching non-HTTP requests (like browser extension calls)
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes("unpkg.com") && 
      !event.request.url.includes("googleapis.com") && 
      !event.request.url.includes("gstatic.com")) {
    return;
  }
  
  // 4. Network First with Cache Fallback
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      // If network request succeeds, cache the updated asset and return it
      if (networkResponse && networkResponse.status === 200) {
        const responseCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
      }
      return networkResponse;
    }).catch(() => {
      // If network fails (offline), fall back to Cache
      return caches.match(event.request);
    })
  );
});
