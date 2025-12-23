import { useEffect, useRef, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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

export function IslandAdventureMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { progress, loading } = useCategoryProgress();

  // Calculate levels from progress data (memoized to prevent infinite loops)
  const levels = useMemo<LevelState[]>(() => {
    // Count total completed levels across all categories
    let totalCompleted = 0;
    Object.values(progress).forEach((catProgress) => {
      totalCompleted += catProgress.completedLevels.length;
    });
    
    const currentLevelNum = totalCompleted + 1;
    
    return LEVEL_POSITIONS.map((pos) => {
      const isCompleted = pos.id < currentLevelNum;
      const isCurrent = pos.id === currentLevelNum;
      const isLocked = pos.id > currentLevelNum;
      
      // Find the stars for this level by looking through progress
      // Each level maps to a category based on its ID
      let stars: 0 | 1 | 2 | 3 = 0;
      if (isCompleted) {
        // Map level ID to category and category-level-number
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
        
        // Default to at least 1 star if completed but no star data found
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

  // Find the current level for auto-scroll
  const currentLevelId = useMemo(() => {
    const current = levels.find((l) => l.isCurrent);
    return current?.id || 1;
  }, [levels]);

  // Auto-scroll to current level on mount
  useEffect(() => {
    if (containerRef.current && levels.length > 0 && !loading) {
      const currentPos = LEVEL_POSITIONS.find(p => p.id === currentLevelId);
      
      if (currentPos) {
        const container = containerRef.current;
        const scrollY = (currentPos.y / 100) * container.scrollHeight - container.clientHeight / 2;
        
        setTimeout(() => {
          container.scrollTo({
            top: Math.max(0, scrollY),
            behavior: "smooth",
          });
        }, 300);
      }
    }
  }, [levels, currentLevelId, loading]);

  // State for locked level modal
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [selectedLockedLevel, setSelectedLockedLevel] = useState<number | null>(null);

  const handleLevelClick = (levelId: number) => {
    // Navigate to game with the selected level
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
        className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Map content wrapper - maintains aspect ratio */}
        <div 
          className="relative w-full"
          style={{
            minHeight: "150vh",
            maxWidth: "500px",
            margin: "0 auto",
          }}
        >
          {/* Island background */}
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
