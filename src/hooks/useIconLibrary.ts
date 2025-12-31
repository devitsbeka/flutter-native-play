import { useState, useEffect, useCallback } from 'react';

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

// Category to icon slug mappings for instant lookups
const CATEGORY_ICON_MAP: Record<string, string[]> = {
  'geography': ['globe', 'world', 'map', 'earth', 'compass'],
  'science': ['microscope', 'atom', 'laboratory', 'science', 'chemistry', 'test-tube'],
  'sports': ['soccer-ball', 'football', 'basketball', 'trophy', 'medal', 'tennis'],
  'history': ['scroll', 'castle', 'crown', 'ancient', 'museum', 'knight'],
  'world_history': ['scroll', 'castle', 'crown', 'ancient', 'museum', 'knight'],
  'georgian_history': ['scroll', 'castle', 'crown', 'flag', 'wine', 'church'],
  'art': ['palette', 'painting', 'brush', 'art', 'canvas', 'easel'],
  'music': ['music', 'guitar', 'piano', 'musical-note', 'headphones', 'microphone'],
  'literature': ['book', 'library', 'reading', 'novel', 'writing', 'pen'],
  'georgian_literature': ['book', 'library', 'reading', 'novel', 'writing', 'pen'],
  'movies': ['movie', 'film', 'cinema', 'camera', 'clapperboard', 'popcorn'],
  'technology': ['computer', 'laptop', 'phone', 'tech', 'robot', 'chip'],
  'food': ['food', 'restaurant', 'cooking', 'chef', 'cuisine', 'pizza'],
  'nature': ['tree', 'forest', 'nature', 'flower', 'leaf', 'mountain'],
  'animals': ['animal', 'wildlife', 'zoo', 'pet', 'dog', 'cat', 'lion'],
};

// Common Georgian words to English mappings for better matching
const GEORGIAN_KEYWORD_MAP: Record<string, string[]> = {
  'საქართველო': ['georgia', 'country', 'flag', 'wine'],
  'თბილისი': ['city', 'capital', 'building', 'bridge'],
  'მთა': ['mountain', 'peak', 'landscape', 'climbing'],
  'ზღვა': ['sea', 'ocean', 'water', 'wave', 'beach'],
  'ისტორია': ['history', 'ancient', 'scroll', 'castle'],
  'კულტურა': ['culture', 'art', 'tradition', 'dance'],
  'სპორტი': ['sport', 'ball', 'trophy', 'athlete'],
  'მეცნიერება': ['science', 'atom', 'laboratory', 'research'],
  'მუსიკა': ['music', 'instrument', 'note', 'guitar'],
  'ხელოვნება': ['art', 'painting', 'brush', 'gallery'],
  'ლიტერატურა': ['book', 'writing', 'pen', 'library'],
  'კინო': ['movie', 'film', 'camera', 'cinema'],
  'საკვები': ['food', 'cooking', 'restaurant', 'chef'],
  'ფეხბურთი': ['soccer-ball', 'football', 'goal', 'player'],
  'რაგბი': ['rugby', 'ball', 'sports', 'player'],
  'ოლიმპიადა': ['olympics', 'medal', 'trophy', 'athlete'],
  'ღვინო': ['wine', 'grape', 'bottle', 'glass'],
  'ეკლესია': ['church', 'cross', 'religion', 'building'],
  'მეფე': ['king', 'crown', 'throne', 'castle'],
  'დედოფალი': ['queen', 'crown', 'throne', 'castle'],
  'ომი': ['war', 'sword', 'battle', 'knight'],
  'მხატვარი': ['artist', 'painting', 'brush', 'canvas'],
  'პოეტი': ['poet', 'pen', 'book', 'writing'],
  'მწერალი': ['writer', 'pen', 'book', 'writing'],
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

  const getIconForCategory = useCallback((categoryId: string): string | null => {
    const slugs = CATEGORY_ICON_MAP[categoryId.toLowerCase()] || [];
    for (const slug of slugs) {
      const icon = iconIndex.find(i => i.slug === slug);
      if (icon) return getIconUrl(icon.file_name);
    }
    return null;
  }, [iconIndex]);

  // Get a random icon from the category (used as fallback when main icon fails)
  const getRandomIconForCategory = useCallback((categoryId: string, seed: number = 0): string | null => {
    // Filter icons that might match the category
    const categoryKey = categoryId.toLowerCase();
    const categoryKeywords = CATEGORY_ICON_MAP[categoryKey] || [];
    
    // Try to find icons matching category keywords
    const matchingIcons = iconIndex.filter(icon => {
      const slugMatch = categoryKeywords.some(kw => icon.slug.includes(kw));
      const tagMatch = icon.tags.some(tag => 
        categoryKeywords.some(kw => tag.toLowerCase().includes(kw))
      );
      return slugMatch || tagMatch;
    });
    
    if (matchingIcons.length > 0) {
      // Use seed to get different icon each retry
      const index = seed % matchingIcons.length;
      return getIconUrl(matchingIcons[index].file_name);
    }
    
    // Last resort: just pick any icon based on seed
    if (iconIndex.length > 0) {
      const index = (seed * 137) % iconIndex.length; // 137 is prime for better distribution
      return getIconUrl(iconIndex[index].file_name);
    }
    
    return null;
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
