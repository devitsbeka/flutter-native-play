import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Clock, Check } from 'lucide-react';

export const ControllerQuestion: React.FC = () => {
  const { questions, currentQuestionIndex, timeRemaining, myAnswer, myScore, submitAnswer } = useTVGame();
  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) return null;

  const handleAnswer = async (answer: string) => {
    if (myAnswer) return;
    try {
      await submitAnswer(answer);
    } catch (err) {
      console.error('[ControllerQuestion] Failed to submit answer:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-purple-300 text-sm">Q{currentQuestionIndex + 1}/{questions.length}</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeRemaining <= 5 ? 'bg-red-500/30' : 'bg-white/10'}`}>
          <Clock className={`w-4 h-4 ${timeRemaining <= 5 ? 'text-red-400' : 'text-purple-300'}`} />
          <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>{timeRemaining}</span>
        </div>
        <span className="text-purple-300 text-sm">{myScore} pts</span>
      </div>

      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <p className="text-white font-semibold text-center">{currentQuestion.question_text}</p>
      </div>

      {myAnswer ? (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
          <Check className="w-16 h-16 text-green-400 mb-4" />
          <p className="text-white text-xl font-bold">Answer Submitted!</p>
          <p className="text-purple-300">Watch the TV...</p>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          {currentQuestion.options.map((option, index) => (
            <ChunkyButton
              key={index}
              variant="white"
              size="md"
              onClick={() => handleAnswer(option)}
              className="w-full text-left justify-start"
            >
              <span className="inline-flex items-center gap-3">
                <span 
                  className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ 
                    background: ['#A855F7', '#7C3AED', '#6366F1', '#8B5CF6'][index] 
                  }}
                >
                  {['A', 'B', 'C', 'D'][index]}
                </span>
                <span className="text-gray-800">{option}</span>
              </span>
            </ChunkyButton>
          ))}
        </div>
      )}
    </div>
  );
};
