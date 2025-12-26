import { Lock, Star } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";

interface LockedLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  requiredLevel: number;
}

export function LockedLevelModal({ isOpen, onClose, levelId, requiredLevel }: LockedLevelModalProps) {
  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      icon={<Lock className="w-10 h-10" />}
      title={`Level ${levelId}`}
      subtitle="Locked"
      showSparkles
    >
      {/* Requirements box */}
      <div 
        className="rounded-2xl p-4 mb-4 text-center"
        style={{
          background: "linear-gradient(180deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.05) 100%)",
          border: "2px solid rgba(251,191,36,0.3)",
          boxShadow: "0 4px 0 rgba(251,191,36,0.15)",
        }}
      >
        <p className="text-sm text-muted-foreground font-medium mb-3">
          Complete previous levels to unlock!
        </p>
        
        <div className="flex items-center justify-center gap-2 text-foreground">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span className="font-bold">
            Complete Level {levelId - 1}
          </span>
        </div>
      </div>
      
      <GameModalFooter
        primaryLabel="Got it!"
        onPrimary={onClose}
        primaryVariant="primary"
      />
    </GameModal>
  );
}
