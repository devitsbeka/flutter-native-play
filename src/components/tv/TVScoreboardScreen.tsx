import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from 'framer-motion';
import { Trophy, Star, RotateCcw, Home, Crown } from 'lucide-react';
import { useTVGame, TVPlayer } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import confetti from 'canvas-confetti';
import { AppIcon } from '@/components/shared/AppIcon';
import { SafeAvatarImage } from '@/components/shared/SafeAvatar';

const PODIUM_HEIGHTS = [160, 200, 120]; // 2nd, 1st, 3rd place heights
const PODIUM_COLORS = ['bg-gray-400', 'bg-yellow-500', 'bg-amber-700'];

interface TVScoreboardScreenProps {
  players?: TVPlayer[];
  onPlayAgain?: () => void;
  onExit?: () => void;
}

export const TVScoreboardScreen: React.FC<TVScoreboardScreenProps> = ({
  players: propPlayers,
  onPlayAgain: propPlayAgain,
  onExit: propExit,
}) => {
  const { players: contextPlayers, leaveSession } = useTVGame();
  const [showConfetti, setShowConfetti] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Use props if provided, otherwise fall back to context
  const players = propPlayers && propPlayers.length > 0 ? propPlayers : contextPlayers;

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
    if (players.length > 0) {
      const timer = setTimeout(() => {
        setShowConfetti(true);
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#9333ea', '#7c3aed'],
        });
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [players.length]);

  const handlePlayAgain = () => {
    if (propPlayAgain) {
      propPlayAgain();
    } else {
      window.location.reload();
    }
  };

  const handleExit = async () => {
    if (propExit) {
      propExit();
    } else {
      leaveSession();
      navigate('/team');
    }
  };

  // Show message if no players
  if (players.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-8">
        <Trophy className="w-24 h-24 text-yellow-500 mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4">{t("extra.gameFinished")}</h1>
        <p className="text-purple-200 text-xl mb-8">{t("extra.resultsLoading2")}</p>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-purple-300"
        >
          {t("extra.waiting")}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <Trophy className="w-16 h-16 text-yellow-500" />
        <h1 className="text-5xl font-bold text-white">{t("extra.tvFinalResults")}</h1>
        <Trophy className="w-16 h-16 text-yellow-500" />
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-6 mb-8">
        {podiumOrder.map((player, displayIndex) => {
          if (!player) return null;
          
          // Get actual rank (0-indexed)
          const actualRank = displayIndex === 1 ? 0 : displayIndex === 0 ? 1 : 2;
          const podiumHeight = PODIUM_HEIGHTS[displayIndex];
          const podiumColor = PODIUM_COLORS[actualRank];

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
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center overflow-hidden border-4 ${actualRank === 0 ? 'border-yellow-500' : actualRank === 1 ? 'border-gray-400' : 'border-amber-700'} shadow-xl`}>
                    <SafeAvatarImage
                      avatarUrl={player.avatar_url}
                      fallback={player.nickname || '?'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {actualRank === 0 && (
                    <motion.div
                      initial={{ rotate: -20, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 1.2, type: 'spring' }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2"
                    >
                      <Crown className="w-12 h-12 text-yellow-500 fill-yellow-500" />
                    </motion.div>
                  )}
                  {player.isHost && (
                    <div className="absolute -bottom-1 -right-1 bg-purple-600 rounded-full p-1">
                      <Crown className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-white font-bold mt-3 text-xl">{player.nickname}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-yellow-500 font-bold text-2xl">{player.score.toLocaleString()}</span>
                </div>
              </motion.div>

              {/* Podium Stand */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: podiumHeight }}
                transition={{ delay: 0.5 + displayIndex * 0.1, duration: 0.5 }}
                className={`w-40 ${podiumColor} rounded-t-2xl flex items-start justify-center pt-4 shadow-lg`}
              >
                <div className="flex flex-col items-center">
                  <AppIcon slug="medal" size={72} />
                  <span className="text-white font-bold text-3xl mt-1">
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
          className="w-full max-w-2xl mb-8"
        >
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
            {restOfPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.6 + index * 0.1 }}
                className="flex items-center gap-4 p-4 border-b border-white/10 last:border-b-0"
              >
                <span className="text-purple-300 font-bold w-12 text-xl">
                  #{index + 4}
                </span>
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                  <SafeAvatarImage
                    avatarUrl={player.avatar_url}
                    fallback={player.nickname || '?'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-white font-medium flex-1 text-lg">
                  {player.nickname}
                  {player.isHost && (
                    <span className="ml-1 inline-flex align-middle">
                      <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-yellow-500 font-bold text-xl">{player.score.toLocaleString()}</span>
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
        className="flex gap-6"
      >
        <ChunkyButton
          variant="primary"
          size="lg"
          icon={<RotateCcw className="w-6 h-6" />}
          onClick={handlePlayAgain}
        >
          {t("extra.tvPlayAgain")}
        </ChunkyButton>
        <ChunkyButton
          variant="secondary"
          size="lg"
          icon={<Home className="w-6 h-6" />}
          onClick={handleExit}
        >
          {t("extra.tvExit")}
        </ChunkyButton>
      </motion.div>
    </div>
  );
};
