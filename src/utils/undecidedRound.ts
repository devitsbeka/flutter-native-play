/**
 * A round whose category is not decided yet — "mixed", or "random".
 *
 * Both mean the same thing to a player about to play one: nobody knows what
 * is coming. The app has always drawn that as the library's mystery box —
 * the create screen, the category picker, the round queue and the room card
 * all use it — but the two screens where a round is actually announced, the
 * countdown and the results header, resolved their picture from the
 * category's own `icon_slug`. An undecided round has none, so both fell
 * through to DynamicIcon's last resort, a grey question mark, and the one
 * category with a well-known face was the only one without it.
 *
 * The catch is that a round like this is stored as a NAME, written by
 * whichever picker queued it, in whatever language that player was using —
 * there is no id to match on. So this matches the words, in all seven, the
 * same way MIXED_LABELS does on the public room card.
 *
 * That list stays separate on purpose: it decides which LABEL to print, and
 * a random round says "Random" rather than "Mixed". This one decides which
 * PICTURE to draw, and they get the same one.
 */

/** The library slug for the mystery box. */
export const UNDECIDED_ICON_SLUG = "mystery-box";

/** The ids the pickers use when no real category has been chosen. */
const UNDECIDED_IDS = new Set(["__mixed__", "__random__", "mixed", "random"]);

/** "Mixed" and "Random", as every picker in every language stores them. */
const UNDECIDED_NAMES = new Set(
  [
    "__mixed__", "__random__",
    "Mixed", "სხვადასხვა", "შერეული", "Gemischt", "Mixto", "Mixte", "Misto",
    "Random", "შემთხვევითი", "Zufällig", "Aleatorio", "Aléatoire", "Casuale", "Aleatório",
  ].map((s) => s.toLowerCase()),
);

/** Is this round's category still a mystery? */
export function isUndecidedRound(
  categoryId?: string | null,
  categoryName?: string | null,
): boolean {
  if (categoryId && UNDECIDED_IDS.has(categoryId.toLowerCase())) return true;
  const name = categoryName?.trim().toLowerCase();
  return !!name && UNDECIDED_NAMES.has(name);
}
