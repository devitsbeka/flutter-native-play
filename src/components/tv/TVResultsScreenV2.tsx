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
      
      // Reduced confetti - fire only 3 bursts instead of continuous
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'];

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
    <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-6 flex gap-6 overflow-hidden">
      {/* Left Side - Podium */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {/* Title */}
        <motion.div
          className="text-center mb-6 flex-shrink-0"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            თამაში<br/>დასრულდა
          </h1>
        </motion.div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3 w-full max-w-xl">
          {/* 2nd Place */}
          {secondPlace && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="relative mb-1">
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm z-10 border-2 border-white">
                  2
                </div>
                <Avatar className="w-14 h-14 ring-3 ring-gray-300 border-2 border-white">
                  <AvatarImage src={secondPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-gray-400 text-white font-bold text-base">
                    {secondPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-base mb-0.5">{secondPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-xs flex items-center gap-1">
                🏅 +{XP_REWARDS[1]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-24 h-16 bg-gradient-to-b from-purple-400 to-purple-600 rounded-t-2xl mt-2 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 64 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <span className="text-white/60 text-3xl font-bold">2</span>
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
                <Crown className="w-8 h-8 text-yellow-400 mb-0.5" />
              </motion.div>
              
              <div className="relative mb-1">
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold text-base z-10 border-2 border-white">
                  1
                </div>
                <Avatar className="w-20 h-20 ring-4 ring-yellow-400 border-2 border-white">
                  <AvatarImage src={firstPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-yellow-500 text-white font-bold text-xl">
                    {firstPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-lg mb-0.5">{firstPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-sm flex items-center gap-1">
                🏅 +{XP_REWARDS[0]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-28 h-24 bg-gradient-to-b from-purple-300 to-purple-500 rounded-t-2xl mt-2 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 96 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <span className="text-white/60 text-4xl font-bold">1</span>
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
              <div className="relative mb-1">
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm z-10 border-2 border-white">
                  3
                </div>
                <Avatar className="w-12 h-12 ring-3 ring-amber-600 border-2 border-white">
                  <AvatarImage src={thirdPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-700 text-white font-bold text-base">
                    {thirdPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-base mb-0.5">{thirdPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-xs flex items-center gap-1">
                🏅 +{XP_REWARDS[2]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-20 h-12 bg-gradient-to-b from-purple-500 to-purple-700 rounded-t-2xl mt-2 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 48 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <span className="text-white/60 text-2xl font-bold">3</span>
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
        className="w-80 bg-purple-800/50 backdrop-blur-sm rounded-2xl p-4 flex flex-col max-h-full"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h2 className="text-white text-lg font-bold mb-3 text-center flex-shrink-0">ლიდერბორდი</h2>
        
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
          {sortedPlayers.map((player, index) => {
            const stats = getPlayerStats(player);
            return (
              <motion.div
                key={player.id}
                className="flex items-center gap-2 bg-purple-700/50 rounded-xl p-2 hover:bg-purple-700/70 transition-colors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                {/* Rank */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs
                  ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-purple-600'}`}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <Avatar className="w-8 h-8 ring-2 ring-cyan-400 border border-white/30">
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-500 text-white font-bold text-xs">
                    {player.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <span className="text-white font-medium flex-1 truncate text-sm">
                  {player.nickname}
                </span>

                {/* Stats */}
                <div className="flex items-center gap-2">
                  {/* Correct */}
                  <span className="text-green-400 flex items-center gap-0.5 text-xs">
                    <Check className="w-3 h-3" />
                    {stats.correctCount}
                  </span>

                  {/* Incorrect */}
                  <span className="text-red-400 flex items-center gap-0.5 text-xs">
                    <X className="w-3 h-3" />
                    {stats.incorrectCount}
                  </span>

                  {/* Score with coin icon */}
                  <span className="text-yellow-400 flex items-center gap-0.5 font-semibold text-sm min-w-[50px] justify-end">
                    <Coins className="w-3 h-3" />
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
