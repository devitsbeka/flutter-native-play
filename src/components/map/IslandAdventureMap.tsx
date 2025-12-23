import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IslandLevelNode, LevelState } from "./IslandLevelNode";
import { LockedLevelModal } from "./LockedLevelModal";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";

import islandBackground from "@/assets/map/island-background.svg";

// Pre-defined level positions matching the winding S-curve path on the island
// Positions are percentages (x: left-to-right, y: top-to-bottom)
const LEVEL_POSITIONS = [
  { id: 1, x: 15, y: 88 },   // Bottom left - START
  { id: 2, x: 35, y: 84 },
  { id: 3, x: 55, y: 78 },
  { id: 4, x: 75, y: 70 },
  { id: 5, x: 72, y: 58 },
  { id: 6, x: 50, y: 50 },
  { id: 7, x: 28, y: 44 },
  { id: 8, x: 25, y: 32 },
  { id: 9, x: 45, y: 26 },
  { id: 10, x: 65, y: 22 },
  { id: 11, x: 75, y: 14 },
  { id: 12, x: 55, y: 8 },
  { id: 13, x: 35, y: 4 },   // Near top
];

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.5;
const DEFAULT_ZOOM = 1;

export function IslandAdventureMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const { progress, loading } = useCategoryProgress();
  
  // Zoom state
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);

  // Calculate levels from progress data (memoized to prevent infinite loops)
  const levels = useMemo<LevelState[]>(() => {
    let totalCompleted = 0;
    Object.values(progress).forEach((catProgress) => {
      totalCompleted += catProgress.completedLevels.length;
    });
    
    const currentLevelNum = totalCompleted + 1;
    
    return LEVEL_POSITIONS.map((pos) => {
      const isCompleted = pos.id < currentLevelNum;
      const isCurrent = pos.id === currentLevelNum;
      const isLocked = pos.id > currentLevelNum;
      
      let stars: 0 | 1 | 2 | 3 = 0;
      if (isCompleted) {
        const categories = Object.keys(progress);
        if (categories.length > 0) {
          const categoryIndex = (pos.id - 1) % categories.length;
          const categoryLevelNumber = Math.floor((pos.id - 1) / categories.length) + 1;
          const categoryId = categories[categoryIndex];
          const catProgress = progress[categoryId];
          
          if (catProgress) {
            const levelData = catProgress.completedLevels.find(
              (l) => l.level_number === categoryLevelNumber
            );
            if (levelData) {
              stars = Math.min(3, Math.max(0, levelData.stars_earned)) as 0 | 1 | 2 | 3;
            }
          }
        }
        
        if (stars === 0 && isCompleted) {
          stars = 1;
        }
      }
      
      return {
        id: pos.id,
        isLocked,
        isCurrent,
        stars,
      };
    });
  }, [progress]);

  const currentLevelId = useMemo(() => {
    const current = levels.find((l) => l.isCurrent);
    return current?.id || 1;
  }, [levels]);

  // Snap back to center after scroll ends
  const snapBackTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const handleScroll = useCallback(() => {
    if (snapBackTimeout.current) {
      clearTimeout(snapBackTimeout.current);
    }
    
    snapBackTimeout.current = setTimeout(() => {
      if (containerRef.current) {
        const container = containerRef.current;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const currentScroll = container.scrollTop;
        const centerScroll = (scrollHeight - clientHeight) / 2;
        
        // If scrolled too far from center, snap back
        const scrollDiff = Math.abs(currentScroll - centerScroll);
        if (scrollDiff > clientHeight * 0.4) {
          container.scrollTo({
            top: centerScroll,
            behavior: "smooth",
          });
        }
      }
    }, 1500);
  }, []);

  // Pinch to zoom handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance - lastTouchDistance.current;
      const zoomDelta = delta * 0.005;
      
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + zoomDelta)));
      lastTouchDistance.current = distance;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(MAX_ZOOM, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(MIN_ZOOM, prev - 0.2));
  };

  // Center view on mount
  useEffect(() => {
    if (containerRef.current && !loading) {
      const container = containerRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const centerScroll = (scrollHeight - clientHeight) / 2;
      
      setTimeout(() => {
        container.scrollTo({
          top: centerScroll,
          behavior: "smooth",
        });
      }, 300);
    }
  }, [loading, zoom]);

  // State for locked level modal
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [selectedLockedLevel, setSelectedLockedLevel] = useState<number | null>(null);

  const handleLevelClick = (levelId: number) => {
    navigate(`/game?level=${levelId}`);
  };

  const handleLockedLevelClick = (levelId: number) => {
    setSelectedLockedLevel(levelId);
    setLockedModalOpen(true);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#7BC043]">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable map container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-auto scrollbar-hide"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Centering wrapper */}
        <div className="flex items-center justify-center" style={{ minHeight: "150vh", padding: "10vh 0" }}>
          {/* Map content wrapper - 70% size (30% smaller) */}
          <div 
            ref={mapRef}
            className="relative"
            style={{
              width: `${70 * zoom}%`,
              maxWidth: `${350 * zoom}px`,
              aspectRatio: "922 / 1894",
              transition: "width 0.2s ease-out, max-width 0.2s ease-out",
            }}
          >
            {/* Island background */}
            <motion.img
              src={islandBackground}
              alt="Island Map"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-3xl shadow-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              draggable={false}
            />

            {/* Level nodes */}
            {levels.map((level, index) => {
              const position = LEVEL_POSITIONS.find(p => p.id === level.id);
              if (!position) return null;
              
              return (
                <IslandLevelNode
                  key={level.id}
                  level={level}
                  position={{ x: position.x, y: position.y }}
                  onClick={handleLevelClick}
                  onLockedClick={handleLockedLevelClick}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Locked level modal */}
      <LockedLevelModal
        isOpen={lockedModalOpen}
        onClose={() => setLockedModalOpen(false)}
        levelId={selectedLockedLevel || 0}
        requiredLevel={currentLevelId}
      />
    </div>
  );
}
