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
const STORAGE_KEY = 'leaderboard-trophy-positions';
// ==========================================================================

// Background image natural dimensions
const BG_IMAGE_DIMENSIONS = { width: 2048, height: 1365 };

// Default trophy positions in pixels relative to background image
const DEFAULT_TROPHY_CONFIG = {
  1: { x: 1360, y: 610, size: 370 }, // Bronze
  2: { x: 370, y: 630, size: 370 },  // Silver
  3: { x: 820, y: 500, size: 450 },  // Gold
} as const;

// Load saved positions from localStorage or use defaults
const loadTrophyConfig = (): Record<number, { x: number; y: number; size: number }> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        1: { ...DEFAULT_TROPHY_CONFIG[1], ...parsed[1] },
        2: { ...DEFAULT_TROPHY_CONFIG[2], ...parsed[2] },
        3: { ...DEFAULT_TROPHY_CONFIG[3], ...parsed[3] },
      };
    }
  } catch (e) {
    console.warn('Failed to load trophy positions:', e);
  }
  return { ...DEFAULT_TROPHY_CONFIG };
};

// Save positions to localStorage
const saveTrophyConfig = (config: Record<number, { x: number; y: number; size: number }>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save trophy positions:', e);
  }
};

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

// Hook to manage trophy positions with auto-save
const useTrophyConfig = () => {
  const [config, setConfig] = useState(() => loadTrophyConfig());
  
  const updatePosition = useCallback((tierNum: number, x: number, y: number) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [tierNum]: { ...prev[tierNum], x, y },
      };
      saveTrophyConfig(newConfig);
      return newConfig;
    });
  }, []);
  
  const resetPositions = useCallback(() => {
    const defaultConfig = { ...DEFAULT_TROPHY_CONFIG };
    setConfig(defaultConfig);
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  return { config, updatePosition, resetPositions };
};

// Hook to calculate trophy screen positions based on background scaling
const useTrophyPositions = (
  containerRef: React.RefObject<HTMLDivElement>,
  trophyConfig: Record<number, { x: number; y: number; size: number }>
) => {
  const [positions, setPositions] = useState<Record<number, { x: number; y: number; size: number }>>({});
  const [scaleInfo, setScaleInfo] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  
  const calculatePositions = useCallback(() => {
    if (!containerRef.current) return;
    
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
    
    setScaleInfo({ scale, offsetX, offsetY });
    
    const newPositions: Record<number, { x: number; y: number; size: number }> = {};
    
    Object.entries(trophyConfig).forEach(([tierKey, config]) => {
      const tierNum = parseInt(tierKey);
      newPositions[tierNum] = {
        x: offsetX + config.x * scale,
        y: offsetY + config.y * scale,
        size: config.size * scale,
      };
    });
    
    setPositions(newPositions);
  }, [containerRef, trophyConfig]);
  
  useEffect(() => {
    calculatePositions();
    window.addEventListener('resize', calculatePositions);
    return () => window.removeEventListener('resize', calculatePositions);
  }, [calculatePositions]);
  
  return { positions, scaleInfo, calculatePositions };
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
  
  const { config: trophyConfig, updatePosition, resetPositions } = useTrophyConfig();
  const { positions, scaleInfo } = useTrophyPositions(containerRef, trophyConfig);
  
  const [isDragging, setIsDragging] = useState<number | null>(null);
  
  const currentMeta = TROPHY_META[tier as keyof typeof TROPHY_META];
  const currentLabel = language === 'ka' ? currentMeta?.labelKa : currentMeta?.label;

  const handleTrophyClick = useCallback((clickedTier: number) => {
    if (!DEV_MODE) {
      onTierSelect?.(clickedTier);
    }
  }, [onTierSelect]);

  // Convert screen position to image coordinates and auto-save
  const handleDragEnd = useCallback((tierNum: number, info: PanInfo) => {
    if (!DEV_MODE || !containerRef.current) return;
    
    const currentScreenPos = positions[tierNum];
    if (!currentScreenPos) return;
    
    const newScreenX = currentScreenPos.x + info.offset.x;
    const newScreenY = currentScreenPos.y + info.offset.y;
    
    // Convert back to image coordinates
    const imageX = Math.round((newScreenX - scaleInfo.offsetX) / scaleInfo.scale);
    const imageY = Math.round((newScreenY - scaleInfo.offsetY) / scaleInfo.scale);
    
    // Auto-save to localStorage
    updatePosition(tierNum, imageX, imageY);
    setIsDragging(null);
  }, [positions, scaleInfo, updatePosition]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (tier > 1) onTierSelect?.(tier - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (tier < 3) onTierSelect?.(tier + 1);
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
      {/* DEV MODE controls */}
      {DEV_MODE && isDesktop && (
        <div className="absolute top-2 left-2 z-50 flex gap-2">
          <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
            DEV: Drag trophies to position
          </div>
          <button 
            onClick={resetPositions}
            className="bg-foreground/80 text-background px-3 py-1 rounded-lg text-xs font-bold shadow-lg hover:bg-foreground transition-colors"
          >
            Reset All
          </button>
        </div>
      )}
      
      {isDesktop ? (
        <div 
          ref={containerRef}
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
          
          {Object.keys(trophyConfig).map((tierKey) => {
            const tierNum = parseInt(tierKey);
            const meta = TROPHY_META[tierNum as keyof typeof TROPHY_META];
            const isActive = tierNum === tier;
            const label = language === 'ka' ? meta.labelKa : meta.label;
            const pos = positions[tierNum];
            
            if (!pos) return null;
            
            return (
              <motion.button
                key={tierKey}
                onClick={() => handleTrophyClick(tierNum)}
                className={`absolute ${DEV_MODE ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} group`}
                style={{
                  left: pos.x,
                  top: pos.y,
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
                
                {DEV_MODE && isDragging === tierNum && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-black/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-50">
                    Moving...
                  </div>
                )}
                
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
        <motion.div 
          className="absolute inset-0 w-full touch-pan-y"
          style={{ height: 'calc(100% + 100px)', top: '-100px', cursor: 'grab' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleMobileSwipe}
          whileDrag={{ cursor: 'grabbing' }}
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
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-background/95 border-r border-b border-border/50 rotate-45" />
          </motion.div>
        </AnimatePresence>
      )}
      
      <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-background via-background/80 to-transparent z-[5] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/70 to-transparent z-[5] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
});
