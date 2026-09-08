import { useEffect, useState } from "react";

/**
 * The clock at the top of the play-limit modal.
 *
 * The modal used to say "Next free play: 21m" in grey body text under the
 * title. That is information, not a reason to stay: a number that never moves
 * reads as a closed door, and the two things a player can actually do about it
 * were below it competing for the same attention.
 *
 * A clock that ticks does the opposite. It says the wait is finite and it is
 * already running, which is what makes the two offers under it feel like a
 * choice rather than a toll. This is the standard shape for a free-play gate
 * in a game, and it is standard because it works.
 *
 * Seconds, not minutes. `usePlayLimit` re-formats its string once a minute,
 * which is fine for a sentence and wrong for a clock — a timer that sits still
 * for sixty seconds looks broken.
 */
/**
 * The clock itself, without the block it used to be welded to.
 *
 * The out-of-lives screen (Figma 1102:4315) puts the same ticking figure
 * inside a sentence on the give-up row — "you can play again in 02:48:12" —
 * rather than over a label, so the counting is a hook and the rendering is
 * the caller's.
 */
export function usePlayLimitClock(
  resetsAt: number | null | undefined,
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

  // No timestamp: show whatever string the caller has rather than a zeroed
  // clock, which would claim the plays are already back.
  return resetsAt ? formatClock(remaining) : (fallback ?? null);
}

export function PlayLimitCountdown({
  resetsAt,
  fallback,
  label,
}: {
  /** When the window rolls over. Null when the app does not know yet. */
  resetsAt: number | null | undefined;
  /** The pre-formatted string, for when there is no timestamp to count to. */
  fallback?: string | null;
  label: string;
}) {
  const display = usePlayLimitClock(resetsAt, fallback);
  if (!display) return null;

  return (
    <div className="mt-1 flex flex-col items-center">
      <span
        className="font-display font-black tabular-nums leading-none text-[#1E1B2E]"
        style={{ fontSize: 44, letterSpacing: "-0.02em" }}
        // Announced once, not on every tick — a per-second live region is a
        // screen reader reading a clock aloud forever.
        aria-live="off"
      >
        {display}
      </span>
      <span className="mt-1.5 text-[13px] font-medium text-slate-500">{label}</span>
    </div>
  );
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
