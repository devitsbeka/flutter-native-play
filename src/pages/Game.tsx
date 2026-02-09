import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GameProvider, useGame } from "@/contexts/GameContext";
import { GameContainer } from "@/components/game/GameContainer";
import { ArrowLeft } from "lucide-react";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { useAuth } from "@/hooks/useAuth";

function GameContent() {
  const { startMatchmaking, phase } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category");
  const { user } = useAuth();
  const { canPlay, isVip, regenPlayAvailable, timeUntilNextPlay, useRegenPlay } = usePlayLimit();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    // Guard: if logged-in non-VIP user can't play, show modal and block game start
    if (user && !canPlay && !isVip && phase === "home") {
      setBlocked(true);
      setShowLimitModal(true);
      return;
    }
    // Auto-start matchmaking when page loads
    if (phase === "home" && !blocked) {
      startMatchmaking(categoryId || undefined);
    }
  }, [phase, startMatchmaking, categoryId, user, canPlay, isVip, blocked]);

  // Phases that have their own full-screen background
  const hasOwnBackground = phase === "home" || phase === "matchmaking" || phase === "preparing" || phase === "vs-screen" || phase === "playing" || phase === "question-result" || phase === "match-result";

  return (
    <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden bg-[#7E7ADB]">
      {/* White Radial Mask - only show for match-result phase */}
      {!hasOwnBackground && (
        <div 
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, transparent 0%, transparent 15%, hsl(0 0% 100% / 0.75) 40%, hsl(0 0% 100% / 0.9) 60%, hsl(0 0% 100% / 0.95) 100%)",
          }}
        />
      )}

      {/* Back Button - only show for phases without their own navigation */}
      {!hasOwnBackground && (
        <button
          onClick={() => navigate("/")}
          className="fixed top-4 left-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      )}
      
      {/* Game Content - Full width/height */}
      <div className={`relative flex-1 w-full h-full overflow-hidden ${hasOwnBackground ? '' : 'px-4 pt-14 pb-4'}`}>
        <GameContainer />
      </div>

      {/* Play limit modal - shown when user navigates directly to /game without plays */}
      <PlayLimitModal
        isOpen={showLimitModal}
        onClose={() => {
          setShowLimitModal(false);
          navigate("/");
        }}
        isGuest={false}
        regenPlayAvailable={regenPlayAvailable}
        timeUntilNextPlay={timeUntilNextPlay}
        onPlayWithRegen={async () => {
          const success = await useRegenPlay();
          if (success) {
            setShowLimitModal(false);
            setBlocked(false);
            startMatchmaking(categoryId || undefined);
          }
        }}
      />
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
