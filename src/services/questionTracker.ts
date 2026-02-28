/**
 * Centralized Question Tracker Service
 * Uses localStorage for persistence across sessions.
 * Prevents question repetition by tracking seen/asked question IDs.
 * 
 * GOLDEN RULE: Users should NEVER see repeated questions until they've
 * exhausted ALL available questions in a category/level.
 */

const STORAGE_KEY = 'question_tracker';
const MAX_TRACKED_PER_CATEGORY = 500; // Remember last 500 questions per category
const GLOBAL_MAX_TRACKED = 1000; // Global limit across all categories
const SEEN_MAX_TRACKED = 5000; // Track up to 5000 seen questions across all modes
const MEDIA_SEEN_MAX_TRACKED = 500; // Track up to 500 media (image/video/audio) questions
const RESET_THRESHOLD = 1.0; // Only reset when 100% of available questions have been asked
const CATEGORY_SEEN_KEY_PREFIX = 'cat_'; // Prefix for category-wide tracking

interface TrackerData {
  categories: Record<string, string[]>; // categoryId -> questionIds
  categoryLevels: Record<string, string[]>; // "categoryId_levelNumber" -> questionIds
  global: string[]; // All asked question IDs (for VS mode)
  seen: string[]; // All questions ever shown to user (across all modes)
  mediaSeen: string[]; // Media questions (image/video/audio) seen - separate tracking
  lastUpdated: number;
}

function getTrackerData(): TrackerData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure all arrays exist (migration for existing users)
      if (!parsed.seen) {
        parsed.seen = [];
      }
      if (!parsed.categoryLevels) {
        parsed.categoryLevels = {};
      }
      if (!parsed.mediaSeen) {
        parsed.mediaSeen = [];
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse question tracker data:', e);
  }
  return { categories: {}, categoryLevels: {}, global: [], seen: [], mediaSeen: [], lastUpdated: Date.now() };
}

function saveTrackerData(data: TrackerData): void {
  try {
    data.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save question tracker data:', e);
  }
}

/**
 * Get asked question IDs for a specific category
 */
export function getAskedQuestionIds(categoryId: string): string[] {
  const data = getTrackerData();
  return data.categories[categoryId] || [];
}

/**
 * Get all globally asked question IDs (for VS mode)
 */
export function getGlobalAskedQuestionIds(): string[] {
  const data = getTrackerData();
  return data.global;
}

/**
 * Get all seen question IDs (across all modes)
 * Use this to prioritize fresh questions
 */
export function getSeenQuestionIds(): string[] {
  const data = getTrackerData();
  return data.seen;
}

/**
 * Check if a question has been seen by the user
 */
export function hasQuestionBeenSeen(questionId: string): boolean {
  const data = getTrackerData();
  return data.seen.includes(questionId);
}

/**
 * Get seen question IDs for a specific category and level
 */
export function getCategoryLevelSeenIds(categoryId: string, levelNumber: number): string[] {
  const data = getTrackerData();
  const key = `${categoryId}_${levelNumber}`;
  return data.categoryLevels?.[key] || [];
}

/**
 * Mark questions as seen for a specific category and level
 * This is the most granular tracking for category quiz mode
 */
export function markCategoryLevelSeen(categoryId: string, levelNumber: number, questionIds: string[]): void {
  const data = getTrackerData();
  const key = `${categoryId}_${levelNumber}`;
  
  if (!data.categoryLevels) {
    data.categoryLevels = {};
  }
  
  const existing = data.categoryLevels[key] || [];
  data.categoryLevels[key] = [...new Set([...existing, ...questionIds])];
  
  // Also update global seen (unified tracking)
  const updatedSeen = [...new Set([...data.seen, ...questionIds])];
  data.seen = updatedSeen.slice(-SEEN_MAX_TRACKED);
  
  saveTrackerData(data);
}

/**
 * Clear seen questions for a specific category and level (when fully exhausted)
 */
export function clearCategoryLevelSeen(categoryId: string, levelNumber: number): void {
  const data = getTrackerData();
  const key = `${categoryId}_${levelNumber}`;
  if (data.categoryLevels) {
    delete data.categoryLevels[key];
  }
  saveTrackerData(data);
}

// ============================================================================
// CATEGORY-WIDE TRACKING (for category quiz mode - fixes repetition issue)
// ============================================================================

/**
 * Get all seen question IDs for an entire category (not level-specific)
 * This is the primary tracking for category quiz mode
 */
export function getCategorySeenIds(categoryId: string): string[] {
  const data = getTrackerData();
  const key = `${CATEGORY_SEEN_KEY_PREFIX}${categoryId}`;
  return data.categoryLevels?.[key] || [];
}

/**
 * Mark questions as seen for a category (not level-specific)
 * This ensures questions don't repeat across ANY level in the category
 */
export function markCategorySeen(categoryId: string, questionIds: string[]): void {
  const data = getTrackerData();
  const key = `${CATEGORY_SEEN_KEY_PREFIX}${categoryId}`;
  
  if (!data.categoryLevels) {
    data.categoryLevels = {};
  }
  
  const existing = data.categoryLevels[key] || [];
  const updated = [...new Set([...existing, ...questionIds])];
  // Keep max 500 per category to limit storage
  data.categoryLevels[key] = updated.slice(-MAX_TRACKED_PER_CATEGORY);
  
  // Also update global seen
  const updatedSeen = [...new Set([...data.seen, ...questionIds])];
  data.seen = updatedSeen.slice(-SEEN_MAX_TRACKED);
  
  saveTrackerData(data);
}

/**
 * Clear category-wide seen questions (when pool is fully exhausted)
 */
export function clearCategorySeen(categoryId: string): void {
  const data = getTrackerData();
  const key = `${CATEGORY_SEEN_KEY_PREFIX}${categoryId}`;
  if (data.categoryLevels) {
    delete data.categoryLevels[key];
  }
  saveTrackerData(data);
}

/**
 * Check if category-wide pool should be reset
 */
export function shouldResetCategorySeen(categoryId: string, totalAvailable: number): boolean {
  const seenIds = getCategorySeenIds(categoryId);
  return seenIds.length >= totalAvailable * RESET_THRESHOLD;
}

/**
 * Mark questions as seen (shown to user in any mode)
 * This is the unified tracking across all game modes
 */
export function markQuestionsAsSeen(questionIds: string[]): void {
  const data = getTrackerData();
  const updatedSeen = [...new Set([...data.seen, ...questionIds])];
  // Keep only the most recent SEEN_MAX_TRACKED
  data.seen = updatedSeen.slice(-SEEN_MAX_TRACKED);
  saveTrackerData(data);
}

/**
 * Mark questions as asked for a specific category
 * Also marks them as seen
 */
export function markQuestionsAsAsked(categoryId: string, questionIds: string[]): void {
  const data = getTrackerData();
  
  // Update category-specific tracking
  const categoryAsked = data.categories[categoryId] || [];
  const updatedCategory = [...new Set([...categoryAsked, ...questionIds])];
  
  // Keep only the most recent MAX_TRACKED_PER_CATEGORY
  data.categories[categoryId] = updatedCategory.slice(-MAX_TRACKED_PER_CATEGORY);
  
  // Update global tracking
  const updatedGlobal = [...new Set([...data.global, ...questionIds])];
  data.global = updatedGlobal.slice(-GLOBAL_MAX_TRACKED);
  
  // Also mark as seen (unified tracking)
  const updatedSeen = [...new Set([...data.seen, ...questionIds])];
  data.seen = updatedSeen.slice(-SEEN_MAX_TRACKED);
  
  saveTrackerData(data);
}

/**
 * Mark questions as asked globally (for VS mode)
 * Also marks them as seen
 */
export function markQuestionsAsAskedGlobally(questionIds: string[]): void {
  const data = getTrackerData();
  const updatedGlobal = [...new Set([...data.global, ...questionIds])];
  data.global = updatedGlobal.slice(-GLOBAL_MAX_TRACKED);
  
  // Also mark as seen (unified tracking)
  const updatedSeen = [...new Set([...data.seen, ...questionIds])];
  data.seen = updatedSeen.slice(-SEEN_MAX_TRACKED);
  
  saveTrackerData(data);
}

/**
 * Check if the question pool should be reset for a category
 * Only returns true when ALL questions have been exhausted (100%)
 */
export function shouldResetCategoryPool(categoryId: string, totalAvailable: number): boolean {
  const askedIds = getAskedQuestionIds(categoryId);
  return askedIds.length >= totalAvailable * RESET_THRESHOLD;
}

/**
 * Check if the global question pool should be reset
 */
export function shouldResetGlobalPool(totalAvailable: number): boolean {
  const data = getTrackerData();
  return data.global.length >= totalAvailable * RESET_THRESHOLD;
}

/**
 * Check if the seen questions pool should be reset
 */
export function shouldResetSeenPool(totalAvailable: number): boolean {
  const data = getTrackerData();
  return data.seen.length >= totalAvailable * RESET_THRESHOLD;
}

/**
 * Check if a category+level combination should reset (all questions exhausted)
 */
export function shouldResetCategoryLevel(categoryId: string, levelNumber: number, totalAvailable: number): boolean {
  const levelSeenIds = getCategoryLevelSeenIds(categoryId, levelNumber);
  return levelSeenIds.length >= totalAvailable;
}

/**
 * Clear asked questions for a specific category
 */
export function clearCategoryAskedQuestions(categoryId: string): void {
  const data = getTrackerData();
  delete data.categories[categoryId];
  saveTrackerData(data);
}

/**
 * Clear all globally asked questions
 */
export function clearGlobalAskedQuestions(): void {
  const data = getTrackerData();
  data.global = [];
  saveTrackerData(data);
}

/**
 * Clear all seen questions (use sparingly - for full reset)
 */
export function clearSeenQuestions(): void {
  const data = getTrackerData();
  data.seen = [];
  saveTrackerData(data);
}

/**
 * Clear all tracking data (full reset)
 */
export function clearAllTrackingData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get statistics about tracking
 */
export function getTrackingStats(): {
  totalTracked: number;
  categoriesTracked: number;
  globalTracked: number;
  seenTracked: number;
  categoryLevelsTracked: number;
} {
  const data = getTrackerData();
  const totalTracked = Object.values(data.categories).reduce((sum, ids) => sum + ids.length, 0);
  return {
    totalTracked,
    categoriesTracked: Object.keys(data.categories).length,
    globalTracked: data.global.length,
    seenTracked: data.seen.length,
    categoryLevelsTracked: Object.keys(data.categoryLevels || {}).length,
  };
}

/**
 * Debug function to verify persistence and tracking state
 */
export function getTrackingDebugInfo(): string {
  const data = getTrackerData();
  return JSON.stringify({
    seenCount: data.seen.length,
    mediaSeenCount: data.mediaSeen.length,
    globalCount: data.global.length,
    categoriesCount: Object.keys(data.categories).length,
    categoryLevelsCount: Object.keys(data.categoryLevels || {}).length,
    lastUpdated: new Date(data.lastUpdated).toISOString(),
    sampleSeenIds: data.seen.slice(0, 5),
    categoryLevelKeys: Object.keys(data.categoryLevels || {}).slice(0, 10),
  }, null, 2);
}

// ============================================================================
// MEDIA QUESTION TRACKING (image/video/audio questions)
// ============================================================================

/**
 * Get all media question IDs that have been seen
 */
export function getMediaSeenIds(): string[] {
  const data = getTrackerData();
  return data.mediaSeen || [];
}

/**
 * Mark media questions as seen
 */
export function markMediaQuestionsSeen(questionIds: string[]): void {
  const data = getTrackerData();
  const updated = [...new Set([...(data.mediaSeen || []), ...questionIds])];
  data.mediaSeen = updated.slice(-MEDIA_SEEN_MAX_TRACKED);
  saveTrackerData(data);
}

/**
 * Check if media pool should be reset
 */
export function shouldResetMediaPool(totalMediaAvailable: number): boolean {
  const mediaSeenIds = getMediaSeenIds();
  return mediaSeenIds.length >= totalMediaAvailable * RESET_THRESHOLD;
}

/**
 * Clear media seen tracking (when all media questions exhausted)
 */
export function clearMediaSeen(): void {
  const data = getTrackerData();
  data.mediaSeen = [];
  saveTrackerData(data);
}
