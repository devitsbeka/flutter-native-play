import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TVGameProvider, useTVGame, mapDbStatusToPhase } from '@/contexts/TVGameContext';
import { TVPairingScreenV3 } from '@/components/tv/TVPairingScreenV3';
import { TVLobbyScreenV2 } from '@/components/tv/TVLobbyScreenV2';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreenV3 } from '@/components/tv/TVQuestionScreenV3';
import { TVRevealScreenV2 } from '@/components/tv/TVRevealScreenV2';
import { TVResultsScreen } from '@/components/tv/TVResultsScreen';
import { TVRoundIntroScreen } from '@/components/tv/TVRoundIntroScreen';
import { TVErrorBoundary } from '@/components/tv/TVErrorBoundary';
import { Loader2 } from 'lucide-react';
import { tvLog, tvLogError } from '@/utils/tvDebug';
import { supabase } from '@/integrations/supabase/client';

const TVDisplayContent: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { 
    phase, 
    createSession,
    joinSession,
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

      // If code is provided in URL, this is a TV display joining an existing session
      if (code) {
        try {
          // Try to find session by 6-char code first
          let { data: session } = await supabase
            .from('tv_sessions')
            .select('*')
            .eq('pairing_code', code.toUpperCase())
            .in('status', ['waiting', 'paired', 'countdown', 'playing', 'reveal', 'completed'])
            .single();

          // If not found, try 4-digit code
          if (!session) {
            const { data: session4 } = await supabase
              .from('tv_sessions')
              .select('*')
              .eq('tv_pairing_code', code.toUpperCase())
              .in('status', ['waiting', 'paired', 'countdown', 'playing', 'reveal', 'completed'])
              .single();
            session = session4;
          }

          if (!session) {
            tvLogError('TVDisplay', 'Session not found for code');
            setError('Session not found');
            setLoading(false);
            return;
          }

          tvLog('TVDisplay joining existing session', { sessionId: session.id, code });
          
          // Join using context's joinSession as TV_DISPLAY
          const success = await joinSession(code, 'TV_DISPLAY', null);
          if (!success) {
            tvLogError('TVDisplay', 'Failed to join session');
            setError('Failed to join session');
          }
        } catch (err) {
          tvLogError('TVDisplay', err);
          setError('Failed to join session');
        }
      } else {
        // No code - create new session (TV is the originator)
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
  }, [code, createSession, joinSession]);

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

  // Check if we should show lobby (has players or is paired)
  const showLobby = players.length > 0;

  // Use the mapDbStatusToPhase utility for consistent phase mapping
  const normalizedPhase = mapDbStatusToPhase(phase);

  tvLog('TVDisplay rendering phase', { phase, normalizedPhase, playerCount: players.length });

  switch (normalizedPhase) {
    case 'pairing':
    case 'waiting':
    case 'lobby':
      return showLobby ? <TVLobbyScreenV2 /> : <TVPairingScreenV3 />;
    case 'countdown':
      return <TVCountdownScreenV2 />;
    case 'question':
    case 'playing':
      return <TVQuestionScreenV3 />;
    case 'reveal':
      return <TVRevealScreenV2 />;
    case 'round-intro':
      return <TVRoundIntroScreen isController={false} />;
    case 'results':
    case 'completed':
      return <TVResultsScreen />;
    default:
      return showLobby ? <TVLobbyScreenV2 /> : <TVPairingScreenV3 />;
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
