import { useEffect, useState } from "react";

/**
 * The ticking clock on the play-limit card.
 *
 * A number that never moves reads as a closed door; a clock that ticks says
 * the wait is finite and already running. Seconds, not minutes —
 * `usePlayLimit` re-formats its string once a minute, which is fine for a
 * sentence and wrong for a clock, where sitting still for sixty seconds
 * looks broken.
 *
 * Used to live as its own component rendering giant digits at the top of the
 * modal; the card it sat on moved to the foot of the modal as an honest
 * "give up and wait" row instead (see PlayLimitModal), so this is the
 * ticking string alone, for that row to fold into a sentence.
 */
export function usePlayLimitClock(
  /** When the window rolls over. Null when the app does not know yet. */
  resetsAt: number | null | undefined,
  /** The pre-formatted string, for when there is no timestamp to count to. */
  fallback?: string | null,
): string | null {
  const [remaining, setRemaining] = useState(() =>
    resetsAt ? Math.max(0, resetsAt - Date.now()) : 0,
  );

  useEffect(() => {
    if (!resetsAt) return;
    setRemaining(Math.max(0, resetsAt - Date.now()));
    const id = setInterval(() => {
      setRemaining(Math.max(0, resetsAt - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [resetsAt]);

  // No timestamp: whatever string the caller has rather than a zeroed clock,
  // which would claim the plays are already back.
  return resetsAt ? formatClock(remaining) : (fallback ?? null);
}

/** `h:mm:ss` over an hour, `m:ss` under it. Never a bare number of minutes. */
function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
