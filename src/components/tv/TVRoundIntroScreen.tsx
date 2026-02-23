import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTVGame } from '@/contexts/TVGameContext';
import { SmartAvatar } from '@/components/shared/SmartAvatar';
import { Check, Loader2 } from 'lucide-react';
import { TVBrandingOverlay } from './TVBrandingOverlay';
import { AppIcon } from '@/components/shared/AppIcon';

interface TVRoundIntroScreenProps {
  isController?: boolean;
  onReady?: () => void;
}

export const TVRoundIntroScreen: React.FC<TVRoundIntroScreenProps> = ({ 
  isController = false,
  onReady 
}) => {
  const { t } = useLanguage();
  const { 
    players, 
    categoryName, 
    categoryIcon,
    roundNumber,
    totalRounds,
  } = useTVGame();

  const [isReady, setIsReady] = useState(false);

  const handleReady = () => {
    if (isReady) return;
    setIsReady(true);
    onReady?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Branding Overlay */}
      <TVBrandingOverlay showLogo showCode />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Round Progress Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <span className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-lg flex items-center gap-2">
          <span className="text-purple-300">{t("extra.tvRound")}</span>
          <span className="text-white">{roundNumber}</span>
          <span className="text-purple-300">/</span>
          <span className="text-white">{totalRounds}</span>
        </span>
      </motion.div>


      {/* Category Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-10 flex flex-col items-center gap-4"
      >
        <AppIcon slug={categoryIcon} size={80} hideIfEmpty />
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">
          {categoryName || t("extra.tvCategoryFallback")}
        </h2>
      </motion.div>

      {/* Players list (no per-player ready gating) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md mb-8"
      >
        <div className="flex flex-wrap justify-center gap-3">
          {players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="w-12 h-12">
                <SmartAvatar
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname?.slice(0, 2)}
                  size="md"
                />
              </div>
              <span className="text-xs font-medium text-purple-200">
                {player.nickname}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Ready Button (Controller Only) */}
      {isController && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={handleReady}
            disabled={isReady}
            className={`px-8 py-4 rounded-xl text-lg font-bold text-white transition-all ${
              isReady
                ? 'bg-green-500 cursor-default'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
            }`}
            style={{
              boxShadow: isReady
                ? '0 6px 24px rgba(34, 197, 94, 0.4)'
                : '0 6px 24px rgba(139, 92, 246, 0.4)',
            }}
            whileHover={!isReady ? { scale: 1.05 } : undefined}
            whileTap={!isReady ? { scale: 0.95 } : undefined}
          >
            {isReady ? (
              <span className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                {t("extra.tvReady")}
              </span>
            ) : (
              {t("extra.tvImReady")}
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Waiting indicator for TV */}
      {!isController && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-purple-200"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t("extra.tvWaitingHost")}</span>
        </motion.div>
      )}
    </div>
  );
};
