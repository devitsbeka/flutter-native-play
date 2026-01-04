import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TVSessionProvider, useTVSession } from '@/contexts/TVSessionContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Check, X, Loader2, Tv, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', label: 'A' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', label: 'B' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', label: 'C' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', label: 'D' },
];

const TVControllerContent: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    phase, 
    joinSession, 
    submitAnswer, 
    questions, 
    currentQuestionIndex,
    players,
    timeRemaining,
    pairingCode,
  } = useTVSession();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<boolean | null>(null);

  const currentPlayer = players.find(p => p.id === user?.id);
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const initSession = async () => {
      if (!code) {
        setError('No code provided');
        setLoading(false);
        return;
      }

      const success = await joinSession(code);
      if (!success) {
        setError('Session not found or expired');
      }
      setLoading(false);
    };

    initSession();
  }, [code, joinSession]);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setHasAnswered(false);
    setLastResult(null);
  }, [currentQuestionIndex]);

  // Update result after reveal
  useEffect(() => {
    if (phase === 'reveal' && currentPlayer) {
      setLastResult(currentPlayer.lastAnswerCorrect || false);
      // Vibrate on result
      if ('vibrate' in navigator) {
        navigator.vibrate(currentPlayer.lastAnswerCorrect ? [100] : [100, 50, 100]);
      }
    }
  }, [phase, currentPlayer]);

  const handleAnswer = async (answer: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(answer);
    setHasAnswered(true);
    await submitAnswer(answer);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to TV...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <ChunkyButton onClick={() => navigate('/team')}>
            Back
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // Waiting for game to start
  if (phase === 'pairing' || phase === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Tv className="w-24 h-24 text-primary mb-6" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Connected!</h1>
        <p className="text-muted-foreground text-center mb-8">
          {phase === 'countdown' 
            ? 'Get ready! Game is starting...'
            : 'Look at the TV screen. Waiting for host to start...'}
        </p>
        {currentPlayer && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-foreground">Score: {currentPlayer.score}</span>
          </div>
        )}
      </div>
    );
  }

  // Show results
  if (phase === 'reveal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-6">
        <AnimatePresence>
          {lastResult !== null && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${
                lastResult ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {lastResult ? (
                <Check className="w-16 h-16 text-white" />
              ) : (
                <X className="w-16 h-16 text-white" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {lastResult ? 'Correct! 🎉' : 'Wrong! 😔'}
        </h2>
        {currentPlayer && (
          <div className="flex items-center gap-2 text-yellow-500">
            <Star className="w-5 h-5 fill-yellow-500" />
            <span className="font-bold text-xl">{currentPlayer.score}</span>
          </div>
        )}
      </div>
    );
  }

  // Final scoreboard
  const isScoreboardPhase = phase === 'scoreboard' || (phase as string) === 'completed';
  if (isScoreboardPhase) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const myRank = sortedPlayers.findIndex(p => p.id === user?.id) + 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Game Over!</h1>
          <p className="text-muted-foreground mb-6">Check the TV for full results</p>
          
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <p className="text-muted-foreground mb-2">Your Position</p>
            <p className="text-5xl font-bold text-primary mb-2">#{myRank}</p>
            {currentPlayer && (
              <div className="flex items-center justify-center gap-2 text-yellow-500">
                <Star className="w-5 h-5 fill-yellow-500" />
                <span className="font-bold text-xl">{currentPlayer.score} points</span>
              </div>
            )}
          </div>

          <ChunkyButton onClick={() => navigate('/team')}>
            Back to Lobby
          </ChunkyButton>
        </motion.div>
      </div>
    );
  }

  // Question phase - show answer buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="bg-card border border-border rounded-full px-4 py-2">
          <span className="text-muted-foreground text-sm">Q </span>
          <span className="text-primary font-bold">{currentQuestionIndex + 1}</span>
          <span className="text-muted-foreground text-sm"> / {questions.length}</span>
        </div>
        <div className={`rounded-full px-4 py-2 ${timeRemaining <= 5 ? 'bg-red-500/20 border-red-500' : 'bg-card'} border border-border`}>
          <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-500' : 'text-foreground'}`}>
            {timeRemaining}s
          </span>
        </div>
        {currentPlayer && (
          <div className="flex items-center gap-1 bg-card border border-border rounded-full px-4 py-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-foreground font-bold">{currentPlayer.score}</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center mb-6">
        <p className="text-muted-foreground">
          {hasAnswered ? 'Answer submitted! Look at TV...' : 'Look at TV and tap your answer:'}
        </p>
      </div>

      {/* Answer Buttons */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {currentQuestion?.options.map((option, index) => {
          const color = OPTION_COLORS[index];
          const isSelected = selectedAnswer === option;

          return (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              disabled={hasAnswered}
              onClick={() => handleAnswer(option)}
              className={`${color.bg} ${!hasAnswered && color.hover} rounded-2xl flex items-center justify-center transition-all ${
                hasAnswered && !isSelected ? 'opacity-30' : ''
              } ${isSelected ? 'ring-4 ring-white' : ''}`}
            >
              <span className="text-white text-5xl font-bold">{color.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

const TVController: React.FC = () => {
  return (
    <TVSessionProvider>
      <TVControllerContent />
    </TVSessionProvider>
  );
};

export default TVController;
