import { ReactNode, memo } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import leaderboardMap from "@/assets/leaderboard-map.png";
import leaderboardMapDesktop from "@/assets/leaderboard-map-desktop.png";
import trophyBronze from "@/assets/trophy-bronze.png";
import trophySilver from "@/assets/trophy-silver.png";
import trophyGold from "@/assets/trophy-gold.png";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy sizes per breakpoint
const TROPHY_SIZES = {
  desktop: 200,
  tablet: 200,
  mobile: 150,
};

const TROPHY_META = {
  1: { image: trophyBronze, label: "Bronze League", labelKa: "ბრინჯაოს ლიგა" },
  2: { image: trophySilver, label: "Silver League", labelKa: "ვერცხლის ლიგა" },
  3: { image: trophyGold, label: "Gold League", labelKa: "ოქროს ლიგა" },
} as const;

// Trophy tab for mobile/tablet
const TrophyTab = memo(function TrophyTab({
  tierNum,
  isActive,
  onClick,
  size,
}: {
  tierNum: number;
  isActive: boolean;
  onClick: () => void;
  size: number;
}) {
  const meta = TROPHY_META[tierNum as keyof typeof TROPHY_META];
  
  return (
    <motion.button
      onClick={onClick}
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.95 }}
      animate={{
        scale: isActive ? 1.1 : 0.85,
        opacity: isActive ? 1 : 0.6,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <img
        src={meta.image}
        alt={meta.label}
        className="w-full h-full object-contain drop-shadow-xl"
        style={{
          filter: isActive 
            ? 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' 
            : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
        }}
      />
    </motion.button>
  );
});

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  tier, 
  children, 
  onTierSelect,
}: LeaderboardHeroBackgroundProps) {
  const { language } = useLanguage();

  return (
    <div className="relative w-full overflow-hidden min-h-screen lg:min-h-0">
      {/* Background image - mobile */}
      <div 
        className="absolute inset-0 w-full h-full bg-no-repeat bg-top bg-cover lg:hidden"
        style={{
          backgroundImage: `url(${leaderboardMap})`,
        }}
      />
      {/* Background image - desktop (different image, full width) */}
      <div 
        className="absolute inset-0 w-full h-full bg-no-repeat bg-top bg-[length:100%_auto] hidden lg:block"
        style={{
          backgroundImage: `url(${leaderboardMapDesktop})`,
        }}
      />
      
      {/* Top gradient overlay - smaller on desktop */}
      <div 
        className="absolute inset-x-0 top-0 h-12 lg:h-8 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)'
        }}
      />
      
      {/* Bottom gradient overlay */}
      <div 
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)'
        }}
      />

      {/* Desktop: All 3 trophies in a row - hidden on lg since columns have trophies */}
      <div className="hidden md:flex lg:hidden relative z-20 justify-center items-end gap-4 pt-8 pb-4 px-4">
        {([2, 3, 1] as const).map((tierNum) => {
          const meta = TROPHY_META[tierNum];
          const isActive = tierNum === tier;
          const label = language === 'ka' ? meta.labelKa : meta.label;
          // Gold trophy slightly larger
          const size = tierNum === 3 ? TROPHY_SIZES.desktop + 40 : TROPHY_SIZES.desktop;
          
          return (
            <motion.button
              key={tierNum}
              onClick={() => onTierSelect?.(tierNum)}
              className="relative flex flex-col items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                y: isActive ? -8 : 0,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.img
                src={meta.image}
                alt={label}
                style={{ width: size, height: size }}
                className="object-contain drop-shadow-xl"
                animate={{
                  filter: isActive 
                    ? 'drop-shadow(0 0 25px rgba(255,215,0,0.6))' 
                    : 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))',
                }}
              />
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-2 w-16 h-1 rounded-full bg-amber-400"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Mobile/Tablet: Trophy tabs */}
      <div className="flex md:hidden relative z-20 justify-center items-center gap-2 pt-6 pb-4 px-4">
        {([2, 3, 1] as const).map((tierNum) => (
          <TrophyTab
            key={tierNum}
            tierNum={tierNum}
            isActive={tierNum === tier}
            onClick={() => onTierSelect?.(tierNum)}
            size={TROPHY_SIZES.mobile}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-20 pb-6">
        {children}
      </div>
    </div>
  );
});
