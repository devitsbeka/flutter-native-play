import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, RotateCcw, Home } from 'lucide-react';
import { useTVSession } from '@/contexts/TVSessionContext';
import { Avatar } from '@/components/shared/Avatar';
import { ChunkyButton } from '@/components/ui/chunky-button';
import confetti from 'canvas-confetti';

const PODIUM_HEIGHTS = [160, 200, 120]; // 2nd, 1st, 3rd place heights
const PODIUM_COLORS = ['bg-gray-400', 'bg-yellow-500', 'bg-amber-700'];
const MEDAL_COLORS = ['text-gray-400', 'text-yellow-500', 'text-amber-700'];

export const TVScoreboardScreen: React.FC = () => {
  const { players, leaveSession } = useTVSession();
  const [showConfetti, setShowConfetti] = useState(false);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topThree = sortedPlayers.slice(0, 3);
  const restOfPlayers = sortedPlayers.slice(3);

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = topThree.length >= 3 
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree.length >= 2
      ? [topThree[1], topThree[0]]
      : topThree;

  useEffect(() => {
    // Trigger confetti for winner
    const timer = setTimeout(() => {
      setShowConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handlePlayAgain = () => {
    // This would reset the game state and go back to pairing
    window.location.reload();
  };

  const handleExit = async () => {
    await leaveSession();
    window.location.href = '/team';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-12"
      >
        <Trophy className="w-12 h-12 text-yellow-500" />
        <h1 className="text-4xl font-bold text-foreground">საბოლოო შედეგები</h1>
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-12">
        {podiumOrder.map((player, displayIndex) => {
          if (!player) return null;
          
          // Get actual rank (0-indexed)
          const actualRank = displayIndex === 1 ? 0 : displayIndex === 0 ? 1 : 2;
          const podiumHeight = PODIUM_HEIGHTS[displayIndex];
          const podiumColor = PODIUM_COLORS[actualRank];
          const medalColor = MEDAL_COLORS[actualRank];

          return (
            <motion.div
              key={player.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + displayIndex * 0.2, type: 'spring' }}
              className="flex flex-col items-center"
            >
              {/* Player Info */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + displayIndex * 0.2, type: 'spring' }}
                className="mb-4 text-center"
              >
                <div className="relative">
                  <Avatar
                    imageUrl={player.avatar_url}
                    emoji={player.nickname?.[0] || '👤'}
                    size="xl"
                    className="border-4 border-background shadow-xl"
                  />
                  {actualRank === 0 && (
                    <motion.div
                      initial={{ rotate: -20, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 1.2, type: 'spring' }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2"
                    >
                      <span className="text-4xl">👑</span>
                    </motion.div>
                  )}
                </div>
                <p className="text-foreground font-bold mt-2 text-lg">{player.nickname}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-yellow-500 font-bold">{player.score}</span>
                </div>
              </motion.div>

              {/* Podium Stand */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: podiumHeight }}
                transition={{ delay: 0.5 + displayIndex * 0.1, duration: 0.5 }}
                className={`w-32 ${podiumColor} rounded-t-2xl flex items-start justify-center pt-4 shadow-lg`}
              >
                <div className="flex flex-col items-center">
                  <Medal className={`w-10 h-10 ${medalColor}`} />
                  <span className="text-white font-bold text-2xl mt-1">
                    {actualRank + 1}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Rest of Leaderboard */}
      {restOfPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="w-full max-w-md mb-8"
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {restOfPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.6 + index * 0.1 }}
                className="flex items-center gap-4 p-4 border-b border-border last:border-b-0"
              >
                <span className="text-muted-foreground font-bold w-8">
                  #{index + 4}
                </span>
                <Avatar
                  imageUrl={player.avatar_url}
                  emoji={player.nickname?.[0] || '👤'}
                  size="sm"
                />
                <span className="text-foreground font-medium flex-1">
                  {player.nickname}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-yellow-500 font-bold">{player.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="flex gap-4"
      >
        <ChunkyButton
          variant="primary"
          size="lg"
          icon={<RotateCcw className="w-5 h-5" />}
          onClick={handlePlayAgain}
        >
          თავიდან თამაში
        </ChunkyButton>
        <ChunkyButton
          variant="secondary"
          size="lg"
          icon={<Home className="w-5 h-5" />}
          onClick={handleExit}
        >
          გასვლა
        </ChunkyButton>
      </motion.div>
    </div>
  );
};
