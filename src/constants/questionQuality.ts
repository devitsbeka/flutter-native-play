/**
 * Centralized quality constants for question validation
 * Used across the codebase for consistent validation thresholds
 */

export const QUALITY_CONSTANTS = {
  /** Similarity threshold for duplicate detection (0-1 scale) */
  SIMILARITY_THRESHOLD: 0.55,
  
  /** Maximum characters for question text (including "?") */
  QUESTION_MAX_LENGTH: 70,
  
  /** Maximum characters for each answer option */
  ANSWER_MAX_LENGTH: 20,
  
  /** Maximum allowed difference in character length between answers */
  MAX_ANSWER_LENGTH_DIFF: 8,
  
  /** Minimum answer length to check for answer-in-question */
  MIN_ANSWER_LENGTH_FOR_CHECK: 4,
} as const;

export type QualityConstants = typeof QUALITY_CONSTANTS;
