import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Crown, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

// Calculate correct/incorrect from player's lastAnswerCorrect history
// For now, we'll use the score as a proxy since we don't track per-question history
const getPlayerStats = (player: { score: number }) => {
  // Approximate: each correct answer is ~100 points base
  const correctCount = Math.round(player.score / 100);
  const incorrectCount = Math.max(0, 10 - correctCount); // Assuming 10 questions
  return { correctCount, incorrectCount };
};

const XP_REWARDS = [2000, 500, 200];

export const TVResultsScreenV2: React.FC = () => {
  const { players, isHost, resetGame } = useTVGame();
  const [showConfetti, setShowConfetti] = useState(false);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  // Top 3 for podium
  const firstPlace = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];

  // Trigger confetti on mount
  useEffect(() => {
    if (sortedPlayers.length > 0 && !showConfetti) {
      setShowConfetti(true);
      
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [sortedPlayers.length, showConfetti]);

  if (sortedPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-8 flex gap-8">
      {/* Left Side - Podium */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Title */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            თამაში<br/>დასრულდა
          </h1>
        </motion.div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 w-full max-w-2xl">
          {/* 2nd Place */}
          {secondPlace && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="relative mb-2">
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-lg z-10 border-2 border-white">
                  2
                </div>
                <Avatar className="w-20 h-20 ring-4 ring-gray-300 border-4 border-white">
                  <AvatarImage src={secondPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-gray-400 text-white font-bold text-xl">
                    {secondPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-lg mb-1">{secondPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-sm flex items-center gap-1">
                🏅 +{XP_REWARDS[1]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-32 h-24 bg-gradient-to-b from-purple-400 to-purple-600 rounded-t-3xl mt-4 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 96 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <span className="text-white/60 text-4xl font-bold">2</span>
              </motion.div>
            </motion.div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* Crown */}
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.8, type: "spring", bounce: 0.5 }}
              >
                <Crown className="w-10 h-10 text-yellow-400 mb-1" />
              </motion.div>
              
              <div className="relative mb-2">
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold text-xl z-10 border-2 border-white">
                  1
                </div>
                <Avatar className="w-28 h-28 ring-4 ring-yellow-400 border-4 border-white">
                  <AvatarImage src={firstPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-yellow-500 text-white font-bold text-2xl">
                    {firstPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-xl mb-1">{firstPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold flex items-center gap-1">
                🏅 +{XP_REWARDS[0]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-40 h-36 bg-gradient-to-b from-purple-300 to-purple-500 rounded-t-3xl mt-4 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 144 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <span className="text-white/60 text-5xl font-bold">1</span>
              </motion.div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="relative mb-2">
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-lg z-10 border-2 border-white">
                  3
                </div>
                <Avatar className="w-16 h-16 ring-4 ring-amber-600 border-4 border-white">
                  <AvatarImage src={thirdPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-700 text-white font-bold text-lg">
                    {thirdPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-lg mb-1">{thirdPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-sm flex items-center gap-1">
                🏅 +{XP_REWARDS[2]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-28 h-16 bg-gradient-to-b from-purple-500 to-purple-700 rounded-t-3xl mt-4 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 64 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <span className="text-white/60 text-3xl font-bold">3</span>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Host hint */}
        {isHost && (
          <motion.p
            className="text-white/60 text-sm mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            ახალი რაუნდის დასაწყებად დააჭირე ღილაკს კონტროლერზე
          </motion.p>
        )}
      </div>

      {/* Right Side - Leaderboard */}
      <motion.div 
        className="w-96 bg-purple-800/50 backdrop-blur-sm rounded-3xl p-6 flex flex-col"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h2 className="text-white text-xl font-bold mb-4 text-center">ლიდერბორდი</h2>
        
        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
          {sortedPlayers.map((player, index) => {
            const stats = getPlayerStats(player);
            return (
              <motion.div
                key={player.id}
                className="flex items-center gap-3 bg-purple-700/50 rounded-2xl p-3 hover:bg-purple-700/70 transition-colors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                  ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-purple-600'}`}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <Avatar className="w-10 h-10 ring-2 ring-cyan-400 border-2 border-white/30">
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-500 text-white font-bold text-sm">
                    {player.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <span className="text-white font-medium flex-1 truncate">
                  {player.nickname}
                </span>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  {/* Correct */}
                  <span className="text-green-400 flex items-center gap-1 text-sm">
                    <Check className="w-4 h-4" />
                    {stats.correctCount}
                  </span>

                  {/* Incorrect */}
                  <span className="text-red-400 flex items-center gap-1 text-sm">
                    <X className="w-4 h-4" />
                    {stats.incorrectCount}
                  </span>

                  {/* Score with coin icon */}
                  <span className="text-yellow-400 flex items-center gap-1 font-semibold min-w-[60px] justify-end">
                    <Coins className="w-4 h-4" />
                    {player.score}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
