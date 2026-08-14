// Maps a country to the app language its players should get questions in.
// Only languages the app actually ships (see src/locales) appear here;
// every unlisted country falls back to English.

const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  // Georgian
  ge: "ka",
  // German
  de: "de",
  at: "de",
  li: "de",
  ch: "de",
  // Spanish
  es: "es",
  mx: "es",
  ar: "es",
  co: "es",
  cl: "es",
  pe: "es",
  ve: "es",
  ec: "es",
  gt: "es",
  cu: "es",
  bo: "es",
  do: "es",
  hn: "es",
  py: "es",
  sv: "es",
  ni: "es",
  cr: "es",
  pa: "es",
  uy: "es",
  gq: "es",
  // French
  fr: "fr",
  mc: "fr",
  lu: "fr",
  be: "fr",
  sn: "fr",
  ci: "fr",
  ml: "fr",
  bf: "fr",
  ne: "fr",
  td: "fr",
  gn: "fr",
  cm: "fr",
  cd: "fr",
  cg: "fr",
  ga: "fr",
  bj: "fr",
  tg: "fr",
  ht: "fr",
  // Italian
  it: "it",
  sm: "it",
  va: "it",
  // Portuguese
  pt: "pt",
  br: "pt",
  ao: "pt",
  mz: "pt",
  cv: "pt",
  gw: "pt",
  st: "pt",
  tl: "pt",
};

export function languageForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return "en";
  return COUNTRY_TO_LANGUAGE[countryCode.toLowerCase()] || "en";
}

export interface LanguageSyncInput {
  /** ?lang= on the address the tab was opened with, if it named a real one. */
  override: string | null;
  /** The country on the account. Null while it is still being worked out. */
  countryCode: string | null | undefined;
  /** What the app is showing now. */
  current: string;
}

/**
 * The language to switch to, or null to leave it alone.
 *
 * The account's country is what decides: picking a country in settings is the
 * only language control the app has. The two could still drift apart, because
 * the country lives on the profile and the language in this device's
 * localStorage — a phone that was once opened with ?lang=en, or that signed
 * into an account created somewhere else, kept the language it had behind a
 * profile that said otherwise.
 *
 * ?lang= is the exception, and stays one: it is how the other translations
 * get looked at without touching an account.
 */
export function languageToApply({ override, countryCode, current }: LanguageSyncInput): string | null {
  if (override) return null;
  if (!countryCode) return null;
  const wanted = languageForCountry(countryCode);
  return wanted === current ? null : wanted;
}
