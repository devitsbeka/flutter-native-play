import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Tv, Gift, AlertCircle, RotateCw } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { adService } from "@/services/adService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { REWARDS } from "@/config/rewardConfig";

interface WatchAdForSpinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => Promise<boolean>;
  spinsRemaining: number;
  maxSpins: number;
}

export function WatchAdForSpinsModal({ 
  isOpen, 
  onClose, 
  onWatchAd, 
  spinsRemaining, 
  maxSpins 
}: WatchAdForSpinsModalProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [adError, setAdError] = useState<string | null>(null);
  const [isAdReady, setIsAdReady] = useState(false);

  const extraSpins = REWARDS.AD_WATCH_EXTRA_SPINS || 5;

  // Initialize ad service and preload ad when modal opens
  useEffect(() => {
    if (isOpen) {
      setAdError(null);
      
      // Set age group for child-safety compliance
      adService.setAgeGroup((profile as any)?.age_group);
      
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
          setAdError(t("spin.adFailed"));
        },
      });

      clearInterval(progressInterval);

      if (adSuccess) {
        setWatchProgress(100);
        
        // Call the actual callback to update spins in database
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
          setAdError(t("spin.watchFailed"));
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      setIsWatching(false);
      setWatchProgress(0);
      setAdError(t("spin.errorOccurred"));
      console.error('Error watching ad:', error);
    }
  };

  const headerIcon = (
    <div 
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #F59E0B, #D97706)",
        boxShadow: "0 4px 0 #92400E",
      }}
    >
      <RotateCw className="w-8 h-8 text-white" />
    </div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title={t("spin.noSpinsLeft")}
      subtitle={t("spin.spinsRemaining").replace("{current}", String(spinsRemaining)).replace("{max}", String(maxSpins))}
      variant="info"
    >
      {/* Reward preview */}
      <div 
        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl mb-4"
        style={{
          background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
          boxShadow: "0 2px 0 #FCD34D",
        }}
      >
        <Gift className="w-5 h-5 text-amber-600" />
        <span className="text-amber-800 font-medium">{t("spin.watchAdGetSpins")}</span>
        <span className="text-amber-900 font-bold">{t("spin.extraSpins").replace("{count}", String(extraSpins))}</span>
      </div>

      {/* Error message */}
      {adError && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg mb-4 bg-red-100 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-600 text-sm">{adError}</span>
        </div>
      )}

      {/* Progress bar when watching */}
      {isWatching && (
        <div className="mb-4">
          <div 
            className="h-2 rounded-full overflow-hidden bg-gray-200"
          >
            <motion.div
              className="h-full rounded-full"
              style={{ 
                background: "linear-gradient(90deg, #F59E0B, #D97706)",
                width: `${watchProgress}%`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${watchProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-2 text-center">{t("spin.watchingAd")}</p>
        </div>
      )}

      <GameModalFooter
        primaryLabel={isWatching ? t("spin.watching") : t("spin.watchAdForSpins")}
        onPrimary={handleWatchAd}
        primaryIcon={isWatching ? <Tv className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5" />}
        isLoading={isWatching}
        primaryVariant="success"
      />

      {/* Alternative - VIP */}
      <p className="text-gray-400 text-xs mt-3 text-center">
        {t("modals.orBecomeVip")}
      </p>
    </GameModal>
  );
}
