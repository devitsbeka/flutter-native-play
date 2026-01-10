import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const TVResultsScreen: React.FC = () => {
  const { players, code } = useTVGame();
  const [showConfetti, setShowConfetti] = useState(false);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const podiumPlayers = sortedPlayers.slice(0, 3);
  const otherPlayers = sortedPlayers.slice(3);

  // Fire confetti on mount
  useEffect(() => {
    setShowConfetti(true);
    
    // Reduced confetti - fire only 3 bursts
    const colors = ['#a855f7', '#ec4899', '#f59e0b'];
    
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors,
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 90,
        spread: 100,
        origin: { x: 0.5, y: 0.7 },
        colors,
      });
    }, 500);
  }, []);

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 0: return 'from-yellow-400 to-yellow-600';
      case 1: return 'from-gray-300 to-gray-500';
      case 2: return 'from-orange-400 to-orange-600';
      default: return 'from-purple-400 to-purple-600';
    }
  };

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [1, 0, 2].map(i => podiumPlayers[i]).filter(Boolean);

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 overflow-hidden relative flex flex-col">
      {/* Background sparkles - reduced to 10 */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400/50" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 flex-shrink-0"
      >
        <div className="flex items-center justify-center gap-3 mb-1">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h1 className="text-4xl font-bold text-white font-display">Game Over!</h1>
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        <p className="text-purple-300 text-lg">Final Results</p>
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-6 flex-1">
        {podiumOrder.map((player, displayIndex) => {
          if (!player) return null;
          const actualRank = sortedPlayers.indexOf(player);
          
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: displayIndex * 0.2 }}
              className="flex flex-col items-center"
            >
              {/* Crown for 1st place */}
              {actualRank === 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                >
                  <Crown className="w-8 h-8 text-yellow-400 mb-1" />
                </motion.div>
              )}

              {/* Player avatar */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`relative mb-2 ${actualRank === 0 ? 'scale-110' : ''}`}
              >
                <Avatar className={`${actualRank === 0 ? 'w-16 h-16' : 'w-14 h-14'} ring-4 ${
                  actualRank === 0 ? 'ring-yellow-400' :
                  actualRank === 1 ? 'ring-gray-400' :
                  'ring-orange-400'
                }`}>
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-600 text-white text-lg">
                    {player.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Name and score */}
              <p className="text-white font-bold text-lg mb-0.5">{player.nickname}</p>
              <p className="text-purple-300 font-semibold text-sm mb-2">{player.score} pts</p>

              {/* Podium block - reduced heights */}
              <div className={`w-24 ${actualRank === 0 ? 'h-28' : actualRank === 1 ? 'h-20' : 'h-14'} bg-gradient-to-t ${getPodiumColor(actualRank)} rounded-t-xl flex items-center justify-center`}>
                <span className="text-white text-3xl font-bold">{actualRank + 1}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Other players */}
      {otherPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-2xl mx-auto flex-shrink-0"
        >
          <h3 className="text-purple-300 text-sm mb-2 text-center">Other Players</h3>
          <div className="grid grid-cols-2 gap-2">
            {otherPlayers.map((player, index) => (
              <div
                key={player.id}
                className="bg-white/10 backdrop-blur rounded-lg p-2 flex items-center gap-2"
              >
                <span className="text-purple-400 font-bold w-5 text-sm">{index + 4}</span>
                <Avatar className="w-6 h-6">
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-600 text-white text-xs">
                    {player.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white flex-1 truncate text-sm">{player.nickname}</span>
                <span className="text-purple-300 text-sm">{player.score}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Play again hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-4 text-center flex-shrink-0"
      >
        <p className="text-purple-300 text-sm">
          Host can start a new round from their phone
        </p>
      </motion.div>
    </div>
  );
};
