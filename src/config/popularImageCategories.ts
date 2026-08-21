/**
 * The six "guess from the picture" categories that front the Popular row.
 *
 * They are ordinary rows in `categories` (see the
 * 20260821* popular_image_categories migration) — this module only carries
 * what the client renders specially: the 3D icon PNG that replaces the
 * icon-library glyph on the category card, and a fixed pastel palette per
 * category so the cards match the design instead of taking whatever the
 * id-hash palette picker lands on.
 */

import iconCelebrity from "@/assets/popular/guess_celebrity.png";
import iconMovie from "@/assets/popular/guess_movie.png";
import iconCity from "@/assets/popular/guess_city.png";
import iconSportsman from "@/assets/popular/guess_sportsman.png";
import iconLogo from "@/assets/popular/guess_logo.png";
import iconFlag from "@/assets/popular/guess_flag.png";

export const POPULAR_IMAGE_CATEGORY_IDS = [
  "guess_celebrity",
  "guess_movie",
  "guess_city",
  "guess_sportsman",
  "guess_logo",
  "guess_flag",
] as const;

export type PopularImageCategoryId = (typeof POPULAR_IMAGE_CATEGORY_IDS)[number];

/** Card art: 3D icon rendered centered on the card's gradient.
 *
 * Imported through Vite rather than served from public/: these files get
 * replaced (icon quality passes), and a fixed /images/... URL kept serving
 * the browser's cached old art after a swap. A content-hashed filename
 * changes with the file, so a replacement is visible on the next deploy,
 * every time. */
export const POPULAR_CATEGORY_ICONS: Record<PopularImageCategoryId, string> = {
  guess_celebrity: iconCelebrity,
  guess_movie: iconMovie,
  guess_city: iconCity,
  guess_sportsman: iconSportsman,
  guess_logo: iconLogo,
  guess_flag: iconFlag,
};

/** Same shape as AirbnbCategoryCard's PASTEL_PALETTES entries. */
export const POPULAR_CATEGORY_PALETTES: Record<
  PopularImageCategoryId,
  { base: string; accent: string; depth: string }
> = {
  guess_celebrity: { base: "hsl(150 50% 86%)", accent: "hsl(130 42% 78%)", depth: "hsl(150 45% 68%)" },
  guess_movie: { base: "hsl(340 60% 89%)", accent: "hsl(320 50% 82%)", depth: "hsl(340 50% 72%)" },
  guess_city: { base: "hsl(260 55% 88%)", accent: "hsl(240 45% 82%)", depth: "hsl(260 48% 72%)" },
  guess_sportsman: { base: "hsl(28 70% 87%)", accent: "hsl(15 60% 82%)", depth: "hsl(28 55% 70%)" },
  guess_logo: { base: "hsl(48 75% 86%)", accent: "hsl(35 65% 78%)", depth: "hsl(48 60% 68%)" },
  guess_flag: { base: "hsl(205 60% 87%)", accent: "hsl(190 50% 80%)", depth: "hsl(205 50% 70%)" },
};
