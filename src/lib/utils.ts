import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The whole number, grouped in thousands with a space: 7 850, 161 500.
 *
 * For the balance pills, where the compact form was hiding money: "7.8K"
 * stood for anything from 7 750 to 7 849 coins, and a player looking at the
 * shop's row to see what they can afford was reading a rounding, not a
 * balance (owner: "show coins fully, for example like 7 850 instead 7,8").
 * The space is a no-break one so a pill never wraps its number, and it is
 * the same in every language, where the comma and the point would trade
 * places from one locale to the next.
 */
export function formatFullNumber(num: number): string {
  const whole = Math.trunc(Math.abs(num)).toString();
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return num < 0 ? `-${grouped}` : grouped;
}

export function formatCompactNumber(num: number): string {
  // Prevent cases like 999.9K rounding up to 1000K
  // and show it as 1M instead.
  if (num >= 999_500) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}
