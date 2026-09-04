/**
 * Dates written in the player's language — including the one the browser
 * cannot write.
 *
 * `toLocaleDateString("ka", …)` looks like it works and does not. Browsers
 * ship a trimmed ICU that has no Georgian locale data, and when a locale is
 * missing Intl does not throw: it quietly resolves to en-US and hands back
 * an English date. Measured in the shipped app:
 *
 *   Intl.DateTimeFormat.supportedLocalesOf(["ka"])  ->  []
 *   new Intl.DateTimeFormat("ka").resolvedOptions().locale  ->  "en-US"
 *   new Date().toLocaleDateString("ka", …)  ->  "Sunday, Aug 16"
 *
 * German, Spanish and the rest come back correctly from the same call, so
 * this is Georgian specifically — the app's own language, and the one that
 * has to be right. The names live here instead.
 */

/** Indexed by Date#getDay(): 0 is Sunday. */
export const KA_WEEKDAYS_LONG = [
  "კვირა",
  "ორშაბათი",
  "სამშაბათი",
  "ოთხშაბათი",
  "ხუთშაბათი",
  "პარასკევი",
  "შაბათი",
] as const;

export const KA_WEEKDAYS_SHORT = ["კვი", "ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ"] as const;

/** Indexed by Date#getMonth(): 0 is January. */
export const KA_MONTHS_LONG = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
] as const;

export const KA_MONTHS_SHORT = [
  "იან",
  "თებ",
  "მარ",
  "აპრ",
  "მაი",
  "ივნ",
  "ივლ",
  "აგვ",
  "სექ",
  "ოქტ",
  "ნოე",
  "დეკ",
] as const;

export const isGeorgian = (language: string): boolean => /^ka\b/i.test(language);

interface DateFormatOptions {
  /** Read the date's UTC parts rather than the viewer's local ones. */
  utc?: boolean;
}

const parts = (date: Date, utc: boolean) =>
  utc
    ? { weekday: date.getUTCDay(), day: date.getUTCDate(), month: date.getUTCMonth() }
    : { weekday: date.getDay(), day: date.getDate(), month: date.getMonth() };

/**
 * "კვირა, 16 აგვისტო" — weekday, then day before month, as Georgian writes it.
 * Every other language goes through Intl, which handles them correctly.
 */
/** Just the weekday name — "ორშაბათი" / "Monday" — in the app language. */
export function formatWeekday(date: Date, language: string): string {
  if (Number.isNaN(date.getTime())) return "";
  if (isGeorgian(language)) return KA_WEEKDAYS_LONG[date.getDay()];
  return date.toLocaleDateString(language, { weekday: "long" });
}

export function formatDayWithWeekday(
  date: Date,
  language: string,
  { utc = false }: DateFormatOptions = {}
): string {
  if (Number.isNaN(date.getTime())) return "";

  if (isGeorgian(language)) {
    const { weekday, day, month } = parts(date, utc);
    return `${KA_WEEKDAYS_LONG[weekday]}, ${day} ${KA_MONTHS_LONG[month]}`;
  }

  return date.toLocaleDateString(language, {
    weekday: "long",
    day: "numeric",
    month: "short",
    ...(utc ? { timeZone: "UTC" } : {}),
  });
}

/**
 * "12 სექ." / "12 Sep" — the day and its short month, for a date range.
 *
 * Georgian goes through the local month table with the design's trailing
 * full stop; every other language through Intl, which abbreviates months
 * the way each of them actually does.
 */
export function formatDayMonthShort(
  date: Date,
  language: string,
  { utc = false }: DateFormatOptions = {}
): string {
  if (Number.isNaN(date.getTime())) return "";

  if (isGeorgian(language)) {
    const { day, month } = parts(date, utc);
    return `${day} ${KA_MONTHS_SHORT[month]}.`;
  }

  return date.toLocaleDateString(language, {
    day: "numeric",
    month: "short",
    ...(utc ? { timeZone: "UTC" } : {}),
  });
}

/** "ორშ" — the three-letter weekday used by the streak strip. */
export function formatWeekdayShort(
  date: Date,
  language: string,
  { utc = false }: DateFormatOptions = {}
): string {
  if (Number.isNaN(date.getTime())) return "";

  if (isGeorgian(language)) return KA_WEEKDAYS_SHORT[parts(date, utc).weekday];

  return date.toLocaleDateString(language, {
    weekday: "short",
    ...(utc ? { timeZone: "UTC" } : {}),
  });
}
