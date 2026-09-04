/**
 * The date and rotation arithmetic behind the week strip.
 *
 * Separate from useMissions so it can be exercised without the Supabase
 * client, which the hook module imports and which needs a browser to load.
 * Every decision here fails quietly when it is wrong — a day resolving to
 * the wrong slot shows a plausible list of missions that simply are not the
 * ones the player has — so it is worth pinning.
 */

/** Whole UTC days since the epoch: the slot the rotation turns on. */
export function daySlotOf(dateISO: string): number {
  return Math.floor(Date.parse(`${dateISO}T00:00:00Z`) / 86_400_000);
}

/** Today under the same key mission rows are stored with (a UTC date). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type DayKind = "past" | "today" | "future";

export function dayKindOf(dateISO: string, today = todayKey()): DayKind {
  if (dateISO === today) return "today";
  return dateISO < today ? "past" : "future";
}

/** `count` consecutive entries starting at `slot`, wrapping around. */
export function pickRotation<T>(pool: T[], slot: number, count: number): T[] {
  const start = ((slot % pool.length) + pool.length) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

/** The slice of a pool that a given date runs. */
export function rotationForDate<T>(pool: T[], dateISO: string, count: number): T[] {
  return pickRotation(pool, daySlotOf(dateISO), count);
}

/**
 * Monday of the week a date falls in, as a UTC date key.
 *
 * getUTCDay() numbers Sunday 0, so it is shifted first — left alone, Sunday
 * would start its own week and the weekend would straddle two of them.
 */
export function weekStartOf(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}

export const BONUS_POWER_UPS = ["5050", "freeze", "replace", "time-drain"] as const;

/**
 * Which power-up this week's package carries.
 *
 * Random, but decided by the week rather than by the render — a reward that
 * showed a different power-up on every repaint would read as broken, and
 * the player has to be able to see what they are working toward.
 */
export function weekBonusPowerUp(weekStartISO: string): string {
  const slot = Math.floor(Date.parse(`${weekStartISO}T00:00:00Z`) / (7 * 86_400_000));
  return BONUS_POWER_UPS[((slot % BONUS_POWER_UPS.length) + BONUS_POWER_UPS.length) % BONUS_POWER_UPS.length];
}

/**
 * One mission per difficulty tier for a date, easiest first.
 *
 * The day used to be five consecutive pool entries, which could open with
 * "win a game with 100% accuracy" and never offer anything gentler. A day is
 * now a ladder: each tier is its own small rotation on the day slot, so the
 * first row is always the simplest ask — the one that keeps the streak by
 * itself — and the rows climb from there.
 */
export function rotationByTier<T extends { difficulty: number }>(pool: T[], dateISO: string): T[] {
  const slot = daySlotOf(dateISO);
  const tiers = Array.from(new Set(pool.map((m) => m.difficulty))).sort((a, b) => a - b);
  return tiers.map((tier) => pickRotation(pool.filter((m) => m.difficulty === tier), slot, 1)[0]);
}
