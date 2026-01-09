/**
 * Centralized Question Fetching Utility
 * 
 * Standardizes all question fetching across game modes with consistent filters:
 * - is_active: true (question is active)
 * - in_production: true (question is published)
 * - language: user's preferred language
 */

import { supabase } from "@/integrations/supabase/client";
import { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } from "@/utils/questionValidation";

const STORAGE_KEY = 'preferredLanguage';
const DEFAULT_LANGUAGE = 'ka';

export interface QuestionFilters {
  categoryUuid?: string;
  excludeIds?: string[];
  minLevel?: number;
  maxLevel?: number;
  limit?: number;
}

export interface FetchedQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  level_number?: number;
  icon_slug?: string | null;
  category_id?: string;
}

export interface QuestionAvailabilityResult {
  available: number;
  required: number;
  sufficient: boolean;
  language: string;
}

/**
 * Get the user's preferred language from localStorage
 */
export function getPreferredLanguage(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Check if a category has enough questions in the user's language
 */
export async function checkQuestionAvailability(
  categoryUuid: string,
  requiredCount: number = 5
): Promise<QuestionAvailabilityResult> {
  const language = getPreferredLanguage();
  
  const { count, error } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  if (error) {
    console.error('Error checking question availability:', error);
    return { available: 0, required: requiredCount, sufficient: false, language };
  }
  
  const available = count || 0;
  
  return {
    available,
    required: requiredCount,
    sufficient: available >= requiredCount,
    language,
  };
}

/**
 * Get category UUID from category slug
 */
export async function getCategoryUuid(categorySlug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('category_id', categorySlug)
    .single();
  
  if (error || !data) {
    console.error('Error fetching category UUID:', error);
    return null;
  }
  
  return data.id;
}

/**
 * Fetch questions with standardized filters
 * All game modes should use this function to ensure consistent filtering
 */
export async function fetchQuestions(filters: QuestionFilters = {}): Promise<FetchedQuestion[]> {
  const language = getPreferredLanguage();
  const {
    categoryUuid,
    excludeIds = [],
    minLevel,
    maxLevel,
    limit = 100,
  } = filters;
  
  // Start query with mandatory filters
  let query = supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug, category_id')
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language);
  
  // Add optional filters
  if (categoryUuid) {
    query = query.eq('category_id', categoryUuid);
  }
  
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  
  if (minLevel !== undefined) {
    query = query.gte('level_number', minLevel);
  }
  
  if (maxLevel !== undefined) {
    query = query.lte('level_number', maxLevel);
  }
  
  const { data, error } = await query.limit(limit);
  
  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  
  // Map database response to FetchedQuestion interface
  return (data || []).map(q => ({
    id: q.id,
    question_text: q.question_text,
    correct_answer: q.correct_answer,
    incorrect_answers: Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [],
    difficulty: q.difficulty,
    level_number: q.level_number ?? undefined,
    icon_slug: q.icon_slug,
    category_id: q.category_id,
  }));
}

/**
 * Fetch questions and filter by length constraints
 */
export async function fetchValidQuestions(filters: QuestionFilters = {}): Promise<FetchedQuestion[]> {
  const questions = await fetchQuestions(filters);
  
  return questions.filter(q => {
    // Check question text length
    if (q.question_text.length > QUESTION_MAX_LENGTH) return false;
    
    // Check correct answer length
    if (q.correct_answer.length > ANSWER_MAX_LENGTH) return false;
    
    // Check incorrect answers length
    const incorrectAnswers = Array.isArray(q.incorrect_answers)
      ? q.incorrect_answers
      : [];
    
    if (incorrectAnswers.some((a: string) => a.length > ANSWER_MAX_LENGTH)) return false;
    
    return true;
  });
}

/**
 * Shuffle an array in place
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Select random questions from a pool
 */
export function selectRandomQuestions<T>(questions: T[], count: number): T[] {
  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, count);
}

/**
 * Format questions with shuffled answers for game use
 */
export function formatQuestionsForGame(
  questions: FetchedQuestion[],
  categoryName?: string
): Array<{
  id: string;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
  icon_slug?: string | null;
}> {
  return questions.map(q => {
    const incorrectAnswers = Array.isArray(q.incorrect_answers)
      ? q.incorrect_answers
      : [];
    
    const allAnswers = shuffleArray([q.correct_answer, ...incorrectAnswers]);
    
    return {
      id: q.id,
      question: q.question_text,
      correctAnswer: q.correct_answer,
      incorrectAnswers,
      allAnswers,
      difficulty: (q.difficulty || 'medium') as "easy" | "medium" | "hard",
      category: categoryName || 'General',
      icon_slug: q.icon_slug,
    };
  });
}
