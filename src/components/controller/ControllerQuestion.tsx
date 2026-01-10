import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Clock, Check, Loader2, AlertCircle } from 'lucide-react';

export const ControllerQuestion: React.FC = () => {
  const navigate = useNavigate();
  const { questions, currentQuestionIndex, timeRemaining, myAnswer, myScore, submitAnswer, leaveSession } = useTVGame();
  const currentQuestion = questions[currentQuestionIndex];

  // Handle missing question gracefully - show loading/error state instead of blank screen
  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
        <div className="text-center">
          {questions.length === 0 ? (
            <>
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">თამაში არ არის მზად</p>
              <p className="text-purple-300 text-sm mb-6">კითხვები ჯერ არ ჩაიტვირთა</p>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">იტვირთება...</p>
              <p className="text-purple-300 text-sm mb-6">დაელოდე შემდეგ კითხვას</p>
            </>
          )}
          <ChunkyButton
            variant="secondary"
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
            <div
              key={index}
              onClick={() => handleAnswer(option)}
              className="relative w-full rounded-2xl bg-white min-h-[72px] flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform p-3"
              style={{ boxShadow: '0 4px 0 0 #CBD5E1' }}
            >
              <span 
                className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm flex-shrink-0 self-start mt-0.5"
                style={{ 
                  background: ['#A855F7', '#7C3AED', '#6366F1', '#8B5CF6'][index] 
                }}
              >
                {['A', 'B', 'C', 'D'][index]}
              </span>
              <span className={`text-gray-800 font-semibold flex-1 line-clamp-2 ${option.length > 30 ? 'text-sm' : 'text-base'}`}>
                {option}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
