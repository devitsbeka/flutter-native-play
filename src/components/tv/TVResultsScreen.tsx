import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import goldMedal from '@/assets/trophy-gold.png';
import silverMedal from '@/assets/trophy-silver.png';
import bronzeMedal from '@/assets/trophy-bronze.png';


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
    <div className="h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 overflow-hidden relative flex flex-col">
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

      {/* Header with Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 flex-shrink-0"
      >
        {/* MyTrivia Logo */}
        <div className="flex items-center justify-center mb-3">
          <span 
            className="text-3xl font-slackey text-white"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            MyTrivia
          </span>
          <span className="ml-2 px-2 py-1 rounded-md text-xs font-bold text-white bg-red-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white font-display mb-1">თამაში დასრულდა</h1>
        <p className="text-purple-300 text-base">საბოლოო შედეგები</p>
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-2 flex-shrink-0">
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
              {/* Medal for podium places - increased 20% */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6 + displayIndex * 0.2, type: 'spring' }}
                className="mb-1.5"
              >
                <img 
                  src={actualRank === 0 ? goldMedal : actualRank === 1 ? silverMedal : bronzeMedal}
                  alt={actualRank === 0 ? 'Gold' : actualRank === 1 ? 'Silver' : 'Bronze'}
                  className="w-12 h-12 object-contain"
                />
              </motion.div>

              {/* Player avatar - increased 20% */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`relative mb-2 ${actualRank === 0 ? 'scale-110' : ''}`}
              >
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className={`${actualRank === 0 ? 'w-20 h-20' : 'w-[68px] h-[68px]'} ring-4 ${
                    actualRank === 0 ? 'ring-yellow-400' :
                    actualRank === 1 ? 'ring-gray-400' :
                    'ring-orange-400'
                  }`}
                  fallbackClassName="bg-purple-600 text-white text-xl"
                />
              </motion.div>

              {/* Name and score */}
              <p className="text-white font-bold text-lg mb-0.5">{player.nickname}</p>
              <p className="text-purple-300 font-semibold text-sm mb-2">{player.score} ქულა</p>

              {/* Podium block */}
              <div className={`w-24 ${actualRank === 0 ? 'h-20' : actualRank === 1 ? 'h-14' : 'h-10'} bg-gradient-to-t ${getPodiumColor(actualRank)} rounded-t-xl flex items-center justify-center`}>
                <span className="text-white text-3xl font-bold">{actualRank + 1}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Other players - 3 columns with larger avatars */}
      {otherPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-4xl mx-auto flex-1 min-h-0 overflow-y-auto"
        >
          <h3 className="text-purple-300 text-base mb-2 text-center">დანარჩენი მოთამაშეები</h3>
          <div className="grid grid-cols-3 gap-2">
            {otherPlayers.map((player, index) => (
              <div
                key={player.id}
                className="bg-white/10 backdrop-blur rounded-xl p-2 flex items-center gap-2"
              >
                <span className="text-purple-400 font-bold w-6 text-base">{index + 4}</span>
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className="w-8 h-8"
                  fallbackClassName="bg-purple-600 text-white text-sm"
                />
                <span className="text-white flex-1 truncate text-base">{player.nickname}</span>
                <span className="text-purple-300 font-semibold">{player.score}</span>
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
        className="mt-3 text-center flex-shrink-0"
      >
        <p className="text-purple-300 text-sm">
          მასპინძელს შეუძლია ახალი რაუნდის დაწყება ტელეფონიდან
        </p>
      </motion.div>
    </div>
  );
};
