import { cn } from "@/lib/utils";
import { NOTIFICATION_ICONS } from "@/config/notificationIcons";

/**
 * A notification's own artwork, on the tile every one of them shares.
 *
 * Twenty-one drawn icons, one per type, replacing the line icons that were
 * standing in for them. The tile behind is white falling to yellow — warm
 * enough to read as a badge rather than a hole, pale enough that the artwork
 * (which is saturated and three-dimensional) stays the thing being looked at.
 *
 * The gradient runs 160deg rather than straight down so the highlight sits in
 * the top-left corner, where the icons' own light comes from.
 */

const TILE_BACKGROUND = "linear-gradient(160deg, #FFFFFF 0%, #FFFBF0 46%, #FFEFC2 100%)";
const TILE_BORDER = "rgba(233, 187, 62, 0.35)";
const TILE_SHADOW =
  "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(155,116,17,0.10), 0 4px 10px rgba(155,116,17,0.08)";

interface NotificationIconProps {
  type: string;
  /** Outer tile size in px. The artwork insets itself within it. */
  size?: number;
  /** Corner rounding; defaults to a squircle that suits sizes from 20 up. */
  radius?: number;
  className?: string;
}

export function NotificationIcon({ type, size = 44, radius, className }: NotificationIconProps) {
  const src = NOTIFICATION_ICONS[type] ?? NOTIFICATION_ICONS.system;
  // Small tiles need proportionally more of their box for the artwork or the
  // icon turns into a dot; large ones want the padding to read as a tile.
  const inset = size <= 24 ? 0.86 : 0.74;

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? Math.round(size * 0.32),
        background: TILE_BACKGROUND,
        border: `1px solid ${TILE_BORDER}`,
        boxShadow: TILE_SHADOW,
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="object-contain"
        style={{ width: Math.round(size * inset), height: Math.round(size * inset) }}
      />
    </div>
  );
}
