import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Tv, Gift, AlertCircle } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { adService } from "@/services/adService";
import { useLanguage } from "@/contexts/LanguageContext";

interface WatchAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => Promise<boolean>;
  playsRemaining: number;
}

export function WatchAdModal({ isOpen, onClose, onWatchAd, playsRemaining }: WatchAdModalProps) {
  const { t } = useLanguage();
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [adError, setAdError] = useState<string | null>(null);
  const [isAdReady, setIsAdReady] = useState(false);

  // Initialize ad service and preload ad when modal opens
  useEffect(() => {
    if (isOpen) {
      setAdError(null);
      
      // Preload the ad
      adService.loadRewardedAd({
        onAdLoaded: () => {
          setIsAdReady(true);
        },
        onAdFailedToLoad: (error) => {
          console.warn('Failed to preload ad:', error);
          // Don't show error yet, we can still try to show
        },
      });
    } else {
      setIsAdReady(false);
    }
  }, [isOpen]);

  const handleWatchAd = async () => {
    setIsWatching(true);
    setWatchProgress(0);
    setAdError(null);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setWatchProgress(prev => {
        if (prev >= 90) {
          return 90; // Cap at 90% until ad completes
        }
        return prev + 3;
      });
    }, 50);

    try {
      const adSuccess = await adService.showRewardedAdWithPreload({
        onAdShowed: () => {
          console.log('Ad started showing');
        },
        onRewardEarned: (reward) => {
          console.log('Reward earned:', reward);
        },
        onAdDismissed: () => {
          console.log('Ad dismissed');
        },
        onAdFailedToShow: (error) => {
          console.error('Ad failed to show:', error);
          setAdError(t("modals.adFailed"));
        },
      });

      clearInterval(progressInterval);

      if (adSuccess) {
        setWatchProgress(100);
        
        // Call the actual callback to update plays in database
        const dbSuccess = await onWatchAd();
        
        setTimeout(() => {
          setIsWatching(false);
          setWatchProgress(0);
          if (dbSuccess) {
            onClose();
          }
        }, 500);
      } else {
        setIsWatching(false);
        setWatchProgress(0);
        if (!adError) {
          setAdError(t("modals.watchFailed"));
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      setIsWatching(false);
      setWatchProgress(0);
      setAdError(t("modals.errorOccurred"));
      console.error('Error watching ad:', error);
    }
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
          className="w-full max-w-sm rounded-3xl overflow-hidden relative"
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
              {t("modals.playsLimit")}
            </h2>

            {/* Current status */}
            <p className="text-white/60 mb-4">
              {t("modals.playsRemaining", { current: playsRemaining, max: 5 })}
            </p>

            {/* Reward preview */}
            <div 
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl mb-6"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Gift className="w-5 h-5 text-amber-400" />
              <span className="text-white">{t("modals.watchAdGetPlays")}</span>
              <span className="text-amber-400 font-bold">{t("modals.extraPlays", { count: 2 })}</span>
            </div>

            {/* Error message */}
            {adError && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg mb-4 bg-red-500/20 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm">{adError}</span>
              </div>
            )}

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
                    initial={{ width: 0 }}
                    animate={{ width: `${watchProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">{t("modals.watchingAd")}</p>
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
                  {t("modals.watching")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" fill="currentColor" />
                  {t("modals.watchAd")}
                </span>
              )}
            </ChunkyButton>

            {/* Alternative - VIP */}
            <p className="text-white/40 text-xs mt-4">
              {t("modals.orBecomeVip")}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}