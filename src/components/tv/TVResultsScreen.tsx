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
    
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#a855f7', '#ec4899', '#f59e0b'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#a855f7', '#ec4899', '#f59e0b'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 0: return 'h-40'; // 1st place
      case 1: return 'h-32'; // 2nd place
      case 2: return 'h-24'; // 3rd place
      default: return 'h-16';
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8 overflow-hidden relative">
      {/* Background sparkles */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
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
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-12 h-12 text-yellow-400" />
          <h1 className="text-5xl font-bold text-white font-display">Game Over!</h1>
          <Trophy className="w-12 h-12 text-yellow-400" />
        </div>
        <p className="text-purple-300 text-xl">Final Results</p>
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-12">
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
                  <Crown className="w-12 h-12 text-yellow-400 mb-2" />
                </motion.div>
              )}

              {/* Player avatar */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`relative mb-4 ${actualRank === 0 ? 'scale-110' : ''}`}
              >
                <Avatar className={`${actualRank === 0 ? 'w-24 h-24' : 'w-20 h-20'} ring-4 ${
                  actualRank === 0 ? 'ring-yellow-400' :
                  actualRank === 1 ? 'ring-gray-400' :
                  'ring-orange-400'
                }`}>
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-600 text-white text-2xl">
                    {player.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Name and score */}
              <p className="text-white font-bold text-xl mb-1">{player.nickname}</p>
              <p className="text-purple-300 font-semibold mb-4">{player.score} pts</p>

              {/* Podium block */}
              <div className={`w-32 ${getPodiumHeight(actualRank)} bg-gradient-to-t ${getPodiumColor(actualRank)} rounded-t-xl flex items-center justify-center`}>
                <span className="text-white text-4xl font-bold">{actualRank + 1}</span>
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
          className="max-w-2xl mx-auto"
        >
          <h3 className="text-purple-300 text-lg mb-4 text-center">Other Players</h3>
          <div className="grid grid-cols-2 gap-3">
            {otherPlayers.map((player, index) => (
              <div
                key={player.id}
                className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3"
              >
                <span className="text-purple-400 font-bold w-6">{index + 4}</span>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-600 text-white text-xs">
                    {player.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white flex-1 truncate">{player.nickname}</span>
                <span className="text-purple-300">{player.score}</span>
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
        className="mt-12 text-center"
      >
        <p className="text-purple-300">
          Host can start a new round from their phone
        </p>
      </motion.div>
    </div>
  );
};
