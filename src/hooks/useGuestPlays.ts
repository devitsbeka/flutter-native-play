// Guest plays tracking using localStorage
// Tracks how many times a guest has played before requiring registration

const GUEST_PLAYS_KEY = "mytrivia_guest_plays";
const MAX_GUEST_PLAYS = 5;

export interface GuestPlaysData {
  playsUsed: number;
  lastPlayAt: string | null;
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
  } catch (err) {
    console.error("Error clearing guest plays:", err);
  }
}

export const MAX_GUEST_PLAYS_COUNT = MAX_GUEST_PLAYS;
