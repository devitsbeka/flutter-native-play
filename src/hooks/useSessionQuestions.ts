/**
 * Hook for tracking asked questions within a category to prevent repetition.
 * Uses localStorage to persist across sessions (not just page navigations).
 * Also integrates with unified "seen" tracking across all game modes.
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

  const markQuestionsAsAsked = (questionIds: string[]) => {
    // This now also marks as seen automatically
    markTrackerQuestionsAsAsked(categoryId, questionIds);
  };

  const clearAskedQuestions = () => {
    clearCategoryAskedQuestions(categoryId);
  };

  const shouldResetPool = (totalAvailable: number): boolean => {
    // Reset if we've used more than 80% of available questions
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
