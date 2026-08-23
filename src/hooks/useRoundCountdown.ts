import { useEffect, useState } from "react";
import { countdownNumberAt, msUntilNextTick } from "@/utils/roundCountdown";

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
