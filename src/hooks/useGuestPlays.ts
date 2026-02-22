// Guest plays tracking using localStorage
// Tracks how many times a guest has played before requiring registration
// Also stores per-game details for retroactive game_plays insertion on signup

const GUEST_PLAYS_KEY = "mytrivia_guest_plays";
const GUEST_GAME_LOG_KEY = "mytrivia_guest_game_log";
const MAX_GUEST_PLAYS = 5;

export interface GuestPlaysData {
  playsUsed: number;
  lastPlayAt: string | null;
}

export interface GuestGameLogEntry {
  categoryId: string | null;
  levelNumber: number | null;
  gameType: string;
  score: number | null;
  totalQuestions: number | null;
  starsEarned: number | null;
  playedAt: string;
}

export function getGuestPlays(): GuestPlaysData {
  try {
    const stored = localStorage.getItem(GUEST_PLAYS_KEY);
    if (!stored) {
      return { playsUsed: 0, lastPlayAt: null };
    }
    return JSON.parse(stored);
  } catch {
    return { playsUsed: 0, lastPlayAt: null };
  }
}

export function getGuestGameLog(): GuestGameLogEntry[] {
  try {
    const stored = localStorage.getItem(GUEST_GAME_LOG_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function recordGuestPlay(): boolean {
  try {
    const data = getGuestPlays();
    
    if (data.playsUsed >= MAX_GUEST_PLAYS) {
      return false; // Cannot play anymore
    }
    
    const newData: GuestPlaysData = {
      playsUsed: data.playsUsed + 1,
      lastPlayAt: new Date().toISOString(),
    };
    
    localStorage.setItem(GUEST_PLAYS_KEY, JSON.stringify(newData));
    return true;
  } catch (err) {
    console.error("Error recording guest play:", err);
    return false;
  }
}

/**
 * Log a completed guest game with full details for retroactive game_plays insertion.
 * Called from game completion flows (CategoryQuizPage, Game, etc.) when user is not authenticated.
 */
export function logGuestGameComplete(entry: Omit<GuestGameLogEntry, 'playedAt'>): void {
  try {
    const log = getGuestGameLog();
    log.push({
      ...entry,
      playedAt: new Date().toISOString(),
    });
    localStorage.setItem(GUEST_GAME_LOG_KEY, JSON.stringify(log));
  } catch (err) {
    console.error("Error logging guest game:", err);
  }
}

export function getGuestPlaysRemaining(): number {
  const data = getGuestPlays();
  return Math.max(0, MAX_GUEST_PLAYS - data.playsUsed);
}

export function hasReachedGuestPlayLimit(): boolean {
  const data = getGuestPlays();
  return data.playsUsed >= MAX_GUEST_PLAYS;
}

export function clearGuestPlays(): void {
  try {
    localStorage.removeItem(GUEST_PLAYS_KEY);
    localStorage.removeItem(GUEST_GAME_LOG_KEY);
  } catch (err) {
    console.error("Error clearing guest plays:", err);
  }
}

export const MAX_GUEST_PLAYS_COUNT = MAX_GUEST_PLAYS;
