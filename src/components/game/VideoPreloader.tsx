import { MAP_VIDEOS, getAllVideoUrls } from "@/config/videoConfig";

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
let sessionPreloadComplete = false; // Track if we already preloaded this session
const videoLoadCallbacks: (() => void)[] = [];
const progressCallbacks: ProgressCallback[] = [];

// Store blob URLs for preloaded videos
const videoBlobUrls: Map<string, string> = new Map();

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
  }
}

// Load a single video and return blob URL
async function loadVideo(url: string): Promise<void> {
  try {
    const response = await fetch(url, { 
      cache: 'force-cache',
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      videoBlobUrls.set(url, blobUrl);
    }
  } catch {
    // Silently fail - will use original URL
  }
}

// Load videos in batches to respect browser connection limits
async function loadVideosInBatches(
  urls: string[], 
  batchSize: number = 6
): Promise<void> {
  const total = urls.length;
  let loaded = 0;
  
  updateProgress(0, total, urls[0] || '');
  
  // Process in batches
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    // Load batch in parallel
    await Promise.all(
      batch.map(async (url) => {
        await loadVideo(url);
        loaded++;
        updateProgress(loaded, total, url);
      })
    );
  }
}

// Check if Service Worker has cached videos
async function checkServiceWorkerCache(): Promise<boolean> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        const { cachedCount } = event.data;
        resolve(cachedCount > 0);
      };
      
      // Timeout if no response
      setTimeout(() => resolve(false), 500);
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }
  return false;
}

// Start preloading immediately (called at module load time)
export async function startVideoPreload(): Promise<void> {
  if (preloadingStarted) return;
  preloadingStarted = true;

  const videoUrls = getAllVideoUrls();
  const total = videoUrls.length;
  
  updateProgress(0, total, '');

  // Check if videos are already cached by Service Worker
  const hasCachedVideos = await checkServiceWorkerCache();
  
  if (hasCachedVideos) {
    // Videos are already in SW cache - skip blob URL creation entirely
    // The SW will serve them instantly on demand
    sessionPreloadComplete = true;
    markComplete();
    return;
  }

  // No SW cache - load from network with priority
  const mapVideoUrls = Object.values(MAP_VIDEOS);
  const categoryVideoUrls = videoUrls.filter(url => !mapVideoUrls.includes(url));
  
  // Load map videos first (user sees these immediately)
  await loadVideosInBatches(mapVideoUrls, 3);
  
  // Then load category videos in larger batches
  await loadVideosInBatches(categoryVideoUrls, 6);

  sessionPreloadComplete = true;
  markComplete();
}

// Start preloading immediately when this module is imported
startVideoPreload();

// Empty component for backward compatibility
export function VideoPreloader() {
  return null;
}
