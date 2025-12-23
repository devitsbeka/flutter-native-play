import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IslandLevelNode, LevelState } from "./IslandLevelNode";
import { LockedLevelModal } from "./LockedLevelModal";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useLevelPositions } from "@/hooks/useLevelPositions";
import SVGClouds from "./SVGClouds";
import BIRDS from "vanta/dist/vanta.birds.min";
import * as THREE from "three";

import islandBackground from "@/assets/map/island-background.svg";

// Zoom limits based on screenshots
const MIN_ZOOM = 1;    // Screenshot 3 - zoomed out
const MAX_ZOOM = 1.3;  // Screenshot 2 - zoomed in
const DEFAULT_ZOOM = 1.15;

export function IslandAdventureMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<ReturnType<typeof BIRDS> | null>(null);
  const { progress, loading: progressLoading } = useCategoryProgress();
  const { positions: levelPositions, loading: positionsLoading } = useLevelPositions();
  
  const loading = progressLoading || positionsLoading;
  
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
        color1: 0xffffff,
        color2: 0x000000,
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
    
    return levelPositions.map((pos) => {
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
  }, [progress, levelPositions]);

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
      const currentPos = levelPositions.find(p => p.id === currentLevelId);
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
  }, [loading, currentLevelId, levelPositions]);

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
    <div className="fixed inset-0 overflow-hidden bg-sky-400">
      {/* SVG Clouds overlay - between sky and map */}
      <SVGClouds className="z-[15]" />

      {/* Vanta Birds overlay - on top of everything */}
      <div 
        ref={vantaRef} 
        className="absolute inset-0 z-20 pointer-events-none"
      />

      {/* CSS Animated Clouds - bottom 20% */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none overflow-hidden" style={{ height: '20%' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/40 to-transparent" />
        {/* Animated cloud shapes */}
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-24"
          animate={{ x: ['-100%', '100vw'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 100 50" className="w-full h-full opacity-90">
            <ellipse cx="30" cy="35" rx="25" ry="15" fill="white" />
            <ellipse cx="55" cy="30" rx="30" ry="18" fill="white" />
            <ellipse cx="75" cy="35" rx="20" ry="12" fill="white" />
          </svg>
        </motion.div>
        <motion.div
          className="absolute bottom-4 left-0 w-36 h-20"
          animate={{ x: ['-50%', '100vw'] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear', delay: 5 }}
        >
          <svg viewBox="0 0 100 50" className="w-full h-full opacity-80">
            <ellipse cx="30" cy="35" rx="22" ry="14" fill="white" />
            <ellipse cx="50" cy="28" rx="28" ry="16" fill="white" />
            <ellipse cx="70" cy="35" rx="18" ry="11" fill="white" />
          </svg>
        </motion.div>
        <motion.div
          className="absolute bottom-2 right-0 w-40 h-22"
          animate={{ x: ['100vw', '-100%'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear', delay: 10 }}
        >
          <svg viewBox="0 0 100 50" className="w-full h-full opacity-85">
            <ellipse cx="25" cy="35" rx="20" ry="13" fill="white" />
            <ellipse cx="50" cy="30" rx="25" ry="15" fill="white" />
            <ellipse cx="75" cy="35" rx="22" ry="14" fill="white" />
          </svg>
        </motion.div>
      </div>

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
        className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide z-10"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Map wrapper with spacing */}
        <div className="relative w-full" style={{ paddingTop: '150px', paddingBottom: '300px' }}>
          {/* Island background - maintains aspect ratio */}
          <div className="relative">
            <img
              src={islandBackground}
              alt="Island Map"
              className="w-full h-auto block"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
              }}
              draggable={false}
            />
            
            {/* Level nodes positioned over the image */}
            <div className="absolute inset-0">
              {levels.map((level, index) => {
                const position = levelPositions.find(p => p.id === level.id);
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
              
              {/* Trophy at the end */}
              {levelPositions.length > 0 && (
                <motion.div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${levelPositions[levelPositions.length - 1].x + 8}%`,
                    top: `${levelPositions[levelPositions.length - 1].y - 2}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                >
                  <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-3 rounded-full shadow-lg shadow-amber-500/30">
                    <Trophy className="h-8 w-8 text-white drop-shadow-md" />
                  </div>
                </motion.div>
              )}
            </div>
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
