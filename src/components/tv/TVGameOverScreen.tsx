import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Crown, Medal, LogOut, Library, Vote } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';

import crown2 from '@/assets/icons/crown-2.png';
import { AppIcon } from '@/components/shared/AppIcon';
import { SafeAvatarImage } from '@/components/shared/SafeAvatar';
import medalGold from '@/assets/icons/medal-gold.png';
import medalSilver from '@/assets/icons/medal-silver.png';
import medalBronze from '@/assets/icons/medal-bronze.png';

const RANK_MEDALS: Record<number, string> = { 1: medalGold, 2: medalSilver, 3: medalBronze };

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
  onContinueNextRound?: () => void;
  hasMoreRounds?: boolean;
  onDirectSelection?: () => void;  // NEW: Direct category pick
  onStartPoll?: () => void;        // NEW: Start poll mode
}

export const TVGameOverScreen: React.FC<TVGameOverScreenProps> = ({
  players,
  currentPlayerId,
  onExit,
  isHost = false,
  onPlayAgain,
  onContinueNextRound,
  hasMoreRounds = false,
  onDirectSelection,
  onStartPoll,
}) => {
  const { t } = useLanguage();
  

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const currentPlayerRank = sortedPlayers.findIndex(p => p.id === currentPlayerId) + 1;
  const currentPlayer = sortedPlayers.find(p => p.id === currentPlayerId);


  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="flex items-center justify-center"
          >
            <AppIcon slug="medal" size={64} />
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.1 }}
            className="flex items-center justify-center"
          >
            <AppIcon slug="medal" size={56} />
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <AppIcon slug="medal" size={56} />
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-white">
            {hasMoreRounds ? t("extra.tvRoundOver") : t("extra.tvGameOverExcl")}
          </h1>
        </div>
      </motion.div>

      {/* Your Result - minimal display */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex-1 min-h-0 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20 mb-4 flex flex-col"
      >
        <div className="flex items-center gap-2 mb-4">
          <Medal className="w-5 h-5 text-purple-300" />
          <h2 className="text-lg font-bold text-white">{t("extra.tvLeaderboard")}</h2>
        </div>
        
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
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
                      ? 'bg-purple-500/30 border-2 border-purple-400' 
                      : 'bg-white/10'
                  }`}
                >
                  {/* Medal above the avatar, with a hair of air between
                      them — a gap-1 column, so the trophy sits ON TOP of the
                      player it belongs to instead of floating in its own
                      side column, and never touches the picture. Gold,
                      silver and bronze by rank; the one generic medal this
                      used to draw made first and second place look the
                      same. */}
                  <div className="flex w-12 shrink-0 flex-col items-center gap-1">
                    {rank <= 3 ? (
                      <img
                        src={RANK_MEDALS[rank]}
                        alt={`#${rank}`}
                        className="h-6 w-6 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                      />
                    ) : (
                      <span className="text-sm font-bold leading-6 text-purple-300">#{rank}</span>
                    )}
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      <SafeAvatarImage
                        avatarUrl={player.avatar_url}
                        fallback={player.nickname}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1">
                    <span className={`font-semibold ${isCurrentPlayer ? 'text-purple-300' : 'text-white'}`}>
                      {player.nickname}
                      {isCurrentPlayer && ` ${t("extra.tvYou")}`}
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
                  <span className="font-bold text-lg text-white">
                    {player.score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Status message */}
      {!isHost && hasMoreRounds && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-purple-200 mb-4"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {t("extra.tvWaitingNextRound")}
          </motion.div>
        </motion.div>
      )}
      {!hasMoreRounds && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-purple-200 mb-4"
        >
          {t("extra.tvRoundsFinished")}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col gap-3"
      >
        {isHost && hasMoreRounds && onContinueNextRound ? (
          <ChunkyButton
            onClick={onContinueNextRound}
            variant="primary"
            className="w-full"
          >
            {t("extra.tvNextRound")}
          </ChunkyButton>
        ) : isHost && !hasMoreRounds ? (
          // Two-option new game flow: Direct Selection or Poll
          <div className="space-y-2">
            {onDirectSelection && (
              <ChunkyButton
                onClick={onDirectSelection}
                variant="primary"
                className="w-full"
              >
                <Library className="w-5 h-5 mr-2" />
                {t("extra.tvAddCategory")}
              </ChunkyButton>
            )}
            {onStartPoll && (
              <ChunkyButton
                onClick={onStartPoll}
                variant="secondary"
                className="w-full"
              >
                <Vote className="w-5 h-5 mr-2" />
                {t("extra.tvStartPoll")}
              </ChunkyButton>
            )}
          </div>
        ) : null}
        {onExit && (
          <ChunkyButton
            onClick={onExit}
            variant="outline"
            className="w-full"
          >
            <LogOut className="w-5 h-5 mr-2" />
            {t("extra.tvExit")}
          </ChunkyButton>
        )}
      </motion.div>
    </div>
  );
};
