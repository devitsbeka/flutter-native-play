import { useState, useEffect, useCallback } from 'react';
import { GEORGIAN_CATEGORY_SLUGS } from '@/data/categoryIconMap';
import { supabase } from '@/integrations/supabase/client';

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
// Using verified slugs that exist in the icon library
const CATEGORY_ICON_MAP: Record<string, string[]> = {
  // General
  'general': ['lightbulb', 'brain', 'question', 'puzzle', 'book', 'star', 'sparkle', 'idea'],
  
  // Classic/Educational
  'geography': ['globe', 'globe-earth', 'world-map', 'map', 'compass', 'earth', 'planet'],
  'world_history': ['scroll', 'papyrus-scroll', 'magic-scroll', 'castle', 'crown', 'medieval'],
  'georgian_history': ['scroll', 'castle', 'crown', 'church', 'wine', 'flag', 'medieval'],
  'science': ['microscope', 'electron-microscope', 'vintage-microscope', 'atom', 'laboratory', 'test-tube', 'flask'],
  'sports': ['trophy', 'champions-league-trophy', 'motorsport-trophy', 'soccer-ball', 'basketball', 'football', 'medal'],
  
  // Fun/Entertainment - Updated with verified library slugs
  'movies': ['movie-clapperboard', 'clapperboard', 'film-reel', 'movie-camera', 'cinema', 'popcorn', 'movie-projector', 'cinema-screen'],
  'tv_series': ['television', 'smart-tv', 'tv', 'remote-control', 'television-remote', 'streaming', 'screen'],
  'music': ['karaoke-microphone', 'guitar', 'piano', 'headphones', 'microphone', 'musical-note', 'violin', 'drums'],
  'video_games': ['gamepad', 'controller', 'joystick', 'arcade', 'console', 'gaming', 'gaming-console'],
  'celebrities': ['star', 'vip', 'red-carpet', 'celebrity', 'fame', 'spotlight', 'award'],
  'memes_internet': ['emoji', 'smile', 'laugh', 'viral', 'trending', 'internet', 'social'],
  'anime_manga': ['anime', 'manga', 'japanese', 'cartoon', 'cosplay', 'ninja', 'samurai'],
  'pop_culture': ['smartphone', 'trending', 'viral', 'influencer', 'social-media', 'hashtag', 'mobile'],
  'social_media': ['smartphone', 'instagram', 'twitter', 'facebook', 'tiktok', 'hashtag', 'social', 'mobile-phone'],
  'fun_facts': ['lightbulb', 'brain', 'mind-blown', 'surprise', 'trivia', 'question-mark', 'idea'],
  
  // Educational/Academic
  'literature': ['book', 'bookshelf', 'library', 'notebook', 'pen', 'quill', 'reading', 'open-book'],
  'georgian_literature': ['book', 'quill', 'scroll', 'pen', 'inkwell', 'manuscript', 'writing'],
  'art': ['palette', 'paint-palette', 'easel', 'brush', 'canvas', 'painting', 'artist', 'oil-paint-palette'],
  'technology': ['laptop', 'computer', 'smartphone', 'chip', 'circuit', 'robot', 'processor', 'motherboard'],
  'nature': ['tree', 'flower', 'leaf', 'mountain', 'forest', 'green-earth', 'plant', 'nature'],
  'space': ['rocket', 'astronaut', 'planet', 'satellite', 'galaxy', 'telescope', 'space-shuttle', 'moon'],
  'animals': ['african-lion', 'african-elephant', 'forest-full-of-animals', 'wildlife-rehabilitator', 'cat-paw-print', 'dog-paw-print', 'totem-animal-effigy', 'panda', 'tiger', 'bear'],
  'math': ['calculator', 'abacus', 'ruler', 'protractor', 'graph', 'equation', 'numbers', 'pi'],
  'physics': ['atom', 'magnet', 'pendulum', 'wave', 'energy', 'electron', 'nuclear', 'radiation'],
  'chemistry': ['flask', 'beaker', 'test-tube', 'molecule', 'periodic-table', 'experiment', 'erlenmeyer-flask'],
  'biology': ['dna', 'cell', 'microscope', 'bacteria', 'gene', 'evolution', 'chromosome', 'virus'],
  'astronomy': ['telescope', 'planet', 'star', 'constellation', 'observatory', 'comet', 'moon', 'saturn'],
  'geology': ['rock', 'crystal', 'volcano', 'mineral', 'fossil', 'diamond', 'gemstone', 'cave'],
  'ecology': ['recycle', 'green-earth', 'leaf', 'sustainable', 'environment', 'eco', 'renewable'],
  'medicine': ['stethoscope', 'hospital', 'doctor', 'nurse', 'pill', 'syringe', 'medical', 'health'],
  'psychology': ['brain', 'mind', 'therapy', 'thought', 'emotion', 'psychology', 'mental'],
  'philosophy': ['thinker', 'brain', 'book', 'wisdom', 'ancient', 'scroll', 'thought'],
  'economics': ['money', 'coin', 'chart', 'bank', 'dollar', 'stock', 'currency', 'gold-coin'],
  'politics': ['capitol', 'capitol-building', 'parliament', 'vote', 'democracy', 'government', 'flag'],
  'languages': ['speech-bubble', 'translate', 'globe', 'alphabet', 'dictionary', 'language', 'chat'],
  'archaeology': ['fossil', 'artifact', 'ancient', 'dig', 'ruins', 'pottery', 'dinosaur'],
  'architecture': ['building', 'blueprint', 'skyscraper', 'house', 'column', 'dome', 'construction'],
  'military_history': ['sword', 'shield', 'tank', 'cannon', 'helmet', 'battle', 'world-war-ii-sherman-tank', 'knight'],
  'religion_mythology': ['church', 'temple', 'cross', 'angel', 'mythology', 'god', 'religion'],
  'myths_reality': ['magnifying-glass', 'detective', 'mystery', 'truth', 'fact', 'myth', 'search'],
  
  // Georgian Culture
  'georgian_culture': ['wine', 'grape', 'dance', 'traditional', 'folk', 'costume', 'wine-bottle'],
  'georgian_cuisine': ['khachapuri', 'wine', 'khinkali', 'cooking', 'food', 'restaurant', 'cheese'],
  'world_cuisine': ['chef-hat', 'pizza', 'sushi', 'burger', 'cooking-pot', 'restaurant', 'cooking'],
  
  // Tech & Innovation
  'programming': ['code', 'developer', 'programmer', 'terminal', 'computer', 'binary', 'html', 'coding'],
  'robotics_ai': ['robot', 'ai', 'artificial-intelligence', 'machine', 'android', 'cyborg', 'robot-face'],
  'fashion': ['dress', 'shirt', 'shoe', 'handbag', 'fashion', 'style', 'clothing', 'high-heels'],
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

// Local icon library JSON (storage fetch removed — was always returning 400).
// The slim variant carries slug/file_name/category/tags/title — half the
// bytes of the full admin metadata file, which admin pages still fetch.
const ICON_LIBRARY_LOCAL_PATH = '/data/icon-index-slim.json';

// Load icons from local JSON file
async function loadIconIndex(): Promise<IconItem[]> {
  if (iconCache) return iconCache;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const response = await fetch(ICON_LIBRARY_LOCAL_PATH);
      if (!response.ok) throw new Error('Local icon library fetch failed');
      const data = await response.json();
      iconCache = data.items || [];
      return iconCache;
    } catch (error) {
      console.error('[IconLibrary] Load failed:', error);
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
  
  // Slug matching - prioritize partial matches for generic keywords
  for (const keyword of keywords) {
    if (icon.slug === keyword) {
      score += 80;
    } else if (icon.slug.includes(keyword)) {
      // "animal" matches "forest-full-of-animals", "wildlife" matches "wildlife-rehabilitator"
      score += 50;
    } else if (keyword.length >= 4 && icon.slug.split('-').some(part => part.includes(keyword) || keyword.includes(part))) {
      // Match word parts: "paw" matches "cat-paw-print"
      score += 35;
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

// Module-level cache for database icons
let dbIconsCache: Record<string, string> | null = null;
let dbIconsPromise: Promise<Record<string, string>> | null = null;

async function loadDbIcons(): Promise<Record<string, string>> {
  if (dbIconsCache) return dbIconsCache;
  if (dbIconsPromise) return dbIconsPromise;

  dbIconsPromise = (async () => {
    // Load ALL icons from database (no limit) for complete coverage
    const { data, error } = await supabase
      .from('icon_library')
      .select('slug, icon_url');
    
    if (error) {
      console.error('[IconLibrary] DB fetch error:', error);
      dbIconsCache = {};
      return dbIconsCache;
    }
    
    dbIconsCache = {};
    (data || []).forEach((icon) => {
      if (icon.slug && icon.icon_url) {
        dbIconsCache![icon.slug] = icon.icon_url;
      }
    });
    console.info(`[IconLibrary] Loaded ${Object.keys(dbIconsCache).length} icons from database`);
    return dbIconsCache;
  })();

  return dbIconsPromise;
}

// Export function to refresh db cache (called from Icon Library admin)
export function refreshDbIconsCache(): void {
  dbIconsCache = null;
  dbIconsPromise = null;
}

export function useIconLibrary() {
  const [iconIndex, setIconIndex] = useState<IconItem[]>([]);
  const [dbIcons, setDbIcons] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load local JSON icons
  useEffect(() => {
    loadIconIndex().then(icons => {
      setIconIndex(icons);
      setIsLoading(false);
    });
  }, []);

  // Load database icons using module-level cache
  useEffect(() => {
    loadDbIcons().then(icons => {
      setDbIcons(icons);
      setDbLoaded(true);
    });
    
    // Listen for refresh events from Icon Library admin
    const handleRefresh = () => {
      setDbLoaded(false);
      refreshDbIconsCache();
      loadDbIcons().then(icons => {
        setDbIcons(icons);
        setDbLoaded(true);
      });
    };
    
    window.addEventListener('icon-library-refresh', handleRefresh);

    return () => {
      window.removeEventListener('icon-library-refresh', handleRefresh);
    };
  }, []);

  const findIcon = useCallback((
    keywords: string[],
    category?: string
  ): IconMatch | null => {
    if (iconIndex.length === 0) return null;
    
    let bestMatch: IconItem | null = null;
    let bestScore = 0;
    
    if (keywords.length > 0) {
      for (const icon of iconIndex) {
        const score = scoreMatch(icon, keywords, category);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = icon;
        }
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
    
    // HARDCODED FALLBACK: Use first icon from CATEGORY_ICON_MAP for the category
    if (category) {
      const categoryKey = category.toLowerCase();
      const categoryKeywords = CATEGORY_ICON_MAP[categoryKey] || [];
      
      // Try each slug from the category map until we find one that exists
      for (const slug of categoryKeywords) {
        // Exact match
        const exactIcon = iconIndex.find(i => i.slug === slug);
        if (exactIcon) {
          return {
            slug: exactIcon.slug,
            title: exactIcon.title,
            iconUrl: getIconUrl(exactIcon.file_name),
            matchScore: 10, // Low score indicates fallback
          };
        }
        // Partial match (slug contains keyword)
        const partialIcon = iconIndex.find(i => i.slug.includes(slug));
        if (partialIcon) {
          return {
            slug: partialIcon.slug,
            title: partialIcon.title,
            iconUrl: getIconUrl(partialIcon.file_name),
            matchScore: 10,
          };
        }
      }
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
    // First check database icons (recently uploaded)
    if (dbIcons[slug]) {
      return dbIcons[slug];
    }
    
    // Fall back to local JSON
    const icon = iconIndex.find(i => i.slug === slug);
    return icon ? getIconUrl(icon.file_name) : null;
  }, [iconIndex, dbIcons]);

  // Direct database lookup for icons not in cache (async)
  const fetchIconBySlug = useCallback(async (slug: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('icon_library')
        .select('icon_url, file_name')
        .eq('slug', slug)
        .single();
      
      if (error || !data) return null;
      
      // Return icon_url if available, otherwise construct from file_name
      return data.icon_url || getIconUrl(data.file_name);
    } catch {
      return null;
    }
  }, []);

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
  // IMPORTANT: Icons are sorted alphabetically by slug to ensure consistent order
  // across all clients - this guarantees the same seed produces the same icon everywhere
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
        // SORT ALPHABETICALLY for consistent order across all clients
        const sortedIcons = [...matchingIcons].sort((a, b) => 
          a.slug.localeCompare(b.slug)
        );
        const index = Math.abs(seed) % sortedIcons.length;
        return getIconUrl(sortedIcons[index].file_name);
      }
    }
    
    // Fallback: ALSO sort before picking to ensure consistency
    const sortedAll = [...iconIndex].sort((a, b) => a.slug.localeCompare(b.slug));
    const index = Math.abs((seed * 137) % sortedAll.length); // 137 is prime for better distribution
    return getIconUrl(sortedAll[index].file_name);
  }, [iconIndex]);

  return { 
    findIcon, 
    findIconForQuestion,
    getIconBySlug,
    fetchIconBySlug,
    getIconForCategory,
    getRandomIconForCategory,
    isLoaded: !isLoading && iconIndex.length > 0 && dbLoaded,
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
