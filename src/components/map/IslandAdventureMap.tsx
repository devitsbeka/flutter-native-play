import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IslandLevelNode, LevelState } from "./IslandLevelNode";
import { LockedLevelModal } from "./LockedLevelModal";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import BIRDS from "vanta/dist/vanta.birds.min";
import * as THREE from "three";

import islandBackground from "@/assets/map/island-background.svg";

// Pre-defined level positions matching the winding S-curve path on the island
const LEVEL_POSITIONS = [
  { id: 1, x: 15, y: 88 },
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
  { id: 13, x: 35, y: 4 },
];

// Zoom limits based on screenshots
const MIN_ZOOM = 1;    // Screenshot 3 - zoomed out
const MAX_ZOOM = 1.3;  // Screenshot 2 - zoomed in
const DEFAULT_ZOOM = 1.15;

export function IslandAdventureMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<ReturnType<typeof BIRDS> | null>(null);
  const { progress, loading } = useCategoryProgress();
  
  // Zoom state
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const lastTouchDistance = useRef<number | null>(null);

  // Initialize Vanta Birds effect
  useEffect(() => {
    if (!vantaEffect.current && vantaRef.current) {
      vantaEffect.current = BIRDS({
        el: vantaRef.current,
        THREE: THREE,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color1: 0x6d67de,
        color2: 0x37e8bd,
        colorMode: "lerp",
        backgroundColor: 0x000000,
        backgroundAlpha: 0, // Transparent background
        separation: 84.00,
        alignment: 59.00,
        quantity: 3.00,
      });
    }
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  // Calculate levels from progress data
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
      const zoomDelta = delta * 0.003;
      
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + zoomDelta)));
      lastTouchDistance.current = distance;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
  }, []);

  // Scroll to current level on mount
  useEffect(() => {
    if (containerRef.current && !loading) {
      const currentPos = LEVEL_POSITIONS.find(p => p.id === currentLevelId);
      if (currentPos) {
        const container = containerRef.current;
        setTimeout(() => {
          const scrollY = (currentPos.y / 100) * container.scrollHeight - container.clientHeight / 2;
          container.scrollTo({
            top: Math.max(0, scrollY),
            behavior: "smooth",
          });
        }, 300);
      }
    }
  }, [loading, currentLevelId]);

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
    <div className="fixed inset-0 overflow-hidden">
      {/* Vanta Birds overlay - on top of map */}
      <div 
        ref={vantaRef} 
        className="absolute inset-0 z-20 pointer-events-none"
      />

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

      {/* Scrollable map container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-hide relative z-10"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Map content - full width, scrollable height */}
        <div 
          className="relative mx-auto"
          style={{
            // Height based on aspect ratio (922:1894) scaled by zoom, width at 70%
            width: "70%",
            height: `${(1894 / 922) * 70 * zoom}vw`,
          }}
        >
          {/* Island background - integral part, no shadow */}
          <motion.img
            src={islandBackground}
            alt="Island Map"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
