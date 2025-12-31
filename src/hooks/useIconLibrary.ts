import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IconItem {
  id: string;
  title: string;
  file_name: string;
  slug: string;
  category: string;
  tags: string[];
  icon_url: string;
}

interface IconMatch {
  slug: string;
  title: string;
  iconUrl: string;
  matchScore: number;
}

// In-memory cache for icons
let iconCache: IconItem[] | null = null;
let cachePromise: Promise<IconItem[]> | null = null;

// Category to icon slug mappings for instant lookups
const CATEGORY_ICON_MAP: Record<string, string[]> = {
  'geography': ['globe', 'world', 'map', 'earth', 'compass'],
  'science': ['microscope', 'atom', 'laboratory', 'science', 'chemistry'],
  'sports': ['soccer', 'football', 'basketball', 'trophy', 'medal'],
  'history': ['scroll', 'castle', 'crown', 'ancient', 'museum'],
  'art': ['palette', 'painting', 'brush', 'art', 'canvas'],
  'music': ['music', 'guitar', 'piano', 'musical', 'headphones'],
  'literature': ['book', 'library', 'reading', 'novel', 'writing'],
  'movies': ['movie', 'film', 'cinema', 'camera', 'clapperboard'],
  'technology': ['computer', 'laptop', 'phone', 'tech', 'robot'],
  'food': ['food', 'restaurant', 'cooking', 'chef', 'cuisine'],
  'nature': ['tree', 'forest', 'nature', 'flower', 'leaf'],
  'animals': ['animal', 'wildlife', 'zoo', 'pet', 'creature'],
};

// Common Georgian words to English mappings
const GEORGIAN_KEYWORD_MAP: Record<string, string[]> = {
  'საქართველო': ['georgia', 'country', 'flag'],
  'თბილისი': ['city', 'capital', 'building'],
  'მთა': ['mountain', 'peak', 'landscape'],
  'ზღვა': ['sea', 'ocean', 'water', 'wave'],
  'ისტორია': ['history', 'ancient', 'scroll'],
  'კულტურა': ['culture', 'art', 'tradition'],
  'სპორტი': ['sport', 'ball', 'trophy'],
  'მეცნიერება': ['science', 'atom', 'laboratory'],
  'მუსიკა': ['music', 'instrument', 'note'],
  'ხელოვნება': ['art', 'painting', 'brush'],
  'ლიტერატურა': ['book', 'writing', 'pen'],
  'კინო': ['movie', 'film', 'camera'],
  'საკვები': ['food', 'cooking', 'restaurant'],
};

async function loadIconIndex(): Promise<IconItem[]> {
  if (iconCache) return iconCache;
  
  if (cachePromise) return cachePromise;
  
  cachePromise = (async () => {
    console.log('Loading icon library...');
    const { data, error } = await supabase
      .from('icon_library')
      .select('id, title, file_name, slug, category, tags, icon_url');
    
    if (error) {
      console.error('Failed to load icon library:', error);
      return [];
    }
    
    iconCache = data || [];
    console.log(`Loaded ${iconCache.length} icons into cache`);
    return iconCache;
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
        iconUrl: bestMatch.icon_url,
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
    return icon?.icon_url || null;
  }, [iconIndex]);

  const getIconForCategory = useCallback((categoryId: string): string | null => {
    const slugs = CATEGORY_ICON_MAP[categoryId.toLowerCase()] || [];
    for (const slug of slugs) {
      const icon = iconIndex.find(i => i.slug === slug);
      if (icon) return icon.icon_url;
    }
    return null;
  }, [iconIndex]);

  return { 
    findIcon, 
    findIconForQuestion,
    getIconBySlug, 
    getIconForCategory,
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
