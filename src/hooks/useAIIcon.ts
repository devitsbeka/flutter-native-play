import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

interface AIIconResult {
  slugs: string[];
  keywords: string[];
  mainConcept: string;
}

interface CacheEntry {
  result: AIIconResult;
  timestamp: number;
}

// In-memory cache for current session
const memoryCache = new Map<string, AIIconResult>();

// LocalStorage cache key prefix
const CACHE_PREFIX = 'ai_icon_cache_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Simple hash function for cache keys
function hashQuestion(question: string): string {
  let hash = 0;
  for (let i = 0; i < question.length; i++) {
    const char = question.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function getCachedResult(questionHash: string): AIIconResult | null {
  // Check memory cache first
  if (memoryCache.has(questionHash)) {
    return memoryCache.get(questionHash)!;
  }

  // Check localStorage
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + questionHash);
    if (stored) {
      const entry: CacheEntry = JSON.parse(stored);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        // Restore to memory cache
        memoryCache.set(questionHash, entry.result);
        return entry.result;
      } else {
        // Expired, remove it
        localStorage.removeItem(CACHE_PREFIX + questionHash);
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  return null;
}

function setCachedResult(questionHash: string, result: AIIconResult): void {
  // Set in memory cache
  memoryCache.set(questionHash, result);

  // Set in localStorage
  try {
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + questionHash, JSON.stringify(entry));
  } catch (e) {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

// Track pending requests to avoid duplicate API calls
const pendingRequests = new Map<string, Promise<AIIconResult | null>>();

async function fetchAIIconData(question: string, category?: string): Promise<AIIconResult | null> {
  const questionHash = hashQuestion(question + (category || ''));

  // Check if already pending
  if (pendingRequests.has(questionHash)) {
    return pendingRequests.get(questionHash)!;
  }

  const request = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-question-icon', {
        body: { question, category },
      });

      if (error) {
        console.error('AI icon analysis error:', error);
        return null;
      }

      if (data?.fallback || data?.error) {
        console.warn('AI icon fallback:', data.error);
        return null;
      }

      const result: AIIconResult = {
        slugs: data.slugs || [],
        keywords: data.keywords || [],
        mainConcept: data.mainConcept || '',
      };

      // Cache successful result
      setCachedResult(questionHash, result);

      return result;
    } catch (e) {
      console.error('AI icon fetch error:', e);
      return null;
    } finally {
      pendingRequests.delete(questionHash);
    }
  })();

  pendingRequests.set(questionHash, request);
  return request;
}

export interface UseAIIconOptions {
  questionText?: string;
  category?: string;
  enabled?: boolean;
}

export interface UseAIIconResult {
  aiData: AIIconResult | null;
  isLoading: boolean;
  isFromCache: boolean;
}

export function useAIIcon({ questionText, category, enabled = true }: UseAIIconOptions): UseAIIconResult {
  const [aiData, setAIData] = React.useState<AIIconResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFromCache, setIsFromCache] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !questionText) {
      setAIData(null);
      setIsLoading(false);
      return;
    }

    const questionHash = hashQuestion(questionText + (category || ''));

    // Check cache first
    const cached = getCachedResult(questionHash);
    if (cached) {
      setAIData(cached);
      setIsFromCache(true);
      setIsLoading(false);
      return;
    }

    // Fetch from AI
    setIsLoading(true);
    setIsFromCache(false);

    fetchAIIconData(questionText, category).then((result) => {
      setAIData(result);
      setIsLoading(false);
    });
  }, [questionText, category, enabled]);

  return { aiData, isLoading, isFromCache };
}

// Utility to preload AI icon data for questions during matchmaking
// This runs in background so icons are ready when user starts playing
export async function preloadQuestionIcons(
  questions: Array<{ question: string; category?: string }>
): Promise<void> {
  if (!questions || questions.length === 0) return;

  // Filter to only uncached questions
  const uncached = questions.filter(q => {
    const questionHash = hashQuestion(q.question + (q.category || ''));
    return !getCachedResult(questionHash);
  });

  if (uncached.length === 0) return;

  // Fire all uncached requests in parallel (fetchAIIconData deduplicates via pendingRequests)
  await Promise.allSettled(
    uncached.map(q => fetchAIIconData(q.question, q.category))
  );
}
