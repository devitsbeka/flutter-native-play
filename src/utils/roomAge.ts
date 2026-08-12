/**
 * How long ago a room was made, in the short form the app already uses for
 * time-ago elsewhere ("ახლახანს", "20წთ", "3სთ", "გუშინ").
 *
 * Short on purpose: this rides in the card's corner badge, in the space that
 * used to hold the word "waiting" — which read the same on every card and so
 * told you nothing about which room was which.
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
  if (elapsed < HOUR) return { key: "extra.timeMinShort", count: Math.floor(elapsed / MINUTE) };
  if (elapsed < DAY) return { key: "extra.timeHourShort", count: Math.floor(elapsed / HOUR) };

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return { key: "extra.timeYesterday" };
  if (days < 7) return { key: "extra.timeDayShort", count: days };
  return { key: "extra.timeWeekShort", count: Math.floor(days / 7) };
}
