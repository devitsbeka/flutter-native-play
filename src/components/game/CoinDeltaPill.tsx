/**
 * What a game did to your coins, as one pill on every results screen.
 *
 * Three screens said it three ways: the quick game in green and red, the
 * duel in white and amber, the room's podium in gold, silver, bronze and
 * white by place. The owner picked one (owner: "i like red -500 and green
 * +500 badges, use them everywhere on results pages"): green for a gain,
 * red for a loss, and a quiet translucent pill for a round that moved
 * nothing — a seat that scored zero still has a row, and an empty slot
 * would read as "not settled yet".
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import coinIcon from "@/assets/icons/icon-coin.png";

interface CoinDeltaPillProps {
  delta: number;
  /** "md" under a face; "sm" at the end of a list row. */
  size?: "md" | "sm";
  /** Springs in after the rest of the screen has landed. */
  delay?: number;
  className?: string;
}

export function CoinDeltaPill({ delta, size = "md", delay = 0.3, className }: CoinDeltaPillProps) {
  const up = delta > 0;
  const down = delta < 0;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring" }}
      className={cn(
        "inline-flex items-center rounded-full font-bold text-white",
        size === "md" ? "gap-1.5 px-3 py-1.5 text-sm" : "gap-1 px-2 py-0.5 text-xs",
        up ? "bg-emerald-500" : down ? "bg-red-500" : "bg-white/25",
        className,
      )}
      style={{
        boxShadow: up
          ? "0 3px 0 rgba(5,150,105,0.5)"
          : down
            ? "0 3px 0 rgba(180,0,0,0.5)"
            : "0 3px 0 rgba(255,255,255,0.15)",
      }}
    >
      <img src={coinIcon} alt="" className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      {up ? `+${delta}` : delta}
    </motion.span>
  );
}
