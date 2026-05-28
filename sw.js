// sw.js - Service Worker for Offline Gym Use
const CACHE_NAME = "hevy-clone-v3";
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

// Fetch Event - Cache first strategy with network fallback
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
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset immediately, but trigger a fetch in the background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => { /* Silence network fetch errors when offline */ });
        
        return cachedResponse;
      }
      
      // Fallback to network
      return fetch(event.request).then((networkResponse) => {
        // Cache newly fetched assets
        if (networkResponse && networkResponse.status === 200 && event.request.method === "GET") {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        }
        return networkResponse;
      });
    })
  );
});
