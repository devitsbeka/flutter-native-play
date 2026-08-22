/**
 * Countdowns for the two claimable rewards on the home page.
 *
 * The daily reward resets at local midnight; the chest runs on its own
 * cooldown from the moment it was last opened. Both are pure functions of
 * "now" plus what the server last said, so the boundaries — midnight, the
 * exact cooldown expiry — can be exercised without waiting for them.
 */

import { REWARDS } from "@/config/rewardConfig";

export const CHEST_COOLDOWN_MS = REWARDS.CHEST_COOLDOWN_HOURS * 60 * 60 * 1000;

export interface CountdownParts {
  /** HH:MM:SS, zero-padded. */
  timeLeft: string;
  secondsLeft: number;
}

export function formatTimeDiff(diffMs: number): CountdownParts {
  if (diffMs <= 0) return { timeLeft: "00:00:00", secondsLeft: 0 };
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    timeLeft: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    secondsLeft: Math.floor(diffMs / 1000),
  };
}

/** Time until the daily reward resets — the next UTC midnight.
 *
 * claim_daily_reward gates on the server's CURRENT_DATE, which flips at UTC
 * midnight, not the player's. Counting to local midnight told a Georgian
 * player at 1am that the next claim was 23 hours away when the server would
 * accept one at 4am local — the countdown must promise what the server keeps. */
export function dailyResetCountdown(now: Date): CountdownParts {
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return formatTimeDiff(midnight.getTime() - now.getTime());
}

export interface ChestStatus extends CountdownParts {
  canClaim: boolean;
}

/**
 * Whether the chest is openable, and how long until it is.
 *
 * An unclaimed chest (no timestamp) is immediately claimable — a player who
 * has never opened one must never be shown a countdown.
 */
export function chestCooldownStatus(
  chestClaimedAt: string | null | undefined,
  now: Date
): ChestStatus {
  const ready = { timeLeft: "00:00:00", secondsLeft: 0, canClaim: true };
  if (!chestClaimedAt) return ready;

  const claimedAtMs = new Date(chestClaimedAt).getTime();
  // An unparseable timestamp must not lock the chest forever.
  if (Number.isNaN(claimedAtMs)) return ready;

  const diff = claimedAtMs + CHEST_COOLDOWN_MS - now.getTime();
  if (diff <= 0) return ready;
  return { ...formatTimeDiff(diff), canClaim: false };
}
