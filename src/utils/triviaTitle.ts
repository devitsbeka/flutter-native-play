/**
 * What to call a trivia that was never named.
 *
 * A MyTrivia Party is saved the moment its questions are, and naming it is
 * optional — so a card could end up with an empty heading, or with the
 * brand's own name standing in for it, which reads as though every party is
 * called the same thing (owner: "when my trivia party is untitled, say
 * untitled").
 *
 * A blank is not a name and neither is the product's. "Untitled" is, and it
 * is also a prompt: the pencil is right there.
 */
export function triviaDisplayTitle(
  title: string | null | undefined,
  t: (key: string) => string,
): string {
  const named = (title ?? "").trim();
  return named || t("extra.triviaUntitled");
}
