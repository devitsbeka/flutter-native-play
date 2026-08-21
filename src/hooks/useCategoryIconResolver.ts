import { useEffect, useState, useCallback } from 'react';
import { getCategoryKeywords } from '@/data/categoryIconKeywords';
import { loadIconIndex as loadSharedIconIndex } from '@/hooks/useIconLibrary';

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';
const CACHE_KEY = 'category_icons_cache_v2';

// In-memory cache for instant access
let memoryCache: Record<string, string> = {};
let iconIndex: Array<{ slug: string; tags: string[]; title: string }> = [];
let indexLoaded = false;

// The icon index comes from useIconLibrary, which already loads and caches
// this file. This module used to fetch it itself, with its own module-level
// cache, so the same 1.3 MB catalogue was downloaded twice on a page that
// touched both — 2.7 MB to answer one question about icon slugs.
async function loadIconIndex(): Promise<void> {
  if (indexLoaded) return;

  try {
    const items = await loadSharedIconIndex();
    iconIndex = items.map((item) => ({
      slug: item.slug,
      tags: item.tags || [],
      title: item.title || '',
    }));
    indexLoaded = true;
  } catch (error) {
    console.error('[IconResolver] Failed to load icon index:', error);
  }
}

// Search for icon by keyword
function findIconByKeyword(keyword: string): string | null {
  const lowerKeyword = keyword.toLowerCase();
  
  // Priority 1: Exact slug match
  const exactMatch = iconIndex.find(icon => icon.slug === lowerKeyword);
  if (exactMatch) {
    return `${ICON_STORAGE_URL}/${exactMatch.slug}.png`;
  }
  
  // Priority 2: Slug contains keyword
  const slugContains = iconIndex.find(icon => icon.slug.includes(lowerKeyword));
  if (slugContains) {
    return `${ICON_STORAGE_URL}/${slugContains.slug}.png`;
  }
  
  // Priority 3: Tag match
  const tagMatch = iconIndex.find(icon => 
    icon.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
  if (tagMatch) {
    return `${ICON_STORAGE_URL}/${tagMatch.slug}.png`;
  }
  
  // Priority 4: Title contains keyword
  const titleMatch = iconIndex.find(icon => 
    icon.title?.toLowerCase().includes(lowerKeyword)
  );
  if (titleMatch) {
    return `${ICON_STORAGE_URL}/${titleMatch.slug}.png`;
  }
  
  return null;
}

// Resolve icon for a category using keywords
function resolveCategoryIcon(categoryId: string): string | null {
  const keywords = getCategoryKeywords(categoryId);

  for (const keyword of keywords) {
    const iconUrl = findIconByKeyword(keyword);
    if (iconUrl) {
      return iconUrl;
    }
  }

  return null;
}

// Load cache from localStorage
function loadCache(): Record<string, string> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      memoryCache = parsed;
      return parsed;
    }
  } catch (error) {
    console.error('[IconResolver] Failed to load cache:', error);
  }
  return {};
}

// Save cache to localStorage
function saveCache(cache: Record<string, string>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    memoryCache = cache;
  } catch (error) {
    console.error('[IconResolver] Failed to save cache:', error);
  }
}

// Preload and resolve all category icons
export async function preloadCategoryIcons(categoryIds: string[]): Promise<Record<string, string>> {
  const cache = loadCache();
  const resolved: Record<string, string> = { ...cache };

  // Only pay for the icon index download when something actually needs
  // resolving — with a warm localStorage cache this fetches nothing.
  const unresolved = categoryIds.filter((id) => !resolved[id]);
  if (unresolved.length > 0) {
    await loadIconIndex();
    let updated = false;
    for (const categoryId of unresolved) {
      const iconUrl = resolveCategoryIcon(categoryId);
      if (iconUrl) {
        resolved[categoryId] = iconUrl;
        updated = true;
      }
    }
    if (updated) {
      saveCache(resolved);
    }
  } else {
    memoryCache = resolved;
  }

  // Warm only the icons this caller asked about — not the whole cache
  categoryIds.forEach((id) => {
    const url = resolved[id];
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });

  return resolved;
}

// Get cached icon URL for a category (synchronous, for render)
export function getCachedCategoryIcon(categoryId: string): string | null {
  return memoryCache[categoryId] || null;
}

// React hook for category icons
export function useCategoryIconResolver(categoryIds: string[]) {
  const [iconMap, setIconMap] = useState<Record<string, string>>(memoryCache);
  const [isLoading, setIsLoading] = useState(!indexLoaded);
  
  useEffect(() => {
    if (categoryIds.length === 0) return;
    
    preloadCategoryIcons(categoryIds).then(resolved => {
      setIconMap(resolved);
      setIsLoading(false);
    });
  }, [categoryIds.join(',')]);
  
  const getIcon = useCallback((categoryId: string): string | null => {
    return iconMap[categoryId] || null;
  }, [iconMap]);
  
  return { iconMap, getIcon, isLoading };
}

// Initialize cache on module load
loadCache();
