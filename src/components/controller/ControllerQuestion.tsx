import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Clock, Check, Loader2, AlertCircle, X } from 'lucide-react';

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

  // Check if this is a True/False question
  const isTrueFalseQuestion = useMemo(() => {
    if (!currentQuestion?.options) return false;
    if (currentQuestion.options.length !== 2) return false;
    
    const answers = currentQuestion.options.map(a => a.toLowerCase());
    return (
      (answers.includes("მართალია") && answers.includes("მცდარია")) ||
      (answers.includes("true") && answers.includes("false"))
    );
  }, [currentQuestion?.options]);

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
      ) : isTrueFalseQuestion ? (
        /* True/False Layout - side by side cards */
        <div className="flex-1 flex gap-3 px-1 pt-2">
          {currentQuestion.options.map((option, index) => {
            const isTrue = option.toLowerCase() === "მართალია" || option.toLowerCase() === "true";
            return (
              <motion.button
                key={index}
                onClick={() => handleAnswer(option)}
                whileTap={{ scale: 0.95 }}
                className="flex-1 relative min-h-[120px] cursor-pointer"
              >
                {/* Shadow Layer */}
                <div 
                  className="absolute inset-0 rounded-2xl"
                  style={{ 
                    background: isTrue ? '#A5D6A7' : '#EF9A9A', 
                    transform: "translateY(4px)" 
                  }}
                />
                
                {/* Main Face */}
                <div 
                  className="relative flex flex-col items-center justify-center py-5 rounded-2xl gap-2 h-full"
                  style={{ background: isTrue ? '#E8F5E9' : '#FFEBEE' }}
                >
                  {/* Icon Circle */}
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: isTrue ? '#22C55E' : '#EF4444' }}
                  >
                    {isTrue ? (
                      <Check className="w-8 h-8 text-white" strokeWidth={3} />
                    ) : (
                      <X className="w-8 h-8 text-white" strokeWidth={3} />
                    )}
                  </div>
                  
                  {/* Label Text */}
                  <span 
                    className="font-bold text-lg"
                    style={{ color: isTrue ? '#22C55E' : '#EF4444' }}
                  >
                    {isTrue ? "მართალია" : "მცდარია"}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
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
