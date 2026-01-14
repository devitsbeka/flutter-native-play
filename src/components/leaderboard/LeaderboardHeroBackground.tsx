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
const STORAGE_KEY = 'leaderboard-trophy-positions-v3';
// ==========================================================================

// Background image natural dimensions
const BG_IMAGE_DIMENSIONS = { width: 2048, height: 1365 };

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

// Default trophy positions for each breakpoint (in pixels relative to background image)
const DEFAULT_TROPHY_CONFIGS: Record<Breakpoint, Record<number, { x: number; y: number; size: number }>> = {
  desktop: {
    1: { x: 1360, y: 610, size: 370 }, // Bronze
    2: { x: 370, y: 630, size: 370 },  // Silver
    3: { x: 820, y: 500, size: 450 },  // Gold
  },
  tablet: {
    1: { x: 1024, y: 400, size: 280 }, // Bronze
    2: { x: 300, y: 420, size: 280 },  // Silver
    3: { x: 620, y: 340, size: 340 },  // Gold
  },
  mobile: {
    1: { x: 1024, y: 350, size: 240 }, // Bronze - centered for single view
    2: { x: 1024, y: 350, size: 240 }, // Silver
    3: { x: 1024, y: 300, size: 300 }, // Gold
  },
};

// Load saved positions from localStorage or use defaults
const loadTrophyConfigs = (): Record<Breakpoint, Record<number, { x: number; y: number; size: number }>> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load trophy configs:', e);
  }
  return { ...DEFAULT_TROPHY_CONFIGS };
};

// Save positions to localStorage
const saveTrophyConfigs = (configs: Record<Breakpoint, Record<number, { x: number; y: number; size: number }>>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    console.log('Trophy configs saved:', configs);
  } catch (e) {
    console.error('Failed to save trophy configs:', e);
  }
};

// Hook to manage trophy configurations for all breakpoints
const useTrophyConfigs = () => {
  const [configs, setConfigs] = useState(() => loadTrophyConfigs());
  const [pendingConfigs, setPendingConfigs] = useState<Record<Breakpoint, Record<number, { x: number; y: number; size: number }>> | null>(null);

  const updatePosition = useCallback((breakpoint: Breakpoint, tierNum: number, x: number, y: number) => {
    setPendingConfigs(prev => {
      const base = prev || configs;
      return {
        ...base,
        [breakpoint]: {
          ...base[breakpoint],
          [tierNum]: { ...base[breakpoint][tierNum], x, y }
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
      [breakpoint]: { ...DEFAULT_TROPHY_CONFIGS[breakpoint] }
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

  return { getConfig, updatePosition, saveChanges, resetBreakpoint, hasUnsavedChanges };
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
  initialX: number;
  initialY: number;
  size: number;
  scaleInfo: { scale: number; offsetX: number; offsetY: number };
  onPositionChange: (tierNum: number, x: number, y: number) => void;
  onClick: () => void;
}

const DraggableTrophy = memo(function DraggableTrophy({
  tierNum,
  meta,
  isActive,
  label,
  initialX,
  initialY,
  size,
  scaleInfo,
  onPositionChange,
  onClick
}: DraggableTrophyProps) {
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);
  const [isDragging, setIsDragging] = useState(false);
  const lastInitialRef = useRef({ x: initialX, y: initialY });

  // Only update position when initialX/initialY actually changes (resize), not during drag
  useEffect(() => {
    if (!isDragging && (lastInitialRef.current.x !== initialX || lastInitialRef.current.y !== initialY)) {
      x.set(initialX);
      y.set(initialY);
      lastInitialRef.current = { x: initialX, y: initialY };
    }
  }, [initialX, initialY, x, y, isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    if (!DEV_MODE) return;
    
    // Get current screen position
    const screenX = x.get();
    const screenY = y.get();
    
    // Convert screen position back to image pixels
    const imageX = (screenX - scaleInfo.offsetX) / scaleInfo.scale;
    const imageY = (screenY - scaleInfo.offsetY) / scaleInfo.scale;
    
    onPositionChange(tierNum, Math.round(imageX), Math.round(imageY));
  }, [tierNum, x, y, scaleInfo, onPositionChange]);

  return (
    <motion.div
      className={`absolute cursor-grab z-40 ${isDragging ? 'z-50 cursor-grabbing' : ''}`}
      style={{ 
        x, 
        y,
        width: size,
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
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Tier {tierNum}
        </div>
      )}
    </motion.div>
  );
});

// Hook to calculate trophy screen positions based on container size
const useTrophyPositions = (
  containerRef: React.RefObject<HTMLDivElement>,
  trophyConfig: Record<number, { x: number; y: number; size: number }>,
  resetKey: number
) => {
  const [positions, setPositions] = useState<Record<number, { x: number; y: number; size: number }>>({});
  const [scaleInfo, setScaleInfo] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const updatePositions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      // Calculate scale to cover container
      const scaleX = containerWidth / BG_IMAGE_DIMENSIONS.width;
      const scaleY = containerHeight / BG_IMAGE_DIMENSIONS.height;
      const scale = Math.max(scaleX, scaleY);

      // Calculate offset for centering
      const scaledWidth = BG_IMAGE_DIMENSIONS.width * scale;
      const scaledHeight = BG_IMAGE_DIMENSIONS.height * scale;
      const offsetX = (containerWidth - scaledWidth) / 2;
      const offsetY = (containerHeight - scaledHeight) / 2;

      setScaleInfo({ scale, offsetX, offsetY });

      // Convert image pixel positions to screen positions
      const newPositions: Record<number, { x: number; y: number; size: number }> = {};
      for (const [tierStr, config] of Object.entries(trophyConfig)) {
        const tier = parseInt(tierStr);
        newPositions[tier] = {
          x: config.x * scale + offsetX,
          y: config.y * scale + offsetY,
          size: config.size * scale,
        };
      }
      setPositions(newPositions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [containerRef, trophyConfig, resetKey]);

  return { positions, scaleInfo };
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
  
  const { getConfig, updatePosition, saveChanges, resetBreakpoint, hasUnsavedChanges } = useTrophyConfigs();
  const currentConfig = getConfig(breakpoint);
  
  const { positions, scaleInfo } = useTrophyPositions(containerRef, currentConfig, resetKey);

  const handlePositionChange = useCallback((tierNum: number, x: number, y: number) => {
    updatePosition(breakpoint, tierNum, x, y);
  }, [breakpoint, updatePosition]);

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
            const pos = positions[tierNum];
            
            if (!pos) return null;
            
            return (
              <DraggableTrophy
                key={`${tierKey}-${resetKey}`}
                tierNum={tierNum}
                meta={meta}
                isActive={isActive}
                label={label}
                initialX={pos.x}
                initialY={pos.y}
                size={pos.size}
                scaleInfo={scaleInfo}
                onPositionChange={handlePositionChange}
                onClick={() => handleTrophyClick(tierNum)}
              />
            );
          })}
        </div>
      ) : (
        <motion.div 
          ref={containerRef}
          className="absolute inset-0 w-full touch-pan-y"
          style={{ height: 'calc(100% + 100px)', top: '-100px', cursor: DEV_MODE ? 'default' : 'grab' }}
          drag={DEV_MODE ? false : "x"}
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
          
          {/* Single trophy view for mobile/tablet */}
          {DEV_MODE ? (
            // DEV MODE: Show single draggable trophy
            (() => {
              const pos = positions[showTier];
              if (!pos) return null;
              const label = language === 'ka' ? showMeta.labelKa : showMeta.label;
              
              return (
                <DraggableTrophy
                  key={`mobile-${showTier}-${resetKey}`}
                  tierNum={showTier}
                  meta={showMeta}
                  isActive={true}
                  label={label}
                  initialX={pos.x}
                  initialY={pos.y}
                  size={pos.size}
                  scaleInfo={scaleInfo}
                  onPositionChange={handlePositionChange}
                  onClick={() => {}}
                />
              );
            })()
          ) : (
            // Normal mode: Animated transitions
            <AnimatePresence mode="popLayout">
              {currentMeta && (
                <motion.div
                  key={tier}
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%',
                    top: '40%',
                    width: positions[tier]?.size || 200,
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
                    damping: 25 
                  }}
                >
                  <motion.img
                    src={currentMeta.image}
                    alt={language === 'ka' ? currentMeta.labelKa : currentMeta.label}
                    className="w-full h-auto drop-shadow-2xl"
                    style={{
                      filter: 'drop-shadow(0 0 30px rgba(255,215,0,0.5))'
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
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
