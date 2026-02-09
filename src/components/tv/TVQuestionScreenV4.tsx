import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { Check, X, Clock } from 'lucide-react';
import { QuizAnswerButton } from '@/components/ui/quiz-answer-button';
import { TimerBadge } from '@/components/game/TimerBadge';
import { QuizQuestionCard } from '@/components/ui/quiz-question-card';
import { TVRoundQueueIndicator } from './TVRoundQueueIndicator';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { TVDebugOverlay } from './TVDebugOverlay';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import { TVBrandingOverlay } from './TVBrandingOverlay';


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
    currentRoundSuggesterId,
    currentRoundSuggesterNickname,
    currentRoundSuggesterAvatarUrl,
  } = useTVGame();

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const timerMax = 15;
  const timerPercent = (timeRemaining / timerMax) * 100;
  
  // Check if this is a media-based question
  const hasImage = !!currentQuestion?.image_url;
  const hasVideo = !!currentQuestion?.video_url;
  const hasAudio = !!currentQuestion?.audio_url;
  const hasMedia = hasImage || hasVideo || hasAudio;

  // Filter out the suggester from active players - they skip this round
  const activePlayers = players.filter(p => p.id !== currentRoundSuggesterId);

  // Group players by their answer status for current question
  const correctPlayers = activePlayers.filter(p => p.hasAnswered && p.lastAnswerCorrect === true);
  const wrongPlayers = activePlayers.filter(p => p.hasAnswered && p.lastAnswerCorrect === false);
  const waitingPlayers = activePlayers.filter(p => !p.hasAnswered);

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
      {/* Code only overlay (no logo during gameplay) */}
      <TVBrandingOverlay showLogo={false} showCode compact />

      {/* Debug Overlay - only shows in development */}
      <TVDebugOverlay />
      {/* Question Progress Indicator - Left side */}
      {totalQuestions > 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5"
        >
          <motion.div
            className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-white/30 border-2 border-white shadow-lg"
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                '0 0 10px rgba(255,255,255,0.25)',
                '0 0 20px rgba(255,255,255,0.45)',
                '0 0 10px rgba(255,255,255,0.25)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-white font-bold text-xs">
              {currentQuestionIndex + 1}/{totalQuestions}
            </span>
          </motion.div>

          <span className="text-white/60 text-[10px] font-medium mt-1 writing-vertical">
            კითხვა
          </span>
        </motion.div>
      )}

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
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className="w-10 h-10 ring-3 ring-red-400 border-2 border-white"
                  fallbackClassName="bg-red-500 text-white font-bold text-sm"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                  <X className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Waiting Players (Yellow) - CENTER - only show players who haven't answered */}
        <div className="flex gap-2 justify-center flex-1">
          <AnimatePresence mode="popLayout">
            {waitingPlayers.map((player) => (
              <motion.div 
                key={player.id}
                className="relative"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                layout
              >
                {/* Subtle outer glow */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: '0 0 12px 3px rgba(250, 204, 21, 0.4)',
                  }}
                />
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className="w-10 h-10 ring-3 ring-yellow-400 border-2 border-white relative z-10"
                  fallbackClassName="bg-yellow-500 text-white font-bold text-sm"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white z-20">
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
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className="w-10 h-10 ring-3 ring-green-400 border-2 border-white"
                  fallbackClassName="bg-green-500 text-white font-bold text-sm"
                />
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
          {categoryName && (
            <span>{categoryName}</span>
          )}
          <span className="text-white/60 font-medium">-</span>
          <span className="text-white/80 font-medium">რაუნდი {roundNumber}/{totalRounds}</span>
        </div>

        <TimerBadge seconds={timeRemaining} maxSeconds={timerMax} compact />
      </div>

      {/* Question + answers (game UI) */}
      {hasImage ? (
        // SPECIAL LAYOUT FOR IMAGE QUESTIONS: 50/50 split
        <motion.div 
          className="max-w-6xl mx-auto w-full px-6 flex-1 flex min-h-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Left 50%: Question text + Image */}
          <div className="w-1/2 pr-4 flex flex-col justify-center">
            {/* Question text card */}
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
              <p className="text-xl font-semibold text-center text-[#2A2550]">
                {currentQuestion.question_text}
              </p>
            </div>
            {/* Image */}
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-lg">
              <img 
                src={currentQuestion.image_url!} 
                alt="Question" 
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
          
          {/* Right 50%: Answers stacked vertically */}
          <div className="w-1/2 pl-4 flex flex-col justify-center gap-3">
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
                className="w-full"
              />
            ))}
          </div>
        </motion.div>
      ) : (
        // STANDARD LAYOUT: Question card + 2x2 grid
        <motion.div 
          className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col min-h-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative flex justify-center mb-3 flex-shrink-0 pt-16 [@media(max-height:700px)]:pt-12">
            {/* Suggester Avatar - top left corner */}
            {currentRoundSuggesterId && (
              <motion.div 
                className="absolute left-0 top-12 z-30 flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <SafeAvatar 
                  avatarUrl={currentRoundSuggesterAvatarUrl}
                  fallback={currentRoundSuggesterNickname || '?'}
                  className="w-10 h-10 ring-2 ring-purple-300 border-2 border-white shadow-lg"
                  fallbackClassName="bg-purple-500 text-white font-bold text-xs"
                />
                <span className="text-white/80 text-xs font-medium bg-black/30 px-2 py-1 rounded-lg">
                  {currentRoundSuggesterNickname}
                </span>
              </motion.div>
            )}
            {/* Category/Question Icon - overlapping top of card (hide if media) */}
            {!hasMedia && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 w-24 h-24">
                <DynamicIcon 
                  slug={currentQuestion?.icon_slug || undefined}
                  questionId={currentQuestion?.id}
                  size={96}
                  className="drop-shadow-lg"
                  hideIfEmpty={false}
                />
              </div>
            )}
            <QuizQuestionCard
              questionText={currentQuestion.question_text}
              imageUrl={currentQuestion.image_url}
              videoUrl={currentQuestion.video_url}
              audioUrl={currentQuestion.audio_url}
              progressPercent={Math.max(0, Math.min(100, timerPercent))}
              className="w-full pt-8"
              reserveTopSpace={!hasMedia}
              hideQuestionText={!!currentQuestion.image_url}
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
      )}
    </div>
  );
};
