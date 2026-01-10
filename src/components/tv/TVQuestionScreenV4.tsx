import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Clock } from 'lucide-react';

const GEORGIAN_LABELS = ['ა', 'ბ', 'გ', 'დ'];

const OPTION_COLORS = [
  { bg: 'bg-red-500/90', label: 'bg-red-600' },
  { bg: 'bg-blue-500/90', label: 'bg-blue-600' },
  { bg: 'bg-yellow-500/90', label: 'bg-yellow-600' },
  { bg: 'bg-green-500/90', label: 'bg-green-600' },
];

export const TVQuestionScreenV4: React.FC = () => {
  const { 
    questions, 
    currentQuestionIndex, 
    timeRemaining, 
    players,
    categoryName,
    roomName 
  } = useTVGame();

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const timerPercent = (timeRemaining / 15) * 100;

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

      {/* Category & Room Name */}
      <div className="flex justify-between items-center px-4 mb-2 flex-shrink-0">
        <span className="text-white/80 text-sm font-medium">
          {categoryName || 'კატეგორია'}
        </span>
        <span className="text-white/80 text-sm font-medium">
          {roomName || 'ოთახის სახელი'}
        </span>
      </div>

      {/* Question Card */}
      <motion.div 
        className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-purple-500/40 backdrop-blur-sm rounded-2xl p-4 mb-3 flex-shrink-0">
          {/* Timer and Question Number */}
          <div className="flex justify-between items-center mb-3">
            <motion.span 
              className={`text-2xl font-bold ${timeRemaining <= 5 ? 'text-red-400' : 'text-green-400'}`}
              animate={timeRemaining <= 5 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
            >
              {formatTime(timeRemaining)}
            </motion.span>
            <span className="text-white/80 text-sm font-medium">
              {currentQuestionIndex + 1} / {totalQuestions}
            </span>
          </div>

          {/* Question Text */}
          <h2 className="text-xl md:text-2xl text-white font-bold text-center mb-4 leading-relaxed">
            {currentQuestion.question_text}
          </h2>

          {/* Progress Bar */}
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-orange-400 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Answer Options 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {currentQuestion.options.slice(0, 4).map((option, index) => (
            <motion.div
              key={index}
              className={`${OPTION_COLORS[index].bg} rounded-xl p-4 flex items-center gap-3`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <span className={`${OPTION_COLORS[index].label} text-white font-bold text-lg w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                {GEORGIAN_LABELS[index]}
              </span>
              <span className="text-white text-base md:text-lg font-medium flex-1 line-clamp-3">
                {option}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
