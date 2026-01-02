import * as React from "react";

// In-memory cache reference (shared with useAIIcon.ts)
const CACHE_PREFIX = 'ai_icon_cache_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Simple hash function (same as useAIIcon.ts)
function hashQuestion(question: string): string {
  let hash = 0;
  for (let i = 0; i < question.length; i++) {
    const char = question.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

interface CacheEntry {
  result: {
    slugs: string[];
    keywords: string[];
    mainConcept: string;
  };
  timestamp: number;
}

/**
 * Hook to get AI-analyzed icon slug for a question.
 * Returns the best slug from cache, or null if not yet analyzed.
 * This hook is reactive and will update when cache becomes available.
 */
export function useAIIconSlug(questionText: string | undefined, category?: string): string | null {
  const [slug, setSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!questionText) {
      setSlug(null);
      return;
    }

    const questionHash = hashQuestion(questionText + (category || ''));

    // Check cache immediately
    const checkCache = () => {
      try {
        const stored = localStorage.getItem(CACHE_PREFIX + questionHash);
        if (stored) {
          const entry: CacheEntry = JSON.parse(stored);
          if (Date.now() - entry.timestamp < CACHE_TTL) {
            // Return first slug (highest priority from AI)
            const bestSlug = entry.result.slugs?.[0] || null;
            setSlug(bestSlug);
            return true;
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      return false;
    };

    // Check immediately
    if (checkCache()) return;

    // Poll for cache updates (AI preload runs in background)
    const interval = setInterval(() => {
      if (checkCache()) {
        clearInterval(interval);
      }
    }, 200); // Check every 200ms

    // Stop polling after 5 seconds (if AI hasn't responded, use fallback)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [questionText, category]);

  return slug;
}
