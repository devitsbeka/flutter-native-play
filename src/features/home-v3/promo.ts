import { useEffect, useState } from "react";

/**
 * The clock on the offer strip. The offer itself — its label, its dates —
 * is a row in `public.promotions` (see usePromotion.ts); this is only the
 * arithmetic that turns its end into the reference's HH : MM : SS.
 *
 * That format cannot show a month, so the clock counts to the end of the
 * current local day, and on the offer's last day to the offer's end: every
 * day of the offer the strip says how long is left today.
 */

export function promoIsLive(now: number, endsAt: string): boolean {
  return new Date(endsAt).getTime() > now;
}

/** "10 : 53 : 37" — never negative. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
}

/** Midnight at the end of the local day `now` falls in, or the offer's end if sooner. */
export function countdownTarget(now: number, endsAt: string): number {
  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return Math.min(midnight, new Date(endsAt).getTime());
}

export function useCountdown(endsAt: string): string {
  const [left, setLeft] = useState(() => countdownTarget(Date.now(), endsAt) - Date.now());
  useEffect(() => {
    const tick = () => setLeft(countdownTarget(Date.now(), endsAt) - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return formatCountdown(left);
}
