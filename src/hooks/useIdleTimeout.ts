import { useEffect, useRef } from 'react';

/**
 * Triggers a callback when the watched value hasn't changed for `timeoutMs`.
 * Used in TV game pages to auto-redirect when the game is stuck/idle.
 * During active gameplay, phases change every few seconds so this never fires.
 */
export function useIdleTimeout(
  watchValue: string | number,
  onTimeout: () => void,
  timeoutMs = 60_000,
) {
  const callbackRef = useRef(onTimeout);
  callbackRef.current = onTimeout;

  useEffect(() => {
    const timer = setTimeout(() => {
      callbackRef.current();
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [watchValue, timeoutMs]);
}
