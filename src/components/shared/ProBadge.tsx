import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVipStatus } from "@/hooks/useVipStatus";

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
  /** `crown` is the round badge that sits on an avatar; `pill` reads "PRO". */
  variant?: "crown" | "pill";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Skips the subscription check — for previews and showcases. */
  force?: boolean;
}

const GOLD = "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
const GOLD_SHADOW = "0 2px 8px rgba(255, 215, 0, 0.5)";

// The four sizes the framed avatar already drew its crown at, kept to the
// pixel so adopting this badge changed nothing on the screens using it.
const CROWN_SIZES = {
  sm: { box: "w-4 h-4", icon: "w-2.5 h-2.5" },
  md: { box: "w-5 h-5", icon: "w-3 h-3" },
  lg: { box: "w-7 h-7", icon: "w-4 h-4" },
  xl: { box: "w-8 h-8", icon: "w-5 h-5" },
};

const PILL_SIZES = {
  sm: { pill: "h-5 px-1.5 gap-0.5 text-[10px]", icon: "w-2.5 h-2.5" },
  md: { pill: "h-6 px-2 gap-1 text-xs", icon: "w-3 h-3" },
  lg: { pill: "h-7 px-2.5 gap-1 text-sm", icon: "w-3.5 h-3.5" },
  xl: { pill: "h-8 px-3 gap-1.5 text-base", icon: "w-4 h-4" },
};

export function ProBadge({ variant = "crown", size = "md", className, force }: ProBadgeProps) {
  const { isVip, loading } = useVipStatus();
  if (!force && (loading || !isVip)) return null;

  const common = {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: { type: "spring" as const, stiffness: 400, damping: 15 },
    style: { background: GOLD, boxShadow: GOLD_SHADOW },
  };

  if (variant === "pill") {
    const s = PILL_SIZES[size];
    return (
      <motion.span
        {...common}
        aria-label="PRO"
        className={cn(
          "inline-flex items-center rounded-full font-display font-black text-white",
          s.pill,
          className,
        )}
      >
        <Crown className={cn(s.icon, "fill-white")} />
        PRO
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
      <Crown className={cn(s.icon, "text-white fill-white")} />
    </motion.span>
  );
}
