import { useEffect, useState } from "react";

/**
 * The offer banner pinned above the tab bar on the V3 home.
 *
 * The offer runs until `PROMO_ENDS_AT` and the banner disappears on its own
 * once that moment passes, so a stale offer can never sit on the screen —
 * change the date here (and the label in `homeV3.promoLabel`) to run the
 * next one. PRO subscribers never see it: the paywall it opens has nothing
 * to sell them.
 *
 * The clock on it is the reference's HH : MM : SS, which cannot show a month
 * — so it counts to the end of the current day, and on the offer's last day
 * to the offer's end. Every day of the offer the strip says how long is left
 * today.
 */
export const PROMO_ENDS_AT = "2026-09-30T23:59:59+04:00";

export function promoIsLive(now: number = Date.now(), endsAt: string = PROMO_ENDS_AT): boolean {
  return new Date(endsAt).getTime() > now;
}

/** "10 : 53 : 37" — hours roll past 24 rather than showing days. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
}

/** Midnight at the end of the local day `now` falls in, or the offer's end if sooner. */
export function countdownTarget(now: number, endsAt: string = PROMO_ENDS_AT): number {
  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return Math.min(midnight, new Date(endsAt).getTime());
}

export function useCountdown(endsAt: string = PROMO_ENDS_AT): string {
  const [left, setLeft] = useState(() => countdownTarget(Date.now(), endsAt) - Date.now());
  useEffect(() => {
    const tick = () => setLeft(countdownTarget(Date.now(), endsAt) - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return formatCountdown(left);
}
