import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useTVSession } from '@/contexts/TVSessionContext';
import { Avatar } from '@/components/shared/Avatar';

const OPTION_COLORS = [
  { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', label: 'A' },
  { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', label: 'B' },
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', label: 'C' },
  { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', label: 'D' },
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

          return (
            <motion.div
              key={index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-6 border-2 ${
                isCorrect 
                  ? 'bg-green-500/30 border-green-500' 
                  : playersWhoChoseThis.length > 0
                    ? 'bg-red-500/20 border-red-500/50'
                    : `${color.bg} ${color.border} opacity-50`
              }`}
            >
              {/* Correct/Wrong indicator */}
              {isCorrect && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-6 h-6 text-white" />
                </motion.div>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-xl ${isCorrect ? 'bg-green-500/30' : color.bg} border ${isCorrect ? 'border-green-500' : color.border} flex items-center justify-center`}>
                  <span className={`text-xl font-bold ${isCorrect ? 'text-green-400' : color.text}`}>
                    {color.label}
                  </span>
                </div>
                <span className="text-xl font-medium text-foreground flex-1">
                  {option}
                </span>
              </div>

              {/* Players who chose this answer */}
              {playersWhoChoseThis.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {playersWhoChoseThis.map((player, pIndex) => (
                    <motion.div
                      key={player.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + pIndex * 0.1 }}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}
                    >
                      <Avatar
                        imageUrl={player.avatar_url}
                        emoji={player.nickname?.[0] || '👤'}
                        size="sm"
                      />
                      <span className="text-sm text-foreground">{player.nickname}</span>
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
