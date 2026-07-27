import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { supabase } from '@/integrations/supabase/client';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import goldMedal from '@/assets/trophy-gold.png';
import silverMedal from '@/assets/trophy-silver.png';
import bronzeMedal from '@/assets/trophy-bronze.png';


import { useLanguage } from '@/contexts/LanguageContext';

export const TVResultsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { players, code, sessionId } = useTVGame();
  const [showConfetti, setShowConfetti] = useState(false);

  // Presence is volatile - if the TV's socket went stale during the game the
  // presence list is empty/frozen and the podium rendered blank. The durable
  // tv_players roster (scores persisted on every answer) is the fallback.
  type DbResultRow = { player_id: string; nickname: string; avatar_url: string | null; is_host: boolean; current_round_score: number | null };
  const [dbRoster, setDbRoster] = useState<DbResultRow[]>([]);
  useEffect(() => {
    if (!sessionId || sessionId === 'mock-session-id') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('tv_players')
        .select('player_id, nickname, avatar_url, is_host, current_round_score')
        .eq('tv_session_id', sessionId);
      if (!cancelled && data) {
        const systemIds = ['TV_DISPLAY', 'TV_MIRROR'];
        setDbRoster((data as DbResultRow[]).filter(
          p => !systemIds.includes(p.player_id) && !systemIds.includes(p.nickname || '')
        ));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ONE PODIUM SPOT PER PERSON: identity = normalized nickname. Re-bound
  // devices leave duplicate rows/entries for the same human; take the best
  // score across all of a person's entries (presence + every DB row).
  const norm = (s: string | null | undefined) => (s || '').trim().toLowerCase();
  const bestDbScoreByNickname = new Map<string, DbResultRow>();
  dbRoster.forEach(p => {
    const key = norm(p.nickname);
    const existing = bestDbScoreByNickname.get(key);
    if (!existing || (p.current_round_score || 0) > (existing.current_round_score || 0)) {
      bestDbScoreByNickname.set(key, p);
    }
  });

  const seenNicknames = new Set<string>();
  const mergedPlayers = players
    .filter(p => {
      const key = norm(p.nickname);
      if (seenNicknames.has(key)) return false;
      seenNicknames.add(key);
      return true;
    })
    .map(p => {
      const dbScore = bestDbScoreByNickname.get(norm(p.nickname))?.current_round_score || 0;
      return dbScore > p.score ? { ...p, score: dbScore } : p;
    });

  const dbOnlyPlayers = [...bestDbScoreByNickname.values()]
    .filter(p => !seenNicknames.has(norm(p.nickname)))
    .map(p => ({
      id: p.player_id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      score: p.current_round_score || 0,
      hasAnswered: false,
      lastAnswerCorrect: null,
      lastAnswer: null,
      isHost: p.is_host,
    }));
  const allPlayers = [...mergedPlayers, ...dbOnlyPlayers];

  // Sort players by score
  const sortedPlayers = [...allPlayers].sort((a, b) => b.score - a.score);
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
        className="text-center pt-6 mb-2 flex-shrink-0"
      >
        {/* MyTrivia Logo */}
        <div className="flex items-center justify-center mb-4">
          <span
            className="text-4xl font-slackey text-white"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            MyTrivia
          </span>
          <span className="ml-2 px-2 py-1 rounded-md text-xs font-bold text-white bg-red-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>
        <h1 className="text-4xl font-bold text-white font-display mb-2">{t("extra.tvGameOver")}</h1>
        <p className="text-purple-300 text-lg">{t("extra.tvFinalResults")}</p>
      </motion.div>

      {/* Center stage - podium floats in the middle of the free space */}
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        {/* Podium */}
        <div className="flex items-end justify-center gap-10 flex-shrink-0">
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
                {/* Trophy - large, with clear air below so it never touches the avatar */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6 + displayIndex * 0.2, type: 'spring' }}
                  className={actualRank === 0 ? 'mb-6' : 'mb-5'}
                >
                  <img
                    src={actualRank === 0 ? goldMedal : actualRank === 1 ? silverMedal : bronzeMedal}
                    alt={actualRank === 0 ? 'Gold' : actualRank === 1 ? 'Silver' : 'Bronze'}
                    className={`${actualRank === 0 ? 'w-24 h-24' : 'w-20 h-20'} object-contain drop-shadow-lg`}
                  />
                </motion.div>

                {/* Player avatar */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative mb-4"
                >
                  <SafeAvatar
                    avatarUrl={player.avatar_url}
                    fallback={player.nickname}
                    className={`${actualRank === 0 ? 'w-28 h-28' : 'w-24 h-24'} ring-4 ${
                      actualRank === 0 ? 'ring-yellow-400' :
                      actualRank === 1 ? 'ring-gray-400' :
                      'ring-orange-400'
                    }`}
                    fallbackClassName="bg-purple-600 text-white text-2xl"
                  />
                </motion.div>

                {/* Name and score */}
                <p className="text-white font-bold text-2xl mb-1">{player.nickname}</p>
                <p className="text-purple-300 font-semibold text-lg mb-4">{player.score} {t("extra.tvPoints")}</p>

                {/* Podium block */}
                <div className={`w-36 ${actualRank === 0 ? 'h-32' : actualRank === 1 ? 'h-24' : 'h-16'} bg-gradient-to-t ${getPodiumColor(actualRank)} rounded-t-xl flex items-center justify-center`}>
                  <span className="text-white text-4xl font-bold">{actualRank + 1}</span>
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
            className="max-w-4xl mx-auto w-full min-h-0 overflow-y-auto mt-8"
          >
            <h3 className="text-purple-300 text-base mb-2 text-center">{t("extra.tvOtherPlayers")}</h3>
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
      </div>

      {/* Play again hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="pt-8 pb-8 text-center flex-shrink-0"
      >
        <p className="text-purple-300 text-lg">
          {t("extra.tvHostCanStartNew")}
        </p>
      </motion.div>
    </div>
  );
};
