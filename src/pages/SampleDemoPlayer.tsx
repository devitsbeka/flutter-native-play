import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoGameProvider, useDemoGame } from '@/contexts/DemoGameContext';
import { Check, X } from 'lucide-react';
import { QuizQuestionCard } from '@/components/ui/quiz-question-card';
import { QuizAnswerButton, QuizAnswerState } from '@/components/ui/quiz-answer-button';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { TimerBadge } from '@/components/game/TimerBadge';
import { QuizProgressDots } from '@/components/ui/quiz-progress-dots';

const GEORGIAN_LABELS = ['ა', 'ბ', 'გ', 'დ'];

const DemoPlayerContent: React.FC = () => {
  const { phase, countdownValue, currentQuestionIndex, timeRemaining, players, questions, playerAnswer, playerAnswerCorrect, startGame, submitAnswer } = useDemoGame();
  const isAutostart = React.useMemo(() => new URLSearchParams(window.location.search).get('autostart') === 'true', []);

  const tamuna = players.find(p => p.id === 'p3');

  // Auto-select answer after 1.5s when autostart is enabled
  React.useEffect(() => {
    if (!isAutostart || phase !== 'playing' || playerAnswer !== null) return;
    const question = questions[currentQuestionIndex];
    const timer = setTimeout(() => {
      submitAnswer(question.correct_answer);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAutostart, phase, currentQuestionIndex, playerAnswer, questions, submitAnswer]);

  if (phase === 'idle') return <PlayerIdleScreen onStart={startGame} />;
  if (phase === 'countdown') return <PlayerCountdownScreen value={countdownValue} />;
  if (phase === 'results') return <PlayerResultsScreen players={players} />;

  const question = questions[currentQuestionIndex];
  const isReveal = phase === 'reveal';
  const timerPercent = (timeRemaining / 15) * 100;

  const getAnswerState = (option: string): QuizAnswerState => {
    if (!isReveal && playerAnswer === null) return 'default';
    if (!isReveal && playerAnswer === option) return 'selected';
    if (!isReveal && playerAnswer !== null) return 'disabled';
    if (option === question.correct_answer) return 'correct';
    if (playerAnswer === option && !playerAnswerCorrect) return 'wrong';
    return 'disabled';
  };

  const progressResults = questions.map((_, i) => {
    if (i > currentQuestionIndex) return undefined;
    if (i === currentQuestionIndex && !isReveal) return undefined;
    return undefined;
  });

  return (
    <div className="w-full min-h-screen bg-[#7E7ADB] overflow-hidden" style={{ marginTop: "calc(-1 * var(--safe-top))", paddingTop: "var(--safe-top)" }}>
      <div className="w-full min-h-screen flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 py-1 mb-2 flex-shrink-0">
          <span className="text-white font-bold text-base truncate max-w-[200px]">
            📚 ქართული ლიტერატურა
          </span>
          <TimerBadge seconds={timeRemaining} maxSeconds={15} compact />
        </div>

        {/* Score */}
        <div className="text-center mb-2 flex-shrink-0">
          <span className="text-white/60 text-sm">ქულა: </span>
          <span className="text-white font-bold">{tamuna?.score || 0}</span>
        </div>

        {/* Question Card with Icon */}
        <div className="px-4 flex-shrink-0 -mt-1 mb-0 relative">
          {!(question as any).image_url && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-20">
              <DynamicIcon 
                slug={question.icon_slug}
                size={64}
                className="drop-shadow-lg"
              />
            </div>
          )}
          <QuizQuestionCard
            questionText={question.question_text}
            imageUrl={(question as any).image_url}
            hideQuestionText={!!(question as any).image_url}
            progressPercent={Math.max(0, Math.min(100, timerPercent))}
            reserveTopSpace={!(question as any).image_url}
          />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center py-2 flex-shrink-0">
          <QuizProgressDots
            total={questions.length}
            current={currentQuestionIndex}
            results={progressResults as any}
          />
        </div>

        {/* Answer Buttons */}
        <div className="flex-1 px-4 mt-0 flex flex-col gap-3 overflow-y-auto min-h-0 pb-2">
          {question.options.map((option, index) => (
            <div key={`${currentQuestionIndex}-${index}`} className="flex-shrink-0 w-full">
              <QuizAnswerButton
                label={GEORGIAN_LABELS[index]}
                text={option}
                state={getAnswerState(option)}
                onClick={() => submitAnswer(option)}
                disabled={playerAnswer !== null || isReveal}
                showLabel={true}
              />
            </div>
          ))}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {playerAnswer && !isReveal && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-4 pb-2 text-center flex-shrink-0">
              <p className="text-white text-lg font-medium">
                {playerAnswerCorrect ? '✅ სწორია!' : '❌ არასწორია'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

const PlayerIdleScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === 'true') onStart();
  }, [onStart]);

  return (
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
};

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
