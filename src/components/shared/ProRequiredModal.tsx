import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useProPurchase } from "@/hooks/useProPurchase";
import { Capacitor } from "@capacitor/core";
import type { ProFeature } from "@/hooks/useProGating";

const FEATURE_MESSAGES: Record<ProFeature, string> = {
  rooms: "ოთახების შესაქმნელად",
  trivia: "ტრივიას შესაქმნელად",
  collection: "კოლექციის შესაქმნელად",
  avatar: "3D ავატარის შესაქმნელად",
  animation: "ავატარის ანიმაციისთვის",
  general: "ამ ფუნქციისთვის",
};

interface ProRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: ProFeature;
}

export function ProRequiredModal({ isOpen, onClose, feature = "general" }: ProRequiredModalProps) {
  const navigate = useNavigate();
  const { initiateProCheckout, isProcessing } = useProPurchase();

  const handleUpgrade = async () => {
    if (Capacitor.isNativePlatform()) {
      // Native: trigger in-app purchase
      const result = await initiateProCheckout("pro");
      if (result.success) {
        onClose();
      }
    } else {
      // Web: navigate to profile PRO tab
      onClose();
      navigate("/profile?tab=PRO");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[320px] p-0 overflow-hidden bg-gradient-to-b from-accent/20 to-background border-accent/30">
        <DialogTitle className="sr-only">PRO ფუნქცია</DialogTitle>
        
        <div className="flex flex-col items-center px-6 py-8">
          {/* Crown Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-5 shadow-lg shadow-accent/30"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-xl text-foreground mb-3"
          >
            PRO ფუნქცია
          </motion.h2>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground text-center text-sm mb-6"
          >
            {FEATURE_MESSAGES[feature]} გახდი PRO მომხმარებელი
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            <ChunkyButton
              variant="secondary"
              className="w-full"
              onClick={handleUpgrade}
              disabled={isProcessing}
            >
              {isProcessing ? "იტვირთება..." : "გახდი PRO"}
            </ChunkyButton>
          </motion.div>

          {/* Cancel */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            onClick={onClose}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            გაუქმება
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
