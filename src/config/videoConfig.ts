// Centralized video configuration for preloading and display
// IMPORTANT: No cache-busting query params - Service Worker handles versioning

// Map/Adventure videos
export const MAP_VIDEOS = {
  default: "/videos/floating-blob.mp4",
  videoB: "/videos/map-video-b.mp4",
  videoC: "/videos/map-video-c.mp4",
};

// Category card background videos
// Note: Removed ?v=X params - SW cache handles versioning via CACHE_NAME
export const CATEGORY_VIDEOS: Record<string, string> = {
  art: "/videos/art.mp4",
  // Filenames are the originals; the artwork was assigned the wrong way
  // round — the sword figure belongs to history and the town view to
  // culture. Swapped here rather than renaming two videos and two
  // stills, so nothing else has to be hunted down.
  georgian_history: "/videos/georgian-culture.mp4",
  sports: "/videos/sport-final.mp4",
  space: "/videos/galaxy.mp4",
  georgian_literature: "/videos/literature.mp4",
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
  programming: "/videos/coding.mp4",
  ecology: "/videos/ecology.mp4",
  nature: "/videos/nature.mp4",
  religion: "/videos/religion.mp4",
  religion_mythology: "/videos/religion.mp4",
  philosophy: "/videos/philosophy.mp4",
  physics: "/videos/physics.mp4",
  politics: "/videos/politics.mp4",
  pop_culture: "/videos/pop-culture.mp4",
  pop_culture_trends: "/videos/pop-culture.mp4",
  video_games: "/videos/video-games.mp4",
  gaming: "/videos/video-games.mp4",
  world_cuisine: "/videos/world-cuisine.mp4",
  food: "/videos/world-cuisine.mp4",
  georgian_cuisine: "/videos/georgian-cuisine.mp4",
  georgian_culture: "/videos/geo-history.mp4",
  geology: "/videos/geology.mp4",
  languages: "/videos/languages.mp4",
  linguistics: "/videos/languages.mp4",
};

// Category card first-frame images for instant loading during animations
export const CATEGORY_IMAGES: Record<string, string> = {
  art: "/images/categories/art.jpg",
  // Paired with the video swap above.
  georgian_history: "/images/categories/georgian-culture.jpg",
  sports: "/images/categories/sport.jpg",
  space: "/images/categories/galaxy.jpg",
  georgian_literature: "/images/categories/literature.jpg",
  psychology: "/images/categories/psyc.jpg",
  geography: "/images/categories/geography.jpg",
  science: "/images/categories/science.jpg",
  archaeology: "/images/categories/archeology.jpg",
  fun_facts: "/images/categories/funny-facts.jpg",
  world_history: "/images/categories/world-history.jpg",
  animals: "/images/categories/animals.jpg",
  anime: "/images/categories/anime.jpg",
  anime_manga: "/images/categories/anime.jpg",
  architecture: "/images/categories/architecture.jpg",
  economics: "/images/categories/economics.jpg",
  fashion: "/images/categories/fashion.jpg",
  math: "/images/categories/mathematics.jpg",
  mathematics: "/images/categories/mathematics.jpg",
  military_history: "/images/categories/military-history.jpg",
  movies: "/images/categories/movies.jpg",
  music: "/images/categories/music.jpg",
  tv_shows: "/images/categories/tvshows.jpg",
  tv_series: "/images/categories/tvshows.jpg",
  biology: "/images/categories/biology.jpg",
  memes: "/images/categories/memes.jpg",
  memes_internet: "/images/categories/memes.jpg",
  technology: "/images/categories/modern-technologies.jpg",
  modern_technologies: "/images/categories/modern-technologies.jpg",
  myths_or_reality: "/images/categories/myths-or-reality.jpg",
  myths_reality: "/images/categories/myths-or-reality.jpg",
  paparazzi: "/images/categories/paparazzi.jpg",
  celebrities: "/images/categories/paparazzi.jpg",
  astronomy: "/images/categories/astrology.jpg",
  chemistry: "/images/categories/chemistry.jpg",
  medicine: "/images/categories/medicine.jpg",
  robotics_ai: "/images/categories/robotics-ai.jpg",
  social_media: "/images/categories/social-media.jpg",
  coding: "/images/categories/coding.jpg",
  programming: "/images/categories/coding.jpg",
  ecology: "/images/categories/ecology.jpg",
  nature: "/images/categories/nature.jpg",
  religion: "/images/categories/religion.jpg",
  religion_mythology: "/images/categories/religion.jpg",
  philosophy: "/images/categories/philosophy.jpg",
  physics: "/images/categories/physics.jpg",
  politics: "/images/categories/politics.jpg",
  pop_culture: "/images/categories/pop-culture.jpg",
  pop_culture_trends: "/images/categories/pop-culture.jpg",
  video_games: "/images/categories/video-games.jpg",
  gaming: "/images/categories/video-games.jpg",
  world_cuisine: "/images/categories/world-cuisine.jpg",
  food: "/images/categories/world-cuisine.jpg",
  georgian_cuisine: "/images/categories/georgian-cuisine.jpg",
  georgian_culture: "/images/categories/geo-history.jpg",
  geology: "/images/categories/geology.jpg",
  languages: "/images/categories/languages.jpg",
  linguistics: "/images/categories/languages.jpg",
};

// Convert an MP4 path to its WebM equivalent (720px standard)
export function toWebmUrl(mp4Url: string): string {
  return mp4Url.replace(/\.mp4$/, ".webm");
}

// Convert an MP4 path to its mobile WebM equivalent (480px)
export function toMobileWebmUrl(mp4Url: string): string {
  const lastSlash = mp4Url.lastIndexOf("/");
  const dir = mp4Url.substring(0, lastSlash);
  const filename = mp4Url.substring(lastSlash + 1).replace(/\.mp4$/, ".webm");
  return `${dir}/mobile/${filename}`;
}

// Check if user is on a mobile-sized viewport (< 768px)
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

// Get the best video URL for current device: mobile WebM, desktop WebM, or MP4 fallback
export function getResponsiveVideoSrc(mp4Url: string): {
  webm: string;
  mp4: string;
} {
  return {
    webm: isMobileViewport() ? toMobileWebmUrl(mp4Url) : toWebmUrl(mp4Url),
    mp4: mp4Url,
  };
}

// Get all video URLs for preloading (deduplicated, viewport-aware so the
// SW cache list matches what playback actually requests).
// categoryLimit caps how many category videos are included (map videos always included).
export function getAllVideoUrls(categoryLimit?: number): string[] {
  const categoryUrls = [...new Set(Object.values(CATEGORY_VIDEOS))];
  const limitedCategoryUrls =
    categoryLimit != null ? categoryUrls.slice(0, categoryLimit) : categoryUrls;
  const uniqueMp4 = [
    ...new Set([...Object.values(MAP_VIDEOS), ...limitedCategoryUrls]),
  ];
  const toUrl = isMobileViewport() ? toMobileWebmUrl : toWebmUrl;

  return uniqueMp4.map((url) => toUrl(url));
}

// Get all MP4 URLs (for legacy/fallback preloading)
export function getAllMp4Urls(): string[] {
  const allUrls = [
    ...Object.values(MAP_VIDEOS),
    ...Object.values(CATEGORY_VIDEOS),
  ];
  return [...new Set(allUrls)];
}

// Get category image URL for instant display while video loads
export function getCategoryImageUrl(categoryId: string): string | null {
  return CATEGORY_IMAGES[categoryId] || null;
}

// Keyword patterns for mapping free-form post subjects/hashtags to a themed
// category video. Ordered most-specific first; keys must exist in CATEGORY_VIDEOS.
const SUBJECT_CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/georgian\s*cuisine|khachapuri|khinkali/, "georgian_cuisine"],
  [/georgian\s*histor/, "georgian_history"],
  [/georgian\s*literat/, "georgian_literature"],
  [/georgian|georgia|tbilisi|tradition|landmark|supra/, "georgian_culture"],
  [/social\s*media|influencer|tiktok|instagram|youtube/, "social_media"],
  [/celebrit|paparazzi|gossip/, "celebrities"],
  [/movie|film|cinema/, "movies"],
  [/\bmusic|\bsong/, "music"],
  [/pop\s*culture|\btrend/, "pop_culture"],
  [/\bmemes?\b/, "memes"],
  [/anime|manga/, "anime"],
  [/tv\s*show|series/, "tv_shows"],
  [/video\s*game|gaming|esport/, "video_games"],
  [/sport|football|soccer|basketball|olympic/, "sports"],
  [/space|galaxy|astronom|planet/, "space"],
  [/\banimal|wildlife/, "animals"],
  [/cuisine|\bfood\b|cooking/, "world_cuisine"],
  [/histor/, "world_history"],
  [/geograph/, "geography"],
  [/scien/, "science"],
  [/tech|coding|programm|software/, "technology"],
  [/\bart\b/, "art"],
];

// Map a post's subject/hashtags to a CATEGORY_VIDEOS key, or null if no match
export function subjectToCategoryKey(
  subject: string,
  hashtags: string[] = []
): string | null {
  const text = `${subject} ${hashtags.join(" ")}`.toLowerCase().trim();
  if (!text) return null;
  for (const [pattern, key] of SUBJECT_CATEGORY_PATTERNS) {
    if (pattern.test(text)) return key;
  }
  return null;
}
