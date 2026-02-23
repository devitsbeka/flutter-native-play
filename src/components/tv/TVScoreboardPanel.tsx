import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Check, Clock } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  score: number;
  hasAnswered?: boolean;
  lastAnswerCorrect?: boolean | null;
  lastAnswer?: string | null;
  isHost?: boolean;
}

interface TVScoreboardPanelProps {
  players: Player[];
  showAnswerStatus?: boolean;
}

export const TVScoreboardPanel: React.FC<TVScoreboardPanelProps> = ({
  players,
  showAnswerStatus = true,
}) => {
  const { t } = useLanguage();
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="h-full bg-card/50 backdrop-blur-sm border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h3 className="text-xl font-bold text-foreground">{t("extra.tvLeaderboard")}</h3>
        </div>
      </div>

      {/* Players list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => {
            const position = index + 1;
            const positionColors = [
              'bg-yellow-500/20 border-yellow-500 text-yellow-500',
              'bg-gray-400/20 border-gray-400 text-gray-400',
              'bg-amber-600/20 border-amber-600 text-amber-600',
            ];
            const positionColor = positionColors[index] || 'bg-muted/20 border-muted text-muted-foreground';

            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="flex items-center gap-3 bg-background/50 rounded-xl p-3 border border-border"
              >
                {/* Position */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${positionColor} font-bold text-sm`}>
                  {position}
                </div>

                {/* Avatar with answer status */}
                <div className="relative">
                  <Avatar
                    imageUrl={player.avatar_url}
                    emoji={player.nickname?.[0] || '👤'}
                    size="sm"
                  />
                  {showAnswerStatus && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: player.hasAnswered ? 1 : 0.8 }}
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        player.hasAnswered 
                          ? 'bg-green-500' 
                          : 'bg-muted'
                      }`}
                    >
                      {player.hasAnswered ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <Clock className="w-3 h-3 text-muted-foreground" />
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Name and host badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground font-medium truncate">
                      {player.nickname}
                    </span>
                    {player.isHost && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        {t("extra.tvHostBadge")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <motion.div
                  key={player.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-lg font-bold text-primary"
                >
                  {player.score}
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {players.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            {t("extra.tvNoPlayersYet")}
          </div>
        )}
      </div>
    </div>
  );
};
