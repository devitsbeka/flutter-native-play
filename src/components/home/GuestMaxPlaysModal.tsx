import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import React from "react";
import { Sparkles, Trophy, Lock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface GuestMaxPlaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  onContinuePlaying?: () => void;
  isBlocking?: boolean;
  inline?: boolean;
}

export const GuestMaxPlaysModal = React.forwardRef<HTMLDivElement, GuestMaxPlaysModalProps>(
  function GuestMaxPlaysModal({ isOpen, onClose, onRegister, onContinuePlaying, isBlocking = false, inline }, ref) {

    const handleClose = () => {
      if (isBlocking) return;
      if (onContinuePlaying) {
        onContinuePlaying();
      } else {
        onClose();
      }
    };

    return (
      <div ref={ref}>
        <GameModal
          isOpen={isOpen}
          onClose={isBlocking ? undefined : handleClose}
          variant="primary"
          iconSrc={triviaBuzzer}
          title="შექმენი ანგარიში და გააგრძელე თამაში"
          showSparkles
          showStars
          inline={inline}
          fullScreen={false}
        >
          {/* Benefits list */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[hsl(270,80%,95%)] border border-[hsl(270,60%,85%)]">
              <Sparkles className="w-5 h-5 text-[hsl(270,60%,50%)] shrink-0" />
              <span className="text-sm font-medium text-foreground">შექმენი ანიმირებული ავატარი</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[hsl(140,60%,93%)] border border-[hsl(140,40%,80%)]">
              <Trophy className="w-5 h-5 text-[hsl(140,50%,40%)] shrink-0" />
              <span className="text-sm font-medium text-foreground">შეინახე პროგრესი</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[hsl(210,60%,95%)] border border-[hsl(210,40%,85%)]">
              <Lock className="w-5 h-5 text-[hsl(210,50%,50%)] shrink-0" />
              <span className="text-sm font-medium text-foreground">გახსენი ყველა ფუნქცია</span>
            </div>
          </div>

          {/* CTA Button */}
          <ChunkyButton
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={onRegister}
          >
            <Sparkles className="w-5 h-5" />
            დავიწყოთ!
          </ChunkyButton>
        </GameModal>
      </div>
    );
  }
);

GuestMaxPlaysModal.displayName = "GuestMaxPlaysModal";
