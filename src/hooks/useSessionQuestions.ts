/**
 * Hook for tracking asked questions within a session to prevent repetition.
 * Uses sessionStorage to persist across page navigations within the same session.
 */
export function useSessionQuestions(categoryId: string) {
  const storageKey = `asked_questions_${categoryId}`;

  const getAskedQuestionIds = (): string[] => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  };

  const markQuestionsAsAsked = (questionIds: string[]) => {
    const current = getAskedQuestionIds();
    const updated = [...new Set([...current, ...questionIds])];
    sessionStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const clearAskedQuestions = () => {
    sessionStorage.removeItem(storageKey);
  };

  const shouldResetPool = (totalAvailable: number): boolean => {
    // Reset if we've used more than 50% of available questions
    const asked = getAskedQuestionIds();
    return asked.length > totalAvailable * 0.5;
  };

  return { 
    getAskedQuestionIds, 
    markQuestionsAsAsked, 
    clearAskedQuestions, 
    shouldResetPool 
  };
}
