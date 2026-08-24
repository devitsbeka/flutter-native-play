import { useEffect, useState } from "react";
import {
  COUNTDOWN_MS,
  ROUND_START_GRACE_MS,
  countdownNumberAt,
  isWithinRoundStart,
  msUntilNextTick,
} from "@/utils/roundCountdown";

/**
 * The digit currently on screen for a room's 3-2-1, or null when there is
 * none — the count is spent, or the room recorded no start.
 *
 * Repaints on the second boundary rather than every frame, because one digit
 * is all that changes. The value is derived from the room's start time, so
 * this is safe to call from several places at once: they all agree.
 */
export function useRoundCountdown(startedAt: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const wait = msUntilNextTick(startedAt, Date.now());
    if (wait === null) return;
    const timer = setTimeout(() => setNow(Date.now()), wait);
    return () => clearTimeout(timer);
  }, [startedAt, now]);

  // A new round reuses this hook with a fresh timestamp; without resetting,
  // `now` could still be the value from the last round's final tick and the
  // count would open on the wrong digit.
  useEffect(() => {
    setNow(Date.now());
  }, [startedAt]);

  return countdownNumberAt(startedAt, now);
}

/**
 * Whether the round-start screen should still be held up for a client that
 * has not reached the round yet, including the grace after the digits end.
 *
 * Its own timer, because useRoundCountdown deliberately stops scheduling once
 * the count is spent — there would be nothing left to trigger the re-render
 * that takes this screen back down.
 */
export function useRoundStartHold(startedAt: string | null | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
  }, [startedAt]);

  useEffect(() => {
    if (!startedAt) return;
    const start = Date.parse(startedAt);
    if (Number.isNaN(start)) return;
    const endsIn = start + COUNTDOWN_MS + ROUND_START_GRACE_MS - Date.now();
    if (endsIn <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), endsIn);
    return () => clearTimeout(timer);
  }, [startedAt, now]);

  return isWithinRoundStart(startedAt, now);
}
