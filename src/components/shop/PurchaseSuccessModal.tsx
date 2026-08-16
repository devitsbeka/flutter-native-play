import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { Check, Sparkles } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  quantity?: number;
  icon?: React.ReactNode;
}

// Helper to forcefully remove any confetti canvas elements
function cleanupConfettiCanvas() {
  confetti.reset();
  
  // Also manually remove any orphaned confetti canvas elements
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    // Confetti library creates canvases with specific styles
    const style = canvas.style;
    if (
      style.position === 'fixed' && 
      style.pointerEvents === 'none' &&
      (style.zIndex === '9999' || parseInt(style.zIndex) > 1000)
    ) {
      canvas.remove();
    }
  });
}

export function PurchaseSuccessModal({
  isOpen,
  onClose,
  itemName,
  quantity = 1,
  icon,
}: PurchaseSuccessModalProps) {
  const { t } = useLanguage();
  const wasOpenRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoized close handler to ensure cleanup
  const handleClose = useCallback(() => {
    cleanupConfettiCanvas();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5, x: 0.5 },
        colors: ["#A855F7", "#EC4899", "#FFD700", "#22C55E", "#3B82F6"],
        zIndex: 9999,
      });

      // Auto close after 3 seconds
      timerRef.current = setTimeout(() => {
        cleanupConfettiCanvas();
        onClose();
      }, 3000);
    }
    
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      cleanupConfettiCanvas();
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      cleanupConfettiCanvas();
    };
  }, []);

  // Handler for when exit animation completes
  const handleExitComplete = useCallback(() => {
    cleanupConfettiCanvas();
  }, []);

  return (
    <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))] bg-background/80 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm p-6 rounded-3xl text-center"
            style={{
              background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
              boxShadow: "0 20px 60px hsl(0 0% 0% / 0.2), 0 8px 0 hsl(var(--border))",
              border: "3px solid hsl(var(--border))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.3, opacity: 0.6 }}
                animate={{ scale: 2.5 + i * 0.5, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.2,
                  ease: "easeOut",
                  repeat: Infinity,
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-success/40 pointer-events-none"
                style={{ width: 80, height: 80 }}
              />
            ))}

            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.3, 1], rotate: 0 }}
              transition={{
                duration: 0.6,
                times: [0, 0.6, 1],
                type: "spring",
                stiffness: 200,
              }}
              className="relative mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(160 60% 40%) 100%)",
                boxShadow: "0 6px 0 hsl(142 60% 30%)",
              }}
            >
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </motion.div>

            {/* Item Icon */}
            {icon && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="absolute top-4 right-4"
              >
                {icon}
              </motion.div>
            )}

            {/* Success Text */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-display font-bold text-foreground mb-2"
            >
              {t("shop.purchaseSuccess")}
            </motion.h2>

            {/* Item Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: "linear-gradient(180deg, hsl(263 76% 92%) 0%, hsl(263 70% 85%) 100%)",
                boxShadow: "0 3px 0 hsl(263 60% 70%)",
              }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary">
                {quantity > 1 ? `+${quantity}x ` : ""}
                {itemName}
              </span>
            </motion.div>

            {/* Floating particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                initial={{
                  opacity: 0,
                  x: 0,
                  y: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos((i * 30 * Math.PI) / 180) * 100,
                  y: Math.sin((i * 30 * Math.PI) / 180) * 100,
                  scale: [0, 1, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.3 + i * 0.05,
                  ease: "easeOut",
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl pointer-events-none"
              >
                ✨
              </motion.div>
            ))}

            {/* Continue Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ChunkyButton onClick={handleClose} variant="primary" className="w-full">
                {t("shop.continue")}
              </ChunkyButton>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
