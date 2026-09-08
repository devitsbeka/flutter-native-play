/**
 * What to call a trivia that was never named.
 *
 * A MyTrivia Party is saved the moment its questions are, and naming it is
 * optional — but the save does not store "no name", it stores the brand:
 * `title: title || "MyTrivia Party"`. So an unnamed party arrives at every
 * screen already looking titled, and titled the same as every other one.
 *
 * That is what put the name on the card twice, once on the banner and once
 * beside the icon, with nothing on it naming THIS party (owner: "if trivia
 * has no name show 'untitled' on banner and don't show 'my trivia party'
 * twice"). The brand is the kind of thing it is; the banner is for what the
 * player called it.
 *
 * So a blank is not a name and neither is the product's. Handled here on the
 * way out rather than at the save, because the parties already stored carry
 * that default and would otherwise keep looking named forever.
 */

/**
 * The stored titles that mean "the player never named this".
 *
 * Spelled both ways because the product is written both ways across the app
 * — "MyTrivia Party" in the save, "My Trivia Party" in the label.
 */
const BRAND_TITLES = new Set(["mytrivia party", "my trivia party"]);

export function triviaDisplayTitle(
  title: string | null | undefined,
  t: (key: string) => string,
): string {
  const named = (title ?? "").trim();
  if (!named) return t("extra.triviaUntitled");
  return BRAND_TITLES.has(named.toLowerCase()) ? t("extra.triviaUntitled") : named;
}
