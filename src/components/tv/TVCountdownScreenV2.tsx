import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { tvLog, tvLogPhase } from '@/utils/tvDebug';
import { TVBrandingOverlay } from './TVBrandingOverlay';
import { AppIcon } from '@/components/shared/AppIcon';


export const TVCountdownScreenV2: React.FC = () => {
  const { players, categoryName, categoryIcon, isHost, startPlaying, roundNumber } = useTVGame();
  const [count, setCount] = useState(3);
  const hasTriggeredPlaying = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // When countdown ends, ONLY the host triggers startPlaying
  // NO FALLBACK - this prevents race conditions where both TV and Phone trigger
  useEffect(() => {
    if (count === 0 && !hasTriggeredPlaying.current && isHost) {
      hasTriggeredPlaying.current = true;
      tvLog('Countdown ended, host triggering startPlaying');
      
      const transitionTimer = setTimeout(() => {
        startPlaying();
        tvLogPhase('countdown', 'playing', 'countdown ended');
      }, 500);

      return () => clearTimeout(transitionTimer);
    }
  }, [count, isHost, startPlaying]);

  const getCountDisplay = () => {
    if (count === 0) return 'დაიწყო!';
    return count.toString();
  };

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Branding Overlay */}
      <TVBrandingOverlay showLogo showCode />

      {/* Category info - moved up */}
      {categoryName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center -mt-8"
        >
          <p className="text-purple-300 text-lg">რაუნდი {roundNumber || 1}</p>
          <div className="flex items-center gap-3 text-white text-2xl font-bold">
            <AppIcon slug={categoryIcon} size={40} hideIfEmpty />
            <span>{categoryName}</span>
          </div>
        </motion.div>
      )}

      {/* Countdown number - moved up */}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative -mt-4"
        >
          {/* Glow effect - only for countdown numbers */}
          {count > 0 && (
            <div className="absolute inset-0 blur-3xl">
              <div className="w-64 h-64 rounded-full bg-purple-500/50" />
            </div>
          )}

          {/* Number or Text */}
          {count > 0 ? (
            <div className="relative z-10 w-64 h-64 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 shadow-2xl">
              <span className="text-white text-9xl font-bold font-display">
                {count}
              </span>
            </div>
          ) : (
            <span className="relative z-10 text-green-400 text-9xl font-bold font-display drop-shadow-[0_0_30px_rgba(74,222,128,0.5)]">
              დაიწყო!
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Players at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12 flex items-center gap-4"
      >
        {players.slice(0, 8).map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <SafeAvatar 
              avatarUrl={player.avatar_url}
              fallback={player.nickname}
              className="w-12 h-12 ring-2 ring-white/30"
              fallbackClassName="bg-purple-600 text-white text-sm"
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-purple-300 text-lg"
      >
        {count === 0 ? 'წავედით!' : 'მოემზადეთ...'}
      </motion.p>
    </div>
  );
};
