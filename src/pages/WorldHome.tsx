import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { InteractiveGlobe } from "@/components/world/InteractiveGlobe";
import { useWorldProgress } from "@/hooks/useWorldProgress";
import { Continent } from "@/data/worldData";
import { ChunkyButton } from "@/components/ui/chunky-button";

export default function WorldHome() {
  const navigate = useNavigate();
  const { 
    getUnlockedContinents, 
    getContinentProgress, 
    loading 
  } = useWorldProgress();

  const unlockedContinents = getUnlockedContinents();
  const continentProgress = getContinentProgress();

  const handleContinentClick = (continent: Continent) => {
    navigate(`/continent/${continent.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-purple px-6 pt-12 pb-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-primary-foreground mb-2"
        >
          🌍 Trivia World
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-primary-foreground/80"
        >
          Explore countries, learn facts, become a world expert!
        </motion.p>
      </div>

      {/* Globe */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-spin">🌍</div>
              <p className="text-muted-foreground">Loading your world...</p>
            </div>
          </div>
        ) : (
          <InteractiveGlobe
            onContinentClick={handleContinentClick}
            unlockedContinents={unlockedContinents}
            continentProgress={continentProgress}
          />
        )}
      </div>

      {/* Bottom hint */}
      <div className="px-6 py-4 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          Tap a continent to explore its countries
        </p>
        
        {/* Quick nav buttons */}
        <div className="flex gap-3 justify-center">
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={() => navigate("/leaderboards")}
          >
            🏆 Leaderboard
          </ChunkyButton>
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={() => navigate("/profile")}
          >
            👤 Profile
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
