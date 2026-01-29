/**
 * Unified TV Game Scoring Utility
 * 
 * Centralizes score calculation to ensure consistency between
 * TVHostController and TVGameContext.
 */

const BASE_POINTS = 100;
const TIME_BONUS_MULTIPLIER = 5;
const QUESTION_TIME_SECONDS = 15;

/**
 * Calculate points for an answer
 * @param isCorrect - Whether the answer was correct
 * @param timeRemaining - Seconds remaining when answer was submitted
 * @returns Points earned (0 for incorrect answers)
 */
export const calculatePoints = (isCorrect: boolean, timeRemaining: number): number => {
  if (!isCorrect) return 0;
  
  // Ensure timeRemaining is within valid range
  const clampedTime = Math.max(0, Math.min(timeRemaining, QUESTION_TIME_SECONDS));
  
  // Math.round to prevent floating point precision issues from timer decrements
  return Math.round(BASE_POINTS + (clampedTime * TIME_BONUS_MULTIPLIER));
};

/**
 * Calculate observer bonus when a player answers incorrectly or times out
 * The bonus is inversely proportional to how quickly the player failed
 * This creates fair scoring: fast wrong = low bonus, timeout = max bonus (175)
 * 
 * @param timeWhenAnswered - Seconds remaining when wrong answer was given (0 for timeout)
 * @returns Bonus points for observer (100-175 range, matching player point range)
 */
export const calculateObserverBonus = (timeWhenAnswered: number): number => {
  // If player answered wrong quickly (14s left), observer gets less (105)
  // If player timed out (0s left), observer gets max (175)
  const clampedTime = Math.max(0, Math.min(timeWhenAnswered, QUESTION_TIME_SECONDS));
  const timeUsed = QUESTION_TIME_SECONDS - clampedTime;
  // Math.round to prevent floating point precision issues
  return Math.round(BASE_POINTS + (timeUsed * TIME_BONUS_MULTIPLIER));
};

/**
 * Calculate time remaining from server start time
 * @param questionStartTime - ISO string of when question started
 * @param totalTime - Total seconds for the question (default: 15)
 * @returns Seconds remaining (clamped to 0-totalTime)
 */
export const calculateTimeRemaining = (
  questionStartTime: string | null | undefined,
  totalTime: number = QUESTION_TIME_SECONDS
): number => {
  if (!questionStartTime) return totalTime;
  
  const startTime = new Date(questionStartTime).getTime();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  
  return Math.max(0, Math.min(totalTime, totalTime - elapsed));
};

/**
 * Get the total time for a question
 */
export const getQuestionTime = (): number => QUESTION_TIME_SECONDS;

/**
 * Storage key for session bindings
 */
const SESSION_BINDING_PREFIX = 'tv_session_binding_';

interface SessionBinding {
  sessionId: string;
  playerId: string;
  createdAt: number;
}

/**
 * Get existing player ID for a session (for join idempotency)
 * Returns null if no binding exists or if it's expired (>24h)
 */
export const getSessionBinding = (sessionId: string): string | null => {
  try {
    const key = `${SESSION_BINDING_PREFIX}${sessionId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    const binding: SessionBinding = JSON.parse(stored);
    
    // Check if binding is expired (24 hours)
    const isExpired = Date.now() - binding.createdAt > 24 * 60 * 60 * 1000;
    
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }
    
    return binding.playerId;
  } catch {
    return null;
  }
};

/**
 * Store a session binding for join idempotency
 */
export const setSessionBinding = (sessionId: string, playerId: string): void => {
  try {
    const key = `${SESSION_BINDING_PREFIX}${sessionId}`;
    const binding: SessionBinding = {
      sessionId,
      playerId,
      createdAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(binding));
  } catch {
    // Silently fail - this is an optimization, not critical
  }
};

/**
 * Clear expired session bindings (cleanup utility)
 */
export const clearExpiredBindings = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SESSION_BINDING_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const binding: SessionBinding = JSON.parse(stored);
          if (Date.now() - binding.createdAt > 24 * 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Silently fail
  }
};
