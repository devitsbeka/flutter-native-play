import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Clock } from 'lucide-react';
import { QuizAnswerButton } from '@/components/ui/quiz-answer-button';
import { TimerBadge } from '@/components/game/TimerBadge';
import { QuizQuestionCard } from '@/components/ui/quiz-question-card';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';

const GEORGIAN_LABELS = ['ა', 'ბ', 'გ', 'დ'];

export const TVQuestionScreenV4: React.FC = () => {
  const { 
    questions, 
    currentQuestionIndex, 
    timeRemaining, 
    players,
    categoryName,
    roomName,
    phase,
    categoryIcon,
  } = useTVGame();

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const timerMax = 15;
  const timerPercent = (timeRemaining / timerMax) * 100;

  // Group players by their answer status for current question
  const correctPlayers = players.filter(p => p.hasAnswered && p.lastAnswerCorrect === true);
  const wrongPlayers = players.filter(p => p.hasAnswered && p.lastAnswerCorrect === false);
  const waitingPlayers = players.filter(p => !p.hasAnswered);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading question...</div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    return `00:${seconds.toString().padStart(2, '0')}`;
  };

  const isReveal = phase === 'reveal';
  const correctAnswer = currentQuestion.correct_answer;

  return (
    <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4 flex flex-col overflow-hidden">
      {/* Player Status Bar */}
      <motion.div 
        className="flex justify-center items-center gap-4 mb-3 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Correct Players (Green) */}
        <AnimatePresence>
          {correctPlayers.length > 0 && (
            <motion.div 
              className="flex -space-x-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {correctPlayers.map((player) => (
                <motion.div 
                  key={player.id}
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <Avatar className="w-10 h-10 ring-3 ring-green-400 border-2 border-white">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback className="bg-green-500 text-white font-bold text-sm">
                      {player.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waiting Players (Yellow/Cyan - thinking) */}
        <div className="flex -space-x-2">
          {waitingPlayers.map((player) => (
            <motion.div 
              key={player.id}
              className="relative"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Avatar className="w-10 h-10 ring-3 ring-yellow-400 border-2 border-white">
                <AvatarImage src={player.avatar_url || undefined} />
                <AvatarFallback className="bg-yellow-500 text-white font-bold text-sm">
                  {player.nickname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white">
                <Clock className="w-3 h-3 text-white" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Wrong Players (Red) */}
        <AnimatePresence>
          {wrongPlayers.length > 0 && (
            <motion.div 
              className="flex -space-x-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {wrongPlayers.map((player) => (
                <motion.div 
                  key={player.id}
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <Avatar className="w-10 h-10 ring-3 ring-red-400 border-2 border-white">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback className="bg-red-500 text-white font-bold text-sm">
                      {player.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                    <X className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Top info row (category + timer + room) */}
      <div className="flex items-center justify-between px-2 mb-3 flex-shrink-0">
        <div className="min-w-0">
          <div className="text-white/80 text-xs font-medium truncate">
            {roomName || 'ოთახი'}
          </div>
          <div className="text-white font-bold text-lg truncate">
            {categoryName || 'კატეგორია'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-white/80 text-sm font-medium">
            {currentQuestionIndex + 1} / {totalQuestions}
          </div>
          <TimerBadge seconds={timeRemaining} maxSeconds={timerMax} compact />
        </div>
      </div>

      {/* Question + answers (game UI) */}
      <motion.div 
        className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative flex justify-center mb-3 flex-shrink-0 pt-10 [@media(max-height:700px)]:pt-6">
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20">
            <QuizCategoryIcon emoji={categoryIcon || '🎯'} size={96} />
          </div>
          <QuizQuestionCard
            questionText={currentQuestion.question_text}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            timerSeconds={timeRemaining}
            timerMaxSeconds={timerMax}
            progressPercent={Math.max(0, Math.min(100, timerPercent))}
            className="max-w-4xl"
          />
        </div>

        {/* Answer Options 2x2 Grid (single-style, matches standard UI) */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 items-stretch">
          {currentQuestion.options.slice(0, 4).map((option, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex"
            >
              <QuizAnswerButton
                state={
                  isReveal
                    ? option === correctAnswer
                      ? 'correct'
                      : 'disabled'
                    : 'default'
                }
                label={GEORGIAN_LABELS[index]}
                text={option}
                disabled
                className="w-full"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
