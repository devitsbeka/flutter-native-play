/**
 * Hook for tracking asked questions within a category to prevent repetition.
 * Uses localStorage to persist across sessions (not just page navigations).
 * Also integrates with unified "seen" tracking across all game modes.
 * 
 * GOLDEN RULE: Users should NEVER see repeated questions until they've
 * exhausted ALL available questions.
 */
import {
  getAskedQuestionIds as getTrackerAskedIds,
  markQuestionsAsAsked as markTrackerQuestionsAsAsked,
  clearCategoryAskedQuestions,
  shouldResetCategoryPool,
  getSeenQuestionIds,
  markQuestionsAsSeen,
  shouldResetSeenPool,
  clearSeenQuestions,
  getCategoryLevelSeenIds,
  markCategoryLevelSeen,
  clearCategoryLevelSeen,
  shouldResetCategoryLevel,
} from "@/services/questionTracker";

export function useSessionQuestions(categoryId: string) {
  const getAskedQuestionIds = (): string[] => {
    return getTrackerAskedIds(categoryId);
  };

  /**
   * Get all question IDs that should be excluded (category-specific + globally seen)
   * This prioritizes fresh questions the user hasn't seen in ANY mode
   */
  const getExcludeQuestionIds = (): string[] => {
    const categoryAsked = getTrackerAskedIds(categoryId);
    const allSeen = getSeenQuestionIds();
    // Combine and dedupe - use seen as superset
    return [...new Set([...categoryAsked, ...allSeen])];
  };

  /**
   * Get exclude IDs for a specific level (most granular tracking)
   * Combines level-specific + category + globally seen
   */
  const getLevelExcludeQuestionIds = (levelNumber: number): string[] => {
    const levelSeen = getCategoryLevelSeenIds(categoryId, levelNumber);
    const allSeen = getSeenQuestionIds();
    // Combine and dedupe
    return [...new Set([...levelSeen, ...allSeen])];
  };

  /**
   * Mark questions as seen for a specific level (immediate marking)
   */
  const markLevelQuestionsSeen = (levelNumber: number, questionIds: string[]) => {
    markCategoryLevelSeen(categoryId, levelNumber, questionIds);
  };

  /**
   * Check if a level's question pool is exhausted
   */
  const isLevelExhausted = (levelNumber: number, totalAvailable: number): boolean => {
    return shouldResetCategoryLevel(categoryId, levelNumber, totalAvailable);
  };

  /**
   * Clear level tracking when pool is exhausted (allows repeats)
   */
  const clearLevelSeen = (levelNumber: number) => {
    clearCategoryLevelSeen(categoryId, levelNumber);
  };

  const markQuestionsAsAsked = (questionIds: string[]) => {
    // This now also marks as seen automatically
    markTrackerQuestionsAsAsked(categoryId, questionIds);
  };

  const clearAskedQuestions = () => {
    clearCategoryAskedQuestions(categoryId);
  };

  const shouldResetPool = (totalAvailable: number): boolean => {
    // Reset only when 100% of available questions have been asked
    return shouldResetCategoryPool(categoryId, totalAvailable);
  };

  /**
   * Check if seen pool should be reset (for cross-mode tracking)
   */
  const shouldResetSeenPoolCheck = (totalAvailable: number): boolean => {
    return shouldResetSeenPool(totalAvailable);
  };

  const clearSeen = () => {
    clearSeenQuestions();
  };

  return { 
    getAskedQuestionIds, 
    getExcludeQuestionIds,
    getLevelExcludeQuestionIds,
    markLevelQuestionsSeen,
    isLevelExhausted,
    clearLevelSeen,
    markQuestionsAsAsked, 
    clearAskedQuestions, 
    shouldResetPool,
    shouldResetSeenPoolCheck,
    clearSeen,
    // Export seen utilities for direct access
    getSeenQuestionIds,
    markQuestionsAsSeen,
  };
}
