import { useEffect } from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import { GameContainer } from "@/components/game/GameContainer";
import { SplineGlobe } from "@/components/home/SplineGlobe";

function GameContent() {
  const { startMatchmaking, phase } = useGame();

  useEffect(() => {
    // Auto-start matchmaking when page loads
    if (phase === "home") {
      startMatchmaking();
    }
  }, [phase, startMatchmaking]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Spline Background */}
      <SplineGlobe />
      
      {/* White Radial Mask */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, transparent 0%, transparent 15%, hsl(0 0% 100% / 0.75) 40%, hsl(0 0% 100% / 0.9) 60%, hsl(0 0% 100% / 0.95) 100%)",
        }}
      />
      
      {/* Game Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        <GameContainer />
      </div>
    </div>
  );
}

export default function Game() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
