import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { SmartAvatar } from '@/components/shared/SmartAvatar';
import { Check, Loader2 } from 'lucide-react';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';

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
    myPlayerId,
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
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex flex-col items-center justify-center p-6">
      {/* Round Number Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <span className="px-4 py-2 rounded-full bg-purple-500/30 border border-purple-400/50 text-purple-200 font-medium">
          რაუნდი {roundNumber}
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-3xl sm:text-4xl font-bold text-white mb-8 text-center"
        style={{ fontFamily: 'var(--font-display, inherit)' }}
      >
        შემდეგი რაუნდი
      </motion.h1>

      {/* Category Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-10 flex flex-col items-center"
      >
        <div 
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center mb-4 border-2 border-purple-400/50"
          style={{
            background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.3) 100%)',
          }}
        >
          {categoryIcon ? (
            <span className="text-5xl sm:text-6xl">{categoryIcon}</span>
          ) : (
            <QuizCategoryIcon size={64} emoji="🎲" />
          )}
        </div>
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
