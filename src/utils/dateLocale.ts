import { de, enUS, es, fr, it, ka, pt, type Locale } from "date-fns/locale";

/**
 * date-fns's locale for the reader's language.
 *
 * date-fns will not read the app's language on its own — every call has to be
 * handed a locale object, and the default is US English. So a call that omits
 * it prints English to a Georgian player, and a call that hardcodes `ka`
 * prints Georgian to a French one. The rooms list did the second: "3 დღის
 * წინ" under a room card, whatever language the rest of the card was in.
 *
 * Anything user-facing that formats a date should come through here. The
 * admin screens deliberately do not — they are read by one person, in
 * Georgian.
 */
const DATE_LOCALES: Record<string, Locale> = { en: enUS, ka, de, es, fr, it, pt };

export function dateLocaleFor(language: string): Locale {
  return DATE_LOCALES[language] ?? enUS;
}
