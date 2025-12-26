import { useEffect } from "react";

// Global video preloading state
let videosLoaded = false;
const videoLoadCallbacks: (() => void)[] = [];

// Map video paths
export const MAP_VIDEOS = {
  default: "/videos/map-background.mp4",
  videoB: "/videos/map-video-b.mp4",
  videoC: "/videos/map-video-c.mp4",
};

// Check if videos are loaded
export function areVideosLoaded(): boolean {
  return videosLoaded;
}

// Register callback for when videos are loaded
export function onVideosLoaded(callback: () => void): void {
  if (videosLoaded) {
    callback();
  } else {
    videoLoadCallbacks.push(callback);
  }
}

// Preloader component
export function VideoPreloader() {
  useEffect(() => {
    if (videosLoaded) return;

    const videoUrls = Object.values(MAP_VIDEOS);
    let loadedCount = 0;
    const totalVideos = videoUrls.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalVideos) {
        videosLoaded = true;
        videoLoadCallbacks.forEach((cb) => cb());
        videoLoadCallbacks.length = 0;
      }
    };

    // Create hidden video elements to preload and decode each video
    videoUrls.forEach((url) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
      
      // When video has enough data to play through
      video.addEventListener("canplaythrough", () => {
        checkAllLoaded();
        // Clean up the hidden element after a delay
        setTimeout(() => {
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
        }, 1000);
      }, { once: true });

      // Fallback timeout in case canplaythrough doesn't fire
      setTimeout(() => {
        if (loadedCount < totalVideos) {
          checkAllLoaded();
        }
      }, 8000);

      video.src = url;
      document.body.appendChild(video);
      
      // Start loading
      video.load();
    });

    // Global fallback timeout
    const fallbackTimeout = setTimeout(() => {
      if (!videosLoaded) {
        videosLoaded = true;
        videoLoadCallbacks.forEach((cb) => cb());
        videoLoadCallbacks.length = 0;
      }
    }, 10000);

    return () => {
      clearTimeout(fallbackTimeout);
    };
  }, []);

  return null;
}
