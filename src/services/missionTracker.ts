// Mission tracking service for gameplay sessions
// This service tracks mission-related events during gameplay and can be used
// to submit progress after a game ends

let correctAnswersThisSession = 0;
let totalAnswersThisSession = 0;
let categoriesPlayedThisSession = new Set<string>();

export const missionTracker = {
  // Record any answer (for perfect-game detection)
  recordAnswer: () => {
    totalAnswersThisSession++;
  },

  // Record a correct answer
  recordCorrectAnswer: () => {
    correctAnswersThisSession++;
  },

  // Record a category played
  recordCategoryPlayed: (categoryId: string) => {
    if (categoryId) {
      categoriesPlayedThisSession.add(categoryId);
    }
  },

  // Get session data for mission updates
  getSessionData: () => ({
    correctAnswers: correctAnswersThisSession,
    totalAnswers: totalAnswersThisSession,
    categoriesPlayed: categoriesPlayedThisSession.size,
  }),

  // Reset session data (call when starting a new game)
  resetSession: () => {
    correctAnswersThisSession = 0;
    totalAnswersThisSession = 0;
    categoriesPlayedThisSession.clear();
  },
};
