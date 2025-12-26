import { motion } from "framer-motion";
import { Clock, Sparkles, Heart } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName?: string;
  levelNumber?: number;
}

export function ComingSoonModal({
  isOpen,
  onClose,
  categoryName,
  levelNumber,
}: ComingSoonModalProps) {
  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="მალე დაემატება!"
      iconEmoji="🏗️"
      primaryLabel="გასაგებია"
      onPrimaryClick={onClose}
    >
      <div className="flex flex-col items-center text-center py-2">
        <h3 className="text-lg font-bold text-foreground mb-2">
          ახალი კითხვები მზადდება!
        </h3>

        <p className="text-muted-foreground text-sm mb-4 max-w-[280px]">
          {categoryName && levelNumber ? (
            <>
              <span className="font-semibold text-foreground">{categoryName}</span> - დონე {levelNumber}-ის კითხვები მალე დაემატება.
            </>
          ) : (
            "ჩვენი გუნდი მუშაობს ახალი საინტერესო კითხვების შექმნაზე."
          )}
        </p>

        {/* Features list */}
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center gap-3 bg-primary/5 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm text-foreground">მაღალი ხარისხის კონტენტი</span>
          </div>
          
          <div className="flex items-center gap-3 bg-success/5 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-success" />
            </div>
            <span className="text-sm text-foreground">რეგულარული განახლებები</span>
          </div>
          
          <div className="flex items-center gap-3 bg-destructive/5 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-sm text-foreground">თქვენთვის შექმნილი</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          მადლობა მოთმინებისთვის! 💜
        </p>
      </div>
    </GameModal>
  );
}
