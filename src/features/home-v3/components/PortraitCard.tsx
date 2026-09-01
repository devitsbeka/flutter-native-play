import { useMemo, useState } from "react";
import { CATEGORY_IMAGES } from "@/config/videoConfig";
import { POPULAR_CATEGORY_PALETTES, popularCategoryIcon } from "@/config/popularImageCategories";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import type { TransformedCategory } from "@/hooks/useCategories";
import { V3 } from "../theme";

/** Same stable id-hash palette the Discover cards use for unpictured categories. */
const PASTELS = [
  ["#a9d3ee", "#7fb6d8"],
  ["#d5c3ec", "#b39ad8"],
  ["#b5e5d0", "#86c9ad"],
  ["#f0c6d4", "#d99ab2"],
  ["#f3dfb2", "#d9bb7f"],
  ["#c3d0f0", "#98acdc"],
  ["#c9e6c1", "#9ecc93"],
  ["#f3cdbd", "#dea390"],
  ["#b9e1ea", "#87c3cf"],
  ["#e6c8ec", "#c59bd0"],
];

function palette(id: string): [string, string] {
  const pinned = POPULAR_CATEGORY_PALETTES[id as keyof typeof POPULAR_CATEGORY_PALETTES];
  if (pinned) return [pinned.base, pinned.accent];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PASTELS[Math.abs(hash) % PASTELS.length] as [string, string];
}

interface PortraitCardProps {
  category: Pick<TransformedCategory, "id" | "name" | "icon_slug">;
  onClick: () => void;
  /** The name under the card. Ink on the page, white inside the dark band. */
  nameColor?: string;
}

/**
 * The reference's portrait tile: 145 × 218, radius 20, and the name in 17px
 * bold under it, 12px in from the tile's left edge, held to two lines.
 *
 * The picture is the category's still where it has one, on its own
 * gradient with its icon otherwise — the six picture-guess categories carry
 * their designed art and palette, like everywhere else in the app.
 */
export function PortraitCard({ category, onClick, nameColor = V3.ink }: PortraitCardProps) {
  const still = CATEGORY_IMAGES[category.id];
  const art = popularCategoryIcon(category.id);
  const [broken, setBroken] = useState(false);
  const [top, bottom] = useMemo(() => palette(category.id), [category.id]);
  const showStill = !!still && !broken;

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 snap-start text-left active:scale-[0.98] transition-transform duration-150"
      style={{ width: 145, fontFamily: V3.font, WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className="relative overflow-hidden flex items-center justify-center"
        style={{
          width: 145,
          height: 218,
          borderRadius: 20,
          background: `linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`,
        }}
      >
        {showStill ? (
          <img
            src={still}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setBroken(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : art ? (
          <img src={art} alt="" draggable={false} style={{ width: 104, height: 104, objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))" }} />
        ) : (
          <div style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))" }}>
            <DynamicIcon categoryId={category.id} slug={category.icon_slug ?? undefined} size={88} />
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 12,
          paddingLeft: 12,
          paddingRight: 4,
          minHeight: 46,
          color: nameColor,
          fontSize: 17,
          fontWeight: 700,
          lineHeight: "23px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {category.name}
      </div>
    </button>
  );
}
