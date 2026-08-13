/**
 * How long ago a room was made, spelled out the way the rest of the app
 * says it — "ახლახანს", "20 წუთის წინ", "3 საათის წინ", "გუშინ",
 * "2 კვირის წინ".
 *
 * It rides in the card's corner badge, in the space that used to hold the
 * word "waiting" — which read the same on every card and so told you
 * nothing about which room was which. The abbreviated form that replaced it
 * ("2კვ") was compact but had to be decoded; these are the same keys the
 * notifications panel and the profile modal already use.
 */
export interface RoomAgeLabel {
  key: string;
  count?: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function roomAgeLabel(createdAt: string | null | undefined, now: number = Date.now()): RoomAgeLabel | null {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;

  // A clock skewed slightly ahead of the server should read as "just now",
  // never as a negative age.
  const elapsed = Math.max(0, now - created);

  if (elapsed < MINUTE) return { key: "extra.timeJustNow" };
  if (elapsed < HOUR) return { key: "extra.timeMinutesAgo", count: Math.floor(elapsed / MINUTE) };
  if (elapsed < DAY) return { key: "extra.timeHoursAgo", count: Math.floor(elapsed / HOUR) };

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return { key: "extra.timeYesterday" };
  if (days < 7) return { key: "extra.timeDaysAgo", count: days };
  // Past a month, weeks stop being readable — "9 კვირის წინ" is a number to
  // divide, not a fact. The app's other time-ago formatters turn over the
  // same way.
  if (days < 30) return { key: "extra.timeWeeksAgo", count: Math.floor(days / 7) };
  return { key: "extra.timeMonthsAgo", count: Math.floor(days / 30) };
}
