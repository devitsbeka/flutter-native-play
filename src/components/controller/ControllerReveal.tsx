import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Check, X, Loader2, Star } from 'lucide-react';

export const ControllerReveal: React.FC = () => {
  const navigate = useNavigate();
  const { questions, currentQuestionIndex, myAnswer, myScore, players, myPlayerId, leaveSession, phase, currentRoundSuggesterId } = useTVGame();
  
  // Check if current player is the suggester for this round
  const isSuggester = myPlayerId && currentRoundSuggesterId && myPlayerId === currentRoundSuggesterId;
  
  // FIX: Capture the answer state when we first enter reveal
  // This prevents showing wrong data when myAnswer is cleared during transition
  const capturedAnswerRef = useRef<{ answer: string | null; questionIndex: number; isCorrect: boolean | null } | null>(null);
  
  const currentQuestion = questions[currentQuestionIndex];
  
  // Capture the answer state on first render or when question changes
  useEffect(() => {
    if (phase === 'reveal' && currentQuestion) {
      // Only capture if we have an answer or if this is a new question
      if (myAnswer !== null || !capturedAnswerRef.current || capturedAnswerRef.current.questionIndex !== currentQuestionIndex) {
        const isCorrect = myAnswer !== null ? myAnswer === currentQuestion.correct_answer : null;
        capturedAnswerRef.current = {
          answer: myAnswer,
          questionIndex: currentQuestionIndex,
          isCorrect,
        };
        console.log('[ControllerReveal] Captured answer state:', {
          answer: myAnswer?.slice(0, 20),
          questionIndex: currentQuestionIndex,
          isCorrect,
        });
      }
    }
  }, [phase, currentQuestion, myAnswer, currentQuestionIndex]);
  
  // Reset capture when leaving reveal phase
  useEffect(() => {
    if (phase !== 'reveal') {
      capturedAnswerRef.current = null;
    }
  }, [phase]);

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

  // CRITICAL FIX: Suggester sees observer reveal UI, not "Time expired"
  if (isSuggester && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <Star className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">შენი კატეგორიაა!</h2>
        <p className="text-purple-300 mb-4">ამ რაუნდში აკვირდები</p>
        
        <div className="bg-white/10 rounded-xl p-4 mb-4 max-w-sm">
          <p className="text-purple-300 text-sm mb-1">სწორი პასუხი:</p>
          <p className="text-white font-semibold text-center">{currentQuestion.correct_answer}</p>
        </div>
        
        <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
          <span className="text-purple-300">შენი ქულა: </span>
          <span className="text-white text-2xl font-bold">{myScore}</span>
        </div>
        
        <p className="text-purple-300/60">შემდეგი კითხვა მალე...</p>
      </div>
    );
  }

  // FIX: Use captured state if available and valid for current question
  // This prevents the UI from flickering when myAnswer is cleared during transition
  const captured = capturedAnswerRef.current;
  const isCorrect = captured?.questionIndex === currentQuestionIndex && captured?.isCorrect !== null
    ? captured.isCorrect
    : myAnswer === currentQuestion.correct_answer;
  
  // If we have no answer data at all (transitioning state), show loading
  if (myAnswer === null && (!captured || captured.questionIndex !== currentQuestionIndex)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">მოწმდება...</p>
          <div className="bg-white/10 rounded-xl px-6 py-3 mt-4">
            <span className="text-purple-300">შენი ქულა: </span>
            <span className="text-white text-2xl font-bold">{myScore}</span>
          </div>
        </div>
      </div>
    );
  }

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
