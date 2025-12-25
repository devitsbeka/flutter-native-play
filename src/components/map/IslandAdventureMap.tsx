// Island Adventure Map with animated birds
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import { IslandLevelNode, LevelState } from "./IslandLevelNode";
import { LockedLevelModal } from "./LockedLevelModal";
import { CompletedLevelModal } from "./CompletedLevelModal";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useLevelPositions } from "@/hooks/useLevelPositions";
import { useAuth } from "@/hooks/useAuth";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import SVGClouds from "./SVGClouds";

import islandBackground from "@/assets/map/island-background.svg";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";

// Zoom limits - matching admin page scale
const MIN_ZOOM = 1;
const MAX_ZOOM = 1.3;
const DEFAULT_ZOOM = 1;

// Simple animated bird component
const AnimatedBird = ({ delay, startX, startY, duration }: { delay: number; startX: number; startY: number; duration: number }) => (
  <motion.svg
    className="absolute w-6 h-6 opacity-70 pointer-events-none"
    viewBox="0 0 24 24"
    initial={{ x: `${startX}vw`, y: `${startY}vh` }}
    animate={{ 
      x: [`${startX}vw`, `${startX + 80}vw`],
      y: [`${startY}vh`, `${startY - 10}vh`, `${startY - 5}vh`, `${startY - 15}vh`]
    }}
    transition={{ 
      duration, 
      delay, 
      repeat: Infinity, 
      ease: "linear",
      times: [0, 0.3, 0.6, 1]
    }}
  >
    <motion.path
      d="M12 8 L6 12 L12 10 L18 12 Z"
      fill="currentColor"
      className="text-slate-800"
      animate={{ d: ["M12 8 L6 12 L12 10 L18 12 Z", "M12 10 L6 8 L12 10 L18 8 Z", "M12 8 L6 12 L12 10 L18 12 Z"] }}
      transition={{ duration: 0.3, repeat: Infinity }}
    />
  </motion.svg>
);

export function IslandAdventureMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { progress, loading: progressLoading, getLevelStats } = useCategoryProgress();
  const { positions: levelPositions, loading: positionsLoading } = useLevelPositions();
  const { profile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const loading = progressLoading || positionsLoading;
  
  // Zoom state
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const lastTouchDistance = useRef<number | null>(null);

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

  // State for completed level modal
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [selectedCompletedLevel, setSelectedCompletedLevel] = useState<number | null>(null);
  const [completedLevelStats, setCompletedLevelStats] = useState<{
    questionsAnswered: number;
    correctAnswers: number;
    pointsEarned: number;
    starsEarned: number;
    completedAt?: string;
  }>({
    questionsAnswered: 0,
    correctAnswers: 0,
    pointsEarned: 0,
    starsEarned: 0,
  });

  const handleLevelClick = (levelId: number) => {
    // Find the level to check if it's completed or current
    const level = levels.find(l => l.id === levelId);
    
    if (level && !level.isLocked && !level.isCurrent) {
      // Completed level - get actual stats using getLevelStats
      const categories = Object.keys(progress);
      let stats: {
        questionsAnswered: number;
        correctAnswers: number;
        pointsEarned: number;
        starsEarned: number;
        completedAt?: string;
      } = {
        questionsAnswered: 5,
        correctAnswers: 3,
        pointsEarned: levelId * 100,
        starsEarned: level.stars || 1,
      };

      if (categories.length > 0) {
        const categoryIndex = (levelId - 1) % categories.length;
        const categoryId = categories[categoryIndex];
        const categoryLevelNumber = Math.floor((levelId - 1) / categories.length) + 1;
        const levelData = getLevelStats(categoryId, categoryLevelNumber);
        
        if (levelData) {
          stats = {
            questionsAnswered: levelData.total_questions || 5,
            correctAnswers: levelData.score || 3,
            pointsEarned: levelData.score * 20,
            starsEarned: Math.min(3, Math.max(1, levelData.stars_earned || 1)),
            completedAt: levelData.completed_at,
          };
        }
      }

      setCompletedLevelStats(stats);
      setSelectedCompletedLevel(levelId);
      setCompletedModalOpen(true);
    } else {
      // Current level - navigate to game
      navigate(`/game?level=${levelId}`);
    }
  };

  const handleReplayLevel = () => {
    if (selectedCompletedLevel) {
      setCompletedModalOpen(false);
      navigate(`/game?level=${selectedCompletedLevel}`);
    }
  };

  const handleLockedLevelClick = (levelId: number) => {
    setSelectedLockedLevel(levelId);
    setLockedModalOpen(true);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <SideMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <div className="fixed inset-0 overflow-hidden bg-sky-400">
      {/* SVG Clouds overlay - between sky and map */}
      <SVGClouds className="z-[15]" />

      {/* Animated Birds overlay - on top of everything */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        <AnimatedBird delay={0} startX={-10} startY={15} duration={20} />
        <AnimatedBird delay={3} startX={-5} startY={25} duration={25} />
        <AnimatedBird delay={6} startX={-15} startY={10} duration={22} />
      </div>

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

      {/* Top Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-50 px-4 pt-4 safe-top">
        <div className="flex items-center justify-between gap-3">
          <button 
            onClick={handleBack}
            className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>

          {/* Combined currency chip */}
          <motion.div 
            className="flex items-center gap-3 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-1">
              <img src={iconCoin} alt="" className="w-6 h-6 object-contain" />
              <span className="text-sm font-bold text-gray-800">{profile?.total_points || 0}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1">
              <img src={iconGem} alt="" className="w-6 h-6 object-contain" />
              <span className="text-sm font-bold text-gray-800">0</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Scrollable map container - MATCHING ADMIN STRUCTURE EXACTLY */}
      <div className="absolute inset-0 pt-20 overflow-auto z-10">
        <div 
          ref={containerRef}
          className="relative w-full"
          style={{ minHeight: "100%" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Map image container for position calculation - SAME as admin */}
          <div className="relative">
            <img
              src={islandBackground}
              alt="Island Map"
              className="w-full h-auto block"
              draggable={false}
            />
            
            {/* Level nodes positioned over the image - SAME as admin */}
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
          {/* Bottom spacing for nav bar */}
          <div style={{ height: "120px" }} />
        </div>
      </div>

      {/* Locked level modal */}
      <LockedLevelModal
        isOpen={lockedModalOpen}
        onClose={() => setLockedModalOpen(false)}
        levelId={selectedLockedLevel || 0}
        requiredLevel={currentLevelId}
      />

      {/* Completed level modal */}
      <CompletedLevelModal
        isOpen={completedModalOpen}
        onClose={() => setCompletedModalOpen(false)}
        levelId={selectedCompletedLevel || 0}
        stats={completedLevelStats}
        onReplay={handleReplayLevel}
      />
      </div>
    </>
  );
}
