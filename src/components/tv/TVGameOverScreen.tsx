import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Medal, LogOut } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import confetti from 'canvas-confetti';
import crown2 from '@/assets/icons/crown-2.png';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
  hasAnswered?: boolean;
  isHost?: boolean;
}

interface TVGameOverScreenProps {
  players: Player[];
  currentPlayerId?: string;
  onExit?: () => void;
  isHost?: boolean;
  onPlayAgain?: () => void;
  hasMoreRounds?: boolean;
}

export const TVGameOverScreen: React.FC<TVGameOverScreenProps> = ({
  players,
  currentPlayerId,
  onExit,
  isHost = false,
  onPlayAgain,
  hasMoreRounds = false,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const currentPlayerRank = sortedPlayers.findIndex(p => p.id === currentPlayerId) + 1;
  const currentPlayer = sortedPlayers.find(p => p.id === currentPlayerId);

  useEffect(() => {
    // Trigger confetti for top 3
    if (currentPlayerRank <= 3 && currentPlayerRank > 0) {
      setShowConfetti(true);
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = currentPlayerRank === 1 
        ? ['#FFD700', '#FFA500', '#FFEC8B'] 
        : currentPlayerRank === 2 
        ? ['#C0C0C0', '#E8E8E8', '#A8A8A8']
        : ['#CD7F32', '#D2691E', '#8B4513'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [currentPlayerRank]);

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="text-6xl"
          >
            🥇
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.1 }}
            className="text-5xl"
          >
            🥈
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
            className="text-5xl"
          >
            🥉
          </motion.div>
        );
      default:
        return (
          <span className="text-3xl font-bold text-muted-foreground">#{rank}</span>
        );
    }
  };

  const getRankText = (rank: number) => {
    switch (rank) {
      case 1: return '1st Place!';
      case 2: return '2nd Place!';
      case 3: return '3rd Place!';
      default: return `#${rank} Place`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-amber-500';
      case 2: return 'from-gray-300 to-gray-400';
      case 3: return 'from-orange-400 to-orange-600';
      default: return 'from-primary/50 to-primary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 via-background to-background p-4 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">თამაში დასრულდა!</h1>
        </div>
      </motion.div>

      {/* Your Result */}
      {currentPlayer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center mb-6"
        >
          <div className={`bg-gradient-to-r ${getRankColor(currentPlayerRank)} p-1 rounded-2xl mb-3`}>
            <div className="bg-card rounded-xl px-8 py-4 flex flex-col items-center">
              {getMedalIcon(currentPlayerRank)}
              <span className="text-lg font-bold mt-2">{getRankText(currentPlayerRank)}</span>
              
              {/* Avatar */}
              <div className="relative mt-3">
                {currentPlayerRank === 1 && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: -35, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute left-1/2 -translate-x-1/2"
                  >
                    <Crown className="w-8 h-8 text-yellow-500" />
                  </motion.div>
                )}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden border-4 border-primary/30">
                  {currentPlayer.avatar_url ? (
                    <img 
                      src={currentPlayer.avatar_url} 
                      alt={currentPlayer.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-primary-foreground">
                      {currentPlayer.nickname.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              <span className="text-lg font-semibold mt-2">{currentPlayer.nickname}</span>
              <motion.span 
                className="text-3xl font-bold text-primary"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {currentPlayer.score.toLocaleString()} pts
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex-1 bg-card/50 rounded-2xl p-4 backdrop-blur-sm border border-border/50 mb-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Medal className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">ლიდერბორდი</h2>
        </div>
        
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          <AnimatePresence>
            {sortedPlayers.map((player, index) => {
              const rank = index + 1;
              const isCurrentPlayer = player.id === currentPlayerId;
              
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCurrentPlayer 
                      ? 'bg-primary/20 border-2 border-primary' 
                      : 'bg-muted/30'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {rank <= 3 ? (
                      <span className="text-2xl">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
                    )}
                  </div>
                  
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {player.avatar_url ? (
                      <img 
                        src={player.avatar_url} 
                        alt={player.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {player.nickname.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1">
                    <span className={`font-semibold ${isCurrentPlayer ? 'text-primary' : ''}`}>
                      {player.nickname}
                      {isCurrentPlayer && ' (შენ)'}
                      {player.isHost && (
                        <img
                          src={crown2}
                          alt="Host"
                          className="inline-block w-4 h-4 ml-1 align-text-bottom"
                          loading="lazy"
                        />
                      )}
                    </span>
                  </div>
                  
                  {/* Score */}
                  <span className="font-bold text-lg">
                    {player.score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Waiting message */}
      {hasMoreRounds ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-muted-foreground mb-4"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            შემდეგი რაუნდის მოლოდინი...
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-muted-foreground mb-4"
        >
          რაუნდები დასრულდა
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex gap-3"
      >
        {isHost && onPlayAgain && (
          <ChunkyButton
            onClick={onPlayAgain}
            variant="primary"
            className="flex-1"
          >
            ახალი თამაში
          </ChunkyButton>
        )}
        {onExit && (
          <ChunkyButton
            onClick={onExit}
            variant="secondary"
            className={isHost ? '' : 'flex-1'}
          >
            <LogOut className="w-5 h-5 mr-2" />
            გასვლა
          </ChunkyButton>
        )}
      </motion.div>
    </div>
  );
};
