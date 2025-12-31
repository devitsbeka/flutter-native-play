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

// Get the preferred icon slug for a category - NO EMOJI FALLBACKS
export function getCategoryIconSlug(categoryId: string): string | null {
  return CATEGORY_ICON_SLUGS[categoryId] || null;
}

// Legacy function - returns empty string to force icon lookup
export function getCategoryFallbackEmoji(categoryId: string): string {
  // Return empty string - we want icons, not emojis
  return '';
}
