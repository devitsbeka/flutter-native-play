import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Users } from 'lucide-react';
import { useTVSession } from '@/contexts/TVSessionContext';
import { Avatar } from '@/components/shared/Avatar';

const OPTION_COLORS = [
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'A', labelBg: '#A855F7', barBg: '#A855F7' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'B', labelBg: '#7C3AED', barBg: '#7C3AED' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'C', labelBg: '#6366F1', barBg: '#6366F1' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'D', labelBg: '#8B5CF6', barBg: '#8B5CF6' },
];

export const TVRevealScreen: React.FC = () => {
  const { questions, currentQuestionIndex, players } = useTVSession();

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  const correctAnswer = currentQuestion.correct_answer;
  const correctIndex = currentQuestion.options.findIndex(opt => opt === correctAnswer);

  const correctPlayers = players.filter(p => p.lastAnswerCorrect);
  const wrongPlayers = players.filter(p => p.hasAnswered && !p.lastAnswerCorrect);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-foreground mb-2">
          {currentQuestion.question_text}
        </h2>
      </motion.div>

      {/* Answer Options with Results */}
      <div className="flex-1 grid grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
        {currentQuestion.options.map((option, index) => {
          const color = OPTION_COLORS[index];
          const isCorrect = option === correctAnswer;
          const playersWhoChoseThis = players.filter(p => p.lastAnswer === option);
          const totalAnswered = players.filter(p => p.hasAnswered).length;
          const percentage = totalAnswered > 0 ? (playersWhoChoseThis.length / totalAnswered) * 100 : 0;

          return (
            <motion.div
              key={index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-2xl p-6 overflow-hidden"
              style={{
                background: isCorrect 
                  ? 'linear-gradient(180deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.15) 100%)'
                  : playersWhoChoseThis.length > 0
                    ? 'linear-gradient(180deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.1) 100%)'
                    : color.bg,
                border: isCorrect 
                  ? '2px solid rgba(34,197,94,0.8)'
                  : playersWhoChoseThis.length > 0
                    ? '2px solid rgba(239,68,68,0.5)'
                    : '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Distribution Bar Background */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                className="absolute inset-0 opacity-30"
                style={{
                  background: isCorrect 
                    ? 'linear-gradient(90deg, rgba(34,197,94,0.5) 0%, rgba(34,197,94,0.2) 100%)'
                    : `linear-gradient(90deg, ${color.barBg}80 0%, ${color.barBg}20 100%)`,
                }}
              />

              {/* Correct/Wrong indicator */}
              {isCorrect && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center z-10"
                >
                  <Check className="w-6 h-6 text-white" />
                </motion.div>
              )}

              <div className="relative z-10 flex items-center gap-4 mb-4">
                {/* Option Label Badge */}
                <span 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                  style={{ background: isCorrect ? '#22C55E' : color.labelBg }}
                >
                  {color.label}
                </span>
                <span className="text-xl font-medium text-white flex-1">
                  {option}
                </span>
                
                {/* Distribution Stats */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1.5"
                >
                  <Users className="w-4 h-4 text-white/70" />
                  <span className="text-white font-bold">{playersWhoChoseThis.length}</span>
                  <span className="text-white/60 text-sm">({Math.round(percentage)}%)</span>
                </motion.div>
              </div>

              {/* Players who chose this answer */}
              {playersWhoChoseThis.length > 0 && (
                <div className="relative z-10 flex flex-wrap gap-2 mt-2">
                  {playersWhoChoseThis.map((player, pIndex) => (
                    <motion.div
                      key={player.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + pIndex * 0.1 }}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        isCorrect ? 'bg-green-500/30' : 'bg-red-500/30'
                      }`}
                    >
                      <Avatar
                        imageUrl={player.avatar_url}
                        emoji={player.nickname?.[0] || '👤'}
                        size="sm"
                      />
                      <span className="text-sm text-white">{player.nickname}</span>
                      {isCorrect ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 flex justify-center gap-8"
      >
        <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-full px-6 py-3">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-bold text-lg">{correctPlayers.length} სწორი</span>
        </div>
        <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-full px-6 py-3">
          <X className="w-5 h-5 text-red-400" />
          <span className="text-red-400 font-bold text-lg">{wrongPlayers.length} არასწორი</span>
        </div>
      </motion.div>

      {/* Next question indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 text-center"
      >
        <span className="text-muted-foreground">შემდეგი კითხვა მოდის...</span>
      </motion.div>
    </div>
  );
};
