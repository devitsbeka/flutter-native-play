import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { useTVSessionQueue } from '@/hooks/useTVSessionQueue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Crown, Coins, ArrowRight } from 'lucide-react';
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
  const { players, isHost, resetGame, sessionId, startNextRound } = useTVGame();
  const { queue } = useTVSessionQueue(sessionId);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Get next round info from queue
  const nextRound = queue.length > 0 ? queue[0] : null;
  const hasMoreRounds = queue.length > 0;

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
    <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4 flex gap-4 overflow-hidden">
      {/* Left Side - Podium */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {/* Title */}
        <motion.div
          className="text-center mb-4 flex-shrink-0"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            თამაში დასრულდა
          </h1>
        </motion.div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-2 w-full max-w-lg">
          {/* 2nd Place */}
          {secondPlace && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="relative mb-1">
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-xs z-10 border-2 border-white">
                  2
                </div>
                <Avatar className="w-12 h-12 ring-2 ring-gray-300 border-2 border-white">
                  <AvatarImage src={secondPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-gray-400 text-white font-bold text-sm">
                    {secondPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-sm mb-0.5">{secondPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-[10px] flex items-center gap-1">
                🏅 +{XP_REWARDS[1]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-20 h-12 bg-gradient-to-b from-purple-400 to-purple-600 rounded-t-xl mt-1 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 48 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <span className="text-white/60 text-2xl font-bold">2</span>
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
                <Crown className="w-6 h-6 text-yellow-400 mb-0.5" />
              </motion.div>
              
              <div className="relative mb-1">
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold text-sm z-10 border-2 border-white">
                  1
                </div>
                <Avatar className="w-16 h-16 ring-4 ring-yellow-400 border-2 border-white">
                  <AvatarImage src={firstPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-yellow-500 text-white font-bold text-lg">
                    {firstPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-base mb-0.5">{firstPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-xs flex items-center gap-1">
                🏅 +{XP_REWARDS[0]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-24 h-16 bg-gradient-to-b from-purple-300 to-purple-500 rounded-t-xl mt-1 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 64 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <span className="text-white/60 text-3xl font-bold">1</span>
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
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xs z-10 border-2 border-white">
                  3
                </div>
                <Avatar className="w-10 h-10 ring-2 ring-amber-600 border-2 border-white">
                  <AvatarImage src={thirdPlace.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-700 text-white font-bold text-sm">
                    {thirdPlace.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-white font-bold text-sm mb-0.5">{thirdPlace.nickname}</p>
              <p className="text-yellow-400 font-semibold text-[10px] flex items-center gap-1">
                🏅 +{XP_REWARDS[2]} XP
              </p>
              {/* Podium Platform */}
              <motion.div 
                className="w-16 h-10 bg-gradient-to-b from-purple-500 to-purple-700 rounded-t-xl mt-1 flex items-center justify-center"
                initial={{ height: 0 }}
                animate={{ height: 40 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <span className="text-white/60 text-xl font-bold">3</span>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Next round preview or host hint */}
        {hasMoreRounds && nextRound ? (
          <motion.div
            className="mt-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <div className="bg-purple-500/30 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-purple-300" />
              <span className="text-white/80 text-sm">შემდეგი:</span>
              <span className="text-white font-semibold text-sm">{nextRound.category_name}</span>
            </div>
            <motion.p
              className="text-white/50 text-xs mt-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {isHost ? 'დააჭირე კონტროლერზე გასაგრძელებლად' : 'მოლოდინი...'}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            className="mt-4 flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <p className="text-white/60 text-xs">
              {isHost ? 'ახალი რაუნდის დასაწყებად დააჭირე ღილაკს კონტროლერზე' : 'რაუნდები დასრულდა'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Right Side - Leaderboard */}
      <motion.div 
        className="w-72 bg-purple-800/50 backdrop-blur-sm rounded-xl p-3 flex flex-col max-h-full"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h2 className="text-white text-base font-bold mb-2 text-center flex-shrink-0">ლიდერბორდი</h2>
        
        <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0">
          {sortedPlayers.map((player, index) => {
            const stats = getPlayerStats(player);
            return (
              <motion.div
                key={player.id}
                className="flex items-center gap-1.5 bg-purple-700/50 rounded-lg p-1.5 hover:bg-purple-700/70 transition-colors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                {/* Rank */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px]
                  ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-purple-600'}`}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <Avatar className="w-7 h-7 ring-1 ring-cyan-400 border border-white/30">
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-500 text-white font-bold text-[10px]">
                    {player.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <span className="text-white font-medium flex-1 truncate text-xs">
                  {player.nickname}
                </span>

                {/* Stats */}
                <div className="flex items-center gap-1.5">
                  {/* Correct */}
                  <span className="text-green-400 flex items-center gap-0.5 text-[10px]">
                    <Check className="w-2.5 h-2.5" />
                    {stats.correctCount}
                  </span>

                  {/* Incorrect */}
                  <span className="text-red-400 flex items-center gap-0.5 text-[10px]">
                    <X className="w-2.5 h-2.5" />
                    {stats.incorrectCount}
                  </span>

                  {/* Score with coin icon */}
                  <span className="text-yellow-400 flex items-center gap-0.5 font-semibold text-xs min-w-[40px] justify-end">
                    <Coins className="w-2.5 h-2.5" />
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
