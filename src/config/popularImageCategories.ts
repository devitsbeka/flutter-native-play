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

import heroCelebrity from "@/assets/popular/guess_celebrity.webp";
import heroMovie from "@/assets/popular/guess_movie.webp";
import heroCity from "@/assets/popular/guess_city.webp";
import heroSportsman from "@/assets/popular/guess_sportsman.webp";
import heroLogo from "@/assets/popular/guess_logo.webp";
import heroFlag from "@/assets/popular/guess_flag.webp";

import iconCelebrity from "@/assets/popular/guess_celebrity_card.webp";
import iconMovie from "@/assets/popular/guess_movie_card.webp";
import iconCity from "@/assets/popular/guess_city_card.webp";
import iconSportsman from "@/assets/popular/guess_sportsman_card.webp";
import iconLogo from "@/assets/popular/guess_logo_card.webp";
import iconFlag from "@/assets/popular/guess_flag_card.webp";

export const POPULAR_IMAGE_CATEGORY_IDS = [
  "guess_celebrity",
  "guess_movie",
  "guess_city",
  "guess_sportsman",
  "guess_logo",
  "guess_flag",
] as const;

export type PopularImageCategoryId = (typeof POPULAR_IMAGE_CATEGORY_IDS)[number];

/**
 * Card art: the 3D icon rendered centred on the card's gradient.
 *
 * Two sizes, because two surfaces draw the same picture very differently and
 * one file cannot serve both honestly:
 *
 *   CategoryPage hero   w-[40%] max-w-[230px]  = up to 690 device px at 3x
 *   Discover card       141 CSS px measured    =        423 device px
 *   Room category picker 26 CSS px             =         78 device px
 *
 * Shipping the hero's 1000px art everywhere cost Discover 737 KB to draw six
 * icons at 141 CSS px — measured, and the largest single item on that page.
 * Shipping the card's art to the hero is how guess_logo came to be 102px and
 * visibly mushy. So: 512px is the default below, and the hero opts in to the
 * full-size map. Six card icons are 269 KB rather than 643.
 *
 * Imported through Vite rather than served from public/: these files get
 * replaced (icon quality passes), and a fixed /images/... URL kept serving
 * the browser's cached old art after a swap. A content-hashed filename
 * changes with the file, so a replacement is visible on the next deploy.
 *
 * WebP, not AVIF — AVIF needs iOS 16 and this app deploys to 15, where the
 * icon would simply not render.
 */
export const POPULAR_CATEGORY_ICONS: Record<PopularImageCategoryId, string> = {
  guess_celebrity: iconCelebrity,
  guess_movie: iconMovie,
  guess_city: iconCity,
  guess_sportsman: iconSportsman,
  guess_logo: iconLogo,
  guess_flag: iconFlag,
};

/**
 * The 1000px originals, for the one surface that draws them large.
 *
 * Only CategoryPage's hero should reach for these. Anything card-sized or
 * smaller wants POPULAR_CATEGORY_ICONS above — at 141 CSS px the difference
 * is invisible and costs 374 KB across the six.
 */
export const POPULAR_CATEGORY_HERO_ICONS: Record<PopularImageCategoryId, string> = {
  guess_celebrity: heroCelebrity,
  guess_movie: heroMovie,
  guess_city: heroCity,
  guess_sportsman: heroSportsman,
  guess_logo: heroLogo,
  guess_flag: heroFlag,
};

/** The bundled art for a category, or null for everything else.
 *
 * The icon-library glyphs these categories carry in `icon_slug` are generic
 * stand-ins (globe, magnifier, running man); every surface that shows a
 * category icon should prefer this art so the guess-categories look the same
 * in the Popular row, the pickers and the continue-playing card. */
export function popularCategoryIcon(categoryId: string | null | undefined): string | null {
  if (!categoryId) return null;
  return (POPULAR_CATEGORY_ICONS as Record<string, string>)[categoryId] ?? null;
}

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
