import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Clock, Users, Check, Trophy } from 'lucide-react';
import { SmartAvatar } from '@/components/shared/SmartAvatar';
import { getQuestionTime } from '@/utils/tvScoring';

const OPTION_COLORS = [
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'A', labelBg: '#A855F7' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'B', labelBg: '#7C3AED' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'C', labelBg: '#6366F1' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'D', labelBg: '#8B5CF6' },
];

export const TVQuestionScreenV3: React.FC = () => {
  const { 
    questions, 
    currentQuestionIndex, 
    timeRemaining, 
    players 
  } = useTVGame();
  
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = players.filter(p => p.hasAnswered).length;
  const totalPlayers = players.length;

  // Sort players by score for leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <p className="text-white text-2xl">Loading question...</p>
      </div>
    );
  }

  const questionTime = getQuestionTime();
  const timerPercentage = (timeRemaining / questionTime) * 100;

  return (
    <div className="h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4 flex overflow-hidden">
      {/* Main Question Area - 2/3 */}
      <div className="flex-1 flex flex-col pr-4 min-w-0" style={{ width: '66%' }}>
        {/* Header - Question Counter & Timer */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-xl font-bold text-white">
                {currentQuestionIndex + 1}
                <span className="text-purple-300">/{questions.length}</span>
              </span>
            </div>

            {/* Answered Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-white font-bold text-sm">{answeredCount}/{totalPlayers}</span>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`} />
            <div className="relative w-36 h-6 rounded-full overflow-hidden bg-white/10">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: timeRemaining <= 5 
                    ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
                    : 'linear-gradient(90deg, #A855F7 0%, #7C3AED 100%)',
                }}
                initial={{ width: '100%' }}
                animate={{ width: `${timerPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                {timeRemaining}s
              </span>
            </div>
          </div>
        </div>

        {/* Question Box - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center mb-4 flex-shrink-0"
        >
          <div 
            className="w-full max-w-3xl px-6 py-5 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <h2 
              className="text-2xl lg:text-3xl font-bold text-white leading-snug"
              style={{ fontFamily: 'var(--font-display, inherit)' }}
            >
              {currentQuestion.question_text}
            </h2>
          </div>
        </motion.div>

        {/* Answer Options - 2x2 Grid - Compact */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {currentQuestion.options.map((option, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="relative p-4 rounded-xl text-left flex items-center gap-3 min-h-[80px]"
              style={{
                background: OPTION_COLORS[index].bg,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
            >
              {/* Option Label Badge */}
              <span 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0 self-start mt-0.5"
                style={{ background: OPTION_COLORS[index].labelBg }}
              >
                {OPTION_COLORS[index].label}
              </span>
              
              {/* Option Text */}
              <span className="text-lg lg:text-xl font-bold text-white line-clamp-2 flex-1">
                {option}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Leaderboard Panel - 1/3 - Fixed height */}
      <div 
        className="w-72 rounded-2xl p-4 flex flex-col flex-shrink-0 max-h-full"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">ლიდერბორდი</h3>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
          <AnimatePresence mode="popLayout">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  player.hasAnswered ? 'bg-green-500/20' : 'bg-white/5'
                }`}
              >
                {/* Rank */}
                <div 
                  className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                    index === 0 ? 'bg-yellow-500 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-amber-600 text-amber-100' :
                    'bg-white/10 text-white/60'
                  }`}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8">
                    <SmartAvatar
                      avatarUrl={player.avatar_url}
                      fallback={player.nickname?.slice(0, 2)}
                      size="sm"
                    />
                  </div>
                  
                  {/* Answered Indicator */}
                  {player.hasAnswered && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </div>

                {/* Name & Score */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate text-sm">{player.nickname}</p>
                  {!player.hasAnswered && (
                    <motion.p 
                      className="text-purple-300/60 text-xs"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ფიქრობს...
                    </motion.p>
                  )}
                </div>

                {/* Score */}
                <motion.div
                  key={player.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-right flex-shrink-0"
                >
                  <span className="text-sm font-bold text-white">{player.score}</span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Waiting indicator */}
        <div className="mt-2 pt-2 border-t border-white/10 text-center flex-shrink-0">
          <div className="flex items-center justify-center gap-2 text-purple-300/60">
            <Users className="w-3 h-3" />
            <span className="text-xs">{answeredCount}/{totalPlayers} უპასუხა</span>
          </div>
        </div>
      </div>
    </div>
  );
};
