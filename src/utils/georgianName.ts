/**
 * A nickname in the case Georgian needs it in.
 *
 * "მეგობრობა სურს" — wants friendship — governs the dative, so the name in
 * front of it has to be "TriviaMaste-ს", not "TriviaMaste". The design shows
 * it that way and the sentence is wrong without it.
 *
 * The ending is not one string appended to everything, because how it attaches
 * depends on what the name is written in:
 *
 *   Latin (and anything else)  a hyphen, then the ending: TriviaMaste-ს.
 *                              This is the ordinary Georgian convention for
 *                              foreign words, and it is what the design shows.
 *   Georgian script            the ending joins the word: ნინო -> ნინოს.
 *                              Hyphenating a Georgian word is wrong.
 *   already ends in ს          left alone. "ლუკას-ს" and "Lukas-ს" are both
 *                              worse than the name on its own, and a player
 *                              whose nickname happens to end that way should
 *                              not pay for it.
 *
 * Only for Georgian. Every other language puts the name in front of a sentence
 * that does not inflect it.
 */

/** Mkhedruli, the script Georgian is written in. */
const GEORGIAN_LETTER = /[Ⴀ-ჿ]/;

export function georgianDative(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // Already in the dative, or ending in the same letter by coincidence.
  if (trimmed.endsWith("ს")) return trimmed;

  const last = trimmed[trimmed.length - 1];
  return GEORGIAN_LETTER.test(last) ? `${trimmed}ს` : `${trimmed}-ს`;
}
