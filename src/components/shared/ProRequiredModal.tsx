import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useProPurchase } from "@/hooks/useProPurchase";
import { Capacitor } from "@capacitor/core";
import type { ProFeature } from "@/hooks/useProGating";
import crownIcon from "@/assets/icons/crown-2.png";

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
      <DialogContent className="max-w-[320px] p-0 overflow-hidden bg-gradient-to-b from-purple-500/15 via-background to-background border-purple-500/30">
        <DialogTitle className="sr-only">PRO ფუნქცია</DialogTitle>
        
        <div className="flex flex-col items-center px-6 py-8">
          {/* Crown Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              y: [0, -6, 0]
            }}
            transition={{ 
              scale: { type: "spring", stiffness: 300, damping: 20 },
              rotate: { type: "spring", stiffness: 300, damping: 20 },
              y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            <img 
              src={crownIcon} 
              alt="Crown" 
              className="w-14 h-14 object-contain drop-shadow-lg"
            />
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
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleUpgrade}
              disabled={isProcessing}
              showParticles={true}
              icon={<img src={crownIcon} alt="" className="w-5 h-5 object-contain" />}
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
