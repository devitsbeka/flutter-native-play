/**
 * Service Worker for World Quizzes
 * Caches video files for instant return visits
 *
 * Version: 4 - new pop culture / social media / Georgian culture clips
 *
 * Videos are served cache-first under a versioned cache name, so replacing a
 * clip at a path that is already cached is invisible to anyone who has
 * visited before. Bump this whenever a video's contents change, not just
 * when the caching logic does — the bump is what evicts the old copy.
 */

const CACHE_NAME = 'worldquizzes-videos-v4';

// Match video requests - MP4 and WebM (including mobile/ subdirectory)
const VIDEO_URL_PATTERN = /\/videos\/.*\.(mp4|webm)$/;

// Install event - activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('worldquizzes-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
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
        return cachedResponse;
      }

      // Not in cache, fetch from network
      try {
        const networkResponse = await fetch(event.request);
        
        // Cache the response for future use
        if (networkResponse.ok && networkResponse.status === 200) {
          // Clone before caching
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Network failed - return a minimal error response
        return new Response('Video unavailable', { 
          status: 503, 
          statusText: 'Service Unavailable' 
        });
      }
    })
  );
});

// Message handler for manual cache operations
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_VIDEOS') {
    const urls = event.data.urls || [];
    
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Check which URLs are not yet cached
        const uncachedUrls = [];
        for (const url of urls) {
          const cached = await cache.match(url);
          if (!cached) {
            uncachedUrls.push(url);
          }
        }
        
        // Only fetch uncached URLs
        if (uncachedUrls.length === 0) {
          return;
        }
        
        // Cache in batches of 3 to respect connection limits
        const batchSize = 3;
        for (let i = 0; i < uncachedUrls.length; i += batchSize) {
          const batch = uncachedUrls.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (url) => {
              try {
                const response = await fetch(url);
                if (response.ok) {
                  await cache.put(url, response);
                }
              } catch {
                // Silent fail - will try again next time
              }
            })
          );
        }
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
