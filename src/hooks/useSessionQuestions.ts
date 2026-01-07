/**
 * Hook for tracking asked questions within a category to prevent repetition.
 * Uses localStorage to persist across sessions (not just page navigations).
 */
import {
  getAskedQuestionIds as getTrackerAskedIds,
  markQuestionsAsAsked as markTrackerQuestionsAsAsked,
  clearCategoryAskedQuestions,
  shouldResetCategoryPool,
} from "@/services/questionTracker";

export function useSessionQuestions(categoryId: string) {
  const getAskedQuestionIds = (): string[] => {
    return getTrackerAskedIds(categoryId);
  };

  const markQuestionsAsAsked = (questionIds: string[]) => {
    markTrackerQuestionsAsAsked(categoryId, questionIds);
  };

  const clearAskedQuestions = () => {
    clearCategoryAskedQuestions(categoryId);
  };

  const shouldResetPool = (totalAvailable: number): boolean => {
    // Reset if we've used more than 80% of available questions
    return shouldResetCategoryPool(categoryId, totalAvailable);
  };

  return { 
    getAskedQuestionIds, 
    markQuestionsAsAsked, 
    clearAskedQuestions, 
    shouldResetPool 
  };
}
