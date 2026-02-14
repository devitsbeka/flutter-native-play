import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoGameProvider, useDemoGame, DEMO_QUESTIONS } from '@/contexts/DemoGameContext';
import { MyTriviaLiveLogo } from '@/components/shared/MyTriviaLiveLogo';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Check, X, Clock, Crown, Sparkles } from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { QuizAnswerButton } from '@/components/ui/quiz-answer-button';
import { TimerBadge } from '@/components/game/TimerBadge';
import { QuizQuestionCard } from '@/components/ui/quiz-question-card';
import confetti from 'canvas-confetti';
import goldMedal from '@/assets/trophy-gold.png';
import silverMedal from '@/assets/trophy-silver.png';
import bronzeMedal from '@/assets/trophy-bronze.png';

// Video avatar component for demo players
const DemoAvatar: React.FC<{ player: any; className?: string }> = ({ player, className = '' }) => {
  if (player.avatar_video) {
    return (
      <video
        src={player.avatar_video}
        autoPlay
        loop
        muted
        playsInline
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  // Fallback to text initial
  return (
    <div className={`rounded-full bg-purple-600 flex items-center justify-center text-white font-bold ${className}`}>
      {player.nickname.charAt(0)}
    </div>
  );
};

const GEORGIAN_LABELS = ['ა', 'ბ', 'გ', 'დ'];

const DemoTVContent: React.FC = () => {
  const { phase, countdownValue, currentQuestionIndex, timeRemaining, players, questions, startGame } = useDemoGame();

  if (phase === 'idle') return <IdleScreen onStart={startGame} players={players} />;
  if (phase === 'countdown') return <CountdownScreen value={countdownValue} />;
  if (phase === 'results') return <ResultsScreen players={players} />;

  // playing or reveal
  const question = questions[currentQuestionIndex];
  const isReveal = phase === 'reveal';
  const timerPercent = (timeRemaining / 15) * 100;

  const correctPlayers = players.filter(p => p.hasAnswered && p.lastAnswerCorrect === true);
  const wrongPlayers = players.filter(p => p.hasAnswered && p.lastAnswerCorrect === false);
  const waitingPlayers = players.filter(p => !p.hasAnswered);

  return (
    <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4 flex flex-col overflow-hidden relative">
      {/* Player Status Bar */}
      <motion.div className="flex justify-between items-center w-full mb-3 flex-shrink-0 px-4"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Wrong */}
        <div className="flex gap-2 min-w-[60px] justify-start">
          <AnimatePresence>
            {wrongPlayers.map(p => (
              <motion.div key={p.id} className="relative" initial={{ scale: 0, x: 50 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', bounce: 0.5 }} layout>
                <DemoAvatar player={p} className="w-10 h-10 ring-3 ring-red-400 border-2 border-white" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white"><X className="w-3 h-3 text-white" /></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* Waiting */}
        <div className="flex gap-2 justify-center flex-1">
          <AnimatePresence mode="popLayout">
            {waitingPlayers.map(p => (
              <motion.div key={p.id} className="relative" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} layout>
                <DemoAvatar player={p} className="w-10 h-10 ring-3 ring-yellow-400 border-2 border-white" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white"><Clock className="w-3 h-3 text-white" /></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* Correct */}
        <div className="flex gap-2 min-w-[60px] justify-end">
          <AnimatePresence>
            {correctPlayers.map(p => (
              <motion.div key={p.id} className="relative" initial={{ scale: 0, x: -50 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', bounce: 0.5 }} layout>
                <DemoAvatar player={p} className="w-10 h-10 ring-3 ring-green-400 border-2 border-white" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white"><Check className="w-3 h-3 text-white" /></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Top info row */}
      <div className="flex items-center justify-between px-2 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <span>📚 ქართული ლიტერატურა</span>
          <span className="text-white/60 font-medium">-</span>
          <span className="text-white/80 font-medium">კითხვა {currentQuestionIndex + 1}/{questions.length}</span>
        </div>
        <TimerBadge seconds={timeRemaining} maxSeconds={15} compact />
      </div>

      {/* Question + Answers */}
      <motion.div className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col min-h-0"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="relative flex justify-center mb-3 flex-shrink-0 pt-6">
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 w-24 h-24">
            <DynamicIcon 
              slug={question.icon_slug}
              className="w-24 h-24 drop-shadow-lg"
            />
          </div>
          <QuizQuestionCard
            questionText={question.question_text}
            progressPercent={Math.max(0, Math.min(100, timerPercent))}
            className="w-full"
            reserveTopSpace={true}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {question.options.map((option, index) => (
            <QuizAnswerButton
              key={index}
              state={isReveal ? (option === question.correct_answer ? 'correct' : 'disabled') : 'default'}
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

const IdleScreen: React.FC<{ onStart: () => void; players: any[] }> = ({ onStart, players }) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-8">
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
      <MyTriviaLiveLogo size="xl" textColor="light" className="justify-center mb-3" />
      <p className="text-purple-300 text-xl">ქართული ლიტერატურა</p>
    </motion.div>
    <div className="flex gap-8 mb-10">
      {players.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, scale: 0, y: 30 }} animate={{ opacity: 1, scale: [0, 1.2, 1], y: 0 }} transition={{ delay: 0.5 + i * 0.4, duration: 0.5, ease: "backOut" }} className="flex flex-col items-center">
          <DemoAvatar player={p} className="w-32 h-32 ring-4 ring-purple-400 border-2 border-white" />
          <span className="text-white mt-3 font-medium text-lg">{p.nickname}</span>
        </motion.div>
      ))}
    </div>
    <ChunkyButton onClick={onStart} variant="success" size="lg" className="text-2xl px-12">
      დაწყება
    </ChunkyButton>
  </div>
);

const CountdownScreen: React.FC<{ value: number }> = ({ value }) => {
  const display = value === 0 ? 'GO!' : value;
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div key={value} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`w-40 h-40 rounded-full flex items-center justify-center shadow-xl ${value === 0 ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-purple-500 to-purple-700'}`}>
          <span className="text-white text-6xl font-bold font-display">{display}</span>
        </motion.div>
      </AnimatePresence>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl text-white font-bold mt-6">
        {value === 0 ? 'დაიწყო!' : 'მოემზადეთ!'}
      </motion.p>
    </div>
  );
};

const ResultsScreen: React.FC<{ players: any[] }> = ({ players }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const podium = sorted.slice(0, 3);
  const podiumOrder = [1, 0, 2].map(i => podium[i]).filter(Boolean);

  React.useEffect(() => {
    const colors = ['#a855f7', '#ec4899', '#f59e0b'];
    confetti({ particleCount: 50, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors });
    confetti({ particleCount: 50, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors });
  }, []);

  const getPodiumColor = (rank: number) => {
    if (rank === 0) return 'from-yellow-400 to-yellow-600';
    if (rank === 1) return 'from-gray-300 to-gray-500';
    return 'from-orange-400 to-orange-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h1 className="text-4xl font-bold text-white font-display mb-1">თამაში დასრულდა</h1>
        <p className="text-purple-300 text-lg">საბოლოო შედეგები</p>
      </motion.div>

      <div className="flex items-end justify-center gap-4 mb-6">
        {podiumOrder.map((player, displayIndex) => {
          if (!player) return null;
          const actualRank = sorted.indexOf(player);
          return (
            <motion.div key={player.id} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: displayIndex * 0.2 }} className="flex flex-col items-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + displayIndex * 0.2, type: 'spring' }} className="mb-1.5">
                <img src={actualRank === 0 ? goldMedal : actualRank === 1 ? silverMedal : bronzeMedal} alt="medal" className="w-12 h-12 object-contain" />
              </motion.div>
              <DemoAvatar player={player}
                className={`${actualRank === 0 ? 'w-20 h-20 ring-yellow-400' : 'w-[68px] h-[68px]'} ring-4 ${actualRank === 1 ? 'ring-gray-400' : actualRank === 2 ? 'ring-orange-400' : 'ring-yellow-400'}`} />
              <p className="text-white font-bold text-lg mt-2">{player.nickname}</p>
              <p className="text-purple-300 font-semibold text-sm mb-2">{player.score} ქულა</p>
              <div className={`w-24 ${actualRank === 0 ? 'h-28' : actualRank === 1 ? 'h-20' : 'h-14'} bg-gradient-to-t ${getPodiumColor(actualRank)} rounded-t-xl flex items-center justify-center`}>
                <span className="text-white text-3xl font-bold">{actualRank + 1}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.length > 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="w-full max-w-md">
          {sorted.slice(3).map((p, i) => (
            <div key={p.id} className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3 mb-2">
              <span className="text-purple-400 font-bold w-6">{i + 4}</span>
              <DemoAvatar player={p} className="w-8 h-8" />
              <span className="text-white flex-1">{p.nickname}</span>
              <span className="text-purple-300 font-semibold">{p.score}</span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

const SampleDemoTV: React.FC = () => (
  <DemoGameProvider>
    <DemoTVContent />
  </DemoGameProvider>
);

export default SampleDemoTV;
