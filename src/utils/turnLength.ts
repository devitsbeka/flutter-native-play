import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * How long the player on the spot gets, by what they are being asked.
 *
 * A picture round — guess the logo, the flag, the city — is recognition:
 * you know it in a second or you never will, and the rest of the clock is
 * dead air. A classic question is read, considered and worked out. So a
 * board made entirely of the guess categories runs thirty seconds a turn,
 * and anything else runs a minute. A mixed board takes the longer clock:
 * the slowest question on it is what the turn has to accommodate.
 *
 * Both were twice this — 60 and 90 — and a turn that long is the rest of
 * the room watching one person. The owner has now halved it twice.
 */
export function turnSecondsFor(
  categories: { slug?: string | null }[],
): number {
  const slugs = categories.map((c) => c.slug).filter(Boolean) as string[];
  const allPictures =
    slugs.length > 0 &&
    slugs.length === categories.length &&
    slugs.every((s) => (POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).includes(s));
  return allPictures ? 30 : 60;
}
