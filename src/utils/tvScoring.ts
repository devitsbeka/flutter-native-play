/**
 * TV Game Scoring Utility
 *
 * Scoring itself comes from the app-wide unified policy in utils/scoring —
 * TV pays the same points for the same answer as every other mode. This
 * module keeps the TV-specific helpers (server-time sync, session bindings)
 * and re-exports the shared formulas for existing TV call sites.
 */

import { calculatePoints, calculateObserverBonus, QUESTION_TIME_SECONDS } from "./scoring";

export { calculatePoints, calculateObserverBonus };

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
