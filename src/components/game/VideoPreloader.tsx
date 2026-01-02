import { MAP_VIDEOS, getAllVideoUrls } from "@/config/videoConfig";

// Re-export MAP_VIDEOS for backward compatibility
export { MAP_VIDEOS };

// Global video preloading state
let videosLoaded = false;
let preloadingStarted = false;
const videoLoadCallbacks: (() => void)[] = [];

// Store blob URLs for preloaded videos
const videoBlobUrls: Map<string, string> = new Map();

// Check if videos are loaded
export function areVideosLoaded(): boolean {
  return videosLoaded;
}

// Get blob URL for a video (returns original URL if not cached)
export function getVideoBlobUrl(originalUrl: string): string {
  return videoBlobUrls.get(originalUrl) || originalUrl;
}

// Register callback for when videos are loaded
export function onVideosLoaded(callback: () => void): void {
  if (videosLoaded) {
    callback();
  } else {
    videoLoadCallbacks.push(callback);
  }
}

// Mark loading as complete
function markComplete() {
  if (!videosLoaded) {
    videosLoaded = true;
    videoLoadCallbacks.forEach((cb) => cb());
    videoLoadCallbacks.length = 0;
  }
}

// Start preloading immediately (called at module load time)
export function startVideoPreload(): void {
  if (preloadingStarted) return;
  preloadingStarted = true;

  const videoUrls = getAllVideoUrls();
  let loadedCount = 0;
  const totalVideos = videoUrls.length;

  const checkAllLoaded = () => {
    loadedCount++;
    if (loadedCount >= totalVideos) {
      markComplete();
    }
  };

  // Use fetch + blob for better caching
  videoUrls.forEach(async (url) => {
    try {
      const response = await fetch(url, { 
        cache: 'force-cache',
        priority: 'high' as RequestPriority
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        videoBlobUrls.set(url, blobUrl);
      }
      checkAllLoaded();
    } catch {
      // Fallback: just mark as loaded, will use original URL
      checkAllLoaded();
    }
  });

  // Global fallback timeout - don't block forever
  setTimeout(() => {
    markComplete();
  }, 12000);
}

// Start preloading immediately when this module is imported
startVideoPreload();

// Empty component for backward compatibility
export function VideoPreloader() {
  return null;
}
