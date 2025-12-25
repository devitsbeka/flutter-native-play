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

  // Hide background for phases that have their own full-screen background
  const hasOwnBackground = phase === "vs-screen" || phase === "playing" || phase === "question-result";

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-[#8B7FD4]">
      {/* Spline Background - only show for certain phases */}
      {!hasOwnBackground && <SplineGlobe />}
      
      {/* White Radial Mask - only show for certain phases */}
      {!hasOwnBackground && (
        <div 
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, transparent 0%, transparent 15%, hsl(0 0% 100% / 0.75) 40%, hsl(0 0% 100% / 0.9) 60%, hsl(0 0% 100% / 0.95) 100%)",
          }}
        />
      )}

      {/* Back Button - only show for phases without their own back button */}
      {!hasOwnBackground && (
        <button
          onClick={() => navigate("/")}
          className="fixed top-4 left-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      )}
      
      {/* Game Content - Full height */}
      <div className={`relative z-10 flex-1 flex flex-col h-full overflow-hidden ${hasOwnBackground ? '' : 'px-4 pt-14 pb-4'}`}>
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
