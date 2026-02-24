import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { TVScoreboardPanel } from './TVScoreboardPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { getQuestionTime } from '@/utils/tvScoring';

const OPTION_COLORS = [
  { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', label: 'A' },
  { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', label: 'B' },
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', label: 'C' },
  { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', label: 'D' },
];

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
  hasAnswered?: boolean;
  isHost?: boolean;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface TVQuestionScreenProps {
  questions: Question[];
  currentQuestionIndex: number;
  timeRemaining: number;
  players: Player[];
}

export const TVQuestionScreen: React.FC<TVQuestionScreenProps> = ({
  questions,
  currentQuestionIndex,
  timeRemaining,
  players,
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const { t } = useLanguage();
  if (!currentQuestion) return null;

  const answeredCount = players.filter(p => p.hasAnswered).length;
  const totalPlayers = players.length;

  // Timer progress (use centralized question time constant)
  const questionTime = getQuestionTime();
  const timerProgress = (timeRemaining / questionTime) * 100;
  const timerColor = timeRemaining <= 5 ? 'stroke-red-500' : 'stroke-primary';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex">
      {/* Main content area (2/3) */}
      <div className="flex-1 flex flex-col p-8" style={{ width: '66.67%' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {/* Question Counter */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3"
          >
            <span className="text-purple-200">{t("extra.tvQuestion")}</span>
            <span className="text-white font-bold text-2xl">
              {currentQuestionIndex + 1}
            </span>
            <span className="text-purple-200"> / {questions.length}</span>
          </motion.div>

          {/* Timer */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative"
          >
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/10"
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
                className={`text-4xl font-bold ${timeRemaining <= 5 ? 'text-red-500' : 'text-white'}`}
              >
                {timeRemaining}
              </motion.span>
            </div>
          </motion.div>

          {/* Answer Progress */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3"
          >
            <span className="text-white font-bold text-2xl">{answeredCount}</span>
            <span className="text-purple-200"> / {totalPlayers} {t("extra.tvAnswered")}</span>
          </motion.div>
        </div>

        {/* Question */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex items-center justify-center mb-6"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-4xl w-full shadow-2xl">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-white leading-tight">
              {currentQuestion.question_text}
            </h2>
          </div>
        </motion.div>

        {/* Answer Options */}
        <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto w-full mb-6">
          {currentQuestion.options.map((option, index) => {
            const color = OPTION_COLORS[index];
            return (
              <motion.div
                key={index}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`${color.bg} backdrop-blur-sm border-2 ${color.border} rounded-2xl p-5 flex items-center gap-4`}
              >
                <div className={`w-14 h-14 rounded-xl ${color.bg} border-2 ${color.border} flex items-center justify-center`}>
                  <span className={`text-3xl font-bold ${color.text}`}>{color.label}</span>
                </div>
                <span className="text-xl md:text-2xl font-medium text-white flex-1">
                  {option}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Player answer indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <AnimatePresence>
            {players.map((player) => (
              <motion.div
                key={player.id}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <div className={`rounded-full p-0.5 ${player.hasAnswered ? 'bg-green-500' : 'bg-white/20'}`}>
                    <Avatar
                      imageUrl={player.avatar_url}
                      emoji={player.nickname?.[0] || '👤'}
                      size="sm"
                    />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: player.hasAnswered ? 1 : 0 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                  {!player.hasAnswered && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center"
                    >
                      <Clock className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>
                <span className="text-xs text-purple-200 truncate max-w-[60px]">
                  {player.nickname}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Scoreboard panel (1/3) */}
      <div className="w-1/3 min-w-[300px]">
        <TVScoreboardPanel players={players} showAnswerStatus={true} />
      </div>
    </div>
  );
};
