// Direct mapping from category_id (from database) to icon library slugs
// This is the most reliable mapping - uses ASCII category IDs

// PRIMARY MAPPING: category_id → icon slug (45 total)
export const CATEGORY_ID_TO_ICON: Record<string, string> = {
  // General
  'general': 'lightbulb',

  // Party (multiplayer-only vote categories)
  'most_likely_to': 'group-of-people',

  // Classic (15)
  'archaeology': 'fossil',
  'architecture': 'building',
  'geography': 'globe',
  'economics': 'money',
  'languages': 'book',
  'science': 'microscope',
  'world_history': 'scroll',
  'politics': 'building',
  'religion_mythology': 'church',
  'military_history': 'sword',
  'georgian_history': 'scroll',
  'sports': 'trophy',
  'philosophy': 'book',
  'georgian_literature': 'book',
  'art': 'artist-palette',
  
  // Educational (15)
  'astronomy': 'telescope',
  'biology': 'dna',
  'nature': 'tree',
  'geology': 'rock',
  'ecology': 'recycle',
  'space': 'rocket',
  'math': 'calculator',
  'medicine': 'stethoscope',
  'programming': 'code',
  'robotics_ai': 'robot',
  'technology': 'laptop',
  'physics': 'atom',
  'psychology': 'brain',
  'georgian_culture': 'glass-of-red-wine',
  'chemistry': 'beaker',
  
  // Fun (15)
  'anime_manga': 'ninja',
  'video_games': 'game-controller',
  'movies': 'movie-clapperboard',
  'memes_internet': 'emoji-pin',
  'myths_reality': 'magnifying-glass',
  'fashion': 'dress',
  'world_cuisine': 'chef',
  'music': 'guitar',
  'pop_culture': 'smartphone',
  'fun_facts': 'lightbulb',
  'tv_series': 'television',
  'social_media': 'smartphone',
  'georgian_cuisine': 'glass-of-red-wine',
  'celebrities': 'star',
  'animals': 'lion',
};

// Legacy mapping (kept for backward compatibility)
export const CATEGORY_ICON_SLUGS: Record<string, string> = {
  // General
  'general': 'lightbulb',

  // Party
  'most_likely_to': 'group-of-people',

  // Classic/Educational
  'geography': 'globe',
  'world_history': 'scroll',
  'georgian_history': 'scroll',
  'science': 'microscope',
  'sports': 'trophy',
  
  // Fun/Entertainment
  'movies': 'movie-clapperboard',
  'tv_series': 'television',
  'music': 'guitar',
  'video_games': 'game-controller',
  'celebrities': 'star',
  'memes_internet': 'emoji-pin',
  'anime_manga': 'ninja',
  'pop_culture': 'smartphone',
  'social_media': 'smartphone',
  'fun_facts': 'lightbulb',
  
  // Educational/Academic
  'literature': 'book',
  'georgian_literature': 'book',
  'art': 'artist-palette',
  'technology': 'laptop',
  'nature': 'tree',
  'space': 'rocket',
  'animals': 'lion',
  'math': 'calculator',
  'physics': 'atom',
  'chemistry': 'beaker',
  'biology': 'dna',
  'astronomy': 'telescope',
  'geology': 'rock',
  'ecology': 'recycle',
  'medicine': 'stethoscope',
  'psychology': 'brain',
  'philosophy': 'book',
  'economics': 'money',
  'politics': 'building',
  'languages': 'book',
  'archaeology': 'fossil',
  'architecture': 'building',
  'military_history': 'sword',
  'religion_mythology': 'church',
  'myths_reality': 'magnifying-glass',
  
  // Georgian Culture
  'georgian_culture': 'glass-of-red-wine',
  'georgian_cuisine': 'glass-of-red-wine',
  'world_cuisine': 'chef',
  
  // Tech & Innovation
  'programming': 'code',
  'robotics_ai': 'robot',
  'fashion': 'dress',
};

// Map Georgian category names to English category slugs
export const GEORGIAN_CATEGORY_SLUGS: Record<string, string> = {
  // General
  'ზოგადი ცოდნა': 'general',
  'ზოგადი': 'general',
  
  // Classic (exact names from database)
  'არქეოლოგია': 'archaeology',
  'არქიტექტურა': 'architecture',
  'გეოგრაფია': 'geography',
  'ეკონომიკა': 'economics',
  'ენები და ლინგვისტიკა': 'languages',
  'მეცნიერება': 'science',
  'მსოფლიო ისტორია': 'world_history',
  'პოლიტიკა': 'politics',
  'რელიგია და მითოლოგია': 'religion_mythology',
  'სამხედრო ისტორია': 'military_history',
  'საქართველოს ისტორია': 'georgian_history',
  'სპორტი': 'sports',
  'ფილოსოფია': 'philosophy',
  'ქართული ლიტერატურა': 'georgian_literature',
  'ხელოვნება': 'art',
  
  // Educational (exact names from database)
  'ასტრონომია': 'astronomy',
  'ბიოლოგია': 'biology',
  'ბუნება': 'nature',
  'გეოლოგია': 'geology',
  'ეკოლოგია': 'ecology',
  'კოსმოსი': 'space',
  'მათემატიკა': 'math',
  'მედიცინა და ჯანმრთელობა': 'medicine',
  'პროგრამირება': 'programming',
  'რობოტიკა და AI': 'robotics_ai',
  'ტექნოლოგიები': 'technology',
  'ფიზიკა': 'physics',
  'ფსიქოლოგია': 'psychology',
  'ქართული კულტურა': 'georgian_culture',
  'ქიმია': 'chemistry',
  
  // Fun (exact names from database)
  'ანიმე და მანგა': 'anime_manga',
  'ვიდეო თამაშები': 'video_games',
  'კინო': 'movies',
  'მემები და ინტერნეტი': 'memes_internet',
  'მითები თუ რეალობა': 'myths_reality',
  'მოდა და სტილი': 'fashion',
  'მსოფლიო სამზარეულო': 'world_cuisine',
  'მუსიკა': 'music',
  'პოპ კულტურა': 'pop_culture',
  'სახალისო ფაქტები': 'fun_facts',
  'სერიალები': 'tv_series',
  'სოციალური მედია': 'social_media',
  'ქართული სამზარეულო': 'georgian_cuisine',
  'ცნობილი ადამიანები': 'celebrities',
  'ცხოველები': 'animals',
};

/**
 * The national categories are <language>_<subject> — french_history,
 * german_cuisine, portuguese_literature. Twenty of them, none with an
 * `icon_slug` in the database and none named above, and the count grows every
 * time a language is added.
 *
 * The subject is what the picture should show; which language is asking is
 * carried by the question, not by the icon. Without this they reach
 * DynamicIcon as an id it cannot place, and its last resort is an icon chosen
 * by hashing that id — stable, and unrelated to the subject.
 *
 * Only consulted after the exact lookups above, so a category that names its
 * own icon keeps it: military_history stays a sword rather than becoming a
 * scroll.
 */
const SUBJECT_ICON_SLUGS: Record<string, string> = {
  history: 'scroll',
  literature: 'book',
  cuisine: 'chef',
  culture: 'theater',
};

// Get the preferred icon slug for a category - supports both English slugs and Georgian names
export function getCategoryIconSlug(categoryIdOrName: string): string | null {
  // First try direct slug lookup
  if (CATEGORY_ICON_SLUGS[categoryIdOrName]) {
    return CATEGORY_ICON_SLUGS[categoryIdOrName];
  }

  // Then try Georgian name mapping
  const englishSlug = GEORGIAN_CATEGORY_SLUGS[categoryIdOrName];
  if (englishSlug && CATEGORY_ICON_SLUGS[englishSlug]) {
    return CATEGORY_ICON_SLUGS[englishSlug];
  }

  // Finally, <language>_<subject> — see SUBJECT_ICON_SLUGS.
  const subject = categoryIdOrName.split('_').pop();
  if (subject && SUBJECT_ICON_SLUGS[subject]) {
    return SUBJECT_ICON_SLUGS[subject];
  }

  return null;
}

// Legacy function - returns empty string to force icon lookup
export function getCategoryFallbackEmoji(categoryId: string): string {
  // Return empty string - we want icons, not emojis
  return '';
}
