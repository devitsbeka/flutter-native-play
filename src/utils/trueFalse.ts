/**
 * The two words a true/false card is written with.
 *
 * Every play surface — the quiz screen, the room, the TV, the controller —
 * decides a question is true/false by looking at its two answers, and the
 * whole vocabulary it knows is the Georgian pair or the English one:
 *
 *   (answers.includes("მართალია") && answers.includes("მცდარია")) ||
 *   (answers.includes("true") && answers.includes("false"))
 *
 * So a card written for a Spanish session still says True and False. That is
 * not laziness about translating two words: the word on the button is the one
 * the buzzer, the TV and the controller all match on, and a Spanish pair
 * would produce a card none of them can draw as true/false.
 *
 * The editor used to write its own literals inline — and wrote "მცდარი",
 * one letter short of the "მცდარია" every one of those screens looks for, so
 * a true/false card made from the defaults was not played as one. One pair,
 * in one place, is what stops that.
 */

export const TRUE_WORD_KA = "მართალია";
export const FALSE_WORD_KA = "მცდარია";
export const TRUE_WORD_EN = "True";
export const FALSE_WORD_EN = "False";

/** The pair to write a new card with, for the language being read. */
export function trueFalseWords(language: string): { yes: string; no: string } {
  return language === "ka"
    ? { yes: TRUE_WORD_KA, no: FALSE_WORD_KA }
    : { yes: TRUE_WORD_EN, no: FALSE_WORD_EN };
}

/** Is this answer the "true" one, in either pair? */
export function isTrueWord(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === TRUE_WORD_KA || value === TRUE_WORD_EN.toLowerCase();
}

/** Is this answer either half of either pair — i.e. an untouched default? */
export function isTrueFalseWord(text: string): boolean {
  const value = text.trim().toLowerCase();
  return (
    value === TRUE_WORD_KA ||
    value === FALSE_WORD_KA ||
    value === TRUE_WORD_EN.toLowerCase() ||
    value === FALSE_WORD_EN.toLowerCase() ||
    // What the editor wrote before this file existed. A draft saved then is
    // still on somebody's device.
    value === "მცდარი"
  );
}
