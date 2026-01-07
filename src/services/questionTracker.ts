/**
 * Centralized Question Tracker Service
 * Uses localStorage for persistence across sessions.
 * Prevents question repetition by tracking asked question IDs.
 */

const STORAGE_KEY = 'question_tracker';
const MAX_TRACKED_PER_CATEGORY = 200; // Remember last 200 questions per category
const GLOBAL_MAX_TRACKED = 500; // Global limit across all categories
const RESET_THRESHOLD = 0.8; // Reset when 80% of available questions have been asked

interface TrackerData {
  categories: Record<string, string[]>; // categoryId -> questionIds
  global: string[]; // All asked question IDs (for VS mode)
  lastUpdated: number;
}

function getTrackerData(): TrackerData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to parse question tracker data:', e);
  }
  return { categories: {}, global: [], lastUpdated: Date.now() };
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
 * Mark questions as asked for a specific category
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
  
  saveTrackerData(data);
}

/**
 * Mark questions as asked globally (for VS mode)
 */
export function markQuestionsAsAskedGlobally(questionIds: string[]): void {
  const data = getTrackerData();
  const updatedGlobal = [...new Set([...data.global, ...questionIds])];
  data.global = updatedGlobal.slice(-GLOBAL_MAX_TRACKED);
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
} {
  const data = getTrackerData();
  const totalTracked = Object.values(data.categories).reduce((sum, ids) => sum + ids.length, 0);
  return {
    totalTracked,
    categoriesTracked: Object.keys(data.categories).length,
    globalTracked: data.global.length,
  };
}
