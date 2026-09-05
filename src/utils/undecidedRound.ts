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

/** "Mixed", as every picker in every language stores it. */
const MIXED_NAMES = [
  "__mixed__",
  "Mixed", "სხვადასხვა", "შერეული", "Gemischt", "Mixto", "Mixte", "Misto",
].map((s) => s.toLowerCase());

/** "Random", likewise. */
const RANDOM_NAMES = [
  "__random__",
  "Random", "შემთხვევითი", "Zufällig", "Aleatorio", "Aléatoire", "Casuale", "Aleatório",
].map((s) => s.toLowerCase());

/** "Mixed" and "Random", as every picker in every language stores them. */
const UNDECIDED_NAMES = new Set([...MIXED_NAMES, ...RANDOM_NAMES]);

/** Is this round's category still a mystery? */
export function isUndecidedRound(
  categoryId?: string | null,
  categoryName?: string | null,
): boolean {
  if (categoryId && UNDECIDED_IDS.has(categoryId.toLowerCase())) return true;
  const name = categoryName?.trim().toLowerCase();
  return !!name && UNDECIDED_NAMES.has(name);
}

/**
 * Which kind of undecided round this is, or null if it is a real category.
 *
 * The picture is the same for both (above), but the WORD is not, and the
 * word has to be the viewer's own. A round like this denormalizes its
 * category_name at pick time, in the language of whoever picked it, and
 * useLocalizedCategoryName cannot help: it maps names through the
 * `categories` table, and "mixed" is not a row there — it is a pseudo-
 * category the pickers invent, so the stored string passes straight through.
 *
 * That is how an English host who started a game saw "სხვადასხვა" on the
 * countdown: a Georgian client had written the name, and every reader after
 * that printed it verbatim. The public room card already solved this by
 * matching the words and printing its own label; this puts that decision
 * next to the icon's, so the next screen to announce a round does not have
 * to work it out again.
 */
export function undecidedRoundKind(
  categoryId?: string | null,
  categoryName?: string | null,
): "mixed" | "random" | null {
  const id = categoryId?.trim().toLowerCase();
  if (id === "__mixed__" || id === "mixed") return "mixed";
  if (id === "__random__" || id === "random") return "random";
  const name = categoryName?.trim().toLowerCase();
  if (!name) return null;
  if (MIXED_NAMES.includes(name)) return "mixed";
  if (RANDOM_NAMES.includes(name)) return "random";
  return null;
}
