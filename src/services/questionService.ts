/**
 * Unified Question Service
 * 
 * GOLDEN STANDARD: Single canonical question-selection pipeline for all game modes.
 * Consolidates duplicated logic from:
 * - useTrivia.ts (VS Mode)
 * - CategoryQuizPage.tsx (Category Mode)
 * - TVGameContext.tsx (TV Mode)
 * - TVEnterCodeModal.tsx (TV Mode entry)
 * 
 * All modes use this service to ensure consistent:
 * - Language filtering
 * - Active/production filtering
 * - Question length validation
 * - Seen question tracking
 * - Exhaustion detection and fallback
 */

import { supabase } from "@/integrations/supabase/client";
import { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } from "@/utils/questionValidation";
import {
  getAskedQuestionIds,
  getSeenQuestionIds,
  markQuestionsAsAsked,
  markQuestionsAsAskedGlobally,
  clearCategoryAskedQuestions,
  clearSeenQuestions,
  shouldResetGlobalPool,
  getCategoryLevelSeenIds,
  markCategoryLevelSeen,
  clearCategoryLevelSeen,
} from "@/services/questionTracker";
import type { Json } from "@/integrations/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionContext {
  mode: 'category' | 'vs' | 'tv';
  categorySlug?: string;      // e.g., "science", "history"
  categoryUuid?: string;      // UUID from database
  levelNumber?: number;       // For category mode level progression
  count?: number;             // Number of questions needed (default: 5-10)
  excludeIds?: string[];      // Additional IDs to exclude
}

export interface FormattedQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];       // Shuffled
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;          // Category name for display
  categorySlug?: string;      // Category slug
  iconSlug?: string | null;   // Question-specific icon
}

export interface QuestionResult {
  questions: FormattedQuestion[];
  exhausted: boolean;         // True if pool was exhausted (repeats may occur)
  exhaustionInfo?: {
    totalAvailable: number;
    totalSeen: number;
    wasReset: boolean;
    usedFallback: boolean;
  };
  language: string;
  categoryUuid?: string;
}

interface RawQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: Json;
  difficulty: string;
  level_number?: number | null;
  icon_slug?: string | null;
  category_id?: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

const STORAGE_KEY = 'preferredLanguage';
const DEFAULT_LANGUAGE = 'ka';

/**
 * Get user's preferred language
 */
export function getPreferredLanguage(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Shuffle array using Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Parse incorrect answers from JSON or array
 */
function parseIncorrectAnswers(raw: Json | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Validate question length constraints
 */
function isValidQuestionLength(q: RawQuestion): boolean {
  if (q.question_text.length > QUESTION_MAX_LENGTH) return false;
  if (q.correct_answer.length > ANSWER_MAX_LENGTH) return false;
  const incorrects = parseIncorrectAnswers(q.incorrect_answers);
  if (incorrects.some(a => a.length > ANSWER_MAX_LENGTH)) return false;
  return true;
}

/**
 * Format raw question to game format
 */
function formatQuestion(q: RawQuestion, categoryName?: string, categorySlug?: string): FormattedQuestion {
  const incorrectAnswers = parseIncorrectAnswers(q.incorrect_answers);
  return {
    id: q.id,
    question: q.question_text,
    correctAnswer: q.correct_answer,
    incorrectAnswers,
    allAnswers: shuffleArray([q.correct_answer, ...incorrectAnswers]),
    difficulty: (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
    category: categoryName,
    categorySlug,
    iconSlug: q.icon_slug,
  };
}

/**
 * Get tracker key for a category (uses UUID for consistency)
 */
function getTrackerKey(categoryUuid: string, mode: 'category' | 'vs' | 'tv'): string {
  // Standardize: All modes use UUID for tracker keys
  return `${mode}_${categoryUuid}`;
}

// ============================================================================
// CATEGORY UUID RESOLUTION
// ============================================================================

/**
 * Convert category slug to UUID
 */
export async function resolveCategoryUuid(slugOrUuid: string): Promise<string | null> {
  // Already a UUID (contains dashes)
  if (slugOrUuid.includes('-')) {
    return slugOrUuid;
  }
  
  // Look up by slug
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('category_id', slugOrUuid)
    .single();
  
  if (error || !data) {
    console.error('Failed to resolve category UUID:', error);
    return null;
  }
  
  return data.id;
}

/**
 * Get category info by UUID
 */
async function getCategoryInfo(uuid: string): Promise<{ name: string; slug: string; icon: string; totalLevels: number } | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('name, category_id, icon, total_levels')
    .eq('id', uuid)
    .single();
  
  if (error || !data) return null;
  
  return {
    name: data.name,
    slug: data.category_id,
    icon: data.icon,
    totalLevels: data.total_levels,
  };
}

// ============================================================================
// MAIN QUESTION SERVICE
// ============================================================================

/**
 * Get questions for any game mode
 * 
 * This is the GOLDEN STANDARD function - all modes should use this
 */
export async function getQuestions(ctx: QuestionContext): Promise<QuestionResult> {
  const language = getPreferredLanguage();
  const count = ctx.count || (ctx.mode === 'category' ? 5 : 10);
  
  // Resolve category UUID if needed
  let categoryUuid = ctx.categoryUuid;
  if (!categoryUuid && ctx.categorySlug) {
    categoryUuid = await resolveCategoryUuid(ctx.categorySlug) || undefined;
  }
  
  // Mode-specific handlers
  switch (ctx.mode) {
    case 'category':
      return getCategoryQuestions(categoryUuid!, ctx.levelNumber || 1, count, language, ctx.excludeIds);
    case 'tv':
      return getTVQuestions(categoryUuid!, count, language);
    case 'vs':
      return getVSQuestions(count, language);
    default:
      throw new Error(`Unknown mode: ${ctx.mode}`);
  }
}

// ============================================================================
// CATEGORY MODE
// ============================================================================

async function getCategoryQuestions(
  categoryUuid: string,
  levelNumber: number,
  count: number,
  language: string,
  additionalExcludeIds?: string[]
): Promise<QuestionResult> {
  let exhausted = false;
  let wasReset = false;
  let usedFallback = false;
  
  // Get category info
  const categoryInfo = await getCategoryInfo(categoryUuid);
  
  // Expand level range for variety
  const minLevel = Math.max(1, levelNumber - 3);
  const maxLevel = Math.min(20, levelNumber + 5);
  
  // Get total available for this level range
  const { count: totalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid)
    .gte('level_number', minLevel)
    .lte('level_number', maxLevel);
  
  const totalAvailable = totalCount || 0;
  
  // Get seen questions for THIS level ONLY (category mode is isolated from other modes)
  const levelSeenIds = getCategoryLevelSeenIds(categoryUuid, levelNumber);
  
  // Category mode: use ONLY level-specific tracking
  // Do NOT include globalSeen from VS/TV modes - they are separate tracking scopes
  let excludeIds = [...new Set([...levelSeenIds, ...(additionalExcludeIds || [])])];
  
  // Check level-specific exhaustion
  const levelExhausted = levelSeenIds.length >= totalAvailable;
  
  if (levelExhausted && totalAvailable > 0) {
    // Level pool exhausted - clear level tracking and start fresh
    clearCategoryLevelSeen(categoryUuid, levelNumber);
    wasReset = true;
    exhausted = true;
    excludeIds = [...(additionalExcludeIds || [])]; // Only keep explicit exclusions
  }
  
  // Build query
  let query = supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug')
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid)
    .gte('level_number', minLevel)
    .lte('level_number', maxLevel);
  
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  
  let { data: questions } = await query.limit(100);
  
  // Fallback 1: try full level range (1-20) with exclusions if not enough
  if (!questions || questions.length < count) {
    usedFallback = true;
    let fallbackQuery = supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid)
      .gte('level_number', 1)
      .lte('level_number', 20);
    
    // Still apply exclusions in fallback
    if (excludeIds.length > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`);
    }
    
    const { data: fallbackQuestions } = await fallbackQuery.limit(100);
    questions = fallbackQuestions || [];
  }
  
  // Fallback 2: If still not enough, clear ALL exclusions and try ANY level
  if (!questions || questions.length < count) {
    clearCategoryLevelSeen(categoryUuid, levelNumber);
    wasReset = true;
    exhausted = true;
    
    const { data: resetQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid)
      .limit(100);
    
    questions = resetQuestions || [];
  }
  
  // Fallback 3: If STILL empty (truly no questions in category), return empty gracefully
  if (!questions || questions.length === 0) {
    console.warn(`[questionService] No questions available for category ${categoryUuid} in language ${language}`);
    return {
      questions: [],
      exhausted: true,
      exhaustionInfo: {
        totalAvailable,
        totalSeen: 0,
        wasReset: true,
        usedFallback: true,
      },
      language,
      categoryUuid,
    };
  }
  
  // Filter by length and format
  const rawQuestions = (questions || []) as RawQuestion[];
  const validQuestions = rawQuestions
    .filter(isValidQuestionLength)
    .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  
  // Shuffle and select
  const selected = shuffleArray(validQuestions).slice(0, count);
  
  // Mark as seen immediately
  if (selected.length > 0) {
    markCategoryLevelSeen(categoryUuid, levelNumber, selected.map(q => q.id));
  }
  
  return {
    questions: selected,
    exhausted,
    exhaustionInfo: {
      totalAvailable,
      totalSeen: excludeIds.length,
      wasReset,
      usedFallback,
    },
    language,
    categoryUuid,
  };
}

// ============================================================================
// TV MODE
// ============================================================================

async function getTVQuestions(
  categoryUuid: string,
  count: number,
  language: string
): Promise<QuestionResult> {
  const trackerKey = getTrackerKey(categoryUuid, 'tv');
  let exhausted = false;
  let wasReset = false;
  let usedFallback = false;
  
  // Get category info
  const categoryInfo = await getCategoryInfo(categoryUuid);
  
  // Get previously asked + globally seen
  const categoryAskedIds = getAskedQuestionIds(trackerKey);
  const allSeenIds = getSeenQuestionIds();
  let excludeIds = [...new Set([...categoryAskedIds, ...allSeenIds])];
  
  // Get total available
  const { count: totalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  const totalAvailable = totalCount || 0;
  
  // Build query
  let query = supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug')
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  
  let { data: questions } = await query.limit(50);
  
  // If not enough, reset tracker
  if (!questions || questions.length < count) {
    clearCategoryAskedQuestions(trackerKey);
    wasReset = true;
    exhausted = true;
    
    const { data: resetQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid)
      .limit(50);
    
    questions = resetQuestions || [];
  }
  
  // TV Mode: NEVER pull from other categories - only repeat from same category
  // If still not enough after reset, clear global seen and try one more time
  if (!questions || questions.length < count) {
    clearSeenQuestions(); // Clear global seen to allow repeats from same category
    wasReset = true;
    exhausted = true;
    
    const { data: finalQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid)
      .limit(count * 3);
    
    questions = finalQuestions || [];
  }
  
  // If STILL empty (truly no questions in this category), return empty gracefully
  if (!questions || questions.length === 0) {
    console.warn(`[TV Mode] No questions available for category ${categoryUuid} in language ${language}`);
    return {
      questions: [],
      exhausted: true,
      exhaustionInfo: {
        totalAvailable,
        totalSeen: excludeIds.length,
        wasReset: true,
        usedFallback: false,
      },
      language,
      categoryUuid,
    };
  }
  
  // Filter by length and format
  const rawQuestions = (questions || []) as RawQuestion[];
  const validQuestions = rawQuestions
    .filter(isValidQuestionLength)
    .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  
  // Shuffle and select
  const selected = shuffleArray(validQuestions).slice(0, count);
  
  // Mark as asked
  if (selected.length > 0) {
    markQuestionsAsAsked(trackerKey, selected.map(q => q.id));
  }
  
  return {
    questions: selected,
    exhausted,
    exhaustionInfo: {
      totalAvailable,
      totalSeen: excludeIds.length,
      wasReset,
      usedFallback,
    },
    language,
    categoryUuid,
  };
}

// ============================================================================
// VS MODE
// ============================================================================

async function getVSQuestions(
  count: number,
  language: string
): Promise<QuestionResult> {
  let exhausted = false;
  let wasReset = false;
  const usedFallback = false;
  
  // Get global tracking
  const seenIds = getSeenQuestionIds();
  
  // Get total question count
  const { count: totalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language);
  
  const totalAvailable = totalCount || 0;
  
  // Check exhaustion against SEEN ids (what we actually exclude), not global asked
  const isExhausted = seenIds.length >= totalAvailable && totalAvailable > 0;
  
  if (isExhausted) {
    clearSeenQuestions();
    wasReset = true;
    exhausted = true;
  }
  
  // Get fresh exclude list after potential reset
  let excludeIds = wasReset ? [] : [...seenIds];
  
  // Get all active categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, category_id, icon_slug')
    .eq('is_active', true);
  
  if (!categories || categories.length === 0) {
    return {
      questions: [],
      exhausted: true,
      exhaustionInfo: { totalAvailable: 0, totalSeen: 0, wasReset, usedFallback: false },
      language,
    };
  }
  
  // Shuffle categories and pick questions with retry logic
  const shuffledCategories = shuffleArray(categories);
  const selectedQuestions: FormattedQuestion[] = [];
  let categoryIndex = 0;
  let usedFallbackLocal = false;
  
  // Try to get one question per category, retry with next category if exhausted
  while (selectedQuestions.length < count && categoryIndex < shuffledCategories.length) {
    const cat = shuffledCategories[categoryIndex];
    
    let query = supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('category_id', cat.id)
      .eq('language', language);
    
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }
    
    const { data } = await query.limit(50);
    
    if (data && data.length > 0) {
      const rawQuestions = data as RawQuestion[];
      const validQuestions = rawQuestions.filter(isValidQuestionLength);
      if (validQuestions.length > 0) {
        const randomQ = validQuestions[Math.floor(Math.random() * validQuestions.length)];
        selectedQuestions.push(formatQuestion(randomQ, cat.name, cat.category_id));
        // Add to excludeIds to prevent same question in this batch
        excludeIds.push(randomQ.id);
      }
    }
    
    categoryIndex++;
  }
  
  // Global fallback: if still not enough, query across ALL categories
  if (selectedQuestions.length < count) {
    usedFallbackLocal = true;
    const needed = count - selectedQuestions.length;
    const existingIds = selectedQuestions.map(q => q.id);
    
    let fallbackQuery = supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, category_id')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language);
    
    const allExcludeIds = [...new Set([...excludeIds, ...existingIds])];
    if (allExcludeIds.length > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${allExcludeIds.join(',')})`);
    }
    
    const { data: fallbackData } = await fallbackQuery.limit(needed * 3);
    
    if (fallbackData && fallbackData.length > 0) {
      const validFallback = (fallbackData as RawQuestion[]).filter(isValidQuestionLength);
      const shuffled = shuffleArray(validFallback).slice(0, needed);
      
      for (const q of shuffled) {
        const cat = categories.find(c => c.id === q.category_id);
        selectedQuestions.push(formatQuestion(q, cat?.name, cat?.category_id));
      }
    }
  }
  
  // Mark as seen globally
  if (selectedQuestions.length > 0) {
    markQuestionsAsAskedGlobally(selectedQuestions.map(q => q.id));
  }
  
  return {
    questions: selectedQuestions,
    exhausted,
    exhaustionInfo: {
      totalAvailable,
      totalSeen: seenIds.length,
      wasReset,
      usedFallback: usedFallbackLocal,
    },
    language,
  };
}

// ============================================================================
// EXHAUSTION CHECK UTILITY
// ============================================================================

/**
 * Check if a category is close to exhaustion (for showing UI warnings)
 */
export async function checkExhaustionStatus(
  categorySlug: string,
  mode: 'category' | 'tv' | 'vs'
): Promise<{
  isExhausted: boolean;
  percentUsed: number;
  totalAvailable: number;
  totalSeen: number;
}> {
  const language = getPreferredLanguage();
  const categoryUuid = await resolveCategoryUuid(categorySlug);
  
  if (!categoryUuid) {
    return { isExhausted: true, percentUsed: 100, totalAvailable: 0, totalSeen: 0 };
  }
  
  const trackerKey = getTrackerKey(categoryUuid, mode);
  const seenIds = getAskedQuestionIds(trackerKey);
  
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  const totalAvailable = count || 0;
  const totalSeen = seenIds.length;
  const percentUsed = totalAvailable > 0 ? Math.round((totalSeen / totalAvailable) * 100) : 100;
  
  return {
    isExhausted: percentUsed >= 100,
    percentUsed,
    totalAvailable,
    totalSeen,
  };
}

/**
 * Clear all tracking for a category (force reset)
 */
export function resetCategoryTracking(categoryUuid: string, mode: 'category' | 'tv' | 'vs'): void {
  const trackerKey = getTrackerKey(categoryUuid, mode);
  clearCategoryAskedQuestions(trackerKey);
}
