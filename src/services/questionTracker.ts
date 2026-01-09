/**
 * Centralized Question Tracker Service
 * Uses localStorage for persistence across sessions.
 * Prevents question repetition by tracking seen/asked question IDs.
 */

const STORAGE_KEY = 'question_tracker';
const MAX_TRACKED_PER_CATEGORY = 200; // Remember last 200 questions per category
const GLOBAL_MAX_TRACKED = 500; // Global limit across all categories
const SEEN_MAX_TRACKED = 1000; // Track up to 1000 seen questions across all modes
const RESET_THRESHOLD = 0.8; // Reset when 80% of available questions have been asked

interface TrackerData {
  categories: Record<string, string[]>; // categoryId -> questionIds
  global: string[]; // All asked question IDs (for VS mode)
  seen: string[]; // All questions ever shown to user (across all modes)
  lastUpdated: number;
}

function getTrackerData(): TrackerData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure seen array exists (migration for existing users)
      if (!parsed.seen) {
        parsed.seen = [];
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse question tracker data:', e);
  }
  return { categories: {}, global: [], seen: [], lastUpdated: Date.now() };
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
} {
  const data = getTrackerData();
  const totalTracked = Object.values(data.categories).reduce((sum, ids) => sum + ids.length, 0);
  return {
    totalTracked,
    categoriesTracked: Object.keys(data.categories).length,
    globalTracked: data.global.length,
    seenTracked: data.seen.length,
  };
}
