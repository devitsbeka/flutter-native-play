import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { MyTriviaLiveLogo } from '@/components/shared/MyTriviaLiveLogo';
import { Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import goldMedal from '@/assets/trophy-gold.png';
import silverMedal from '@/assets/trophy-silver.png';
import bronzeMedal from '@/assets/trophy-bronze.png';


import { useLanguage } from '@/contexts/LanguageContext';
import { useDurableRoster } from '@/hooks/useDurableRoster';

export const TVResultsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { players, code, sessionId } = useTVGame();
  const [showConfetti, setShowConfetti] = useState(false);

  // Presence is volatile; tv_players is the durable record behind it. The
  // whole merge now lives in useDurableRoster, because the controller's
  // game-over screen needed exactly the same thing and did not have it.
  const sortedPlayers = useDurableRoster(sessionId, players);

  // An infinite drift is exactly the kind of motion somebody may have asked
  // their device to stop. The trophies simply hold still for them.
  const swaying = !useReducedMotion();

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
        className="text-center pt-4 mb-1 flex-shrink-0"
      >
        {/* Crown logo — the hand-written "MyTrivia + LIVE" text pair was the
            pre-rebrand logo and kept resurfacing on the TV. */}
        <div className="flex items-center justify-center mb-2">
          <MyTriviaLiveLogo size="lg" textColor="light" />
        </div>
        <p className="text-purple-300 text-lg">{t("extra.tvFinalResults")}</p>
      </motion.div>

      {/* Center stage - podium floats in the middle of the free space */}
      <div className="flex-1 min-h-0 flex flex-col justify-center items-center">
        {/* Podium */}
        <div className="flex items-end justify-center gap-8 flex-shrink-0">
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
                {/* Avatar with its trophy floating ABOVE it, clear of the ring.
                    It used to sit on the avatar's bottom edge, overlapping the
                    face and the ring both — a medal worn rather than awarded.
                    Still absolutely positioned, so it costs no layout height
                    and the places below the podium keep their room; mt-16 is
                    what buys the space it floats into. */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative mt-16 mb-3"
                >
                  <SafeAvatar
                    avatarUrl={player.avatar_url}
                    fallback={player.nickname}
                    className={`${actualRank === 0 ? 'w-24 h-24' : 'w-20 h-20'} ring-4 ${
                      actualRank === 0 ? 'ring-yellow-400' :
                      actualRank === 1 ? 'ring-gray-400' :
                      'ring-orange-400'
                    }`}
                    fallbackClassName="bg-purple-600 text-white text-2xl"
                  />
                  {/* Positioning lives on this wrapper, NOT on the image.
                      framer-motion writes its own `transform` for scale/rotate,
                      which silently overwrites Tailwind's -translate-x-1/2 - so
                      the trophy's LEFT EDGE ended up on the avatar's centre
                      instead of its middle. Separating the two keeps the
                      centring immune to whatever the animation does.

                      `bottom-full mb-3` puts the trophy's foot on the avatar's
                      crown and then lifts it 12px clear, so nothing touches the
                      ring at any size. */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-10">
                    {/* The sway is its own layer, between the centring wrapper
                        and the image, because all three want the transform
                        property and only one element can have it. Outer:
                        centring. This: the drift. Inner: the arrival pop. */}
                    <motion.div
                      animate={swaying ? { x: [0, -7, 0, 7, 0] } : undefined}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        // Staggered by place, so three trophies drift with the
                        // room rather than marching in step. Starts after the
                        // arrival pop below has landed.
                        delay: 1.2 + displayIndex * 0.6,
                      }}
                    >
                      <motion.img
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.6 + displayIndex * 0.2, type: 'spring' }}
                        src={actualRank === 0 ? goldMedal : actualRank === 1 ? silverMedal : bronzeMedal}
                        alt={actualRank === 0 ? 'Gold' : actualRank === 1 ? 'Silver' : 'Bronze'}
                        className={`${actualRank === 0 ? 'w-11 h-11' : 'w-9 h-9'} object-contain
                          drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`}
                      />
                    </motion.div>
                  </div>
                </motion.div>

                <div className="max-w-[13rem]">
                  <p className="text-white font-bold text-2xl truncate mb-1">{player.nickname}</p>
                </div>
                <p className="text-purple-300 font-semibold text-lg mb-3">{player.score} {t("extra.tvPoints")}</p>

                {/* Podium block */}
                <div className={`w-32 ${actualRank === 0 ? 'h-24' : actualRank === 1 ? 'h-20' : 'h-12'} bg-gradient-to-t ${getPodiumColor(actualRank)} rounded-t-xl flex items-center justify-center`}>
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
            className="max-w-4xl w-full flex-shrink-0 mt-6"
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
        className="pt-4 pb-4 text-center flex-shrink-0"
      >
        <p className="text-purple-300 text-lg">
          {t("extra.tvHostCanStartNew")}
        </p>
      </motion.div>
    </div>
  );
};
