/**
 * The language a generated question is written in.
 *
 * Both question generators used to end their prompts with "LANGUAGE: Georgian
 * only" and take no language at all, so every caller got Georgian whatever the
 * player was reading: an English party opened on the English starter pack and
 * turned Georgian on the first press of change-question, and an English player
 * asking for a quiz about "Formula 1" got ten Georgian cards and a Georgian
 * title.
 *
 * One table, imported by both, because two copies of "which languages exist"
 * is how one of them ends up a language short.
 *
 * The seven are the seven `src/locales` ships. Anything else — and a caller
 * that says nothing, which is every client older than this — falls back to
 * Georgian, which is what these functions did for everybody before.
 */

export const LANGUAGE_NAMES: Record<string, string> = {
  ka: "Georgian (ქართული)",
  en: "English",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  it: "Italian (Italiano)",
  pt: "Portuguese (Português)",
};

export const FALLBACK_LANGUAGE = "ka";

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? LANGUAGE_NAMES[FALLBACK_LANGUAGE];
}

export function knownLanguage(code: unknown): string {
  return typeof code === "string" && code in LANGUAGE_NAMES ? code : FALLBACK_LANGUAGE;
}

/**
 * The two words a true/false card may use — mirrored from
 * `src/utils/trueFalse.ts`, and for the reason given there: every play screen
 * detects a true/false question by matching the Georgian pair or the English
 * one, so a card in Spanish still answers True and False or nothing can draw
 * it as true/false.
 */
export function trueFalseWords(lang: string): { yes: string; no: string } {
  return lang === "ka"
    ? { yes: "მართალია", no: "მცდარია" }
    : { yes: "True", no: "False" };
}

/**
 * The line that says which language to write in.
 *
 * Some of the examples in these prompts are written in English to show a
 * question's shape. For any other target language that has to be called out,
 * or the model reads six English examples and answers in English; for English
 * itself the warning would contradict itself.
 */
export function writeInLanguage(lang: string, readerNote: string): string {
  const name = languageName(lang);
  const shapeNote = lang === "en"
    ? ""
    : `\nExamples below may be written in English to show the SHAPE of a question — never copy their language.`;
  return `🌍 WRITE EVERYTHING IN ${name}. ${readerNote}${shapeNote}`;
}

/** Grammar rules worth naming. Georgian's are the ones that went wrong. */
export function grammarRules(lang: string): string {
  if (lang === "ka") {
    return `- All Georgian text MUST be grammatically correct
- Double-check spelling of all Georgian words
- Use proper Georgian verb conjugations
- Questions must be natural-sounding Georgian sentences`;
  }
  const name = languageName(lang);
  return `- All ${name} text MUST be grammatically correct
- Double-check spelling and accents
- Questions must be natural-sounding ${name} sentences a native speaker would write`;
}
