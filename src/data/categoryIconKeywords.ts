// AI-generated icon keywords for each category, sorted by relevance (temperature)
// These are used to search the 9k icon library for matching icons

export const CATEGORY_ICON_KEYWORDS: Record<string, string[]> = {
  // Classic (15)
  'georgian_history': ['scroll', 'castle', 'crown', 'shield', 'sword'],
  'world_history': ['scroll', 'globe', 'book', 'map', 'compass'],
  'geography': ['globe', 'earth', 'map', 'compass', 'world'],
  'science': ['microscope', 'atom', 'flask', 'beaker', 'lab'],
  'sports': ['trophy', 'medal', 'soccer', 'football', 'basketball'],
  'georgian_literature': ['book', 'quill', 'scroll', 'pen', 'library'],
  'art': ['palette', 'brush', 'easel', 'paint', 'canvas'],
  'religion_mythology': ['church', 'cross', 'temple', 'pray', 'angel'],
  'philosophy': ['brain', 'think', 'lightbulb', 'book', 'owl'],
  'archaeology': ['fossil', 'bone', 'dig', 'pyramid', 'ancient'],
  'languages': ['speech', 'bubble', 'translate', 'abc', 'language'],
  'politics': ['capitol', 'building', 'gavel', 'vote', 'government'],
  'economics': ['money', 'dollar', 'coin', 'chart', 'bank'],
  'military_history': ['sword', 'shield', 'tank', 'medal', 'cannon'],
  'architecture': ['building', 'house', 'tower', 'bridge', 'column'],
  
  // Fun (15)
  'movies': ['clapperboard', 'film', 'camera', 'movie', 'popcorn'],
  'music': ['guitar', 'music', 'note', 'headphones', 'microphone'],
  'georgian_cuisine': ['wine', 'grape', 'bread', 'food', 'pot'],
  'animals': ['lion', 'paw', 'dog', 'cat', 'animal'],
  'pop_culture': ['star', 'phone', 'selfie', 'trend', 'viral'],
  'tv_series': ['television', 'tv', 'screen', 'remote', 'couch'],
  'video_games': ['gamepad', 'controller', 'joystick', 'game', 'console'],
  'anime_manga': ['ninja', 'samurai', 'dragon', 'katana', 'anime'],
  'social_media': ['phone', 'like', 'share', 'hashtag', 'follow'],
  'fashion': ['dress', 'shirt', 'shoe', 'handbag', 'hat'],
  'fun_facts': ['lightbulb', 'star', 'sparkle', 'magic', 'wow'],
  'myths_reality': ['magnifier', 'detective', 'question', 'mystery', 'search'],
  'world_cuisine': ['chef', 'cook', 'food', 'restaurant', 'fork'],
  'celebrities': ['star', 'vip', 'crown', 'camera', 'fame'],
  'memes_internet': ['emoji', 'laugh', 'lol', 'meme', 'viral'],
  
  // Educational (15)
  'astronomy': ['telescope', 'star', 'planet', 'moon', 'rocket'],
  'biology': ['dna', 'cell', 'leaf', 'heart', 'microscope'],
  'nature': ['tree', 'leaf', 'flower', 'mountain', 'forest'],
  'geology': ['rock', 'gem', 'crystal', 'diamond', 'stone'],
  'ecology': ['recycle', 'earth', 'leaf', 'green', 'plant'],
  'space': ['rocket', 'astronaut', 'planet', 'satellite', 'ufo'],
  'math': ['calculator', 'plus', 'formula', 'pi', 'number'],
  'medicine': ['stethoscope', 'heart', 'pill', 'doctor', 'hospital'],
  'programming': ['code', 'terminal', 'laptop', 'developer', 'bug'],
  'robotics_ai': ['robot', 'ai', 'chip', 'circuit', 'android'],
  'technology': ['laptop', 'computer', 'chip', 'phone', 'gadget'],
  'physics': ['atom', 'magnet', 'energy', 'wave', 'electron'],
  'psychology': ['brain', 'mind', 'head', 'think', 'emotion'],
  'georgian_culture': ['wine', 'dance', 'music', 'grape', 'tradition'],
  'chemistry': ['beaker', 'flask', 'atom', 'molecule', 'test'],
};

// Get keywords for a category
export function getCategoryKeywords(categoryId: string): string[] {
  return CATEGORY_ICON_KEYWORDS[categoryId] || ['question', 'quiz', 'trivia', 'game', 'play'];
}
