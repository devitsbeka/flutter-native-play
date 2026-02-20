import { useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";
import { Sparkles } from "lucide-react";
import crownIcon from "@/assets/icons/icon-vip-crown.png";

interface FriendJoinedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FriendJoinedModal({ open, onOpenChange }: FriendJoinedModalProps) {
  useEffect(() => {
    if (open) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: ["#FFD700", "#FFA500", "#FF69B4", "#8B5CF6", "#F59E0B"],
        zIndex: 9999,
      });
      setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, zIndex: 9999 });
        confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, zIndex: 9999 });
      }, 300);
    }
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">მეგობარი შემოუერთდა</DialogTitle>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 40%, #F0EBFF 100%)",
            boxShadow: "0 8px 0 #E8E4EC, 0 16px 40px rgba(0, 0, 0, 0.2)",
            border: "3px solid rgba(255, 255, 255, 0.95)",
          }}
        >
          <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
            {/* Crown icon */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mb-4"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #6D28D9 100%)",
                  boxShadow: "0 6px 0 #5B21B6, 0 0 30px rgba(124,58,237,0.4)",
                }}
              >
                <img src={crownIcon} alt="" className="w-12 h-12 object-contain" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-xl font-bold text-gray-900 text-center mb-3"
            >
              🎉 გილოცავთ!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-gray-600 text-center text-sm leading-relaxed mb-6"
            >
              თქვენი მეგობარი შემოუერთდა MyTrivia LIVE-ს თქვენი ლინკით!{" "}
              <span className="font-semibold text-amber-600">
                თქვენ და თქვენმა მეგობარმა მიიღეთ 10 დღიანი PRO.
              </span>
              {" "}სასიამოვნო გართობას გისურვებთ!
            </motion.p>

            {/* PRO badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                boxShadow: "0 3px 0 #C4B5FD",
              }}
            >
              <img src={crownIcon} alt="" className="w-6 h-6 object-contain" />
              <span className="font-display text-sm font-bold text-purple-700">
                10 დღიანი PRO ✓
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="w-full"
            >
              <ChunkyButton
                variant="success"
                size="lg"
                className="w-full"
                onClick={() => onOpenChange(false)}
                icon={<Sparkles className="w-5 h-5" />}
              >
                გასაგებია
              </ChunkyButton>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
