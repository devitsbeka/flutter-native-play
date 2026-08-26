import { useEffect, useRef } from 'react';

/**
 * Triggers a callback when the watched value hasn't changed for `timeoutMs`.
 * Used in TV game pages to leave a session that has genuinely stalled.
 *
 * `enabled` is not optional decoration — it is the whole safety of this hook.
 *
 * The docstring here used to say "during active gameplay, phases change every
 * few seconds so this never fires", which is true and beside the point: a TV
 * session is not always in active gameplay. It spends its first minutes in
 * `lobby`, where the host is holding a QR code up to the room, waiting for
 * people to scan it, and building a round queue. The phase does not change
 * during any of that, because nothing is supposed to be happening yet — the
 * waiting IS the screen. Sixty seconds of it and the host was thrown back to
 * /team mid-setup, which is what "I can't press Start, it kicks me out" was.
 *
 * So the caller says when a stalled phase means something is broken. Pass
 * `enabled: false` for any phase whose job is to wait for a human.
 */
export function useIdleTimeout(
  watchValue: string | number,
  onTimeout: () => void,
  timeoutMs = 60_000,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const callbackRef = useRef(onTimeout);
  callbackRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      callbackRef.current();
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [watchValue, timeoutMs, enabled]);
}

/**
 * The TV phases that advance on their own.
 *
 * A countdown that has not moved in a minute is broken; a lobby that has not
 * moved in a minute is a lobby. Only these are timed, and the list is an
 * allowlist on purpose: a phase added later is not auto-ejected until someone
 * decides it should be, which fails towards a screen the player can back out
 * of rather than towards throwing them off one they are still using.
 */
export const SELF_ADVANCING_TV_PHASES = [
  'countdown',
  'question',
  'playing',
  'reveal',
  'round-intro',
] as const;

/** Whether a stalled `phase` means the session is stuck rather than waiting. */
export const tvPhaseCanStall = (phase: string): boolean =>
  (SELF_ADVANCING_TV_PHASES as readonly string[]).includes(phase);
