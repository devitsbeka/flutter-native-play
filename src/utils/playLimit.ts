/**
 * How many free games a player has left, and when the next one arrives.
 *
 * Two rules ship at once on purpose — the migration that adds the window
 * columns is applied separately from the front-end deploy, so for some
 * window of time one will be live without the other:
 *
 *  - WINDOW RULE (current): five games per rolling three-hour window,
 *    counted in free_plays_used / free_plays_window_start. The window is
 *    the regeneration, so there is no extra trickle play on top.
 *  - LEGACY RULE: five games measured against lifetime games_played, after
 *    which one play regenerates every PLAY_REGEN_HOURS.
 *
 * Everything here is a pure function of the inputs, so both rules — and the
 * boundaries where they hand out a game — can be exercised directly.
 */

import { REWARDS } from "@/config/rewardConfig";

export const MAX_FREE_PLAYS = 5;

/** Must match v_window inside the consume_free_play() database function. */
export const WINDOW_MS = 3 * 60 * 60 * 1000;

export const REGEN_MS = REWARDS.PLAY_REGEN_HOURS * 60 * 60 * 1000;

export interface PlayWindow {
  used: number;
  /** Epoch ms the current window opened, or null when none has opened. */
  start: number | null;
}

export interface PlayLimitInput {
  now: number;
  isVip: boolean;
  /** True once the per-window quota is the rule in force. */
  windowMode: boolean;
  /** Window rule only. */
  playWindow: PlayWindow | null;
  /** Legacy rule only — lifetime games played. */
  gamesPlayed: number;
  /** Legacy rule only — epoch ms of the last regenerated play, or null. */
  lastRegenAt: number | null;
  /** Legacy rule only — set locally the moment a regen play is spent. */
  regenConsumedLocally: boolean;
}

export interface PlayLimitState {
  playsUsed: number;
  playsRemaining: number;
  freeGamesExhausted: boolean;
  regenPlayAvailable: boolean;
  canPlay: boolean;
  /** Epoch ms the next play becomes available, or null when unknown. */
  resetsAt: number | null;
  /** Countdown label, only set while nothing is playable right now. */
  timeUntilNextPlay: string | null;
}

/** A window that never opened, or that has aged out, is a fresh five. */
export const isWindowExpired = (playWindow: PlayWindow | null, now: number): boolean =>
  !playWindow?.start || now - playWindow.start >= WINDOW_MS;

export function formatCountdown(msRemaining: number): string {
  const clamped = Math.max(0, msRemaining);
  const hoursLeft = Math.floor(clamped / (60 * 60 * 1000));
  const minutesLeft = Math.floor((clamped % (60 * 60 * 1000)) / (60 * 1000));
  return hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`;
}

export function resolvePlayLimit({
  now,
  isVip,
  windowMode,
  playWindow,
  gamesPlayed,
  lastRegenAt,
  regenConsumedLocally,
}: PlayLimitInput): PlayLimitState {
  const windowUsed = isWindowExpired(playWindow, now) ? 0 : (playWindow?.used ?? 0);

  const playsUsed = windowMode ? windowUsed : gamesPlayed;
  const playsRemaining = Math.max(0, MAX_FREE_PLAYS - playsUsed);
  const freeGamesExhausted = playsRemaining <= 0;

  // Under the window rule the window itself is the regeneration; granting a
  // trickle play on top of it would hand out a sixth game.
  const regenPlayAvailable =
    !windowMode &&
    freeGamesExhausted &&
    !isVip &&
    !regenConsumedLocally &&
    (lastRegenAt === null || now - lastRegenAt >= REGEN_MS);

  const resetsAt = windowMode
    ? playWindow?.start
      ? playWindow.start + WINDOW_MS
      : null
    : lastRegenAt !== null
      ? lastRegenAt + REGEN_MS
      : null;

  const showCountdown = freeGamesExhausted && !isVip && !regenPlayAvailable && resetsAt !== null;

  return {
    playsUsed,
    playsRemaining,
    freeGamesExhausted,
    regenPlayAvailable,
    canPlay: isVip || playsRemaining > 0 || regenPlayAvailable,
    resetsAt,
    timeUntilNextPlay: showCountdown ? formatCountdown(resetsAt! - now) : null,
  };
}

/**
 * The window after spending one play, applied optimistically before the RPC
 * returns so two fast taps cannot spend the same play twice.
 */
export function spendPlayFromWindow(prev: PlayWindow | null, now: number): PlayWindow {
  return isWindowExpired(prev, now)
    ? { used: 1, start: now }
    : { used: (prev?.used ?? 0) + 1, start: prev!.start };
}
