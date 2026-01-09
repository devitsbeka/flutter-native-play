import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';

export const ControllerReveal: React.FC = () => {
  const navigate = useNavigate();
  const { questions, currentQuestionIndex, myAnswer, myScore, players, myPlayerId, leaveSession } = useTVGame();
  const currentQuestion = questions[currentQuestionIndex];
  const myPlayer = players.find(p => p.id === myPlayerId);

  // Handle missing question gracefully
  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">შედეგები იტვირთება...</p>
          <p className="text-purple-300 text-sm mb-2">დაელოდე შემდეგ კითხვას</p>
          <div className="bg-white/10 rounded-xl px-6 py-3 mt-4 mb-4">
            <span className="text-purple-300">შენი ქულა: </span>
            <span className="text-white text-2xl font-bold">{myScore}</span>
          </div>
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={() => {
              leaveSession();
              navigate('/');
            }}
          >
            თამაშიდან გასვლა
          </ChunkyButton>
        </div>
      </div>
    );
  }

  const isCorrect = myAnswer === currentQuestion.correct_answer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
        {isCorrect ? <Check className="w-12 h-12 text-white" /> : <X className="w-12 h-12 text-white" />}
      </motion.div>
      
      <h2 className={`text-3xl font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
        {isCorrect ? 'სწორია!' : 'არასწორია!'}
      </h2>
      
      {!isCorrect && currentQuestion && (
        <p className="text-purple-300 text-center mb-4">
          პასუხი: {currentQuestion.correct_answer}
        </p>
      )}
      
      <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
        <span className="text-purple-300">შენი ქულა: </span>
        <span className="text-white text-2xl font-bold">{myScore}</span>
      </div>
      
      <p className="text-purple-300/60">შემდეგი კითხვა მალე...</p>
    </div>
  );
};
