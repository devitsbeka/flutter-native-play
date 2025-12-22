import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SeasonSelector } from "./SeasonSelector";
import { MapPath } from "./MapPath";
import { LevelNode } from "./LevelNode";
import { DailyChallengeNode } from "./DailyChallengeNode";
import { TreasureChestNode } from "./TreasureChestNode";
import { SpringBackground } from "./seasons/SpringBackground";
import { SummerBackground } from "./seasons/SummerBackground";
import { AutumnBackground } from "./seasons/AutumnBackground";
import { WinterBackground } from "./seasons/WinterBackground";
import { useMapSounds } from "@/hooks/useMapSounds";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";

export type Season = "spring" | "summer" | "autumn" | "winter";

interface Level {
  id: number;
  season: Season;
  x: number;
  y: number;
  isBoss: boolean;
}

const LEVELS_PER_SEASON = 10;
const CHEST_INTERVAL = 5;

// Generate winding path positions for each level
const generateLevels = (): Level[] => {
  const levels: Level[] = [];
  const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
  
  seasons.forEach((season, seasonIndex) => {
    for (let i = 0; i < LEVELS_PER_SEASON; i++) {
      const levelNum = seasonIndex * LEVELS_PER_SEASON + i + 1;
      const xOffset = Math.sin((i / LEVELS_PER_SEASON) * Math.PI * 2) * 30;
      const baseX = 50 + xOffset;
      
      levels.push({
        id: levelNum,
        season,
        x: baseX,
        y: seasonIndex * 100 + (i / LEVELS_PER_SEASON) * 100,
        isBoss: i === LEVELS_PER_SEASON - 1,
      });
    }
  });
  
  return levels;
};

// Get chest positions (after every 5 levels)
const getChestPositions = (levels: Level[]) => {
  const chests: { position: number; x: number; y: number }[] = [];
  
  for (let i = CHEST_INTERVAL; i <= levels.length; i += CHEST_INTERVAL) {
    const level = levels[i - 1];
    if (level) {
      chests.push({
        position: i,
        x: level.x + (i % 10 === 0 ? -15 : 15), // Alternate sides
        y: level.y + 2,
      });
    }
  }
  
  return chests;
};

export function SeasonalAdventureMap() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentSeason, setCurrentSeason] = useState<Season>("spring");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dailyCompleted, setDailyCompleted] = useState(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem("dailyChallengeDate");
    return saved === today;
  });
  const [openedChests, setOpenedChests] = useState<number[]>(() => {
    const saved = localStorage.getItem("openedChests");
    return saved ? JSON.parse(saved) : [];
  });
  
  const { playTap, playTransition, playVictory, playChestOpen, playAmbientMusic, stopAmbientMusic } = useMapSounds(soundEnabled);
  const { progress, loading, getTotalProgress } = useCategoryProgress();
  
  const levels = generateLevels();
  const chestPositions = getChestPositions(levels);
  const totalCompleted = getTotalProgress();
  
  // Scroll to season when selected
  const scrollToSeason = (season: Season) => {
    const seasonIndex = ["spring", "summer", "autumn", "winter"].indexOf(season);
    if (scrollRef.current) {
      const targetY = seasonIndex * window.innerHeight;
      scrollRef.current.scrollTo({ top: targetY, behavior: "smooth" });
      playTransition();
    }
    setCurrentSeason(season);
  };

  // Detect current season based on scroll and play ambient music
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const scrollY = scrollRef.current.scrollTop;
        const seasonHeight = window.innerHeight;
        const seasonIndex = Math.floor(scrollY / seasonHeight);
        const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
        const newSeason = seasons[Math.min(seasonIndex, 3)];
        if (newSeason !== currentSeason) {
          setCurrentSeason(newSeason);
        }
      }
    };

    const ref = scrollRef.current;
    ref?.addEventListener("scroll", handleScroll);
    return () => ref?.removeEventListener("scroll", handleScroll);
  }, [currentSeason]);

  // Play ambient music when season changes
  useEffect(() => {
    if (soundEnabled) {
      playAmbientMusic(currentSeason);
    }
  }, [currentSeason, soundEnabled, playAmbientMusic]);

  // Cleanup ambient music on unmount
  useEffect(() => {
    return () => {
      stopAmbientMusic();
    };
  }, [stopAmbientMusic]);

  const handleDailyChallengeClick = () => {
    if (!dailyCompleted) {
      playTap();
      // Mark as completed and save date
      localStorage.setItem("dailyChallengeDate", new Date().toDateString());
      setDailyCompleted(true);
      // Navigate to daily challenge
      navigate("/category/general?daily=true");
    }
  };

  const handleChestOpen = (position: number) => {
    if (!openedChests.includes(position)) {
      playChestOpen();
      const newOpenedChests = [...openedChests, position];
      setOpenedChests(newOpenedChests);
      localStorage.setItem("openedChests", JSON.stringify(newOpenedChests));
    }
  };

  const handleLevelClick = (level: Level) => {
    const isUnlocked = level.id <= totalCompleted + 1;
    if (isUnlocked) {
      playTap();
      // Navigate to the game for this level
      navigate(`/category/general?level=${level.id}`);
    }
  };

  const getSeasonBackground = () => {
    switch (currentSeason) {
      case "spring": return <SpringBackground />;
      case "summer": return <SummerBackground />;
      case "autumn": return <AutumnBackground />;
      case "winter": return <WinterBackground />;
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Season Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSeason}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
        >
          {getSeasonBackground()}
        </motion.div>
      </AnimatePresence>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-50 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/")}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-xl flex items-center justify-center shadow-lg border border-border/20"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </motion.button>

          <SeasonSelector 
            currentSeason={currentSeason} 
            onSeasonSelect={scrollToSeason}
            completedLevels={totalCompleted}
          />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-xl flex items-center justify-center shadow-lg border border-border/20"
          >
            {soundEnabled ? (
              <Volume2 className="w-6 h-6 text-foreground" />
            ) : (
              <VolumeX className="w-6 h-6 text-muted-foreground" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Scrollable Map Area */}
      <div 
        ref={scrollRef}
        className="h-full overflow-y-auto overflow-x-hidden scroll-smooth"
        style={{ scrollSnapType: "y proximity" }}
      >
        <div className="relative" style={{ height: `${4 * 100}vh` }}>
          {/* Daily Challenge Node at the top */}
          <DailyChallengeNode
            isCompleted={dailyCompleted}
            bonusXP={500}
            onClick={handleDailyChallengeClick}
          />

          {/* Map Path SVG */}
          <MapPath levels={levels} completedLevels={totalCompleted} />

          {/* Level Nodes */}
          {levels.map((level) => (
            <LevelNode
              key={level.id}
              level={level}
              isCompleted={level.id <= totalCompleted}
              isCurrent={level.id === totalCompleted + 1}
              isUnlocked={level.id <= totalCompleted + 1}
              stars={level.id <= totalCompleted ? Math.min(3, Math.floor(Math.random() * 3) + 1) : 0}
              onClick={() => handleLevelClick(level)}
            />
          ))}

          {/* Treasure Chests */}
          {chestPositions.map((chest) => (
            <TreasureChestNode
              key={chest.position}
              levelPosition={chest.position}
              x={chest.x}
              y={chest.y}
              isUnlocked={totalCompleted >= chest.position}
              isOpened={openedChests.includes(chest.position)}
              onOpen={() => handleChestOpen(chest.position)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-40" />
    </div>
  );
}
