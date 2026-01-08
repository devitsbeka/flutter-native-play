import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import all modals
import { ComingSoonModal } from "@/components/game/ComingSoonModal";
import { PowerUpDetailModal } from "@/components/game/PowerUpDetailModal";
import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { GameLoseModal } from "@/components/game/GameLoseModal";
import { LuckySpinModal } from "@/components/game/LuckySpinModal";
import { VSMatchHelpModal } from "@/components/game/VSMatchHelpModal";
import { GameModal } from "@/components/ui/game-modal";
import { NotificationModal } from "@/components/ui/notification-modal";

// Modal configurations
const MODALS = [
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
  { id: "notification-success", name: "Notification: Success" },
  { id: "notification-error", name: "Notification: Error" },
  { id: "notification-info", name: "Notification: Info" },
  { id: "notification-warning", name: "Notification: Warning" },
] as const;

export default function ModalsShowcase() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
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
        <div className="flex items-center justify-between px-4 h-16 safe-top">
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
