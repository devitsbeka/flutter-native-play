import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { LeagueEntry } from "@/hooks/useLeagueLeaderboard";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import pirateCoinAnimation from "@/assets/lottie/pirate-coin.json";

interface LeaguePlayerRowProps {
  entry: LeagueEntry;
  isCurrentUser: boolean;
  index: number;
  previousRank?: number | null;
  shouldAnimate?: boolean;
  totalPlayers: number;
  isPromotionZone?: boolean;
  isDemotionZone?: boolean;
  isFixed?: boolean;
}

// Rank badge colors matching Duolingo
const RANK_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-yellow-400", text: "text-yellow-900" },
  2: { bg: "bg-gray-300", text: "text-gray-700" },
  3: { bg: "bg-amber-600", text: "text-amber-100" },
};

// Generate consistent avatar colors based on name
function getAvatarColor(name: string): string {
  const colors = [
    "bg-pink-400",
    "bg-blue-400", 
    "bg-green-400",
    "bg-purple-400",
    "bg-orange-400",
    "bg-teal-400",
    "bg-red-400",
    "bg-indigo-400",
  ];
  const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export const LeaguePlayerRow = forwardRef<HTMLDivElement, LeaguePlayerRowProps>(
  function LeaguePlayerRow(
    {
      entry,
      isCurrentUser,
      index,
      previousRank,
      shouldAnimate,
      isPromotionZone,
      isDemotionZone,
      isFixed,
    },
    ref
  ) {
  const { openProfile } = usePlayerProfile();
  const rankStyle = RANK_COLORS[entry.rank];
  const isTopThree = entry.rank <= 3;

  // Calculate animation offset based on rank change
  const rankDiff = previousRank && shouldAnimate ? previousRank - entry.rank : 0;
  const rowHeight = 72;
  const initialOffset = rankDiff * rowHeight;

  // Determine background and border styling based on zone
  const getRowStyles = () => {
    if (isCurrentUser) {
      // Current user: white background with subtle stroke, 18px border radius
      return "bg-background border border-foreground/20";
    }
    if (isPromotionZone) {
      return "bg-background";
    }
    if (isDemotionZone) {
      return "bg-background";
    }
    return "bg-background hover:bg-muted/30";
  };

  // Get zone indicator color for the rank badge ring
  const getZoneRingColor = () => {
    if (isPromotionZone && !isTopThree) return "ring-2 ring-emerald-500";
    if (isDemotionZone) return "ring-2 ring-red-500";
    return "";
  };

  return (
    <motion.div
      className={`flex items-center gap-3 py-3 px-3 transition-colors border-b border-border/40 last:border-b-0 ${getRowStyles()} ${isFixed ? "shadow-lg border border-border/50" : ""}`}
      style={{ borderRadius: isCurrentUser ? 18 : 0 }}
      initial={
        shouldAnimate && rankDiff !== 0 
          ? { y: initialOffset, opacity: 0.8, scale: 0.98 } 
          : isFixed ? {} : { opacity: 0, x: -20 }
      }
      animate={{ y: 0, opacity: 1, x: 0, scale: 1 }}
      transition={
        shouldAnimate && rankDiff !== 0
          ? {
              type: "spring",
              stiffness: 80,
              damping: 15,
              delay: 0.8,
            }
          : {
              delay: isFixed ? 0 : index * 0.03,
              duration: 0.3,
            }
      }
      layout={!isFixed}
    >
      {/* Avatar with Rank Badge overlay - Clickable */}
      <div 
        className="relative shrink-0 cursor-pointer hover:scale-105 transition-transform active:scale-95"
        onClick={() => openProfile(entry.user_id)}
      >
        <SafeAvatar 
          avatarUrl={entry.avatar_url}
          fallback={entry.nickname || "?"}
          className={`h-12 w-12 ${isCurrentUser ? "ring-2 ring-primary" : ""}`}
          fallbackClassName={`${getAvatarColor(entry.nickname)} text-white font-bold text-lg`}
        />
        
        {/* Rank badge positioned at bottom-right of avatar */}
        <div 
          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
            isTopThree && rankStyle 
              ? `${rankStyle.bg} ${rankStyle.text}` 
              : `bg-muted text-muted-foreground ${getZoneRingColor()}`
          }`}
        >
          {entry.rank}
        </div>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-base truncate ${
            isCurrentUser ? "text-primary" : "text-foreground"
          }`}
        >
          {entry.nickname}
        </p>
      </div>

      {/* Coins */}
      <motion.div
        className="flex items-center gap-1.5 shrink-0"
        animate={
          isCurrentUser && shouldAnimate
            ? { scale: [1, 1.1, 1] }
            : {}
        }
        transition={{ delay: 1.6, duration: 0.3 }}
      >
        <Lottie 
          animationData={pirateCoinAnimation} 
          loop={true}
          className="w-[26px] h-[26px]"
        />
        <span className={`font-bold text-base ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
          {(entry.coins || entry.weekly_xp).toLocaleString()}
        </span>
      </motion.div>
    </motion.div>
  );
});
