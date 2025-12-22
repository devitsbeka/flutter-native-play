import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GameProvider, useGame } from "@/contexts/GameContext";
import { GameContainer } from "@/components/game/GameContainer";
import { SplineGlobe } from "@/components/home/SplineGlobe";
import { ArrowLeft } from "lucide-react";

function GameContent() {
  const { startMatchmaking, phase } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-start matchmaking when page loads
    if (phase === "home") {
      startMatchmaking();
    }
  }, [phase, startMatchmaking]);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Spline Background */}
      <SplineGlobe />
      
      {/* White Radial Mask */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, transparent 0%, transparent 15%, hsl(0 0% 100% / 0.75) 40%, hsl(0 0% 100% / 0.9) 60%, hsl(0 0% 100% / 0.95) 100%)",
        }}
      />

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-4 left-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      
      {/* Game Content - Full height minus safe areas */}
      <div className="relative z-10 flex-1 flex flex-col px-4 pt-14 pb-4 h-full overflow-hidden">
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
