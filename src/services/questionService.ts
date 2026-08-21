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
  getCategorySeenIds,
  markCategorySeen,
  clearCategorySeen,
  getMediaSeenIds,
  markMediaQuestionsSeen,
  clearMediaSeen,
} from "@/services/questionTracker";
import type { Json } from "@/integrations/supabase/types";
import { readAppLanguage } from "@/utils/appLanguage";

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionContext {
  mode: 'category' | 'vs' | 'tv';
  categorySlug?: string;      // e.g., "science", "history"
  categoryUuid?: string;      // UUID from database
  categoryName?: string;      // Pre-resolved category name (avoids extra DB lookup)
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
  imageUrl?: string | null;   // Image URL for image trivia questions
  videoUrl?: string | null;   // Video URL for video trivia questions
  audioUrl?: string | null;   // Audio URL for sound trivia questions
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
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

// ============================================================================
// UTILITIES
// ============================================================================

const STORAGE_KEY = 'preferredLanguage';
// What a user with no stored choice reads in — see locales/index.ts.
const DEFAULT_LANGUAGE = 'en';
// What categories.name is written in; translation lookups are skipped for it.
const CONTENT_LANGUAGE = 'ka';

/**
 * Get user's preferred language
 */
export function getPreferredLanguage(): string {
  if (typeof window !== 'undefined') {
    return readAppLanguage(DEFAULT_LANGUAGE);
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Shuffle array using Fisher-Yates
 */
// Image questions are unanswerable without their image ("what's shown in the
// picture?"), so a question whose image can't load must never enter a round.
// Select questions from the pool, preload-validating any image (2.5s cap,
// parallel per batch) and backfilling dropped ones from the remaining pool.
async function selectWithValidImages<T extends { id: string; imageUrl?: string | null }>(
  pool: T[],
  count: number
): Promise<T[]> {
  const preloadOk = (url: string) =>
    new Promise<boolean>(resolve => {
      const img = new Image();
      const timer = setTimeout(() => resolve(false), 2500);
      img.onload = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = url;
    });

  const selected: T[] = [];
  let index = 0;
  while (selected.length < count && index < pool.length) {
    const batch = pool.slice(index, index + (count - selected.length));
    index += batch.length;
    const checks = await Promise.all(
      batch.map(async q => (q.imageUrl ? { q, ok: await preloadOk(q.imageUrl) } : { q, ok: true }))
    );
    for (const { q, ok } of checks) {
      if (ok) {
        selected.push(q);
      } else {
        console.warn('[questionService] Dropping question with unloadable image:', q.id);
      }
    }
  }
  return selected;
}

/**
 * Drop questions that ASK the same thing, whatever row they live in.
 *
 * The pools contain duplicate rows — same question text imported or
 * generated more than once under different ids — and every selection here
 * dedupes by id only, so a 10-question TV round could serve the same
 * question two or three times. Ids are unique by construction; the text is
 * what repeats, so the text is what gets deduped. Normalised so case,
 * punctuation and whitespace do not make two questions different. Applied
 * to every mode: TV rounds, category levels and VS matches all drew from
 * the same duplicate-bearing pools.
 *
 * Media questions are the exception: an image/video/audio question asks
 * through its media while the stem is a shared template ("Which celebrity
 * is pictured?" x70), so for those the media URL is the identity. Keying
 * them by text collapsed every picture-guess level to a single question.
 */
function dedupeByQuestionText<
  T extends { question: string; imageUrl?: string | null; videoUrl?: string | null; audioUrl?: string | null }
>(pool: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const q of pool) {
    const media = q.imageUrl || q.videoUrl || q.audioUrl;
    const key = media
      ? `media:${media}`
      : q.question.toLowerCase().replace(/[?.!,;:'"()]/g, "").replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

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
  // Reject questions with fewer than 3 incorrect answers (need 4 total options)
  if (incorrects.length < 3) return false;
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
    imageUrl: q.image_url,
    videoUrl: q.video_url,
    audioUrl: q.audio_url,
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
    .maybeSingle();
  
  if (error || !data) {
    console.error('Failed to resolve category UUID:', error);
    return null;
  }
  
  return data.id;
}

/**
 * The category's display name in the player's language.
 *
 * `categories.name` is the Georgian name — there is one row per category and
 * every row is Georgian; translations live in `category_translations`, keyed
 * by the category UUID and a language code. Every question this service
 * formats carries a category name into a header directly above the question,
 * so reading `name` raw is exactly the "Georgian category title on an
 * English question" bug. Falls back to the Georgian name only when no
 * translation row exists.
 */
async function translateCategoryNames(
  names: Map<string, string>,
): Promise<Map<string, string>> {
  const language = getPreferredLanguage();
  if (language === CONTENT_LANGUAGE || names.size === 0) return names;

  const { data, error } = await supabase
    .from('category_translations')
    .select('category_id, name')
    .eq('language', language)
    .in('category_id', [...names.keys()]);

  if (error || !data) return names;

  const out = new Map(names);
  for (const row of data) {
    if (row.name) out.set(row.category_id, row.name);
  }
  return out;
}

/**
 * Get category info by UUID — name resolved in the player's language.
 */
async function getCategoryInfo(uuid: string): Promise<{ name: string; slug: string; icon: string; totalLevels: number } | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('name, category_id, icon, total_levels')
    .eq('id', uuid)
    .single();

  if (error || !data) return null;

  const translated = await translateCategoryNames(new Map([[uuid, data.name]]));

  return {
    name: translated.get(uuid) || data.name,
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
  
  // No fallback to Georgian - if no questions in user's language, return empty
  // The UI will show a "no questions" modal instead
  // Resolve category UUID if needed
  let categoryUuid = ctx.categoryUuid;
  if (!categoryUuid && ctx.categorySlug) {
    categoryUuid = await resolveCategoryUuid(ctx.categorySlug) || undefined;
  }
  
  // Mode-specific handlers
  switch (ctx.mode) {
    case 'category':
      if (!categoryUuid) {
        console.error('[questionService] Could not resolve category:', ctx.categorySlug);
        return { questions: [], exhausted: false, language, categoryUuid: undefined };
      }
      return getCategoryQuestions(categoryUuid, ctx.levelNumber || 1, count, language, ctx.excludeIds, ctx.categoryName);
    case 'tv':
      // If no categoryUuid, use multi-category mode (mixed category)
      if (!categoryUuid) {
        return getMultiCategoryVSQuestions(count, language);
      }
      return getTVQuestions(categoryUuid, count, language);
    case 'vs':
      return getVSQuestions(categoryUuid, count, language);
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
  additionalExcludeIds?: string[],
  preResolvedCategoryName?: string
): Promise<QuestionResult> {
  // Defensive: if categoryUuid is falsy, return empty result immediately
  if (!categoryUuid) {
    return { questions: [], exhausted: true, language, exhaustionInfo: { totalAvailable: 0, totalSeen: 0, wasReset: false, usedFallback: false }, categoryUuid: undefined };
  }

  let exhausted = false;
  let wasReset = false;
  let usedFallback = false;
  
  // Expand level range for variety
  const minLevel = Math.max(1, levelNumber - 3);
  const maxLevel = Math.min(20, levelNumber + 5);
  
  // Run category info + exhaustion count in PARALLEL
  // Skip category info lookup if name was pre-resolved
  const [categoryInfo, countResult] = await Promise.all([
    preResolvedCategoryName 
      ? Promise.resolve({ name: preResolvedCategoryName, slug: '', icon: '', totalLevels: 0 })
      : getCategoryInfo(categoryUuid),
    // Use lightweight COUNT query instead of fetching all rows
    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid),
  ]);
  
  const totalAvailable = countResult.count || 0;
  
  // FIX: Get seen questions for ENTIRE CATEGORY (not level-specific)
  // This prevents questions from repeating when playing different levels
  const categorySeenIds = getCategorySeenIds(categoryUuid);
  
  // Combine category-seen with any additional exclusions
  let excludeIds = [...new Set([...categorySeenIds, ...(additionalExcludeIds || [])])];
  
  // Check category-wide exhaustion using VALID question count
  const categoryExhausted = categorySeenIds.length >= totalAvailable && totalAvailable > 0;
  
  if (categoryExhausted) {
    // Category pool exhausted - clear tracking and start fresh
    clearCategorySeen(categoryUuid);
    wasReset = true;
    exhausted = true;
    excludeIds = [...(additionalExcludeIds || [])]; // Only keep explicit exclusions
    console.log(`[questionService] Category ${categoryUuid} exhausted (${categorySeenIds.length}/${totalAvailable}), resetting...`);
  }
  
  // Build query - fetch WITHOUT exclude filter, apply client-side
  let query = supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug, image_url, video_url, audio_url')
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid)
    .gte('level_number', minLevel)
    .lte('level_number', maxLevel);
  
  let { data: questions } = await query.limit(50);
  
  // Client-side exclusion using Set for O(1) lookups
  const excludeSet = new Set(excludeIds);
  if (questions && excludeSet.size > 0) {
    questions = questions.filter(q => !excludeSet.has(q.id));
  }
  
  // Fallback 1: try full level range (1-20) with exclusions if not enough
  if (!questions || questions.length < count) {
    usedFallback = true;
    let fallbackQuery = supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid)
      .gte('level_number', 1)
      .lte('level_number', 20);
    
    const { data: fallbackQuestions } = await fallbackQuery.limit(50);
    // Apply client-side exclusion
    questions = (fallbackQuestions || []).filter(q => !excludeSet.has(q.id));
  }
  
  // Fallback 2: If still not enough, clear ALL exclusions and try ANY level
  if (!questions || questions.length < count) {
    clearCategorySeen(categoryUuid);
    wasReset = true;
    exhausted = true;
    
    const { data: resetQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid)
      .limit(50);
    
    questions = resetQuestions || [];
    
    // Clean stale IDs from tracker: intersect seen IDs with actual DB question IDs
    if (questions && questions.length > 0) {
      const actualIds = new Set(questions.map(q => q.id));
      const currentSeenIds = getCategorySeenIds(categoryUuid);
      const staleCount = currentSeenIds.filter(id => !actualIds.has(id)).length;
      if (staleCount > 0) {
        console.log(`[questionService] Cleaned ${staleCount} stale IDs from tracker for category ${categoryUuid}`);
      }
    }
  }
  
  // FIX: Apply validation BEFORE empty check
  // This ensures we detect when all remaining questions are invalid
  let rawQuestions = (questions || []) as RawQuestion[];
  let validQuestions = rawQuestions
    .filter(isValidQuestionLength)
    .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  
  // FIX: If we got raw questions but 0 valid ones, the tracker is stuck on invalid questions
  // Clear tracker and retry one final time
  if (validQuestions.length === 0 && rawQuestions.length > 0 && !wasReset) {
    console.log(`[questionService] All ${rawQuestions.length} fetched questions were invalid, clearing tracker and retrying...`);
    clearCategorySeen(categoryUuid);
    wasReset = true;
    exhausted = true;
    
    const { data: retryQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid)
      .limit(50);
    
    rawQuestions = (retryQuestions || []) as RawQuestion[];
    validQuestions = rawQuestions
      .filter(isValidQuestionLength)
      .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  }
  
  // Truly no valid questions in this category
  if (validQuestions.length === 0) {
    console.warn(`[questionService] No valid questions for category ${categoryUuid} in language ${language}`);
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
  
  // Shuffle and select
  const selected = await selectWithValidImages(dedupeByQuestionText(shuffleArray(validQuestions)), count);
  
  // FIX: Mark as seen for CATEGORY (not level-specific)
  // This ensures questions won't repeat across any level
  if (selected.length > 0) {
    markCategorySeen(categoryUuid, selected.map(q => q.id));
  }
  
  return {
    questions: selected,
    exhausted,
    exhaustionInfo: {
      totalAvailable,
      totalSeen: categorySeenIds.length,
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
  
  // Build query - fetch full pool, apply exclusion client-side
  let query = supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url')
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  let { data: questions } = await query;
  
  // Client-side exclusion using Set
  const excludeSet = new Set(excludeIds);
  if (questions && excludeSet.size > 0) {
    questions = questions.filter(q => !excludeSet.has(q.id));
  }
  
  // If not enough, reset tracker
  if (!questions || questions.length < count) {
    clearCategoryAskedQuestions(trackerKey);
    wasReset = true;
    exhausted = true;
    
    const { data: resetQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid);
    
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
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid);
    
    questions = finalQuestions || [];
  }
  
  // FIX: Apply validation BEFORE empty check
  let rawQuestions = (questions || []) as RawQuestion[];
  let validQuestions = rawQuestions
    .filter(isValidQuestionLength)
    .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  
  // If 0 valid after filtering but raw existed, retry without exclusions
  if (validQuestions.length === 0 && rawQuestions.length > 0 && !wasReset) {
    console.log(`[TV Mode] All fetched questions invalid, clearing tracker and retrying...`);
    clearCategoryAskedQuestions(trackerKey);
    clearSeenQuestions();
    wasReset = true;
    exhausted = true;
    
    const { data: retryQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid);
    
    rawQuestions = (retryQuestions || []) as RawQuestion[];
    validQuestions = rawQuestions
      .filter(isValidQuestionLength)
      .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  }
  
  // Truly no valid questions
  if (validQuestions.length === 0) {
    console.warn(`[TV Mode] No valid questions for category ${categoryUuid} in language ${language}`);
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
  
  // Shuffle and select
  const selected = await selectWithValidImages(dedupeByQuestionText(shuffleArray(validQuestions)), count);
  
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
  categoryUuid: string | undefined,
  count: number,
  language: string
): Promise<QuestionResult> {
  // If a specific category is selected, use single-category mode
  if (categoryUuid) {
    return getSingleCategoryVSQuestions(categoryUuid, count, language);
  }
  
  // Otherwise, use multi-category random mode (original behavior)
  return getMultiCategoryVSQuestions(count, language);
}

/**
 * Get VS questions from a SINGLE selected category
 */
async function getSingleCategoryVSQuestions(
  categoryUuid: string,
  count: number,
  language: string
): Promise<QuestionResult> {
  let exhausted = false;
  let wasReset = false;
  
  // Get category info
  const categoryInfo = await getCategoryInfo(categoryUuid);
  
  // Get seen question IDs - use FULL list for client-side filtering
  const seenIds = getSeenQuestionIds();
  // No cap needed - we filter client-side now
  let excludeIds = [...seenIds];
  
  // Get total available in this category
  const { count: totalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  const totalAvailable = totalCount || 0;
  
  // Check if exhausted
  if (seenIds.length >= totalAvailable && totalAvailable > 0) {
    clearSeenQuestions();
    wasReset = true;
    exhausted = true;
    excludeIds = [];
  }
  
  // Query all questions from specific category, filter client-side
  const { data: allCatQuestions } = await supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url')
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  // Client-side exclusion
  const excludeSet = new Set(excludeIds);
  let questions = (allCatQuestions || []).filter(q => !excludeSet.has(q.id));
  
  // If not enough, clear exclusions and retry
  if (!questions || questions.length < count) {
    clearSeenQuestions();
    wasReset = true;
    exhausted = true;
    
    const { data: resetQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid);
    
    questions = resetQuestions || [];
  }
  
  // FIX: Apply validation BEFORE empty check
  let rawQuestions = (questions || []) as RawQuestion[];
  let validQuestions = rawQuestions
    .filter(isValidQuestionLength)
    .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  
  // If 0 valid after filtering but raw existed, retry without exclusions
  if (validQuestions.length === 0 && rawQuestions.length > 0 && !wasReset) {
    console.log(`[VS Single] All fetched questions invalid, clearing tracker and retrying...`);
    clearSeenQuestions();
    wasReset = true;
    exhausted = true;
    
    const { data: retryQuestions } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url')
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', categoryUuid);
    
    rawQuestions = (retryQuestions || []) as RawQuestion[];
    validQuestions = rawQuestions
      .filter(isValidQuestionLength)
      .map(q => formatQuestion(q, categoryInfo?.name, categoryInfo?.slug));
  }
  
  // Truly no valid questions
  if (validQuestions.length === 0) {
    return {
      questions: [],
      exhausted: true,
      exhaustionInfo: { totalAvailable, totalSeen: seenIds.length, wasReset, usedFallback: false },
      language,
      categoryUuid,
    };
  }
  
  const selected = await selectWithValidImages(dedupeByQuestionText(shuffleArray(validQuestions)), count);
  
  // Mark as seen
  if (selected.length > 0) {
    markQuestionsAsAskedGlobally(selected.map(q => q.id));
  }
  
  return {
    questions: selected,
    exhausted,
    exhaustionInfo: {
      totalAvailable,
      totalSeen: seenIds.length,
      wasReset,
      usedFallback: false,
    },
    language,
    categoryUuid,
  };
}

/**
 * Get VS questions from MULTIPLE random categories (original behavior)
 */
async function getMultiCategoryVSQuestions(
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
  
  // Get fresh seen list after potential reset - use full list for client-side filtering
  const currentSeenIds = wasReset ? [] : seenIds;
  const seenSet = new Set(currentSeenIds);
  const mediaSeenIds = getMediaSeenIds();
  const mediaSeenSet = new Set(mediaSeenIds);
  
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
  
  // BULK FETCH: Single query across ALL categories — NO limit, NO server-side exclude
  let usedFallbackLocal = false;
  
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug, image_url, video_url, audio_url, category_id')
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language);
  
  // Category names in the player's language — the raw rows are all Georgian.
  const translatedNames = await translateCategoryNames(
    new Map(categories.map(c => [c.id, c.name])),
  );
  const categoryMap = new Map(
    categories.map(c => [c.id, { ...c, name: translatedNames.get(c.id) || c.name }]),
  );

  const selectedQuestions: FormattedQuestion[] = [];
  
  if (allQuestions && allQuestions.length > 0) {
    // Client-side exclusion: filter out all seen questions
    const unseenQuestions = (allQuestions as RawQuestion[]).filter(q => !seenSet.has(q.id));
    const validQuestions = (unseenQuestions.length >= count ? unseenQuestions : allQuestions as RawQuestion[])
      .filter(isValidQuestionLength);
    
    // === MEDIA-AWARE SELECTION ===
    // Separate media questions (image/video/audio) from text-only
    const mediaQuestions = validQuestions.filter(q => q.image_url || q.video_url || q.audio_url);
    const unseenMedia = mediaQuestions.filter(q => !mediaSeenSet.has(q.id));
    
    // Reserve 1-2 slots for unseen media questions if available
    const mediaSlots = Math.min(2, unseenMedia.length, Math.floor(count / 3));
    const usedIds = new Set<string>();
    
    if (mediaSlots > 0) {
      const shuffledMedia = shuffleArray(unseenMedia).slice(0, mediaSlots);
      for (const q of shuffledMedia) {
        const cat = categoryMap.get(q.category_id || '');
        selectedQuestions.push(formatQuestion(q, cat?.name, cat?.category_id));
        usedIds.add(q.id);
      }
    }
    
    // If no unseen media left, reset media tracker
    if (unseenMedia.length === 0 && mediaQuestions.length > 0) {
      clearMediaSeen();
    }
    
    // === ROUND-ROBIN CATEGORY DIVERSITY for remaining slots ===
    const remainingCount = count - selectedQuestions.length;
    const remainingValid = validQuestions.filter(q => !usedIds.has(q.id));
    
    // Group by category for diversity
    const byCategory = new Map<string, RawQuestion[]>();
    for (const q of remainingValid) {
      const catId = q.category_id || 'unknown';
      if (!byCategory.has(catId)) byCategory.set(catId, []);
      byCategory.get(catId)!.push(q);
    }
    
    // Round-robin pick from shuffled categories
    const categoryKeys = shuffleArray([...byCategory.keys()]);
    let roundRobinIndex = 0;
    
    while (selectedQuestions.length < count && roundRobinIndex < categoryKeys.length * count) {
      const catId = categoryKeys[roundRobinIndex % categoryKeys.length];
      const pool = byCategory.get(catId);
      if (pool && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const q = pool[idx];
        if (!usedIds.has(q.id)) {
          usedIds.add(q.id);
          const cat = categoryMap.get(q.category_id || '');
          selectedQuestions.push(formatQuestion(q, cat?.name, cat?.category_id));
          pool.splice(idx, 1);
        }
      }
      roundRobinIndex++;
    }
    
    // If still not enough, pick any remaining
    if (selectedQuestions.length < count) {
      usedFallbackLocal = true;
      const remaining = validQuestions.filter(q => !usedIds.has(q.id));
      const shuffledRemaining = shuffleArray(remaining).slice(0, count - selectedQuestions.length);
      for (const q of shuffledRemaining) {
        const cat = categoryMap.get(q.category_id || '');
        selectedQuestions.push(formatQuestion(q, cat?.name, cat?.category_id));
      }
    }
  }
  
  // Mark as seen globally + track media separately
  if (selectedQuestions.length > 0) {
    markQuestionsAsAskedGlobally(selectedQuestions.map(q => q.id));
    // Track media questions separately for better rotation
    const mediaIds = selectedQuestions
      .filter(q => q.imageUrl || q.videoUrl || q.audioUrl)
      .map(q => q.id);
    if (mediaIds.length > 0) {
      markMediaQuestionsSeen(mediaIds);
    }
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
