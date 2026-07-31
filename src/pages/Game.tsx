import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GameProvider, useGame } from "@/contexts/GameContext";
import { GameContainer } from "@/components/game/GameContainer";
import { ArrowLeft } from "lucide-react";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { GuestMaxPlaysModal } from "@/components/home/GuestMaxPlaysModal";
import { useAuth } from "@/hooks/useAuth";
import { hasReachedGuestPlayLimit, recordGuestPlay, getGuestPlays } from "@/hooks/useGuestPlays";

function GameContent() {
  const { startMatchmaking, phase } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category");
  const { user, loading: authLoading } = useAuth();
  const { canPlay, isVip, freeGamesExhausted, regenPlayAvailable, timeUntilNextPlay, useRegenPlay, consumePlay, loading: playLimitLoading } = usePlayLimit();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalBlocking, setGuestModalBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Wait for auth to finish loading before making any decisions
  const authReady = !authLoading;
  // For logged-in users, also wait for play limit data
  const dataReady = authReady && (!user || !playLimitLoading);

  useEffect(() => {
    // Don't do anything until we have real data
    if (!dataReady) return;
    // Don't re-run after game already started
    if (gameStarted || blocked) return;
    // Only act during home phase
    if (phase !== "home") return;

    // === GUEST CHECK ===
    if (!user) {
      if (hasReachedGuestPlayLimit()) {
        setBlocked(true);
        setGuestModalBlocking(true);
        setShowGuestModal(true);
        return;
      }

      const guestData = getGuestPlays();

      // If guest has played before, show interstitial modal (dismissable)
      if (guestData.playsUsed >= 2) {
        setShowGuestModal(true);
        setGuestModalBlocking(false);
        return; // Wait for user to dismiss or register
      }

      // First game - play freely
      const recorded = recordGuestPlay();
      if (!recorded) {
        setBlocked(true);
        setGuestModalBlocking(true);
        setShowGuestModal(true);
        return;
      }
      setGameStarted(true);
      startMatchmaking(categoryId || undefined);
      return;
    }

    // === LOGGED-IN USER CHECK ===
    if (!canPlay) {
      setBlocked(true);
      setShowLimitModal(true);
      return;
    }

    // Spend the play. Fire-and-forget: consumePlay advances its own local
    // count first, so a double-start cannot spend one play twice, and it
    // never refuses on a network failure - the player was already told yes.
    void consumePlay();

    setGameStarted(true);
    startMatchmaking(categoryId || undefined);
  }, [phase, dataReady, gameStarted, blocked, user, canPlay, consumePlay, startMatchmaking, categoryId]);

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

      {/* Play limit modal - logged-in users */}
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
            setGameStarted(true);
            startMatchmaking(categoryId || undefined);
          }
        }}
      />

      {/* Guest play limit modal */}
      <GuestMaxPlaysModal
        isOpen={showGuestModal}
        isBlocking={guestModalBlocking}
        onClose={() => {
          setShowGuestModal(false);
          navigate("/");
        }}
        onRegister={() => {
          setShowGuestModal(false);
          navigate("/auth?mode=signup");
        }}
        onContinuePlaying={() => {
          setShowGuestModal(false);
          const recorded = recordGuestPlay();
          if (!recorded) {
            setBlocked(true);
            setGuestModalBlocking(true);
            setShowGuestModal(true);
            return;
          }
          setGameStarted(true);
          startMatchmaking(categoryId || undefined);
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
