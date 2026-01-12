import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useCallback, useEffect, useState, memo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// New layered assets
import leaderboardMap from "@/assets/leaderboard-map.png";
import trophyBronze from "@/assets/trophy-bronze.png";
import trophySilver from "@/assets/trophy-silver.png";
import trophyGold from "@/assets/trophy-gold.png";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy configuration - all centered horizontally, 2x size
const TROPHY_CONFIG = {
  1: { 
    left: '50%', 
    top: '50%', 
    image: trophyBronze, 
    label: 'Bronze League', 
    labelKa: 'ბრინჯაოს ლიგა',
    size: '44%',
  },
  2: { 
    left: '50%', 
    top: '50%', 
    image: trophySilver, 
    label: 'Silver League', 
    labelKa: 'ვერცხლის ლიგა',
    size: '44%',
  },
  3: { 
    left: '50%', 
    top: '46%', 
    image: trophyGold, 
    label: 'Gold League', 
    labelKa: 'ოქროს ლიგა',
    size: '52%',
  },
} as const;

// Check if we're on desktop (wide screen where full image fits)
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  return isDesktop;
};

// Smooth spring config for trophy animations
const TROPHY_ENTER_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

const TROPHY_EXIT = {
  duration: 0.12,
};

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  tier, 
  children, 
  onTierSelect, 
  userTier = 1 
}: LeaderboardHeroBackgroundProps) {
  const isDesktop = useIsDesktop();
  const { language } = useLanguage();
  
  // Get label for current tier
  const currentTrophyConfig = TROPHY_CONFIG[tier as keyof typeof TROPHY_CONFIG];
  const currentLabel = language === 'ka' ? currentTrophyConfig?.labelKa : currentTrophyConfig?.label;

  // Handle trophy click (desktop)
  const handleTrophyClick = useCallback((clickedTier: number) => {
    if (clickedTier <= userTier) {
      onTierSelect?.(clickedTier);
    }
  }, [userTier, onTierSelect]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (tier > 1) {
          onTierSelect?.(tier - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (tier < 3 && tier < userTier) {
          onTierSelect?.(tier + 1);
        } else if (tier < 3 && tier + 1 <= userTier) {
          onTierSelect?.(tier + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tier, userTier, onTierSelect]);

  return (
    <motion.div
      className="relative overflow-hidden w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '62vh' }}
    >
      {/* Layer 1: Background Map Image */}
      <div 
        className="absolute inset-0 w-full" 
        style={{ height: 'calc(100% + 100px)', top: '-100px' }}
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${leaderboardMap})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        {/* Layer 2: Trophies with animations */}
        <div className="absolute inset-0 w-full h-full">
          {Object.entries(TROPHY_CONFIG).map(([tierKey, config]) => {
            const tierNum = parseInt(tierKey);
            const isActive = tierNum === tier;
            const isLocked = tierNum > userTier;
            
            return (
              <div key={tierKey}>
                {/* Inactive trophies (faded) */}
                {!isActive && (
                  <motion.button
                    onClick={() => handleTrophyClick(tierNum)}
                    disabled={isLocked}
                    className={`absolute ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                      left: config.left,
                      top: config.top,
                      transform: 'translate(-50%, -100%)',
                      width: config.size,
                    }}
                    initial={{ opacity: 0.4, scale: 0.75 }}
                    animate={{ opacity: isLocked ? 0.25 : 0.45, scale: 0.75 }}
                    whileHover={!isLocked ? { scale: 0.82, opacity: 0.65 } : {}}
                    whileTap={!isLocked ? { scale: 0.7 } : {}}
                  >
                    <img 
                      src={config.image} 
                      alt="" 
                      className="w-full h-auto select-none pointer-events-none"
                      draggable={false}
                    />
                  </motion.button>
                )}
              </div>
            );
          })}
          
          {/* Active trophy with enter/exit animation */}
          <AnimatePresence mode="wait">
            {currentTrophyConfig && (
              <motion.div
                key={tier}
                className="absolute pointer-events-none"
                style={{
                  left: currentTrophyConfig.left,
                  top: currentTrophyConfig.top,
                  transform: 'translate(-50%, -100%)',
                  width: currentTrophyConfig.size,
                  transformOrigin: 'center bottom',
                }}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.2, opacity: 0 }}
                transition={TROPHY_ENTER_SPRING}
              >
                <img 
                  src={currentTrophyConfig.image} 
                  alt="" 
                  className="w-full h-auto select-none pointer-events-none drop-shadow-2xl"
                  draggable={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Floating Label (above active trophy) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`label-${tier}`}
            className="absolute z-[10] left-0 right-0 flex justify-center px-4"
            style={{ top: isDesktop ? '22%' : '100px' }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: [0, -5, 0],
              scale: 1,
            }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{
              opacity: { duration: 0.25 },
              scale: { duration: 0.25 },
              y: {
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }
            }}
          >
            <div className="bg-background/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-border/50">
              <span className="text-sm font-semibold text-foreground/90 whitespace-nowrap">
                {currentLabel}
              </span>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-background/95 border-r border-b border-border/50 rotate-45" />
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Layer 3: Fade gradients */}
      <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-background via-background/80 to-transparent z-[5] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/70 to-transparent z-[5] pointer-events-none" />
      
      {/* Layer 4: Content */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
});
