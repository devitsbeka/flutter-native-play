import { MAP_VIDEOS, getAllVideoUrls } from "@/config/videoConfig";
import logger from "@/utils/logger";

// Re-export MAP_VIDEOS for backward compatibility
export { MAP_VIDEOS };

// Progress tracking
export interface VideoLoadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentVideo: string;
}

type ProgressCallback = (progress: VideoLoadProgress) => void;

// Global video preloading state
let videosLoaded = false;
let preloadingStarted = false;
const videoLoadCallbacks: (() => void)[] = [];
const progressCallbacks: ProgressCallback[] = [];

// Current progress state
let currentProgress: VideoLoadProgress = {
  loaded: 0,
  total: 0,
  percentage: 0,
  currentVideo: '',
};

// Check if videos are loaded
export function areVideosLoaded(): boolean {
  return videosLoaded;
}

// Get current progress
export function getVideoLoadProgress(): VideoLoadProgress {
  return { ...currentProgress };
}

// Blob URLs removed - let SW handle caching directly
// This prevents memory duplication and simplifies architecture
export function getVideoBlobUrl(originalUrl: string): string {
  // Always return original URL - SW serves from cache if available
  return originalUrl;
}

// Register callback for when videos are loaded
export function onVideosLoaded(callback: () => void): void {
  if (videosLoaded) {
    callback();
  } else {
    videoLoadCallbacks.push(callback);
  }
}

// Register callback for progress updates
export function onVideoLoadProgress(callback: ProgressCallback): void {
  progressCallbacks.push(callback);
  // Immediately call with current progress
  callback(currentProgress);
}

// Remove progress callback
export function offVideoLoadProgress(callback: ProgressCallback): void {
  const index = progressCallbacks.indexOf(callback);
  if (index > -1) {
    progressCallbacks.splice(index, 1);
  }
}

// Update progress and notify callbacks
function updateProgress(loaded: number, total: number, currentVideo: string) {
  currentProgress = {
    loaded,
    total,
    percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
    currentVideo,
  };
  progressCallbacks.forEach(cb => cb(currentProgress));
}

// Mark loading as complete
function markComplete() {
  if (!videosLoaded) {
    videosLoaded = true;
    updateProgress(currentProgress.total, currentProgress.total, '');
    videoLoadCallbacks.forEach((cb) => cb());
    videoLoadCallbacks.length = 0;
    logger.debug('[VideoPreloader] All videos ready');
  }
}

// Check if Service Worker has cached videos
async function checkServiceWorkerCache(): Promise<{ hasCached: boolean; count: number }> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        const { cachedCount } = event.data;
        resolve({ hasCached: cachedCount > 0, count: cachedCount });
      };
      
      // Timeout if no response
      setTimeout(() => resolve({ hasCached: false, count: 0 }), 1000);
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }
  return { hasCached: false, count: 0 };
}

// Request SW to cache videos in background
function requestSwCaching(urls: string[]): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_VIDEOS',
      urls,
    });
    logger.debug('[VideoPreloader] Requested SW to cache', urls.length, 'videos');
  }
}

// Cap SW precache: map videos only.
//
// This used to be 12 category videos as well, from when a category video
// played on the Discover cards, the room pickers and the VS reveal — twelve
// of them warmed up front because you were going to meet them within a
// screen or two. A category video now plays in exactly one place, the header
// of that category's own page, one at a time and only if you open it. Paying
// for twelve downloads at launch to maybe serve one is the wrong trade on a
// phone, and it was the kind of background work that shows up as heat.
//
// They still cache on demand: the first play of a category's video puts it in
// the SW cache, so the second visit is instant.
const SW_PRECACHE_CATEGORY_LIMIT = 0;

// Start preloading - optimized for instant app readiness
export async function startVideoPreload(): Promise<void> {
  if (preloadingStarted) return;
  preloadingStarted = true;

  const videoUrls = getAllVideoUrls(SW_PRECACHE_CATEGORY_LIMIT);
  const total = videoUrls.length;
  
  updateProgress(0, total, '');
  logger.debug('[VideoPreloader] Starting preload for', total, 'videos');

  // Check if videos are already cached by Service Worker
  const { hasCached, count } = await checkServiceWorkerCache();
  
  if (hasCached && count >= total * 0.8) {
    // Most videos are cached - mark complete immediately
    logger.debug('[VideoPreloader] SW has', count, 'cached videos - ready!');
    updateProgress(total, total, '');
    markComplete();
    return;
  }

  // Some or no videos cached - trigger SW caching in background
  // But mark as ready immediately (we have first-frame images as fallback)
  requestSwCaching(videoUrls);
  
  // Simulate quick progress for UX (SW caches in background)
  const steps = 5;
  const stepDelay = 100;
  
  for (let i = 1; i <= steps; i++) {
    await new Promise(r => setTimeout(r, stepDelay));
    updateProgress(Math.floor((i / steps) * total), total, '');
  }
  
  markComplete();
}

// Skip background video precaching on constrained connections
function shouldSkipPreload(): boolean {
  const conn = (navigator as any).connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || String(conn.effectiveType || "").includes("2g");
}

// Defer preloading past initial startup work instead of running at import time
function scheduleVideoPreload(): void {
  if (shouldSkipPreload()) {
    // Don't burn data - mark ready immediately so splash/consumers proceed
    preloadingStarted = true;
    markComplete();
    return;
  }

  const start = () => {
    startVideoPreload();
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(start, { timeout: 3000 });
  } else {
    setTimeout(start, 3000);
  }
}

scheduleVideoPreload();

// Empty component for backward compatibility
export function VideoPreloader() {
  return null;
}
