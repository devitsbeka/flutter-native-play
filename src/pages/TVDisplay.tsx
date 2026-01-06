import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TVSessionProvider, useTVSession } from '@/contexts/TVSessionContext';
import { TVPairingScreen } from '@/components/tv/TVPairingScreen';
import { TVCountdownScreen } from '@/components/tv/TVCountdownScreen';
import { TVQuestionScreen } from '@/components/tv/TVQuestionScreen';
import { TVRevealScreen } from '@/components/tv/TVRevealScreen';
import { TVScoreboardScreen } from '@/components/tv/TVScoreboardScreen';
import { Loader2 } from 'lucide-react';

const TVDisplayContent: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { 
    phase, 
    joinSession, 
    startGame, 
    questions, 
    currentQuestionIndex, 
    players, 
    timeRemaining 
  } = useTVSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSession = async () => {
      if (!code) {
        setError('No code provided');
        setLoading(false);
        return;
      }

      const success = await joinSession(code);
      if (!success) {
        setError('Session not found');
      }
      setLoading(false);
    };

    initSession();
  }, [code, joinSession]);

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

  // Handle both the context phase and raw status from DB
  const normalizedPhase = phase === 'playing' ? 'question' : phase === 'completed' ? 'scoreboard' : phase;

  switch (normalizedPhase) {
    case 'pairing':
    case 'waiting':
    case 'paired':
      return <TVPairingScreen onStartGame={handleStartGame} />;
    case 'countdown':
      return <TVCountdownScreen />;
    case 'question':
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
    case 'scoreboard':
      return <TVScoreboardScreen />;
    default:
      return <TVPairingScreen onStartGame={handleStartGame} />;
  }
};

const TVDisplay: React.FC = () => {
  return (
    <TVSessionProvider>
      <div className="tv-display-container overflow-hidden">
        <TVDisplayContent />
      </div>
    </TVSessionProvider>
  );
};

export default TVDisplay;
