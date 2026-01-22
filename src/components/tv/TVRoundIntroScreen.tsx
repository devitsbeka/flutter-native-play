import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { SmartAvatar } from '@/components/shared/SmartAvatar';
import { Check, Loader2 } from 'lucide-react';
import retroTvIcon from '@/assets/retro-tv-colored.png';

interface TVRoundIntroScreenProps {
  isController?: boolean;
  onReady?: () => void;
}

export const TVRoundIntroScreen: React.FC<TVRoundIntroScreenProps> = ({ 
  isController = false,
  onReady 
}) => {
  const { 
    players, 
    categoryName, 
    categoryIcon,
    roundNumber,
    totalRounds,
  } = useTVGame();

  const [isReady, setIsReady] = useState(false);
  
  // Count ready players (those with isReadyForNextRound in presence)
  const readyPlayers = players.filter(p => (p as any).isReadyForNextRound);
  const readyCount = readyPlayers.length;
  const totalPlayers = players.length;
  const allReady = totalPlayers > 0 && readyCount === totalPlayers;

  const handleReady = () => {
    if (isReady) return;
    setIsReady(true);
    onReady?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* 3D TV Icon with glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: -30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-4 relative"
      >
        <div className="absolute inset-0 bg-purple-400/30 blur-2xl rounded-full scale-150" />
        <img src={retroTvIcon} alt="TV" className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative z-10" />
      </motion.div>

      {/* Round Progress Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <span className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-lg flex items-center gap-2">
          <span className="text-purple-300">რაუნდი</span>
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
        className="mb-10 flex flex-col items-center"
      >
        <motion.div 
          className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl flex items-center justify-center mb-4 border-2 border-white/20 relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
          }}
          animate={{ 
            boxShadow: [
              '0 0 30px rgba(168,85,247,0.3)',
              '0 0 50px rgba(168,85,247,0.5)',
              '0 0 30px rgba(168,85,247,0.3)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent" />
          {categoryIcon ? (
            <span className="text-6xl sm:text-7xl relative z-10">{categoryIcon}</span>
          ) : (
            <span className="text-6xl sm:text-7xl relative z-10">🎲</span>
          )}
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">
          {categoryName || 'კატეგორია'}
        </h2>
      </motion.div>

      {/* Players Ready Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-purple-200 text-lg">
            {readyCount}/{totalPlayers} მზადაა
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {players.map((player) => {
            const playerReady = (player as any).isReadyForNextRound;
            return (
              <motion.div
                key={player.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  playerReady
                    ? 'bg-green-500/20 border border-green-400/50'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12">
                    <SmartAvatar
                      avatarUrl={player.avatar_url}
                      fallback={player.nickname?.slice(0, 2)}
                      size="md"
                    />
                  </div>
                  {playerReady && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>
                <span className={`text-xs font-medium ${playerReady ? 'text-green-300' : 'text-purple-200'}`}>
                  {player.nickname}
                </span>
              </motion.div>
            );
          })}
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
                მზადაა!
              </span>
            ) : (
              'მზად ვარ'
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Waiting indicator for TV */}
      {!isController && !allReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-purple-200"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>მოლოდინი მოთამაშეებზე...</span>
        </motion.div>
      )}

      {/* All Ready - Starting Soon */}
      <AnimatePresence>
        {allReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mt-4 text-center"
          >
            <span className="text-green-400 text-xl font-bold">
              ყველა მზადაა! იწყება...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
