// Centralized video configuration for preloading and display

// Map/Adventure videos
export const MAP_VIDEOS = {
  default: "/videos/floating-blob.mp4",
  videoB: "/videos/map-video-b.mp4",
  videoC: "/videos/map-video-c.mp4",
};

// Category card background videos
export const CATEGORY_VIDEOS: Record<string, string> = {
  art: "/videos/art.mp4",
  georgian_history: "/videos/geo-history.mp4",
  sports: "/videos/sport-final.mp4",
  space: "/videos/galaxy.mp4",
  georgian_literature: "/videos/literature.mp4",
  psychology: "/videos/psyc.mp4",
  geography: "/videos/geography.mp4",
  science: "/videos/science.mp4",
  archaeology: "/videos/archeology.mp4",
  fun_facts: "/videos/funny-facts.mp4",
  world_history: "/videos/world-history.mp4",
};

// Get all video URLs for preloading
export function getAllVideoUrls(): string[] {
  return [
    ...Object.values(MAP_VIDEOS),
    ...Object.values(CATEGORY_VIDEOS),
  ];
}
