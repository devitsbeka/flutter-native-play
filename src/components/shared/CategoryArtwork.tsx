import { DynamicIcon } from "@/components/shared/DynamicIcon";
import {
  POPULAR_CATEGORY_ICONS,
  POPULAR_IMAGE_CATEGORY_IDS,
  type PopularImageCategoryId,
} from "@/config/popularImageCategories";
import { cn } from "@/lib/utils";

interface CategoryArtworkProps {
  /** The slug, e.g. "guess_logo" — not the UUID. */
  categoryId?: string | null;
  /** `categories.icon_slug`, used for everything outside the popular set. */
  iconSlug?: string | null;
  size?: number;
  className?: string;
  /**
   * No shadow at all. On a pale card the two shadows — this wrapper's and
   * the icon's own — blurred into a dark box behind a small icon.
   */
  flat?: boolean;
}

/**
 * The picture for a category, for the places that have no video to show.
 *
 * The six picture-guess categories ship a 3D icon of their own (the same art
 * the Discover cards use); everything else falls back to its icon-library
 * glyph. Card backgrounds are a mix of light gradients and dark scrims, so the
 * art carries its own shadow rather than relying on contrast with whatever is
 * behind it.
 */
export function CategoryArtwork({ categoryId, iconSlug, size = 96, className, flat = false }: CategoryArtworkProps) {
  const popularIcon = (POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).includes(categoryId ?? "")
    ? POPULAR_CATEGORY_ICONS[categoryId as PopularImageCategoryId]
    : null;

  if (popularIcon) {
    return (
      <img
        src={popularIcon}
        alt=""
        width={size}
        height={size}
        className={cn("object-contain", !flat && "drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className={cn(!flat && "drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]", className)}>
      <DynamicIcon categoryId={categoryId ?? undefined} slug={iconSlug ?? undefined} size={size} shadow={!flat} />
    </div>
  );
}
