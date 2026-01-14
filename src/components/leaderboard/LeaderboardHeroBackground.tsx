import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ReactNode, useCallback, useEffect, useState, memo, useRef } from "react";
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

// ============ DEV MODE - Set to true to enable trophy dragging ============
const DEV_MODE = true;
// ==========================================================================

// Background image natural dimensions (measure your actual image)
const BG_IMAGE_DIMENSIONS = { width: 2048, height: 1365 };

// Desktop: Trophy positions in PIXELS relative to the background image's natural size
// These coordinates represent where the trophy's bottom-center should be on the image
const DESKTOP_TROPHY_CONFIG = {
  1: { x: 1360, y: 610, size: 370 }, // Bronze - right podium
  2: { x: 370, y: 630, size: 370 },  // Silver - left podium
  3: { x: 820, y: 500, size: 450 },  // Gold - center podium
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

// Hook to calculate trophy positions based on how the background image is scaled
const useTrophyPositions = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [positions, setPositions] = useState<Record<number, { x: number; y: number; size: number }>>({});
  
  const calculatePositions = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Calculate how background-size: cover scales the image
    const imageAspect = BG_IMAGE_DIMENSIONS.width / BG_IMAGE_DIMENSIONS.height;
    const containerAspect = containerWidth / containerHeight;
    
    let scale: number;
    let offsetX = 0;
    let offsetY = 0;
    
    if (containerAspect > imageAspect) {
      // Container is wider than image - image is scaled to fit width
      scale = containerWidth / BG_IMAGE_DIMENSIONS.width;
      const scaledHeight = BG_IMAGE_DIMENSIONS.height * scale;
      // background-position: center top means no Y offset at top
      offsetY = 0;
    } else {
      // Container is taller than image - image is scaled to fit height
      scale = containerHeight / BG_IMAGE_DIMENSIONS.height;
      const scaledWidth = BG_IMAGE_DIMENSIONS.width * scale;
      // background-position: center means X is centered
      offsetX = (containerWidth - scaledWidth) / 2;
    }
    
    // Calculate screen positions for each trophy
    const newPositions: Record<number, { x: number; y: number; size: number }> = {};
    
    Object.entries(DESKTOP_TROPHY_CONFIG).forEach(([tierKey, config]) => {
      const tierNum = parseInt(tierKey);
      newPositions[tierNum] = {
        x: offsetX + config.x * scale,
        y: offsetY + config.y * scale,
        size: config.size * scale,
      };
    });
    
    setPositions(newPositions);
  }, [containerRef]);
  
  useEffect(() => {
    calculatePositions();
    window.addEventListener('resize', calculatePositions);
    return () => window.removeEventListener('resize', calculatePositions);
  }, [calculatePositions]);
  
  return { positions, calculatePositions };
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { positions, calculatePositions } = useTrophyPositions(containerRef);
  
  // Dev mode: track dragging positions
  const [dragPositions, setDragPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [isDragging, setIsDragging] = useState<number | null>(null);
  
  // Get label for current tier
  const currentMeta = TROPHY_META[tier as keyof typeof TROPHY_META];
  const currentLabel = language === 'ka' ? currentMeta?.labelKa : currentMeta?.label;

  // Handle trophy click (desktop)
  const handleTrophyClick = useCallback((clickedTier: number) => {
    if (!DEV_MODE) {
      onTierSelect?.(clickedTier);
    }
  }, [onTierSelect]);

  // Convert screen position back to image coordinates
  const screenToImageCoords = useCallback((screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    const imageAspect = BG_IMAGE_DIMENSIONS.width / BG_IMAGE_DIMENSIONS.height;
    const containerAspect = containerWidth / containerHeight;
    
    let scale: number;
    let offsetX = 0;
    let offsetY = 0;
    
    if (containerAspect > imageAspect) {
      scale = containerWidth / BG_IMAGE_DIMENSIONS.width;
      offsetY = 0;
    } else {
      scale = containerHeight / BG_IMAGE_DIMENSIONS.height;
      const scaledWidth = BG_IMAGE_DIMENSIONS.width * scale;
      offsetX = (containerWidth - scaledWidth) / 2;
    }
    
    return {
      x: Math.round((screenX - offsetX) / scale),
      y: Math.round((screenY - offsetY) / scale),
    };
  }, []);

  // Handle drag end in dev mode
  const handleDragEnd = useCallback((tierNum: number, info: PanInfo) => {
    if (!DEV_MODE) return;
    
    const currentPos = positions[tierNum];
    if (!currentPos) return;
    
    const dragOffset = dragPositions[tierNum] || { x: 0, y: 0 };
    const newScreenX = currentPos.x + dragOffset.x + info.offset.x;
    const newScreenY = currentPos.y + dragOffset.y + info.offset.y;
    
    const imageCoords = screenToImageCoords(newScreenX, newScreenY);
    
    console.log(`\n📍 Trophy ${tierNum} new position:`);
    console.log(`   ${tierNum}: { x: ${imageCoords.x}, y: ${imageCoords.y}, size: ${DESKTOP_TROPHY_CONFIG[tierNum as keyof typeof DESKTOP_TROPHY_CONFIG].size} },`);
    
    // Update drag position to persist the offset
    setDragPositions(prev => ({
      ...prev,
      [tierNum]: {
        x: (prev[tierNum]?.x || 0) + info.offset.x,
        y: (prev[tierNum]?.y || 0) + info.offset.y,
      }
    }));
    
    setIsDragging(null);
  }, [positions, dragPositions, screenToImageCoords]);

  // Mobile swipe handler
  const handleMobileSwipe = useCallback((_: any, info: PanInfo) => {
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

  // Recalculate positions when container mounts
  useEffect(() => {
    if (containerRef.current) {
      calculatePositions();
    }
  }, [calculatePositions]);

  return (
    <motion.div
      className="relative overflow-hidden w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '62vh' }}
    >
      {/* DEV MODE indicator */}
      {DEV_MODE && isDesktop && (
        <div className="absolute top-2 left-2 z-50 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
          DEV MODE: Drag trophies • Check console for coordinates
        </div>
      )}
      
      {/* Layer 1: Background Map Image */}
      {isDesktop ? (
        /* DESKTOP/TABLET: Static background with positioned trophies */
        <div 
          ref={containerRef}
          className="absolute inset-0 w-full" 
          style={{ height: 'calc(100% + 100px)', top: '-100px' }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${leaderboardMap})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
          />
          
          {/* Trophies positioned using calculated screen coordinates */}
          {Object.entries(DESKTOP_TROPHY_CONFIG).map(([tierKey]) => {
            const tierNum = parseInt(tierKey);
            const meta = TROPHY_META[tierNum as keyof typeof TROPHY_META];
            const isActive = tierNum === tier;
            const label = language === 'ka' ? meta.labelKa : meta.label;
            const pos = positions[tierNum];
            const dragOffset = dragPositions[tierNum] || { x: 0, y: 0 };
            
            if (!pos) return null;
            
            return (
              <motion.button
                key={tierKey}
                onClick={() => handleTrophyClick(tierNum)}
                className={`absolute ${DEV_MODE ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} group`}
                style={{
                  left: pos.x + dragOffset.x,
                  top: pos.y + dragOffset.y,
                  transform: 'translate(-50%, -100%)',
                  width: pos.size,
                  maxWidth: '280px',
                  minWidth: '100px',
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  scale: isActive ? 1.1 : 1,
                }}
                whileHover={DEV_MODE ? undefined : { scale: isActive ? 1.15 : 1.08 }}
                whileTap={DEV_MODE ? undefined : { scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                // DEV MODE: Enable dragging
                drag={DEV_MODE}
                dragMomentum={false}
                dragElastic={0}
                onDragStart={() => setIsDragging(tierNum)}
                onDragEnd={(_, info) => handleDragEnd(tierNum, info)}
              >
                <img 
                  src={meta.image} 
                  alt={label}
                  className={`w-full h-auto select-none pointer-events-none transition-all duration-300 ${
                    isActive ? 'drop-shadow-2xl' : 'drop-shadow-lg'
                  }`}
                  draggable={false}
                />
                
                {/* DEV MODE: Show coordinates while dragging */}
                {DEV_MODE && isDragging === tierNum && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-black/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-50">
                    Drag to position...
                  </div>
                )}
                
                {/* Floating label on hover (non-dev mode) */}
                {!DEV_MODE && (
                  <div className={`absolute left-1/2 -translate-x-1/2 -top-10 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'opacity-100' : ''
                  }`}>
                    <div className="bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border border-border/50 whitespace-nowrap">
                      <span className="text-sm font-medium text-foreground/90">
                        {label}
                      </span>
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      ) : (
        /* MOBILE: Swipeable with smooth trophy centering */
        <motion.div 
          className="absolute inset-0 w-full touch-pan-y"
          style={{ height: 'calc(100% + 100px)', top: '-100px', cursor: 'grab' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleMobileSwipe}
          whileDrag={{ cursor: 'grabbing' }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${leaderboardMap})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
          />
          
          {/* Trophy with smooth slide transition */}
          <AnimatePresence mode="popLayout">
            {currentMeta && (
              <motion.div
                key={tier}
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: `calc(${MOBILE_TROPHY_CONFIG[tier as keyof typeof MOBILE_TROPHY_CONFIG].top} + 100px)`,
                  width: MOBILE_TROPHY_CONFIG[tier as keyof typeof MOBILE_TROPHY_CONFIG].size,
                  transformOrigin: 'center bottom',
                }}
                initial={{ 
                  x: tier > 2 ? 100 : tier < 2 ? -100 : 0,
                  opacity: 0,
                  scale: 0.8,
                }}
                animate={{ 
                  x: '-50%',
                  opacity: 1,
                  scale: 1,
                }}
                exit={{ 
                  x: tier > 2 ? -100 : tier < 2 ? 100 : 0,
                  opacity: 0,
                  scale: 0.8,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                }}
              >
                <img 
                  src={currentMeta.image} 
                  alt="" 
                  className="w-full h-auto select-none pointer-events-none drop-shadow-2xl"
                  style={{ transform: 'translateX(-50px) translateY(-100%)' }}
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
