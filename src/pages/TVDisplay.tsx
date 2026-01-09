import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TVGameProvider, useTVGame, mapDbStatusToPhase } from '@/contexts/TVGameContext';
import { TVPairingScreen } from '@/components/tv/TVPairingScreen';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreen } from '@/components/tv/TVQuestionScreen';
import { TVRevealScreen } from '@/components/tv/TVRevealScreen';
import { TVScoreboardScreen } from '@/components/tv/TVScoreboardScreen';
import { TVErrorBoundary } from '@/components/tv/TVErrorBoundary';
import { Loader2 } from 'lucide-react';
import { tvLog, tvLogError } from '@/utils/tvDebug';

const TVDisplayContent: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { 
    phase, 
    createSession,
    startGame, 
    questions, 
    currentQuestionIndex, 
    players, 
    timeRemaining,
    code: sessionCode,
  } = useTVGame();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  useEffect(() => {
    const initSession = async () => {
      // Prevent double initialization in strict mode
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      tvLog('TVDisplay initializing', { code });

      // If code is provided in URL, this is a TV display joining
      // If no code, create a new session (TV is the display)
      if (!code) {
        const newCode = await createSession();
        if (!newCode) {
          tvLogError('TVDisplay', 'Failed to create session');
          setError('Failed to create session');
        } else {
          tvLog('TVDisplay created session', { code: newCode });
        }
      }
      
      setLoading(false);
    };

    initSession();
  }, [code, createSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <button 
            onClick={() => navigate('/team')}
            className="text-purple-300 underline"
          >
            Back to Team
          </button>
        </div>
      </div>
    );
  }

  const handleStartGame = () => {
    startGame();
  };

  // Convert players from context format to component format
  const formattedPlayers = players.map(p => ({
    id: p.id,
    nickname: p.nickname,
    avatar_url: p.avatar_url,
    score: p.score,
    hasAnswered: p.hasAnswered,
  }));

  // Use the mapDbStatusToPhase utility for consistent phase mapping
  const normalizedPhase = mapDbStatusToPhase(phase);

  tvLog('TVDisplay rendering phase', { phase, normalizedPhase, playerCount: players.length });

  switch (normalizedPhase) {
    case 'pairing':
    case 'waiting':
    case 'lobby':
      return <TVPairingScreen onStartGame={handleStartGame} />;
    case 'countdown':
      return <TVCountdownScreenV2 />;
    case 'question':
    case 'playing':
      return (
        <TVQuestionScreen 
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          timeRemaining={timeRemaining}
          players={formattedPlayers}
        />
      );
    case 'reveal':
      return <TVRevealScreen />;
    case 'results':
    case 'completed':
      return <TVScoreboardScreen />;
    default:
      return <TVPairingScreen onStartGame={handleStartGame} />;
  }
};

const TVDisplay: React.FC = () => {
  return (
    <TVGameProvider>
      <TVErrorBoundary 
        onRetry={() => window.location.reload()}
        fallbackMessage="TV display encountered an error"
      >
        <div className="tv-display-container overflow-hidden">
          <TVDisplayContent />
        </div>
      </TVErrorBoundary>
    </TVGameProvider>
  );
};

export default TVDisplay;
