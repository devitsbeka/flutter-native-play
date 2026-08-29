import { useEffect, useRef, useState } from "react";

/**
 * Seconds remaining until a server-issued deadline, ticking 4×/s.
 *
 * When the countdown crosses zero, onExpire fires — and keeps re-firing
 * every retryMs while the same deadline is still the live one. That retry
 * loop is the point: the expiry callbacks these screens use (tb_advance,
 * king_expire_question, king_show_options) are all idempotent server calls
 * that no-op or refuse until the SERVER clock agrees, so a device whose
 * clock runs a couple of seconds fast, or whose first call is lost to the
 * network, simply tries again instead of stalling the match forever. On
 * success the server writes a new phase/deadline, the row update reaches
 * the client, and the effect re-arms against the new value.
 */
export function useServerDeadline(
  deadline: string | null | undefined,
  onExpire: () => void,
  retryMs = 2500,
) {
  const [left, setLeft] = useState(0);
  const lastFireRef = useRef(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!deadline) {
      setLeft(0);
      return;
    }
    lastFireRef.current = 0;
    const compute = () => Math.max(0, (new Date(deadline).getTime() - Date.now()) / 1000);
    setLeft(compute());
    const id = setInterval(() => {
      const remaining = compute();
      setLeft(remaining);
      if (remaining <= 0 && Date.now() - lastFireRef.current >= retryMs) {
        lastFireRef.current = Date.now();
        onExpireRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [deadline, retryMs]);

  return Math.ceil(left);
}
