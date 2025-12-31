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
  'movies': 'clapperboard',
  'tv_series': 'television',
  'music': 'guitar',
  'video_games': 'gamepad',
  'celebrities': 'star',
  'memes_internet': 'emoji',
  'anime_manga': 'ninja',
  'pop_culture': 'smartphone',
  'social_media': 'smartphone',
  'fun_facts': 'lightbulb',
  
  // Educational/Academic
  'literature': 'book',
  'georgian_literature': 'book',
  'art': 'palette',
  'technology': 'laptop',
  'nature': 'tree',
  'space': 'rocket',
  'animals': 'lion',
  'math': 'calculator',
  'physics': 'atom',
  'chemistry': 'flask',
  'biology': 'dna',
  'astronomy': 'telescope',
  'geology': 'rock',
  'ecology': 'recycle',
  'medicine': 'stethoscope',
  'psychology': 'brain',
  'philosophy': 'thinker',
  'economics': 'money',
  'politics': 'capitol',
  'languages': 'speech-bubble',
  'archaeology': 'fossil',
  'architecture': 'building',
  'military_history': 'sword',
  'religion_mythology': 'church',
  'myths_reality': 'magnifying-glass',
  
  // Georgian Culture
  'georgian_culture': 'wine',
  'georgian_cuisine': 'wine',
  'world_cuisine': 'chef-hat',
  
  // Tech & Innovation
  'programming': 'code',
  'robotics_ai': 'robot',
  'fashion': 'dress',
};

// Map Georgian category names to English category slugs
export const GEORGIAN_CATEGORY_SLUGS: Record<string, string> = {
  // Classic
  'მსოფლიო ისტორია': 'world_history',
  'ქართული ისტორია': 'georgian_history',
  'გეოგრაფია': 'geography',
  'მეცნიერება': 'science',
  'სპორტი': 'sports',
  'ქართული ლიტერატურა': 'georgian_literature',
  'ხელოვნება': 'art',
  'რელიგია და მითოლოგია': 'religion_mythology',
  'ფილოსოფია': 'philosophy',
  'არქეოლოგია': 'archaeology',
  'ენები და ლინგვისტიკა': 'languages',
  'პოლიტიკა': 'politics',
  'ეკონომიკა': 'economics',
  'სამხედრო ისტორია': 'military_history',
  'არქიტექტურა': 'architecture',
  
  // Fun
  'კინო': 'movies',
  'მუსიკა': 'music',
  'ქართული სამზარეულო': 'georgian_cuisine',
  'ცხოველები': 'animals',
  'პოპ კულტურა': 'pop_culture',
  'სერიალები': 'tv_series',
  'ვიდეო თამაშები': 'video_games',
  'ანიმე და მანგა': 'anime_manga',
  'სოციალური მედია': 'social_media',
  'მოდა და სტილი': 'fashion',
  'სახალისო ფაქტები': 'fun_facts',
  'მითები თუ რეალობა': 'myths_reality',
  'ცნობილი ადამიანები': 'celebrities',
  'მემები და ინტერნეტი': 'memes_internet',
  'მსოფლიო სამზარეულო': 'world_cuisine',
  
  // Educational
  'მათემატიკა': 'math',
  'ფიზიკა': 'physics',
  'ქიმია': 'chemistry',
  'ბიოლოგია': 'biology',
  'ასტრონომია': 'astronomy',
  'კოსმოსი': 'space',
  'გეოლოგია': 'geology',
  'ეკოლოგია': 'ecology',
  'მედიცინა': 'medicine',
  'ფსიქოლოგია': 'psychology',
  'ტექნოლოგია': 'technology',
  'პროგრამირება': 'programming',
  'რობოტიკა და AI': 'robotics_ai',
  'ბუნება': 'nature',
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
