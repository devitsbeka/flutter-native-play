import React from "react";
import { motion } from "framer-motion";
import { Trophy, Clock, Gift, Gamepad2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useNavigate } from "react-router-dom";

interface WeeklyChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeeklyChallengeModal({ open, onOpenChange }: WeeklyChallengeModalProps) {
  const navigate = useNavigate();
  
  // Hardcoded challenge data for now
  const challenge = {
    title: "ითამაშე 10 თამაში",
    description: "ითამაშე 10 თამაში ამ კვირაში და მიიღე ჯილდო",
    current: 3,
    target: 10,
    rewards: {
      xp: 500,
      coins: 100,
    },
    daysRemaining: 5,
  };

  const progress = (challenge.current / challenge.target) * 100;

  const handlePlayNow = () => {
    onOpenChange(false);
    navigate("/team");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden bg-gradient-to-b from-background to-muted/30 border-border">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white relative">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white text-xl">
              <motion.div 
                className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Trophy className="w-7 h-7" />
              </motion.div>
              კვირის გამოწვევა
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-5">
          {/* Challenge Task */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <Gamepad2 className="w-4 h-4" />
              დავალება
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="font-bold text-foreground text-lg">{challenge.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">პროგრესი</span>
              <span className="text-sm font-bold text-foreground">
                {challenge.current}/{challenge.target}
              </span>
            </div>
            <div className="w-full h-3 bg-border rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Rewards */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <Gift className="w-4 h-4" />
              ჯილდო
            </div>
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 text-center">
                <p className="text-2xl font-bold text-purple-600">{challenge.rewards.xp}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 text-center">
                <p className="text-2xl font-bold text-amber-600">{challenge.rewards.coins}</p>
                <p className="text-xs text-muted-foreground">მონეტა</p>
              </div>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              დარჩენილია: <span className="font-semibold text-foreground">{challenge.daysRemaining} დღე</span>
            </span>
          </div>

          {/* CTA Button */}
          <ChunkyButton
            variant="primary"
            onClick={handlePlayNow}
            className="w-full"
          >
            <Gamepad2 className="w-5 h-5 mr-2" />
            ითამაშე ახლავე
          </ChunkyButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
