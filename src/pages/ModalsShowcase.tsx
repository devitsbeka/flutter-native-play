import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

// Import all modals
import { ComingSoonModal } from "@/components/game/ComingSoonModal";
import { PowerUpDetailModal } from "@/components/game/PowerUpDetailModal";
import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { GameLoseModal } from "@/components/game/GameLoseModal";
import { LuckySpinModal } from "@/components/game/LuckySpinModal";
import { VSMatchHelpModal } from "@/components/game/VSMatchHelpModal";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { GameModal } from "@/components/ui/game-modal";
import { NotificationModal } from "@/components/ui/notification-modal";
import { LevelUpModal } from "@/components/home/LevelUpModal";
import { MissionsModal } from "@/components/home/MissionsModal";
import { DailyRewardsModal } from "@/components/home/DailyRewardsModal";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { AvatarModal } from "@/components/home/AvatarModal";
import { ChunkyButton } from "@/components/ui/chunky-button";

// Assets for preview screens
import wonVideo from "@/assets/animations/won.mp4";
import lostVideo from "@/assets/animations/lost.mp4";
import coinIcon from "@/assets/icons/icon-coin.png";

// Modal configurations
const MODALS = [
  // Full-screen views
  { id: "win-screen", name: "Win Screen (Full)" },
  { id: "lose-screen", name: "Lose Screen (Full)" },
  { id: "level-up", name: "Level Up Modal" },
  // Game modals
  { id: "coming-soon", name: "Coming Soon Modal" },
  { id: "power-up-fifty-fifty", name: "Power-Up: 50/50" },
  { id: "power-up-freeze", name: "Power-Up: Freeze" },
  { id: "power-up-replace", name: "Power-Up: Replace" },
  { id: "power-up-time-drain", name: "Power-Up: Time Drain" },
  { id: "power-up-tutorial", name: "Power-Up Tutorial" },
  { id: "game-lose", name: "Game Lose Modal" },
  { id: "lucky-spin", name: "Lucky Spin Modal" },
  { id: "vs-help", name: "VS Match Help Modal" },
  { id: "game-modal-base", name: "Game Modal (Base)" },
  // Home modals
  { id: "missions", name: "Missions Modal" },
  { id: "play-limit", name: "Play Limit / PRO Modal" },
  { id: "daily-rewards", name: "Daily Rewards Modal" },
  { id: "chest-reward", name: "Chest Reward Modal" },
  { id: "avatar-studio", name: "Avatar Studio Modal" },
  // Notifications
  { id: "notification-success", name: "Notification: Success" },
  { id: "notification-error", name: "Notification: Error" },
  { id: "notification-info", name: "Notification: Info" },
  { id: "notification-warning", name: "Notification: Warning" },
] as const;

// Floating confetti component for win screen
const FloatingConfetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const colors = ["#ffffff", "#f0f0f0", "#e8e8e8", "#d0d0d0"];
    
    const frame = () => {
      myConfetti({
        particleCount: 8,
        angle: 90,
        spread: 180,
        origin: { x: Math.random(), y: -0.1 },
        colors: colors,
        gravity: 0.3,
        drift: Math.random() * 0.4 - 0.2,
        scalar: 0.9,
        ticks: 400,
      });
    };

    const interval = setInterval(frame, 30);
    
    return () => {
      clearInterval(interval);
      myConfetti.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

// Preview Win Screen Component
const PreviewWinScreen = ({ onClose }: { onClose: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 safe-screen z-50 flex flex-col"
      style={{ background: "#858EE7" }}
    >
      <FloatingConfetti />
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <video 
            src={wonVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-40 h-40 object-contain"
          />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-white mt-4"
        >
          მოგება!
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-8 mt-8"
        >
          <div className="text-center">
            <p className="text-white/70 text-sm">You</p>
            <div className="flex items-center gap-1.5 mt-1">
              <img src={coinIcon} alt="" className="w-6 h-6" />
              <span className="text-3xl font-black text-yellow-400">2,450</span>
            </div>
            <span className="text-white/70 text-xs">(Lvl.12)</span>
            <div className="mt-2 px-3 py-1.5 rounded-full bg-emerald-500">
              <span className="font-bold text-white text-sm">+500</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">Opponent</p>
            <div className="flex items-center gap-1.5 mt-1">
              <img src={coinIcon} alt="" className="w-6 h-6" />
              <span className="text-3xl font-black text-yellow-400">1,820</span>
            </div>
            <span className="text-white/70 text-xs">(Lvl.8)</span>
            <div className="mt-2 px-3 py-1.5 rounded-full bg-red-500">
              <span className="font-bold text-white text-sm">-500</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="px-6 pb-8 relative z-10">
        <ChunkyButton onClick={onClose} variant="white" size="lg" className="w-full">
          Continue
        </ChunkyButton>
      </div>
    </motion.div>
  </AnimatePresence>
);

// Preview Lose Screen Component
const PreviewLoseScreen = ({ onClose }: { onClose: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 safe-screen z-50 flex flex-col"
      style={{ background: "#858EE7" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <video 
            src={lostVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-40 h-40 object-contain"
          />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-white mt-4"
        >
          წაგება
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-8 mt-8"
        >
          <div className="text-center">
            <p className="text-white/70 text-sm">You</p>
            <div className="flex items-center gap-1.5 mt-1">
              <img src={coinIcon} alt="" className="w-6 h-6" />
              <span className="text-3xl font-black text-yellow-400">2,450</span>
            </div>
            <span className="text-white/70 text-xs">(Lvl.12)</span>
            <div className="mt-2 px-3 py-1.5 rounded-full bg-red-500">
              <span className="font-bold text-white text-sm">-500</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">Opponent</p>
            <div className="flex items-center gap-1.5 mt-1">
              <img src={coinIcon} alt="" className="w-6 h-6" />
              <span className="text-3xl font-black text-yellow-400">3,120</span>
            </div>
            <span className="text-white/70 text-xs">(Lvl.15)</span>
            <div className="mt-2 px-3 py-1.5 rounded-full bg-emerald-500">
              <span className="font-bold text-white text-sm">+500</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="px-6 pb-8">
        <ChunkyButton onClick={onClose} variant="white" size="lg" className="w-full">
          Continue
        </ChunkyButton>
      </div>
    </motion.div>
  </AnimatePresence>
);

export default function ModalsShowcase() {
  const navigate = useNavigate();
  // Deep-link a specific modal for quick dev/testing: /modals?modal=<id>
  const [currentIndex, setCurrentIndex] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("modal");
    const i = MODALS.findIndex((m) => m.id === id);
    return i >= 0 ? i : 0;
  });
  const [isModalOpen, setIsModalOpen] = useState(true);
  
  const currentModal = MODALS[currentIndex];

  // Reset modal to open when navigating
  useEffect(() => {
    setIsModalOpen(true);
  }, [currentIndex]);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % MODALS.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + MODALS.length) % MODALS.length);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const renderModal = () => {
    const id = currentModal.id;
    
    switch (id) {
      // Full-screen views
      case "win-screen":
        return isModalOpen ? <PreviewWinScreen onClose={handleClose} /> : null;
      
      case "lose-screen":
        return isModalOpen ? <PreviewLoseScreen onClose={handleClose} /> : null;
      
      case "level-up":
        return (
          <LevelUpModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            newLevel={15}
            previousLevel={14}
          />
        );
      
      case "coming-soon":
        return (
          <ComingSoonModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            categoryName="Sample Category"
            levelNumber={5}
          />
        );
      
      case "power-up-fifty-fifty":
        return (
          <PowerUpDetailModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            type="fifty-fifty"
            onAddClick={handleClose}
          />
        );
      
      case "power-up-freeze":
        return (
          <PowerUpDetailModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            type="freeze"
            onAddClick={handleClose}
          />
        );
      
      case "power-up-replace":
        return (
          <PowerUpDetailModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            type="replace"
            onAddClick={handleClose}
          />
        );
      
      case "power-up-time-drain":
        return (
          <PowerUpDetailModal
            isOpen={isModalOpen} 
            onClose={handleClose} 
            type="time-drain"
            onAddClick={handleClose}
          />
        );
      
      case "power-up-tutorial":
        return (
          <PowerUpTutorialModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
          />
        );
      
      case "game-lose":
        return (
          <GameLoseModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            onPlayAgain={handleClose}
            userScore={1250}
            opponentScore={1480}
            opponentName="Player2"
            opponentAvatarUrl={null}
            coinsEarned={50}
          />
        );
      
      case "lucky-spin":
        return (
          <LuckySpinModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
          />
        );
      
      case "vs-help":
        return (
          <VSMatchHelpModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
          />
        );
      
      case "game-modal-base":
        return (
          <GameModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            title="Sample Game Modal"
            subtitle="This is a base game modal"
            primaryLabel="Primary Action"
            onPrimaryClick={handleClose}
            secondaryLabel="Secondary"
            onSecondaryClick={handleClose}
          >
            <div className="text-center text-white/80 py-8">
              <p>This is the content area of the modal.</p>
              <p className="mt-2">You can put anything here.</p>
            </div>
          </GameModal>
        );
      
      // Home modals
      case "play-limit":
        return (
          <PlayLimitModal
            isOpen={isModalOpen}
            onClose={handleClose}
          />
        );

      case "missions":
        return (
          <MissionsModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
          />
        );
      
      case "daily-rewards":
        return (
          <DailyRewardsModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            currentStreak={5}
          />
        );
      
      case "avatar-studio":
        return (
          <AvatarModal
            isOpen={isModalOpen}
            onClose={handleClose}
          />
        );
      case "chest-reward":
        return (
          <ChestRewardModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            onClaim={handleClose}
          />
        );
      
      // Notifications
      case "notification-success":
        return (
          <NotificationModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            type="success"
            title="Success!"
            description="Your action was completed successfully."
          />
        );
      
      case "notification-error":
        return (
          <NotificationModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            type="error"
            title="Error"
            description="Something went wrong. Please try again."
          />
        );
      
      case "notification-info":
        return (
          <NotificationModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            type="info"
            title="Information"
            description="Here's some helpful information for you."
          />
        );
      
      case "notification-warning":
        return (
          <NotificationModal 
            isOpen={isModalOpen} 
            onClose={handleClose}
            type="warning"
            title="Warning"
            description="Please be careful with this action."
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-800/80">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Left: Back button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          {/* Center: Title + Counter */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-lg font-bold text-white">Modals Showcase</h1>
            <span className="text-xs text-white/60">
              {currentIndex + 1} / {MODALS.length}
            </span>
          </motion.div>

          {/* Right: Navigation arrows */}
          <div className="flex items-center gap-2">
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={goPrev}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              onClick={goNext}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Modal Name Banner */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
        <p className="text-center text-white font-semibold">{currentModal.name}</p>
      </div>

      {/* Modal Preview Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {renderModal()}
        
        {/* Show Modal Button when closed */}
        {!isModalOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
          >
            <Eye className="w-5 h-5" />
            Show Modal
          </motion.button>
        )}
      </div>
    </div>
  );
}
