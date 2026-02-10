import { motion } from "framer-motion";
import giftBoxIcon from "@/assets/icons/gift-box.png";

interface FloatingGiftButtonProps {
  onClick: () => void;
}

export function FloatingGiftButton({ onClick }: FloatingGiftButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 z-50 w-16 h-16 rounded-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #6EE7B7 0%, #10B981 50%, #059669 100%)",
        boxShadow: "0 4px 0 #065F46, 0 0 20px rgba(16,185,129,0.4), 0 0 40px rgba(16,185,129,0.2)",
      }}
    >
      {/* Pulsing glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(16,185,129,0.4)",
            "0 0 0 10px rgba(16,185,129,0)",
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      />

      {/* Bounce animation on the icon */}
      <motion.img
        src={giftBoxIcon}
        alt="საჩუქარი"
        className="w-9 h-9 object-contain"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sparkle badge */}
      <motion.div
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
        style={{
          background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
          boxShadow: "0 2px 0 #991B1B",
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <span className="text-white font-bold">1</span>
      </motion.div>
    </motion.button>
  );
}
