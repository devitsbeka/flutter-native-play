import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoGameProvider, useDemoGame } from '@/contexts/DemoGameContext';
import { Check, X } from 'lucide-react';

const OPTION_COLORS = [
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600',
  'from-yellow-500 to-yellow-600',
  'from-red-500 to-red-600',
];

const GEORGIAN_LABELS = ['ა', 'ბ', 'გ', 'დ'];

const DemoPlayerContent: React.FC = () => {
  const { phase, countdownValue, currentQuestionIndex, timeRemaining, players, questions, playerAnswer, playerAnswerCorrect, startGame, submitAnswer } = useDemoGame();

  const tamuna = players.find(p => p.id === 'p3');

  if (phase === 'idle') return <PlayerIdleScreen onStart={startGame} />;
  if (phase === 'countdown') return <PlayerCountdownScreen value={countdownValue} />;
  if (phase === 'results') return <PlayerResultsScreen players={players} />;

  const question = questions[currentQuestionIndex];
  const isReveal = phase === 'reveal';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-white">
          <p className="text-sm text-purple-300">კითხვა {currentQuestionIndex + 1}/{questions.length}</p>
          <p className="font-bold">📚 ქართული ლიტერატურა</p>
        </div>
        <div className="bg-white/20 rounded-xl px-4 py-2">
          <span className="text-white font-bold text-xl">{timeRemaining}s</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-center mb-3">
        <span className="text-purple-300 text-sm">ქულა: </span>
        <span className="text-white font-bold">{tamuna?.score || 0}</span>
      </div>

      {/* Question */}
      <motion.div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-white text-lg font-semibold text-center">{question.question_text}</p>
      </motion.div>

      {/* Answer Buttons */}
      <div className="flex-1 flex flex-col gap-3">
        {question.options.map((option, index) => {
          const isSelected = playerAnswer === option;
          const isCorrectOption = option === question.correct_answer;
          let bgClass = `bg-gradient-to-r ${OPTION_COLORS[index]}`;
          let extraClass = '';

          if (isReveal) {
            if (isCorrectOption) {
              bgClass = 'bg-gradient-to-r from-green-400 to-green-600 ring-4 ring-green-300';
            } else if (isSelected && !playerAnswerCorrect) {
              bgClass = 'bg-gradient-to-r from-red-400 to-red-600 ring-4 ring-red-300';
            } else {
              bgClass = 'bg-gradient-to-r from-gray-500 to-gray-600 opacity-50';
            }
          } else if (isSelected) {
            extraClass = 'ring-4 ring-white scale-[0.98]';
          }

          const disabled = playerAnswer !== null || isReveal;

          return (
            <motion.button
              key={index}
              onClick={() => submitAnswer(option)}
              disabled={disabled}
              className={`w-full p-4 rounded-2xl text-white font-bold text-left flex items-center gap-3 transition-all ${bgClass} ${extraClass} ${disabled && !isReveal && !isSelected ? 'opacity-70' : ''}`}
              whileTap={!disabled ? { scale: 0.95 } : {}}
            >
              <span className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {GEORGIAN_LABELS[index]}
              </span>
              <span className="flex-1">{option}</span>
              {isReveal && isCorrectOption && <Check className="w-6 h-6 text-white" />}
              {isReveal && isSelected && !playerAnswerCorrect && !isCorrectOption && <X className="w-6 h-6 text-white" />}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {playerAnswer && !isReveal && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 text-center">
            <p className="text-white text-lg font-medium">
              {playerAnswerCorrect ? '✅ სწორია!' : '❌ არასწორია'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PlayerIdleScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <h1 className="text-3xl font-bold text-white font-display mb-2">MyTrivia</h1>
      <p className="text-purple-300 mb-2">📚 ქართული ლიტერატურა</p>
      <p className="text-white/80 text-lg mb-8">შენ თამაშობ როგორც <span className="font-bold text-white">თამუნა</span></p>
    </motion.div>
    <motion.button onClick={onStart} className="px-10 py-4 bg-gradient-to-r from-green-400 to-green-600 text-white text-xl font-bold rounded-2xl shadow-xl"
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      დაწყება
    </motion.button>
    <p className="text-purple-400 text-sm mt-4">ან გახსენი /sampledemotv სხვა ტაბში</p>
  </div>
);

const PlayerCountdownScreen: React.FC<{ value: number }> = ({ value }) => {
  const display = value === 0 ? 'GO!' : value;
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div key={value} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`w-32 h-32 rounded-full flex items-center justify-center shadow-xl ${value === 0 ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-purple-500 to-purple-700'}`}>
          <span className="text-white text-5xl font-bold font-display">{display}</span>
        </motion.div>
      </AnimatePresence>
      <p className="text-2xl text-white font-bold mt-6">{value === 0 ? 'დაიწყო!' : 'მოემზადე!'}</p>
    </div>
  );
};

const PlayerResultsScreen: React.FC<{ players: any[] }> = ({ players }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const tamuna = players.find(p => p.id === 'p3');
  const rank = sorted.findIndex(p => p.id === 'p3') + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <h1 className="text-3xl font-bold text-white font-display mb-4">თამაში დასრულდა!</h1>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <p className="text-purple-300 text-sm mb-1">შენი ადგილი</p>
          <p className="text-white text-5xl font-bold mb-2">#{rank}</p>
          <p className="text-purple-300 text-sm mb-1">ქულა</p>
          <p className="text-white text-3xl font-bold">{tamuna?.score || 0}</p>
        </div>

        <div className="space-y-2 w-full max-w-xs">
          {sorted.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${p.id === 'p3' ? 'bg-purple-500/30 ring-2 ring-purple-400' : 'bg-white/5'}`}>
              <span className="text-purple-400 font-bold w-6">{i + 1}</span>
              <span className="text-white flex-1">{p.nickname}</span>
              <span className="text-purple-300 font-semibold">{p.score}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const SampleDemoPlayer: React.FC = () => (
  <DemoGameProvider>
    <DemoPlayerContent />
  </DemoGameProvider>
);

export default SampleDemoPlayer;
