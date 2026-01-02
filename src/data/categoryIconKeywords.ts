// Icon keywords for each category - matched to actual slugs in icon-library-meta.json
// These are searched in order until a match is found in the 9k icon library

export const CATEGORY_ICON_KEYWORDS: Record<string, string[]> = {
  // Classic (15) - using actual slugs from library
  'georgian_history': ['scroll', 'castle', 'crown', 'medieval', 'kingdom'],
  'georgian-history': ['scroll', 'castle', 'crown', 'medieval', 'kingdom'],
  'world_history': ['globe', 'book', 'scroll', 'ancient', 'history'],
  'geography': ['globe', 'earth', 'map', 'compass', 'world'],
  'science': ['microscope', 'flask', 'beaker', 'laboratory', 'chemistry'],
  'sports': ['trophy', 'medal', 'soccer', 'football', 'basketball'],
  'georgian_literature': ['book', 'quill', 'pen', 'notebook', 'library'],
  'georgian-literature': ['book', 'quill', 'pen', 'notebook', 'library'],
  'art': ['palette', 'brush', 'easel', 'painting', 'canvas'],
  'religion_mythology': ['church', 'temple', 'cross', 'angel', 'pray'],
  'philosophy': ['brain', 'lightbulb', 'book', 'owl', 'think'],
  'archaeology': ['fossil', 'pyramid', 'ancient', 'dig', 'bone'],
  'languages': ['speech', 'bubble', 'translate', 'book', 'alphabet'],
  'politics': ['capitol', 'government', 'gavel', 'vote', 'flag'],
  'economics': ['money', 'coin', 'bank', 'chart', 'dollar'],
  'military_history': ['sword', 'shield', 'tank', 'cannon', 'army'],
  'architecture': ['building', 'house', 'tower', 'bridge', 'column'],
  'general': ['question', 'quiz', 'book', 'lightbulb', 'star'],
  
  // Fun (15) - using actual slugs from library
  'movies': ['clapperboard', 'film', 'camera', 'popcorn', 'cinema'],
  'music': ['guitar', 'piano', 'music', 'headphones', 'microphone'],
  'georgian_cuisine': ['wine', 'grape', 'bread', 'khinkali', 'pot'],
  'georgian-cuisine': ['wine', 'grape', 'bread', 'khinkali', 'pot'],
  'animals': ['lion', 'dog', 'cat', 'paw', 'animal'],
  'pop_culture': ['star', 'phone', 'selfie', 'camera', 'sparkle'],
  'tv_series': ['television', 'tv', 'remote', 'screen', 'couch'],
  'video_games': ['gamepad', 'controller', 'joystick', 'game', 'console'],
  'anime_manga': ['ninja', 'samurai', 'dragon', 'katana', 'mask'],
  'social_media': ['phone', 'like', 'heart', 'share', 'hashtag'],
  'fashion': ['dress', 'shirt', 'shoe', 'handbag', 'hat'],
  'fun_facts': ['lightbulb', 'sparkle', 'star', 'magic', 'question'],
  'myths_reality': ['magnifier', 'detective', 'search', 'mystery', 'question'],
  'world_cuisine': ['chef', 'fork', 'restaurant', 'pot', 'food'],
  'celebrities': ['star', 'crown', 'camera', 'vip', 'trophy'],
  'memes_internet': ['emoji', 'laugh', 'phone', 'computer', 'viral'],
  
  // Educational (15) - using actual slugs from library
  'astronomy': ['telescope', 'planet', 'moon', 'star', 'rocket'],
  'biology': ['dna', 'cell', 'leaf', 'heart', 'microscope'],
  'nature': ['tree', 'leaf', 'flower', 'mountain', 'forest'],
  'geology': ['rock', 'gem', 'crystal', 'diamond', 'stone'],
  'ecology': ['recycle', 'earth', 'leaf', 'plant', 'green'],
  'space': ['rocket', 'astronaut', 'planet', 'satellite', 'moon'],
  'math': ['calculator', 'formula', 'plus', 'number', 'pi'],
  'medicine': ['stethoscope', 'heart', 'pill', 'hospital', 'doctor'],
  'programming': ['code', 'terminal', 'laptop', 'computer', 'developer'],
  'robotics_ai': ['robot', 'chip', 'circuit', 'android', 'ai'],
  'technology': ['laptop', 'computer', 'phone', 'chip', 'gadget'],
  'physics': ['atom', 'magnet', 'energy', 'wave', 'electron'],
  'psychology': ['brain', 'head', 'mind', 'think', 'emotion'],
  'georgian_culture': ['wine', 'dance', 'grape', 'music', 'tradition'],
  'chemistry': ['beaker', 'flask', 'atom', 'molecule', 'test-tube'],
};

// Get keywords for a category - also handles hyphen vs underscore variants
export function getCategoryKeywords(categoryId: string): string[] {
  // Try exact match first
  if (CATEGORY_ICON_KEYWORDS[categoryId]) {
    return CATEGORY_ICON_KEYWORDS[categoryId];
  }
  // Try converting hyphens to underscores
  const underscoreId = categoryId.replace(/-/g, '_');
  if (CATEGORY_ICON_KEYWORDS[underscoreId]) {
    return CATEGORY_ICON_KEYWORDS[underscoreId];
  }
  // Try converting underscores to hyphens
  const hyphenId = categoryId.replace(/_/g, '-');
  if (CATEGORY_ICON_KEYWORDS[hyphenId]) {
    return CATEGORY_ICON_KEYWORDS[hyphenId];
  }
  return ['question', 'quiz', 'book', 'game', 'star'];
}
