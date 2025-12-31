// Direct mapping from app category IDs to icon library slugs
// These are used for instant lookups without keyword matching

export const CATEGORY_ICON_SLUGS: Record<string, string> = {
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
  
  return null;
}

// Legacy function - returns empty string to force icon lookup
export function getCategoryFallbackEmoji(categoryId: string): string {
  // Return empty string - we want icons, not emojis
  return '';
}
