import { useState, useEffect, useCallback } from 'react';
import { GEORGIAN_CATEGORY_SLUGS } from '@/data/categoryIconMap';

interface IconItem {
  title: string;
  file_name: string;
  slug: string;
  category: string;
  tags: string[];
}

interface IconMatch {
  slug: string;
  title: string;
  iconUrl: string;
  matchScore: number;
}

// In-memory cache for icons (loaded from local JSON for speed)
let iconCache: IconItem[] | null = null;
let cachePromise: Promise<IconItem[]> | null = null;

// Complete category to icon slug mappings for all app categories
const CATEGORY_ICON_MAP: Record<string, string[]> = {
  // Classic/Educational
  'geography': ['globe', 'globe-earth', 'world-map', 'map', 'compass', 'earth'],
  'world_history': ['scroll', 'silk-road-map', 'papyrus-scroll', 'magic-scroll', 'castle', 'crown'],
  'georgian_history': ['scroll', 'castle', 'crown', 'church', 'wine', 'flag'],
  'science': ['microscope', 'electron-microscope', 'vintage-microscope', 'atom', 'laboratory', 'test-tube'],
  'sports': ['trophy', 'champions-league-trophy', 'motorsport-trophy', 'soccer-ball', 'basketball', 'football'],
  
  // Fun/Entertainment
  'movies': ['clapperboard', 'film-reel', 'movie-camera', 'cinema', 'popcorn', 'camera'],
  'tv_series': ['television', 'tv', 'remote-control', 'couch', 'streaming', 'screen'],
  'music': ['guitar', 'piano', 'headphones', 'microphone', 'musical-note', 'violin'],
  'video_games': ['gamepad', 'controller', 'joystick', 'arcade', 'console', 'gaming'],
  'celebrities': ['star', 'vip', 'red-carpet', 'celebrity', 'fame', 'spotlight'],
  'memes_internet': ['emoji', 'smile', 'laugh', 'viral', 'trending', 'internet'],
  'anime_manga': ['anime', 'manga', 'japanese', 'cartoon', 'cosplay', 'ninja'],
  'pop_culture': ['smartphone', 'trending', 'viral', 'influencer', 'social-media', 'hashtag'],
  'social_media': ['smartphone', 'instagram', 'twitter', 'facebook', 'tiktok', 'hashtag'],
  'fun_facts': ['lightbulb', 'brain', 'mind-blown', 'surprise', 'trivia', 'question-mark'],
  
  // Educational/Academic
  'literature': ['book', 'bookshelf', 'library', 'notebook', 'pen', 'quill'],
  'georgian_literature': ['book', 'quill', 'scroll', 'pen', 'inkwell', 'manuscript'],
  'art': ['palette', 'paint-palette', 'easel', 'brush', 'canvas', 'painting'],
  'technology': ['laptop', 'computer', 'smartphone', 'chip', 'circuit', 'robot'],
  'nature': ['tree', 'flower', 'leaf', 'mountain', 'forest', 'green-earth'],
  'space': ['rocket', 'astronaut', 'planet', 'satellite', 'galaxy', 'telescope'],
  'animals': ['lion', 'african-lion', 'elephant', 'african-elephant', 'tiger', 'bear'],
  'math': ['calculator', 'abacus', 'ruler', 'protractor', 'graph', 'equation'],
  'physics': ['atom', 'magnet', 'pendulum', 'wave', 'energy', 'electron'],
  'chemistry': ['flask', 'beaker', 'test-tube', 'molecule', 'periodic-table', 'experiment'],
  'biology': ['dna', 'cell', 'microscope', 'bacteria', 'gene', 'evolution'],
  'astronomy': ['telescope', 'planet', 'star', 'constellation', 'observatory', 'comet'],
  'geology': ['rock', 'crystal', 'volcano', 'mineral', 'fossil', 'diamond'],
  'ecology': ['recycle', 'green-earth', 'leaf', 'sustainable', 'environment', 'eco'],
  'medicine': ['stethoscope', 'hospital', 'doctor', 'nurse', 'pill', 'syringe'],
  'psychology': ['brain', 'mind', 'therapy', 'thought', 'emotion', 'psychology'],
  'philosophy': ['thinker', 'brain', 'book', 'wisdom', 'ancient', 'scroll'],
  'economics': ['money', 'coin', 'chart', 'bank', 'dollar', 'stock'],
  'politics': ['capitol', 'parliament', 'vote', 'democracy', 'government', 'flag'],
  'languages': ['speech-bubble', 'translate', 'globe', 'alphabet', 'dictionary', 'language'],
  'archaeology': ['fossil', 'artifact', 'ancient', 'dig', 'ruins', 'pottery'],
  'architecture': ['building', 'blueprint', 'skyscraper', 'house', 'column', 'dome'],
  'military_history': ['sword', 'shield', 'tank', 'cannon', 'helmet', 'battle'],
  'religion_mythology': ['church', 'temple', 'cross', 'angel', 'mythology', 'god'],
  'myths_reality': ['magnifying-glass', 'detective', 'mystery', 'truth', 'fact', 'myth'],
  
  // Georgian Culture
  'georgian_culture': ['wine', 'grape', 'dance', 'traditional', 'folk', 'costume'],
  'georgian_cuisine': ['khachapuri', 'wine', 'khinkali', 'cooking', 'food', 'restaurant'],
  'world_cuisine': ['chef-hat', 'pizza', 'sushi', 'burger', 'cooking-pot', 'restaurant'],
  
  // Tech & Innovation
  'programming': ['code', 'developer', 'programmer', 'terminal', 'computer', 'binary'],
  'robotics_ai': ['robot', 'ai', 'artificial-intelligence', 'machine', 'android', 'cyborg'],
  'fashion': ['dress', 'shirt', 'shoe', 'handbag', 'fashion', 'style'],
};

// Extended Georgian keyword mappings for better question-to-icon matching
const GEORGIAN_KEYWORD_MAP: Record<string, string[]> = {
  // Common question words
  'რა': ['question', 'what'],
  'სად': ['location', 'where', 'place'],
  'როდის': ['time', 'when', 'calendar'],
  'ვინ': ['person', 'who', 'user'],
  'რამდენი': ['number', 'count', 'calculator'],
  'რომელი': ['which', 'select', 'choice'],
  
  // Space & Astronomy
  'თანამგზავრი': ['moon', 'satellite', 'orbit', 'space'],
  'მთვარე': ['moon', 'lunar', 'crescent'],
  'მზე': ['sun', 'solar', 'star'],
  'პლანეტა': ['planet', 'globe', 'earth', 'saturn'],
  'დედამიწა': ['earth', 'globe', 'planet', 'world'],
  'კოსმოსი': ['space', 'rocket', 'astronaut', 'galaxy'],
  'ვარსკვლავი': ['star', 'sparkle', 'constellation'],
  'გალაქტიკა': ['galaxy', 'milky-way', 'space'],
  'ბუნებრივი': ['natural', 'nature', 'organic'],
  
  // Social Media & Technology
  'ინსტაგრამი': ['instagram', 'camera', 'social', 'photo'],
  'ფეისბუქი': ['facebook', 'social', 'network'],
  'ტვიტერი': ['twitter', 'bird', 'social'],
  'სნეპჩატი': ['snapchat', 'ghost', 'camera', 'social'],
  'იუთუბი': ['youtube', 'video', 'play', 'streaming'],
  'ტიკტოკი': ['tiktok', 'music', 'video', 'social'],
  'სოციალური': ['social', 'network', 'share', 'users'],
  'აპლიკაცია': ['app', 'smartphone', 'mobile'],
  'ინტერნეტი': ['internet', 'globe', 'network', 'wifi'],
  'სტორი': ['story', 'instagram', 'camera', 'social'],
  'ფუნქცია': ['feature', 'function', 'app', 'tool'],
  
  // Countries & Geography
  'საქართველო': ['georgia', 'country', 'flag', 'wine'],
  'თბილისი': ['city', 'capital', 'building', 'bridge'],
  'ქვეყანა': ['country', 'flag', 'globe', 'map'],
  'დედაქალაქი': ['capital', 'city', 'building', 'landmark'],
  'მთა': ['mountain', 'peak', 'landscape', 'climbing'],
  'ზღვა': ['sea', 'ocean', 'water', 'wave', 'beach'],
  'მდინარე': ['river', 'water', 'stream'],
  'კონტინენტი': ['continent', 'globe', 'map', 'world'],
  'ევროპა': ['europe', 'eu', 'map'],
  'აზია': ['asia', 'map', 'globe'],
  'აფრიკა': ['africa', 'map', 'safari'],
  'ამერიკა': ['america', 'usa', 'flag', 'statue'],
  
  // Culture & History
  'ისტორია': ['history', 'ancient', 'scroll', 'castle'],
  'კულტურა': ['culture', 'art', 'tradition', 'dance'],
  'მეფე': ['king', 'crown', 'throne', 'castle'],
  'დედოფალი': ['queen', 'crown', 'throne', 'castle'],
  'ომი': ['war', 'sword', 'battle', 'knight'],
  'იმპერია': ['empire', 'crown', 'castle', 'kingdom'],
  'რევოლუცია': ['revolution', 'flag', 'fist', 'protest'],
  
  // Arts & Entertainment
  'ხელოვნება': ['art', 'painting', 'brush', 'gallery'],
  'მხატვარი': ['artist', 'painting', 'brush', 'canvas'],
  'ლიტერატურა': ['book', 'writing', 'pen', 'library'],
  'პოეტი': ['poet', 'pen', 'book', 'writing'],
  'მწერალი': ['writer', 'pen', 'book', 'writing'],
  'კინო': ['movie', 'film', 'camera', 'cinema'],
  'ფილმი': ['film', 'movie', 'camera', 'clapperboard'],
  'სერიალი': ['tv', 'series', 'television', 'streaming'],
  'მსახიობი': ['actor', 'theater', 'mask', 'stage'],
  'რეჟისორი': ['director', 'camera', 'clapperboard', 'film'],
  'მომღერალი': ['singer', 'microphone', 'music', 'note'],
  'მუსიკა': ['music', 'instrument', 'note', 'guitar'],
  
  // Sports
  'სპორტი': ['sport', 'ball', 'trophy', 'athlete'],
  'ფეხბურთი': ['soccer-ball', 'football', 'goal', 'player'],
  'კალათბურთი': ['basketball', 'ball', 'hoop'],
  'ტენისი': ['tennis', 'racket', 'ball'],
  'ჩოგბურთი': ['tennis', 'racket', 'ball'],
  'რაგბი': ['rugby', 'ball', 'sports', 'player'],
  'ოლიმპიადა': ['olympics', 'medal', 'trophy', 'athlete'],
  
  // Science
  'მეცნიერება': ['science', 'atom', 'laboratory', 'research'],
  'ქიმია': ['chemistry', 'flask', 'atom', 'molecule'],
  'ფიზიკა': ['physics', 'atom', 'magnet', 'wave'],
  'ბიოლოგია': ['biology', 'dna', 'cell', 'microscope'],
  'მათემატიკა': ['math', 'calculator', 'numbers', 'formula'],
  'ელემენტი': ['element', 'atom', 'periodic', 'molecule'],
  
  // Animals
  'ცხოველი': ['animal', 'paw', 'wildlife'],
  'ძაღლი': ['dog', 'puppy', 'pet'],
  'კატა': ['cat', 'kitten', 'pet'],
  'ფრინველი': ['bird', 'feather', 'wing'],
  'თევზი': ['fish', 'ocean', 'aquarium'],
  'ლომი': ['lion', 'crown', 'king'],
  'სპილო': ['elephant', 'trunk', 'safari'],
  
  // Food & Cuisine
  'საკვები': ['food', 'cooking', 'restaurant', 'chef'],
  'ღვინო': ['wine', 'grape', 'bottle', 'glass'],
  'ეკლესია': ['church', 'cross', 'religion', 'building'],
};

// Build the icon URL from filename
function getIconUrl(fileName: string): string {
  return `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${fileName}`;
}

// Load icons from local JSON file (much faster than database)
async function loadIconIndex(): Promise<IconItem[]> {
  if (iconCache) return iconCache;
  
  if (cachePromise) return cachePromise;
  
  cachePromise = (async () => {
    try {
      const response = await fetch('/data/icon-library-meta.json');
      const data = await response.json();
      
      iconCache = data.items || [];
      console.log(`[IconLibrary] Loaded ${iconCache.length} icons from local JSON`);
      return iconCache;
    } catch (error) {
      console.error('[IconLibrary] Failed to load icon library:', error);
      return [];
    }
  })();
  
  return cachePromise;
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  const keywords: string[] = [];
  
  // Check for Georgian keyword mappings
  for (const [georgian, english] of Object.entries(GEORGIAN_KEYWORD_MAP)) {
    if (text.includes(georgian)) {
      keywords.push(...english);
    }
  }
  
  // Extract English words (3+ chars, lowercase)
  const englishWords = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);
  
  keywords.push(...englishWords);
  
  return [...new Set(keywords)]; // Remove duplicates
}

function scoreMatch(icon: IconItem, keywords: string[], category?: string): number {
  let score = 0;
  
  // Category match bonus
  if (category) {
    const categoryKeywords = CATEGORY_ICON_MAP[category.toLowerCase()] || [];
    if (categoryKeywords.includes(icon.slug)) {
      score += 100;
    }
    if (icon.category.toLowerCase() === category.toLowerCase()) {
      score += 50;
    }
  }
  
  // Exact slug match
  for (const keyword of keywords) {
    if (icon.slug === keyword) {
      score += 80;
    }
    if (icon.slug.includes(keyword)) {
      score += 40;
    }
  }
  
  // Tag matches
  for (const tag of icon.tags) {
    const tagLower = tag.toLowerCase();
    for (const keyword of keywords) {
      if (tagLower === keyword) {
        score += 30;
      } else if (tagLower.includes(keyword) || keyword.includes(tagLower)) {
        score += 15;
      }
    }
  }
  
  // Title matches
  const titleLower = icon.title.toLowerCase();
  for (const keyword of keywords) {
    if (titleLower.includes(keyword)) {
      score += 20;
    }
  }
  
  return score;
}

export function useIconLibrary() {
  const [iconIndex, setIconIndex] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIconIndex().then(icons => {
      setIconIndex(icons);
      setIsLoading(false);
    });
  }, []);

  const findIcon = useCallback((
    keywords: string[],
    category?: string
  ): IconMatch | null => {
    if (iconIndex.length === 0 || keywords.length === 0) return null;
    
    let bestMatch: IconItem | null = null;
    let bestScore = 0;
    
    for (const icon of iconIndex) {
      const score = scoreMatch(icon, keywords, category);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = icon;
      }
    }
    
    if (bestMatch && bestScore >= 15) {
      return {
        slug: bestMatch.slug,
        title: bestMatch.title,
        iconUrl: getIconUrl(bestMatch.file_name),
        matchScore: bestScore,
      };
    }
    
    return null;
  }, [iconIndex]);

  const findIconForQuestion = useCallback((
    questionText: string,
    category?: string
  ): IconMatch | null => {
    const keywords = extractKeywords(questionText);
    return findIcon(keywords, category);
  }, [findIcon]);

  const getIconBySlug = useCallback((slug: string): string | null => {
    const icon = iconIndex.find(i => i.slug === slug);
    return icon ? getIconUrl(icon.file_name) : null;
  }, [iconIndex]);

  const getIconForCategory = useCallback((categoryIdOrName: string): string | null => {
    // First check if it's a Georgian category name and convert to English slug
    let categoryKey = categoryIdOrName.toLowerCase();
    const englishSlug = GEORGIAN_CATEGORY_SLUGS[categoryIdOrName];
    if (englishSlug) {
      categoryKey = englishSlug;
    }
    
    const slugs = CATEGORY_ICON_MAP[categoryKey] || [];
    
    // First try exact match
    for (const slug of slugs) {
      const icon = iconIndex.find(i => i.slug === slug);
      if (icon) return getIconUrl(icon.file_name);
    }
    
    // Then try partial match (slug contains keyword)
    for (const slug of slugs) {
      const icon = iconIndex.find(i => i.slug.includes(slug) || slug.includes(i.slug));
      if (icon) return getIconUrl(icon.file_name);
    }
    
    // Finally try tag match
    for (const slug of slugs) {
      const icon = iconIndex.find(i => i.tags.some(tag => tag.toLowerCase().includes(slug)));
      if (icon) return getIconUrl(icon.file_name);
    }
    
    return null;
  }, [iconIndex]);

  // Get a random icon from the category (used as fallback when main icon fails)
  const getRandomIconForCategory = useCallback((categoryId: string, seed: number = 0): string | null => {
    // If no icons loaded, return null
    if (iconIndex.length === 0) return null;
    
    // Filter icons that might match the category
    const categoryKey = categoryId.toLowerCase();
    const categoryKeywords = CATEGORY_ICON_MAP[categoryKey] || [];
    
    // Try to find icons matching category keywords
    if (categoryKeywords.length > 0) {
      const matchingIcons = iconIndex.filter(icon => {
        const slugMatch = categoryKeywords.some(kw => icon.slug.includes(kw));
        const tagMatch = icon.tags.some(tag => 
          categoryKeywords.some(kw => tag.toLowerCase().includes(kw))
        );
        return slugMatch || tagMatch;
      });
      
      if (matchingIcons.length > 0) {
        // Use seed to get different icon each retry
        const index = Math.abs(seed) % matchingIcons.length;
        return getIconUrl(matchingIcons[index].file_name);
      }
    }
    
    // Fallback: pick any icon based on seed (ALWAYS returns something)
    const index = Math.abs((seed * 137) % iconIndex.length); // 137 is prime for better distribution
    return getIconUrl(iconIndex[index].file_name);
  }, [iconIndex]);

  return { 
    findIcon, 
    findIconForQuestion,
    getIconBySlug, 
    getIconForCategory,
    getRandomIconForCategory,
    isLoaded: !isLoading && iconIndex.length > 0,
    iconCount: iconIndex.length,
  };
}

// Utility to preload icon images
export function preloadIcons(urls: string[]) {
  urls.forEach(url => {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
}
