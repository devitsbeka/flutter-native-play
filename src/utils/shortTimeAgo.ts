/**
 * How long ago, in as few characters as the language allows.
 *
 * date-fns' formatDistanceToNow is written to be read in a sentence: a
 * notification thirty seconds old came back as "1 წუთზე ნაკლები", fifteen
 * characters that sat on the same row as the title and pushed it onto a
 * second line. In a list the timestamp is a label, not prose — it only has to
 * say roughly when, and it must never be the reason the title wraps.
 *
 * Nothing here is ever "less than a minute": anything under a minute reads as
 * 1, which is both shorter and the thing a reader takes from it anyway.
 *
 * The whole format lives in the locale, pattern and spacing together, on the
 * extra.time*Short keys the lobby already uses for exactly this. Month and
 * year were the only two missing.
 *
 * Sibling of roomAge.ts, which does the same arithmetic for the verbose
 * "9 hours ago" phrasing; the turnover points are deliberately the same.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function shortTimeAgo(
  value: string | number | Date,
  t: Translate,
  now: number = Date.now(),
): string {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";

  // A clock skewed a few seconds ahead of the server is common, and "-1" is
  // not a time. Anything in the future reads as just now.
  const ms = Math.max(0, now - then);

  const unit = (key: string, n: number) => t(`extra.${key}`, { count: Math.max(1, n) });

  if (ms < HOUR) return unit("timeMinShort", Math.floor(ms / MINUTE));
  if (ms < DAY) return unit("timeHourShort", Math.floor(ms / HOUR));
  if (ms < WEEK) return unit("timeDayShort", Math.floor(ms / DAY));
  if (ms < MONTH) return unit("timeWeekShort", Math.floor(ms / WEEK));
  if (ms < YEAR) return unit("timeMonthShort", Math.floor(ms / MONTH));
  return unit("timeYearShort", Math.floor(ms / YEAR));
}
