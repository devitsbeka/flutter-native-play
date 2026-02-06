import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TVGameProvider, useTVGame, mapDbStatusToPhase } from '@/contexts/TVGameContext';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { TVPairingScreenV3 } from '@/components/tv/TVPairingScreenV3';
import { TVLobbyScreenV2 } from '@/components/tv/TVLobbyScreenV2';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreenV4 } from '@/components/tv/TVQuestionScreenV4';
import { TVResultsScreen } from '@/components/tv/TVResultsScreen';
import { TVRoundIntroScreen } from '@/components/tv/TVRoundIntroScreen';
import { TVPollScreen } from '@/components/tv/TVPollScreen';
import { TVPollResultsScreen } from '@/components/tv/TVPollResultsScreen';
import { TVErrorBoundary } from '@/components/tv/TVErrorBoundary';
import { Loader2 } from 'lucide-react';
import { tvLog, tvLogError } from '@/utils/tvDebug';
import { supabase } from '@/integrations/supabase/client';

// UUID validation helper
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const TVDisplayContent: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    phase,
    createSession,
    joinSession,
    leaveSession,
    startGame,
    questions,
    currentQuestionIndex,
    players,
    timeRemaining,
    code: sessionCode,
    isPaired,
  } = useTVGame();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  // Auto-redirect to pairing screen when game is idle for 60s
  useIdleTimeout(phase, () => {
    tvLog('TVDisplay idle timeout — returning to pairing screen');
    leaveSession();
    navigate('/tv', { replace: true });
  });

  useEffect(() => {
    const initSession = async () => {
      // Prevent double initialization in strict mode
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      tvLog('TVDisplay initializing', { code });

      // All valid statuses that a TV can connect to
      const activeStatuses = ['waiting', 'paired', 'lobby', 'countdown', 'playing', 'reveal', 'completed', 'poll-suggest', 'poll-voting', 'poll-results', 'round-intro', 'results', 'category-select'];

      // If code is provided in URL, this is a TV display joining an existing session
      if (code) {
        try {
          // Try to find session by 6-char code first
          let { data: session } = await supabase
            .from('tv_sessions')
            .select('*')
            .eq('pairing_code', code.toUpperCase())
            .in('status', activeStatuses)
            .maybeSingle();

          // If not found, try 4-digit code
          if (!session) {
            const { data: session4 } = await supabase
              .from('tv_sessions')
              .select('*')
              .eq('tv_pairing_code', code.toUpperCase())
              .in('status', activeStatuses)
              .maybeSingle();
            session = session4;
          }
          
          // Still not found? Try by session ID directly (for /tv/:sessionId routes)
          if (!session && isUuid(code)) {
            const { data: sessionById } = await supabase
              .from('tv_sessions')
              .select('*')
              .eq('id', code)
              .in('status', activeStatuses)
              .maybeSingle();
            session = sessionById;
          }

          if (!session) {
            tvLogError('TVDisplay', 'Session not found for code');
            setError('Session not found');
            setLoading(false);
            return;
          }

          tvLog('TVDisplay joining existing session', { sessionId: session.id, code, status: session.status });
          
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
  const showLobby = isPaired || players.length > 0;

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
      return <TVQuestionScreenV4 />;
    case 'reveal':
      return <TVQuestionScreenV4 />;
    case 'round-intro':
      return <TVRoundIntroScreen isController={false} />;
    case 'poll-suggest':
    case 'poll-voting':
      return <TVPollScreen />;
    case 'poll-results':
      return <TVPollResultsScreen />;
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
