import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * How long the player on the spot gets, by what they are being asked.
 *
 * A picture round — guess the logo, the flag, the city — is recognition:
 * you know it in a second or you never will, and the rest of the clock is
 * dead air. A classic question is read, considered and worked out. So a
 * board made entirely of the picture categories runs a minute a turn, and
 * anything else runs ninety seconds. A mixed board takes the longer clock:
 * the slowest question on it is what the turn has to accommodate.
 */
export function turnSecondsFor(
  categories: { slug?: string | null }[],
): number {
  const slugs = categories.map((c) => c.slug).filter(Boolean) as string[];
  const allPictures =
    slugs.length > 0 &&
    slugs.length === categories.length &&
    slugs.every((s) => (POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).includes(s));
  return allPictures ? 60 : 90;
}
