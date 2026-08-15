import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useVipStatus } from "@/hooks/useVipStatus";
import crownIcon from "@/assets/crown-icon.png";

/**
 * The mark that says this player is PRO.
 *
 * One badge, drawn the same everywhere it appears, because it is answering
 * the same question everywhere: on the player's own avatar at home, beside
 * their name on the profile, and on the framed avatar that already carried a
 * crown of its own before this existed.
 *
 * It decides for itself whether to render: nothing shows for a player who is
 * not subscribed, and nothing shows while the subscription is still being
 * read — a crown that appears a beat late is better than one that appears and
 * then vanishes.
 */

interface ProBadgeProps {
  /**
   * `crown` is the round badge that sits on an avatar, `pill` reads "PRO",
   * and `mark` is the crown on its own — no disc, no word. The disc exists to
   * lift a gold crown off a photograph; beside a name on a plain background
   * there is nothing to lift it off, and it just draws a circle.
   */
  variant?: "crown" | "pill" | "mark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Skips the subscription check — for previews and showcases. */
  force?: boolean;
}

// The crown is the app's own drawn one, the same file the PRO tier cards and
// the seats panel use — a lucide outline beside it read as a different
// product's mark.
//
// Which is also why the badge is no longer gold: the drawn crown is gold, and
// on a gold pill it disappeared into its own background. White carries it the
// way the PRO cards do, with the wordmark in the app's ink.
const PILL_BG = "#FFFFFF";
const PILL_INK = "#402666";
const BADGE_SHADOW = "0 2px 8px rgba(64, 38, 102, 0.22)";

// The four sizes the framed avatar already drew its crown at, kept to the
// pixel so adopting this badge changed nothing on the screens using it.
// The box sizes are the frame's; only the crown inside them grew a step. A
// drawn crown carries less ink than a filled glyph at the same box, so at the
// old sizes it read as a smudge rather than a crown.
const CROWN_SIZES = {
  sm: { box: "w-4 h-4", icon: "w-3 h-3" },
  md: { box: "w-5 h-5", icon: "w-3.5 h-3.5" },
  lg: { box: "w-7 h-7", icon: "w-5 h-5" },
  xl: { box: "w-8 h-8", icon: "w-6 h-6" },
};

const PILL_SIZES = {
  sm: { pill: "h-5 px-1.5 gap-0.5 text-[10px]", icon: "w-3 h-3" },
  md: { pill: "h-6 px-2 gap-1 text-xs", icon: "w-3.5 h-3.5" },
  lg: { pill: "h-7 px-2.5 gap-1 text-sm", icon: "w-4 h-4" },
  xl: { pill: "h-8 px-3 gap-1.5 text-base", icon: "w-5 h-5" },
};

export function ProBadge({ variant = "crown", size = "md", className, force }: ProBadgeProps) {
  const { isVip, loading } = useVipStatus();
  if (!force && (loading || !isVip)) return null;

  const common = {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: { type: "spring" as const, stiffness: 400, damping: 15 },
    style: { background: PILL_BG, boxShadow: BADGE_SHADOW },
  };

  if (variant === "mark") {
    // Sized from the box the disc would have occupied, so swapping between
    // the two does not change how much room the badge takes beside a name.
    const box = CROWN_SIZES[size].box;
    return (
      <motion.img
        initial={common.initial}
        animate={common.animate}
        transition={common.transition}
        src={crownIcon}
        alt="PRO"
        draggable={false}
        className={cn("object-contain", box, className)}
      />
    );
  }

  if (variant === "pill") {
    const s = PILL_SIZES[size];
    return (
      <motion.span
        {...common}
        aria-label="PRO"
        className={cn(
          "inline-flex items-center rounded-full font-display font-black",
          s.pill,
          className,
        )}
        // The wordmark, not the badge: colour goes on the span so the crown
        // keeps its own.
      >
        <img src={crownIcon} alt="" draggable={false} className={cn(s.icon, "object-contain")} />
        <span style={{ color: PILL_INK }}>PRO</span>
      </motion.span>
    );
  }

  const s = CROWN_SIZES[size];
  return (
    <motion.span
      {...common}
      aria-label="PRO"
      className={cn("inline-flex items-center justify-center rounded-full", s.box, className)}
    >
      <img src={crownIcon} alt="" draggable={false} className={cn(s.icon, "object-contain")} />
    </motion.span>
  );
}
