import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTVGame } from '@/contexts/TVGameContext';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { Trophy, Check, Clock } from 'lucide-react';

export const TVLeaderboardPanel: React.FC = () => {
  const { players } = useTVGame();
  const { t } = useLanguage();

  // Sort: active players first by score, then inactive players by score
  const sortedPlayers = [...players].sort((a, b) => {
    const aActive = (a as any).isActive !== false;
    const bActive = (b as any).isActive !== false;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return b.score - a.score;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h3 className="text-white text-xl font-bold">{t("extra.tvRating")}</h3>
      </div>

      {/* Player list */}
      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                (player as any).isActive === false ? 'opacity-50 grayscale' :
                index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                index === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                index === 2 ? 'bg-orange-600/20 border border-orange-600/30' :
                'bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0 ? 'bg-yellow-500 text-yellow-900' :
                index === 1 ? 'bg-gray-400 text-gray-900' :
                index === 2 ? 'bg-orange-600 text-orange-100' :
                'bg-white/10 text-white'
              }`}>
                {index + 1}
              </div>

              {/* Avatar */}
              <SafeAvatar 
                avatarUrl={player.avatar_url}
                fallback={player.nickname}
                className="w-10 h-10"
                fallbackClassName="bg-purple-600 text-white text-sm"
              />

              {/* Name and status */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">
                  {player.nickname}
                </p>
                <div className="flex items-center gap-1">
                  {(player as any).isActive === false ? (
                    <span className="text-purple-400/70 text-xs">{t("extra.tvDisconnected")}</span>
                  ) : player.hasAnswered ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 text-xs">{t("extra.tvAnswered")}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span className="text-purple-400 text-xs">{t("extra.tvThinking")}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Score */}
              <motion.div
                key={player.score}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-white font-bold text-lg"
              >
                {player.score}
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
