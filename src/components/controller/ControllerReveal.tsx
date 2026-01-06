import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Check, X } from 'lucide-react';

export const ControllerReveal: React.FC = () => {
  const { questions, currentQuestionIndex, myAnswer, myScore, players, myPlayerId } = useTVGame();
  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = myAnswer === currentQuestion?.correct_answer;
  const myPlayer = players.find(p => p.id === myPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
        {isCorrect ? <Check className="w-12 h-12 text-white" /> : <X className="w-12 h-12 text-white" />}
      </motion.div>
      
      <h2 className={`text-3xl font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
        {isCorrect ? 'Correct!' : 'Wrong!'}
      </h2>
      
      {!isCorrect && currentQuestion && (
        <p className="text-purple-300 text-center mb-4">
          Answer: {currentQuestion.correct_answer}
        </p>
      )}
      
      <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
        <span className="text-purple-300">Your Score: </span>
        <span className="text-white text-2xl font-bold">{myScore}</span>
      </div>
      
      <p className="text-purple-300/60">Next question coming...</p>
    </div>
  );
};
