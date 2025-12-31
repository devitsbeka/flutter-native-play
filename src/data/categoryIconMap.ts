// Direct mapping from app category IDs to icon library slugs
// These are used for instant lookups without keyword matching

export const CATEGORY_ICON_SLUGS: Record<string, string> = {
  // Classic categories
  'georgia': 'globe',
  'world_history': 'scroll',
  'geography': 'compass',
  'science': 'microscope',
  'sports': 'trophy',
  
  // Fun categories
  'movies': 'clapperboard',
  'tv_shows': 'television',
  'music': 'headphones',
  'video_games': 'gamepad',
  'celebrities': 'star',
  'memes': 'smile',
  
  // Educational categories
  'literature': 'book',
  'art': 'palette',
  'technology': 'laptop',
  'nature': 'tree',
  'space': 'rocket',
  'mythology': 'crown',
};

// Fallback emojis for categories (used when no icon is found)
export const CATEGORY_FALLBACK_EMOJIS: Record<string, string> = {
  'georgia': '🇬🇪',
  'world_history': '📜',
  'geography': '🌍',
  'science': '🔬',
  'sports': '🏆',
  'movies': '🎬',
  'tv_shows': '📺',
  'music': '🎵',
  'video_games': '🎮',
  'celebrities': '⭐',
  'memes': '😂',
  'literature': '📚',
  'art': '🎨',
  'technology': '💻',
  'nature': '🌿',
  'space': '🚀',
  'mythology': '👑',
};

// Get the fallback emoji for a category
export function getCategoryFallbackEmoji(categoryId: string): string {
  return CATEGORY_FALLBACK_EMOJIS[categoryId] || '❓';
}

// Get the preferred icon slug for a category
export function getCategoryIconSlug(categoryId: string): string | null {
  return CATEGORY_ICON_SLUGS[categoryId] || null;
}
