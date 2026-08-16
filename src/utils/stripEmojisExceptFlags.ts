/**
 * Remove emojis from a user-facing translation string.
 *
 * Exception: country-flag emojis (regional indicator symbols) stay — they are
 * information, not decoration.
 *
 * Lives outside LanguageContext so it can be exported and tested without the
 * context file exporting a non-component (which breaks fast refresh).
 */
export function stripEmojisExceptFlags(input: string): string {
  if (!input) return input;

  // A handful of strings are written to sit against a value the markup
  // supplies — " invites you to play" after a nickname, "Answer: " before the
  // answer — and their edge space is the only thing separating the two. The
  // trim below is here to clean up after a removed emoji ("🎉 Congrats" must
  // not become " Congrats"), so it has to keep the space the author typed
  // while still dropping the one an emoji left behind: remember which edges
  // were padded to begin with, and restore only those.
  const hadLeading = /^\s/.test(input);
  const hadTrailing = /\s$/.test(input);

  const stripped = Array.from(input)
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      const isRegionalIndicator = cp >= 0x1f1e6 && cp <= 0x1f1ff;
      if (isRegionalIndicator) return true;

      // Unicode property escape (supported in modern browsers)
      const isEmoji = /\p{Extended_Pictographic}/u.test(ch);
      return !isEmoji;
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();

  // A string that was nothing but padding stays empty rather than becoming
  // padding twice over.
  if (!stripped) return "";

  return `${hadLeading ? " " : ""}${stripped}${hadTrailing ? " " : ""}`;
}
