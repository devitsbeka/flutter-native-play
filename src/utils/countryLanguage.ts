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
