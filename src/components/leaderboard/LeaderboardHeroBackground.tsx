import { motion, AnimatePresence, PanInfo } from "framer-motion";
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

// Desktop/Tablet: Trophy positions on the actual podiums in the background image
const DESKTOP_TROPHY_CONFIG = {
  1: { left: '67%', top: '45.5%', size: '18%' }, // Bronze - left 10px, up 3px
  2: { left: '18%', top: '46%', size: '18%' }, // Silver - right 10px
  3: { left: '40.5%', top: '38%', size: '22%' }, // Gold - left 5px, up 15px
} as const;

// Mobile: Centered trophy for active tier
const MOBILE_TROPHY_CONFIG = {
  1: { left: '50%', top: '50%', size: '44%' },
  2: { left: '50%', top: '50%', size: '44%' },
  3: { left: '50%', top: '46%', size: '52%' },
} as const;

// Trophy metadata
const TROPHY_META = {
  1: { image: trophyBronze, label: 'Bronze League', labelKa: 'ბრინჯაოს ლიგა' },
  2: { image: trophySilver, label: 'Silver League', labelKa: 'ვერცხლის ლიგა' },
  3: { image: trophyGold, label: 'Gold League', labelKa: 'ოქროს ლიგა' },
} as const;

// Check if we're on desktop/tablet (>= 768px)
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

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  tier, 
  children, 
  onTierSelect, 
  userTier = 1 
}: LeaderboardHeroBackgroundProps) {
  const isDesktop = useIsDesktop();
  const { language } = useLanguage();
  
  // Get label for current tier
  const currentMeta = TROPHY_META[tier as keyof typeof TROPHY_META];
  const currentLabel = language === 'ka' ? currentMeta?.labelKa : currentMeta?.label;

  // Handle trophy click (desktop)
  const handleTrophyClick = useCallback((clickedTier: number) => {
    onTierSelect?.(clickedTier);
  }, [onTierSelect]);

  // Mobile swipe handler
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 300;
    
    const swipedLeft = info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold;
    const swipedRight = info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold;
    
    if (swipedLeft && tier < 3) {
      onTierSelect?.(tier + 1);
    } else if (swipedRight && tier > 1) {
      onTierSelect?.(tier - 1);
    }
  }, [tier, onTierSelect]);

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
        if (tier < 3) {
          onTierSelect?.(tier + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tier, onTierSelect]);

  return (
    <motion.div
      className="relative overflow-hidden w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '62vh' }}
    >
      {/* Layer 1: Background Map Image */}
      {isDesktop ? (
        /* DESKTOP/TABLET: Static background with clickable trophies */
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
          
          {/* Trophies for desktop */}
          <div className="absolute inset-0 w-full h-full">
            {Object.entries(DESKTOP_TROPHY_CONFIG).map(([tierKey, config]) => {
              const tierNum = parseInt(tierKey);
              const meta = TROPHY_META[tierNum as keyof typeof TROPHY_META];
              const isActive = tierNum === tier;
              const label = language === 'ka' ? meta.labelKa : meta.label;
              
              return (
                <motion.button
                  key={tierKey}
                  onClick={() => handleTrophyClick(tierNum)}
                  className="absolute cursor-pointer group"
                  style={{
                    left: config.left,
                    top: config.top,
                    transform: 'translate(-50%, -100%)',
                    width: config.size,
                  }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: 1, 
                    scale: isActive ? 1.1 : 1,
                  }}
                  whileHover={{ scale: isActive ? 1.15 : 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <img 
                    src={meta.image} 
                    alt={label}
                    className={`w-full h-auto select-none pointer-events-none transition-all duration-300 ${
                      isActive ? 'drop-shadow-2xl' : 'drop-shadow-lg'
                    }`}
                    draggable={false}
                  />
                  {/* Floating label on hover */}
                  <div className={`absolute left-1/2 -translate-x-1/2 -top-10 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'opacity-100' : ''
                  }`}>
                    <div className="bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border border-border/50 whitespace-nowrap">
                      <span className="text-sm font-medium text-foreground/90">
                        {label}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        /* MOBILE: Swipeable background + trophy together */
        <motion.div 
          className="absolute inset-0 w-full touch-pan-y"
          style={{ height: 'calc(100% + 100px)', top: '-100px', cursor: 'grab' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          whileDrag={{ cursor: 'grabbing' }}
        >
          {/* Background image moves with drag */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${leaderboardMap})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
          />
          
          {/* Trophy moves with background */}
          <AnimatePresence mode="wait">
            {currentMeta && (
              <motion.div
                key={tier}
                className="absolute pointer-events-none"
                style={{
                  left: MOBILE_TROPHY_CONFIG[tier as keyof typeof MOBILE_TROPHY_CONFIG].left,
                  top: `calc(${MOBILE_TROPHY_CONFIG[tier as keyof typeof MOBILE_TROPHY_CONFIG].top} + 100px)`,
                  transform: 'translate(calc(-50% - 50px), -100%)',
                  width: MOBILE_TROPHY_CONFIG[tier as keyof typeof MOBILE_TROPHY_CONFIG].size,
                  transformOrigin: 'center bottom',
                }}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.2, opacity: 0 }}
                transition={TROPHY_ENTER_SPRING}
              >
                <img 
                  src={currentMeta.image} 
                  alt="" 
                  className="w-full h-auto select-none pointer-events-none drop-shadow-2xl"
                  draggable={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
        
      {/* Floating Label - Mobile only (desktop has hover labels) */}
      {!isDesktop && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`label-${tier}`}
            className="absolute z-[10] left-0 right-0 flex justify-center px-4"
            style={{ top: '100px' }}
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
      )}
      
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
