// Centralized video configuration for preloading and display

// Map/Adventure videos
export const MAP_VIDEOS = {
  default: "/videos/floating-blob.mp4",
  videoB: "/videos/map-video-b.mp4",
  videoC: "/videos/map-video-c.mp4",
};

// Category card background videos - v3 cache bust for updated files
export const CATEGORY_VIDEOS: Record<string, string> = {
  art: "/videos/art.mp4?v=2",
  georgian_history: "/videos/geo-history.mp4?v=2",
  sports: "/videos/sport-final.mp4?v=2",
  space: "/videos/galaxy.mp4",
  georgian_literature: "/videos/literature.mp4?v=2",
  psychology: "/videos/psyc.mp4",
  geography: "/videos/geography.mp4",
  science: "/videos/science.mp4",
  archaeology: "/videos/archeology.mp4",
  fun_facts: "/videos/funny-facts.mp4",
  world_history: "/videos/world-history.mp4",
  animals: "/videos/animals.mp4",
  anime: "/videos/anime.mp4",
  anime_manga: "/videos/anime.mp4",
  architecture: "/videos/architecture.mp4",
  economics: "/videos/economics.mp4",
  fashion: "/videos/fashion.mp4",
  math: "/videos/mathematics.mp4",
  mathematics: "/videos/mathematics.mp4",
  military_history: "/videos/military-history.mp4",
  movies: "/videos/movies.mp4",
  music: "/videos/music.mp4",
  tv_shows: "/videos/tvshows.mp4",
  tv_series: "/videos/tvshows.mp4",
  biology: "/videos/biology.mp4",
  memes: "/videos/memes.mp4",
  memes_internet: "/videos/memes.mp4",
  technology: "/videos/modern-technologies.mp4",
  modern_technologies: "/videos/modern-technologies.mp4",
  myths_or_reality: "/videos/myths-or-reality.mp4",
  myths_reality: "/videos/myths-or-reality.mp4",
  paparazzi: "/videos/paparazzi.mp4",
  celebrities: "/videos/paparazzi.mp4",
  astronomy: "/videos/astrology.mp4",
  chemistry: "/videos/chemistry.mp4",
  medicine: "/videos/medicine.mp4",
  robotics_ai: "/videos/robotics-ai.mp4",
  social_media: "/videos/social-media.mp4",
  coding: "/videos/coding.mp4",
  ecology: "/videos/ecology.mp4",
  religion: "/videos/religion.mp4",
  religion_mythology: "/videos/religion.mp4",
};

// Get all video URLs for preloading
export function getAllVideoUrls(): string[] {
  return [
    ...Object.values(MAP_VIDEOS),
    ...Object.values(CATEGORY_VIDEOS),
  ];
}
