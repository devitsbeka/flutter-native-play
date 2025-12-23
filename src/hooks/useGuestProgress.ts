// Guest progress storage using localStorage
// This hook manages progress for non-authenticated users

const GUEST_PROGRESS_KEY = "trivia_guest_progress";

export interface GuestLevelProgress {
  level_number: number;
  stars_earned: number;
  score: number;
  total_questions: number;
  completed_at: string;
}

export interface GuestCategoryProgress {
  categoryId: string;
  completedLevels: GuestLevelProgress[];
}

export function getGuestProgress(): Record<string, GuestCategoryProgress> {
  try {
    const stored = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function saveGuestLevelProgress(
  categoryId: string,
  levelNumber: number,
  score: number,
  totalQuestions: number,
  stars: number
): void {
  try {
    const progress = getGuestProgress();
    
    if (!progress[categoryId]) {
      progress[categoryId] = {
        categoryId,
        completedLevels: [],
      };
    }
    
    // Check if level already completed
    const existingIndex = progress[categoryId].completedLevels.findIndex(
      (l) => l.level_number === levelNumber
    );
    
    const levelData: GuestLevelProgress = {
      level_number: levelNumber,
      stars_earned: stars,
      score,
      total_questions: totalQuestions,
      completed_at: new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      // Update only if new score is better
      if (stars > progress[categoryId].completedLevels[existingIndex].stars_earned) {
        progress[categoryId].completedLevels[existingIndex] = levelData;
      }
    } else {
      progress[categoryId].completedLevels.push(levelData);
    }
    
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error("Error saving guest progress:", err);
  }
}

export function clearGuestProgress(): void {
  try {
    localStorage.removeItem(GUEST_PROGRESS_KEY);
  } catch (err) {
    console.error("Error clearing guest progress:", err);
  }
}

export function hasGuestProgress(): boolean {
  const progress = getGuestProgress();
  return Object.values(progress).some((p) => p.completedLevels.length > 0);
}
