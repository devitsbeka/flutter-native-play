import { ReactNode, useState, useRef, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
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
const STORAGE_KEY = 'leaderboard-trophy-positions-v4';
// ==========================================================================

// Background image natural dimensions (for reference)
const BG_IMAGE_DIMENSIONS = { width: 2048, height: 1365 };

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

// Positions stored as percentages (0-100) relative to background image
// This ensures consistent positioning across all screen sizes
interface TrophyPosition {
  xPercent: number; // 0-100 percentage across image width
  yPercent: number; // 0-100 percentage across image height  
  sizePercent: number; // size as percentage of image width
}

// Default trophy positions for each breakpoint (in percentages)
const DEFAULT_TROPHY_CONFIGS: Record<Breakpoint, Record<number, TrophyPosition>> = {
  desktop: {
    1: { xPercent: 66.4, yPercent: 44.7, sizePercent: 18 }, // Bronze (right)
    2: { xPercent: 18.1, yPercent: 46.2, sizePercent: 18 }, // Silver (left)
    3: { xPercent: 40.0, yPercent: 36.6, sizePercent: 22 }, // Gold (center)
  },
  tablet: {
    1: { xPercent: 66.4, yPercent: 44.7, sizePercent: 18 }, // Bronze
    2: { xPercent: 18.1, yPercent: 46.2, sizePercent: 18 }, // Silver
    3: { xPercent: 40.0, yPercent: 36.6, sizePercent: 22 }, // Gold
  },
  mobile: {
    1: { xPercent: 50, yPercent: 40, sizePercent: 24 }, // Bronze - centered for single view
    2: { xPercent: 50, yPercent: 40, sizePercent: 24 }, // Silver
    3: { xPercent: 50, yPercent: 35, sizePercent: 28 }, // Gold
  },
};

// Load saved positions from localStorage or use defaults
const loadTrophyConfigs = (): Record<Breakpoint, Record<number, TrophyPosition>> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load trophy configs:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_TROPHY_CONFIGS));
};

// Save positions to localStorage
const saveTrophyConfigs = (configs: Record<Breakpoint, Record<number, TrophyPosition>>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    console.log('Trophy configs saved:', configs);
  } catch (e) {
    console.error('Failed to save trophy configs:', e);
  }
};

// Hook to manage trophy configurations for all breakpoints
const useTrophyConfigs = () => {
  const [configs, setConfigs] = useState<Record<Breakpoint, Record<number, TrophyPosition>>>(() => loadTrophyConfigs());
  const [pendingConfigs, setPendingConfigs] = useState<Record<Breakpoint, Record<number, TrophyPosition>> | null>(null);

  const updatePosition = useCallback((breakpoint: Breakpoint, tierNum: number, xPercent: number, yPercent: number) => {
    setPendingConfigs(prev => {
      const base = prev || configs;
      return {
        ...base,
        [breakpoint]: {
          ...base[breakpoint],
          [tierNum]: { ...base[breakpoint][tierNum], xPercent, yPercent }
        }
      };
    });
  }, [configs]);

  const updateSize = useCallback((breakpoint: Breakpoint, tierNum: number, sizePercent: number) => {
    setPendingConfigs(prev => {
      const base = prev || configs;
      return {
        ...base,
        [breakpoint]: {
          ...base[breakpoint],
          [tierNum]: { ...base[breakpoint][tierNum], sizePercent }
        }
      };
    });
  }, [configs]);

  const saveChanges = useCallback((breakpoint: Breakpoint) => {
    if (pendingConfigs) {
      const newConfigs = {
        ...configs,
        [breakpoint]: pendingConfigs[breakpoint]
      };
      setConfigs(newConfigs);
      saveTrophyConfigs(newConfigs);
      setPendingConfigs(null);
    }
  }, [configs, pendingConfigs]);

  const resetBreakpoint = useCallback((breakpoint: Breakpoint) => {
    const newConfigs = {
      ...configs,
      [breakpoint]: JSON.parse(JSON.stringify(DEFAULT_TROPHY_CONFIGS[breakpoint]))
    };
    setConfigs(newConfigs);
    saveTrophyConfigs(newConfigs);
    setPendingConfigs(null);
  }, [configs]);

  const hasUnsavedChanges = useCallback((breakpoint: Breakpoint) => {
    if (!pendingConfigs) return false;
    return JSON.stringify(pendingConfigs[breakpoint]) !== JSON.stringify(configs[breakpoint]);
  }, [configs, pendingConfigs]);

  const getConfig = useCallback((breakpoint: Breakpoint) => {
    return pendingConfigs?.[breakpoint] || configs[breakpoint];
  }, [configs, pendingConfigs]);

  return { getConfig, updatePosition, updateSize, saveChanges, resetBreakpoint, hasUnsavedChanges };
};

// Hook to detect current breakpoint
const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
};

// Hook to check if desktop
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

const TROPHY_META = {
  1: { image: trophyBronze, label: "Bronze League", labelKa: "ბრინჯაოს ლიგა" },
  2: { image: trophySilver, label: "Silver League", labelKa: "ვერცხლის ლიგა" },
  3: { image: trophyGold, label: "Gold League", labelKa: "ოქროს ლიგა" },
} as const;

interface DraggableTrophyProps {
  tierNum: number;
  meta: { image: string; label: string; labelKa: string };
  isActive: boolean;
  label: string;
  xPercent: number;
  yPercent: number;
  sizePercent: number;
  containerWidth: number;
  containerHeight: number;
  onPositionChange: (tierNum: number, xPercent: number, yPercent: number) => void;
  onSizeChange?: (tierNum: number, sizePercent: number) => void;
  onClick: () => void;
}

const DraggableTrophy = memo(function DraggableTrophy({
  tierNum,
  meta,
  isActive,
  label,
  xPercent,
  yPercent,
  sizePercent,
  containerWidth,
  containerHeight,
  onPositionChange,
  onSizeChange,
  onClick
}: DraggableTrophyProps) {
  // Calculate pixel positions from percentages
  const pixelX = (xPercent / 100) * containerWidth;
  const pixelY = (yPercent / 100) * containerHeight;
  const pixelSize = (sizePercent / 100) * containerWidth;
  
  const x = useMotionValue(pixelX);
  const y = useMotionValue(pixelY);
  const [isDragging, setIsDragging] = useState(false);
  const lastPercentRef = useRef({ xPercent, yPercent });

  // Update position when percentages change (but not during drag)
  useEffect(() => {
    if (!isDragging && (lastPercentRef.current.xPercent !== xPercent || lastPercentRef.current.yPercent !== yPercent)) {
      x.set(pixelX);
      y.set(pixelY);
      lastPercentRef.current = { xPercent, yPercent };
    }
  }, [xPercent, yPercent, pixelX, pixelY, x, y, isDragging]);

  // Also update on container resize
  useEffect(() => {
    if (!isDragging) {
      x.set(pixelX);
      y.set(pixelY);
    }
  }, [containerWidth, containerHeight, pixelX, pixelY, x, y, isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    if (!DEV_MODE) return;
    
    // Convert pixel position back to percentage
    const newXPercent = (x.get() / containerWidth) * 100;
    const newYPercent = (y.get() / containerHeight) * 100;
    
    // Round to 1 decimal for cleaner storage
    onPositionChange(tierNum, Math.round(newXPercent * 10) / 10, Math.round(newYPercent * 10) / 10);
  }, [tierNum, x, y, containerWidth, containerHeight, onPositionChange]);

  const handleSizeAdjust = useCallback((delta: number) => {
    if (onSizeChange) {
      // Adjust size by percentage points
      const newSizePercent = Math.max(5, Math.min(40, sizePercent + delta));
      onSizeChange(tierNum, Math.round(newSizePercent * 10) / 10);
    }
  }, [tierNum, sizePercent, onSizeChange]);

  return (
    <motion.div
      className={`absolute cursor-grab z-40 ${isDragging ? 'z-50 cursor-grabbing' : ''}`}
      style={{ 
        x, 
        y,
        width: pixelSize,
        transformOrigin: 'center bottom',
      }}
      drag={DEV_MODE}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      whileHover={!DEV_MODE ? { scale: 1.05 } : undefined}
      animate={isActive && !DEV_MODE ? { scale: 1.1 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.img
        src={meta.image}
        alt={label}
        className={`w-full h-auto drop-shadow-2xl ${DEV_MODE ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${isDragging ? 'opacity-80' : ''}`}
        style={{
          filter: isActive 
            ? 'drop-shadow(0 0 20px rgba(255,215,0,0.6))' 
            : 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))'
        }}
      />
      {DEV_MODE && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleSizeAdjust(-2); }}
            className="bg-blue-600 text-white text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-blue-700"
          >
            -
          </button>
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            T{tierNum}: {sizePercent.toFixed(0)}%
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleSizeAdjust(2); }}
            className="bg-blue-600 text-white text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-blue-700"
          >
            +
          </button>
        </div>
      )}
    </motion.div>
  );
});

// Hook to get container dimensions
const useContainerDimensions = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;
      setDimensions({
        width: container.offsetWidth,
        height: container.offsetHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  return dimensions;
};

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  tier, 
  children, 
  onTierSelect, 
  userTier = 1 
}: LeaderboardHeroBackgroundProps) {
  const isDesktop = useIsDesktop();
  const breakpoint = useBreakpoint();
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [resetKey, setResetKey] = useState(0);
  const [editingTier, setEditingTier] = useState(tier);
  
  const { getConfig, updatePosition, updateSize, saveChanges, resetBreakpoint, hasUnsavedChanges } = useTrophyConfigs();
  const currentConfig = getConfig(breakpoint);
  const containerDimensions = useContainerDimensions(containerRef);

  const handlePositionChange = useCallback((tierNum: number, xPercent: number, yPercent: number) => {
    updatePosition(breakpoint, tierNum, xPercent, yPercent);
  }, [breakpoint, updatePosition]);

  const handleSizeChange = useCallback((tierNum: number, sizePercent: number) => {
    updateSize(breakpoint, tierNum, sizePercent);
  }, [breakpoint, updateSize]);

  const handleSave = useCallback(() => {
    saveChanges(breakpoint);
  }, [breakpoint, saveChanges]);

  const handleReset = useCallback(() => {
    resetBreakpoint(breakpoint);
    setResetKey(prev => prev + 1);
  }, [breakpoint, resetBreakpoint]);

  const handleTrophyClick = useCallback((clickedTier: number) => {
    if (DEV_MODE) {
      setEditingTier(clickedTier);
    }
    onTierSelect?.(clickedTier);
  }, [onTierSelect]);

  // Navigation for mobile/tablet in DEV_MODE
  const navigateTier = useCallback((direction: 'prev' | 'next') => {
    setEditingTier(prev => {
      if (direction === 'prev') return prev > 1 ? prev - 1 : 3;
      return prev < 3 ? prev + 1 : 1;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!DEV_MODE) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigateTier('prev');
      if (e.key === 'ArrowRight') navigateTier('next');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTier]);

  // Swipe handling for non-DEV mode
  const handleMobileSwipe = useCallback((e: any, info: { offset: { x: number } }) => {
    if (DEV_MODE) return;
    
    const threshold = 50;
    if (info.offset.x > threshold && tier > 1) {
      onTierSelect?.(tier - 1);
    } else if (info.offset.x < -threshold && tier < 3) {
      onTierSelect?.(tier + 1);
    }
  }, [tier, onTierSelect]);

  const currentMeta = TROPHY_META[tier as keyof typeof TROPHY_META];
  const showTier = DEV_MODE ? editingTier : tier;
  const showMeta = TROPHY_META[showTier as keyof typeof TROPHY_META];

  return (
    <div className="relative w-full h-[40vh] min-h-[300px] md:min-h-[400px] overflow-hidden">
      {/* DEV MODE UI */}
      {DEV_MODE && (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
          <div className="bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            {breakpoint.toUpperCase()} Mode - Tier {showTier}
          </div>
          <div className="flex gap-2">
            {hasUnsavedChanges(breakpoint) && (
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                Save {breakpoint}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="bg-white/90"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Navigation arrows for mobile/tablet in DEV_MODE */}
      {DEV_MODE && !isDesktop && (
        <>
          <button
            onClick={() => navigateTier('prev')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-50 bg-black/60 text-white p-2 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => navigateTier('next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-50 bg-black/60 text-white p-2 rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Background and Trophies */}
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
              backgroundPosition: 'center 45%',
              backgroundRepeat: 'no-repeat',
            }}
          />
          
          {Object.keys(currentConfig).map((tierKey) => {
            const tierNum = parseInt(tierKey);
            const meta = TROPHY_META[tierNum as keyof typeof TROPHY_META];
            const isActive = tierNum === tier;
            const label = language === 'ka' ? meta.labelKa : meta.label;
            const config = currentConfig[tierNum];
            
            if (!config || containerDimensions.width === 0) return null;
            
            return (
              <DraggableTrophy
                key={`${tierKey}-${resetKey}`}
                tierNum={tierNum}
                meta={meta}
                isActive={isActive}
                label={label}
                xPercent={config.xPercent}
                yPercent={config.yPercent}
                sizePercent={config.sizePercent}
                containerWidth={containerDimensions.width}
                containerHeight={containerDimensions.height}
                onPositionChange={handlePositionChange}
                onSizeChange={handleSizeChange}
                onClick={() => handleTrophyClick(tierNum)}
              />
            );
          })}
        </div>
      ) : (
        // Mobile/Tablet: Panning viewport effect
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            ref={containerRef}
            className="absolute w-[200%] h-full touch-pan-y"
            style={{ 
              height: 'calc(100% + 100px)', 
              top: '-100px',
            }}
            animate={{
              // Pan viewport: Silver (tier 2) = show left, Gold (tier 3) = center, Bronze (tier 1) = show right
              x: tier === 2 ? '0%' : tier === 3 ? '-25%' : '-50%',
            }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 25 
            }}
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
            
            {/* All 3 trophies for mobile/tablet */}
            {DEV_MODE ? (
              // DEV MODE: Show all 3 draggable trophies for editing
              <>
                {Object.keys(currentConfig).map((tierKey) => {
                  const tierNum = parseInt(tierKey);
                  const meta = TROPHY_META[tierNum as keyof typeof TROPHY_META];
                  const isActive = tierNum === tier;
                  const label = language === 'ka' ? meta.labelKa : meta.label;
                  const config = currentConfig[tierNum];
                  
                  if (!config || containerDimensions.width === 0) return null;
                  
                  return (
                    <DraggableTrophy
                      key={`mobile-${tierKey}-${resetKey}`}
                      tierNum={tierNum}
                      meta={meta}
                      isActive={isActive}
                      label={label}
                      xPercent={config.xPercent}
                      yPercent={config.yPercent}
                      sizePercent={config.sizePercent}
                      containerWidth={containerDimensions.width}
                      containerHeight={containerDimensions.height}
                      onPositionChange={handlePositionChange}
                      onSizeChange={handleSizeChange}
                      onClick={() => handleTrophyClick(tierNum)}
                    />
                  );
                })}
              </>
            ) : (
              // Normal mode: Show all 3 trophies positioned on the wide canvas
              <>
                {([2, 3, 1] as const).map((tierNum) => {
                  const meta = TROPHY_META[tierNum];
                  const isActive = tierNum === tier;
                  const label = language === 'ka' ? meta.labelKa : meta.label;
                  
                  // Position trophies on the 200% wide canvas
                  // Silver at 12.5% (left third), Gold at 50% (center), Bronze at 87.5% (right third)
                  const baseSize = isActive ? 160 : 110;
                  const xPositions = { 2: '12.5%', 3: '50%', 1: '87.5%' };
                  
                  return (
                    <motion.div
                      key={tierNum}
                      className="absolute cursor-pointer"
                      style={{
                        left: xPositions[tierNum],
                        top: '38%',
                        width: baseSize,
                        transformOrigin: 'center bottom',
                        transform: 'translateX(-50%)',
                        zIndex: isActive ? 10 : 5,
                      }}
                      onClick={() => onTierSelect?.(tierNum)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{
                        scale: isActive ? 1.15 : 0.9,
                        opacity: isActive ? 1 : 0.7,
                        y: isActive ? -10 : 0,
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 25 
                      }}
                    >
                      <motion.img
                        src={meta.image}
                        alt={label}
                        className="w-full h-auto drop-shadow-2xl"
                        style={{
                          filter: isActive 
                            ? 'drop-shadow(0 0 30px rgba(255,215,0,0.5))' 
                            : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                        }}
                      />
                    </motion.div>
                  );
                })}
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Top gradient overlay */}
      <div 
        className="absolute inset-x-0 top-0 h-24 pointer-events-none z-20"
        style={{
          background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)'
        }}
      />
      
      {/* Bottom gradient overlay */}
      <div 
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-20"
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)'
        }}
      />

      {/* Content */}
      <div className={`relative h-full flex flex-col items-center justify-end pb-8 ${DEV_MODE ? 'pointer-events-none z-10' : 'z-30'}`}>
        {children}
      </div>
    </div>
  );
});
