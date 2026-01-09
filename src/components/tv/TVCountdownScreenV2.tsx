import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { tvLog, tvLogPhase } from '@/utils/tvDebug';

export const TVCountdownScreenV2: React.FC = () => {
  const { players, categoryName, categoryIcon, isHost, startPlaying } = useTVGame();
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

  // When countdown ends and user is host, trigger startPlaying
  // Also add a fallback: if no host triggered after 2 seconds, TV triggers it
  useEffect(() => {
    if (count === 0 && !hasTriggeredPlaying.current) {
      if (isHost) {
        // TV is the host, trigger immediately
        hasTriggeredPlaying.current = true;
        tvLog('Countdown ended, TV host triggering startPlaying');
        
        const transitionTimer = setTimeout(() => {
          startPlaying();
          tvLogPhase('countdown', 'playing', 'countdown ended');
        }, 500);

        return () => clearTimeout(transitionTimer);
      } else {
        // TV is not host, but add fallback in case phone host fails
        tvLog('Countdown ended, waiting for phone host to trigger startPlaying...');
        
        const fallbackTimer = setTimeout(() => {
          if (!hasTriggeredPlaying.current) {
            hasTriggeredPlaying.current = true;
            tvLog('Fallback: TV triggering startPlaying after phone host timeout');
            startPlaying();
            tvLogPhase('countdown', 'playing', 'fallback trigger');
          }
        }, 2000);

        return () => clearTimeout(fallbackTimer);
      }
    }
  }, [count, isHost, startPlaying]);

  const getCountDisplay = () => {
    if (count === 0) return 'GO!';
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Category info */}
      {categoryName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <p className="text-purple-300 text-lg">Playing</p>
          <div className="flex items-center gap-3 text-white text-2xl font-bold">
            {categoryIcon && <span className="text-3xl">{categoryIcon}</span>}
            <span>{categoryName}</span>
          </div>
        </motion.div>
      )}

      {/* Countdown number */}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 blur-3xl">
            <div className={`w-64 h-64 rounded-full ${count === 0 ? 'bg-green-500/50' : 'bg-purple-500/50'}`} />
          </div>

          {/* Number */}
          <div className={`relative z-10 w-64 h-64 rounded-full flex items-center justify-center ${count === 0 ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-purple-500 to-purple-700'} shadow-2xl`}>
            <span className="text-white text-9xl font-bold font-display">
              {getCountDisplay()}
            </span>
          </div>
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
            <Avatar className="w-12 h-12 ring-2 ring-white/30">
              <AvatarImage src={player.avatar_url || undefined} />
              <AvatarFallback className="bg-purple-600 text-white text-sm">
                {player.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-purple-300 text-lg"
      >
        {count === 0 ? 'Here we go!' : 'Get ready...'}
      </motion.p>
    </div>
  );
};
