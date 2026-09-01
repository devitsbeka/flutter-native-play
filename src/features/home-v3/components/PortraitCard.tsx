import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
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

export type PortraitCategory = Pick<TransformedCategory, "id" | "name" | "icon_slug" | "tier">;

interface PortraitCardProps {
  category: PortraitCategory;
  onClick: () => void;
  /**
   * A premium category and no subscription. The card wears the same PRO
   * badge as Discover's and its picture is dimmed; the tap still lands (on
   * the paywall) — an offer, not a dead tile.
   */
  locked?: boolean;
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
export function PortraitCard({ category, onClick, locked = false, nameColor = V3.ink }: PortraitCardProps) {
  const still = CATEGORY_IMAGES[category.id];
  const art = popularCategoryIcon(category.id);
  const [broken, setBroken] = useState(false);
  const [top, bottom] = useMemo(() => palette(category.id), [category.id]);
  const showStill = !!still && !broken;
  const dim = locked ? { filter: "grayscale(0.85)", opacity: 0.55 } : undefined;

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
            style={dim}
          />
        ) : art ? (
          <img
            src={art}
            alt=""
            draggable={false}
            style={{ width: 104, height: 104, objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))", ...dim }}
          />
        ) : (
          <div style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))", ...dim }}>
            <DynamicIcon categoryId={category.id} slug={category.icon_slug ?? undefined} size={88} />
          </div>
        )}

        {locked && (
          <div
            className="absolute flex items-center gap-1 rounded-full border-2 border-purple-300"
            style={{
              top: 10,
              right: 10,
              height: 26,
              padding: "0 9px",
              background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
              boxShadow: "0 3px 0 0 rgba(139,92,246,0.3), inset 0 2px 0 rgba(255,255,255,0.3)",
            }}
          >
            <Lock className="w-3 h-3 text-white" strokeWidth={3} />
            <span style={{ color: "#ffffff", fontSize: 11, fontWeight: 700, lineHeight: "12px", letterSpacing: "0.04em" }}>PRO</span>
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
