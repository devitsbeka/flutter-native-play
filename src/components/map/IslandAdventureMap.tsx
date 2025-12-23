import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IslandLevelNode, LevelState } from "./IslandLevelNode";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";

import islandBackground from "@/assets/map/island-background.svg";

// Pre-defined level positions matching the winding path on the island
// Positions are percentages (x: left-to-right, y: top-to-bottom)
const LEVEL_POSITIONS = [
  { id: 1, x: 18, y: 82 },   // Bottom left - START
  { id: 2, x: 38, y: 78 },
  { id: 3, x: 58, y: 74 },
  { id: 4, x: 75, y: 68 },
  { id: 5, x: 68, y: 58 },
  { id: 6, x: 48, y: 52 },
  { id: 7, x: 28, y: 48 },
  { id: 8, x: 22, y: 38 },
  { id: 9, x: 42, y: 32 },
  { id: 10, x: 62, y: 28 },
  { id: 11, x: 72, y: 20 },
  { id: 12, x: 52, y: 14 },
  { id: 13, x: 32, y: 10 },  // Near top
];

export function IslandAdventureMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { getTotalProgress, getMapLevels } = useCategoryProgress();
  const [levels, setLevels] = useState<LevelState[]>([]);

  // Initialize level states based on progress
  useEffect(() => {
    const mapLevels = getMapLevels();
    const totalCompleted = getTotalProgress();
    const currentLevelNum = totalCompleted + 1;
    
    const levelStates: LevelState[] = LEVEL_POSITIONS.map((pos) => {
      const levelData = mapLevels.find(l => l.id === pos.id);
      const isCompleted = levelData?.isCompleted || false;
      const isCurrent = pos.id === currentLevelNum;
      const isLocked = pos.id > currentLevelNum;
      
      return {
        id: pos.id,
        isLocked,
        isCurrent,
        stars: (levelData?.stars || 0) as 0 | 1 | 2 | 3,
      };
    });
    
    setLevels(levelStates);
  }, [getTotalProgress, getMapLevels]);

  // Auto-scroll to current level on mount
  useEffect(() => {
    if (containerRef.current && levels.length > 0) {
      const totalCompleted = getTotalProgress();
      const currentLevelNum = totalCompleted + 1;
      const currentPos = LEVEL_POSITIONS.find(p => p.id === currentLevelNum);
      
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
  }, [levels, getTotalProgress]);

  const handleLevelClick = (levelId: number) => {
    // Navigate to game with the selected level
    navigate(`/game?level=${levelId}`);
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
                index={index}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
