/**
 * How a question's picture is presented, which depends on what kind of picture
 * it is.
 *
 * Three treatments, and they are not interchangeable:
 *
 *   inset   a logo — a brand mark reads correctly on plain white and nothing
 *           else. Anything behind it is interference.
 *   framed  a flag — a graphic with hard edges, given padding so its own
 *           border does not run into the band's.
 *   band    a photograph — object-contain fits the whole picture (the answer
 *           may be in the part a crop would remove), so a portrait shot
 *           leaves the band bare down both sides. The gradient fills it.
 *
 * The band is an ALLOW-list, not "everything that is not a logo or a flag".
 * The negative rule is what put a coloured wash behind the Land Rover mark:
 * it was written as `category_id !== "guess_logo"`, and a room whose
 * category_id held a uuid rather than the slug failed that comparison and got
 * the photographic treatment. Stated positively, an id nobody recognises gets
 * the neutral surface — the safe answer — instead of the wrong one.
 */

/**
 * The picture banks that are photographs.
 *
 * Four of the six. The other two are graphics — a logo and a flag — and each
 * has its own treatment above.
 */
export const PHOTO_BAND_CATEGORY_IDS = [
  "guess_celebrity",
  "guess_movie",
  "guess_sportsman",
  "guess_city",
] as const;

export interface ImageTreatment {
  inset: boolean;
  framed: boolean;
  band: boolean;
}

/**
 * Takes the ASCII category slug — resolve a room's stored category_id through
 * useCategoryIdentity first, since that column holds either form.
 */
export function imageTreatmentFor(slug: string | null | undefined): ImageTreatment {
  return {
    inset: slug === "guess_logo",
    framed: slug === "guess_flag",
    band: !!slug && (PHOTO_BAND_CATEGORY_IDS as readonly string[]).includes(slug),
  };
}
