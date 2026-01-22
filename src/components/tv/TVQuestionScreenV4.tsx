import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Clock } from 'lucide-react';
import { QuizAnswerButton } from '@/components/ui/quiz-answer-button';
import { TimerBadge } from '@/components/game/TimerBadge';
import { QuizQuestionCard } from '@/components/ui/quiz-question-card';
import { TVRoundQueueIndicator } from './TVRoundQueueIndicator';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import retroTvIcon from '@/assets/retro-tv-colored.png';

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
    roundNumber,
    totalRounds,
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


  const isReveal = phase === 'reveal';
  const correctAnswer = currentQuestion.correct_answer;

  return (
    <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4 flex flex-col overflow-hidden relative">
      {/* Mini Queue Indicator - Right side */}
      <TVRoundQueueIndicator 
        currentRound={roundNumber} 
        totalRounds={totalRounds} 
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30"
      />
      {/* Player Status Bar - Three Zone Layout */}
      <motion.div 
        className="flex justify-between items-center w-full mb-3 flex-shrink-0 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Wrong Players (Red) - LEFT EDGE */}
        <div className="flex gap-2 min-w-[60px] justify-start">
          <AnimatePresence>
            {wrongPlayers.map((player) => (
              <motion.div 
                key={player.id}
                className="relative"
                initial={{ scale: 0, x: 50 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                layout
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
          </AnimatePresence>
        </div>

        {/* Waiting Players (Yellow) - CENTER */}
        <div className="flex gap-2 justify-center flex-1">
          <AnimatePresence>
            {waitingPlayers.map((player) => (
              <motion.div 
                key={player.id}
                className="relative"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.05, 1] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                layout
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
          </AnimatePresence>
        </div>

        {/* Correct Players (Green) - RIGHT EDGE */}
        <div className="flex gap-2 min-w-[60px] justify-end">
          <AnimatePresence>
            {correctPlayers.map((player) => (
              <motion.div 
                key={player.id}
                className="relative"
                initial={{ scale: 0, x: -50 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                layout
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
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Top info row (category + timer) */}
      <div className="flex items-center justify-between px-2 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <img src={retroTvIcon} alt="TV" className="w-6 h-6 object-contain" />
          <span>TV რეჟიმი</span>
          <span className="text-white/80 font-medium">-</span>
          <span className="text-white/80 font-medium">მოემზადეთ სახალისო თამაშისთვის!</span>
        </div>

        <TimerBadge seconds={timeRemaining} maxSeconds={timerMax} compact />
      </div>

      {/* Question + answers (game UI) */}
      <motion.div 
        className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col min-h-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative flex justify-center mb-3 flex-shrink-0 pt-16 [@media(max-height:700px)]:pt-12">
          {/* Category/Question Icon - overlapping top of card */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 w-24 h-24">
            <DynamicIcon 
              slug={currentQuestion?.icon_slug || undefined}
              questionId={currentQuestion?.id}
              size={96}
              className="drop-shadow-lg"
              hideIfEmpty={false}
            />
          </div>
          <QuizQuestionCard
            questionText={currentQuestion.question_text}
            progressPercent={Math.max(0, Math.min(100, timerPercent))}
            className="w-full pt-8"
          />
        </div>

        {/* Answer Options 2x2 Grid - clean single container buttons */}
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {currentQuestion.options.slice(0, 4).map((option, index) => (
            <QuizAnswerButton
              key={index}
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
              className="w-full h-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
