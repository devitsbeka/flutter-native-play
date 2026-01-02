/**
 * Service Worker for World Quizzes
 * Caches video files for instant return visits
 */

const CACHE_NAME = 'worldquizzes-videos-v1';
const VIDEO_CACHE_URLS = [];

// Dynamically build video URLs from the config
// This will cache any video that matches /videos/*.mp4
const VIDEO_URL_PATTERN = /\/videos\/.*\.mp4/;

// Install event - pre-cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('worldquizzes-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy for videos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle video requests
  if (!VIDEO_URL_PATTERN.test(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try to get from cache first
      const cachedResponse = await cache.match(event.request);
      
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', url.pathname);
        return cachedResponse;
      }

      // Not in cache, fetch from network
      console.log('[SW] Fetching from network:', url.pathname);
      
      try {
        const networkResponse = await fetch(event.request);
        
        // Cache the response for future use
        if (networkResponse.ok) {
          // Clone the response since we need to use it and cache it
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.error('[SW] Fetch failed:', error);
        throw error;
      }
    })
  );
});

// Message handler for manual cache operations
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_VIDEOS') {
    const urls = event.data.urls || [];
    
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching videos:', urls.length);
        return Promise.all(
          urls.map((url) => 
            fetch(url)
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch((err) => console.warn('[SW] Failed to cache:', url, err))
          )
        );
      })
    );
  }
  
  if (event.data.type === 'GET_CACHE_STATUS') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.ports[0].postMessage({
          cachedCount: keys.length,
          cachedUrls: keys.map(k => k.url)
        });
      });
    });
  }
});
