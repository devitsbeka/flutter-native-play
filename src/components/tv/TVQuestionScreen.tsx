import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVSession } from '@/contexts/TVSessionContext';

const OPTION_COLORS = [
  { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', label: 'A' },
  { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', label: 'B' },
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', label: 'C' },
  { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', label: 'D' },
];

export const TVQuestionScreen: React.FC = () => {
  const { questions, currentQuestionIndex, timeRemaining, players } = useTVSession();

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  const answeredCount = players.filter(p => p.hasAnswered).length;
  const totalPlayers = players.length;
  const progress = (answeredCount / Math.max(1, totalPlayers)) * 100;

  // Timer progress (15 seconds total)
  const timerProgress = (timeRemaining / 15) * 100;
  const timerColor = timeRemaining <= 5 ? 'stroke-red-500' : 'stroke-primary';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        {/* Question Counter */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-card border border-border rounded-full px-6 py-2"
        >
          <span className="text-muted-foreground">კითხვა </span>
          <span className="text-primary font-bold text-xl">
            {currentQuestionIndex + 1}
          </span>
          <span className="text-muted-foreground"> / {questions.length}</span>
        </motion.div>

        {/* Timer */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative"
        >
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={timerColor}
              strokeDasharray={283}
              strokeDashoffset={283 - (283 * timerProgress) / 100}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              key={timeRemaining}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-3xl font-bold ${timeRemaining <= 5 ? 'text-red-500' : 'text-foreground'}`}
            >
              {timeRemaining}
            </motion.span>
          </div>
        </motion.div>

        {/* Answer Progress */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-card border border-border rounded-full px-6 py-2"
        >
          <span className="text-primary font-bold text-xl">{answeredCount}</span>
          <span className="text-muted-foreground"> / {totalPlayers} უპასუხა</span>
        </motion.div>
      </div>

      {/* Question */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex items-center justify-center mb-8"
      >
        <div className="bg-card border border-border rounded-3xl p-8 max-w-4xl w-full shadow-2xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground leading-tight">
            {currentQuestion.question_text}
          </h2>
        </div>
      </motion.div>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
        {currentQuestion.options.map((option, index) => {
          const color = OPTION_COLORS[index];
          return (
            <motion.div
              key={index}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`${color.bg} border-2 ${color.border} rounded-2xl p-6 flex items-center gap-4`}
            >
              <div className={`w-12 h-12 rounded-xl ${color.bg} border ${color.border} flex items-center justify-center`}>
                <span className={`text-2xl font-bold ${color.text}`}>{color.label}</span>
              </div>
              <span className="text-xl md:text-2xl font-medium text-foreground flex-1">
                {option}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Answer Progress Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 max-w-3xl mx-auto w-full"
      >
        <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>
    </div>
  );
};
