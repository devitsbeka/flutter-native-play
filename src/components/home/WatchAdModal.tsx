import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Tv, Gift } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface WatchAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => Promise<boolean>;
  playsRemaining: number;
}

export function WatchAdModal({ isOpen, onClose, onWatchAd, playsRemaining }: WatchAdModalProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);

  const handleWatchAd = async () => {
    setIsWatching(true);
    setWatchProgress(0);

    // Simulate ad progress
    const interval = setInterval(() => {
      setWatchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 75);

    const success = await onWatchAd();
    
    clearInterval(interval);
    setWatchProgress(100);
    
    setTimeout(() => {
      setIsWatching(false);
      setWatchProgress(0);
      if (success) {
        onClose();
      }
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>

          {/* Content */}
          <div className="p-6 pt-8 text-center">
            {/* Icon */}
            <motion.div
              animate={isWatching ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 0.5, repeat: isWatching ? Infinity : 0 }}
              className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, #4ECDC4, #45B7D1)",
                boxShadow: "0 8px 25px rgba(78, 205, 196, 0.4)",
              }}
            >
              <Tv className="w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <h2 
              className="text-2xl font-black text-white mb-2"
              style={{ fontFamily: "'TASolivare', sans-serif" }}
            >
              თამაშების ლიმიტი
            </h2>

            {/* Current status */}
            <p className="text-white/60 mb-4">
              დარჩენილია: <span className="text-white font-bold">{playsRemaining}/5</span> თამაში
            </p>

            {/* Reward preview */}
            <div 
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl mb-6"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Gift className="w-5 h-5 text-amber-400" />
              <span className="text-white">უყურე რეკლამას და მიიღე</span>
              <span className="text-amber-400 font-bold">+2 თამაში</span>
            </div>

            {/* Progress bar when watching */}
            {isWatching && (
              <div className="mb-4">
                <div 
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ 
                      background: "linear-gradient(90deg, #4ECDC4, #45B7D1)",
                      width: `${watchProgress}%`,
                    }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">რეკლამის ყურება...</p>
              </div>
            )}

            {/* Button */}
            <ChunkyButton
              variant="mint"
              size="lg"
              onClick={handleWatchAd}
              disabled={isWatching}
              className="w-full"
            >
              {isWatching ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Tv className="w-5 h-5" />
                  </motion.div>
                  უყურებ...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" fill="currentColor" />
                  უყურე რეკლამას
                </span>
              )}
            </ChunkyButton>

            {/* Alternative - VIP */}
            <p className="text-white/40 text-xs mt-4">
              ან გახდი <span className="text-amber-400">VIP</span> უსაზღვრო თამაშებისთვის
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
