import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { TVGameProvider, useTVGame } from '@/contexts/TVGameContext';
import { ControllerCodeEntry } from '@/components/controller/ControllerCodeEntry';
import { ControllerLobby } from '@/components/controller/ControllerLobby';
import { ControllerCountdown } from '@/components/controller/ControllerCountdown';
import { ControllerQuestion } from '@/components/controller/ControllerQuestion';
import { ControllerReveal } from '@/components/controller/ControllerReveal';
import { ControllerResults } from '@/components/controller/ControllerResults';
import { ControllerRoundIntroWaiting } from '@/components/controller/ControllerRoundIntroWaiting';
import { ControllerPollScreen } from '@/components/controller/ControllerPollScreen';
import { ControllerPollResultsGuest } from '@/components/controller/ControllerPollResultsGuest';
import { useTVPoll } from '@/hooks/useTVPoll';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Loader2, AlertCircle } from 'lucide-react';

const TVJoinContent: React.FC = () => {
  const { code: urlCode, sessionId: urlSessionId } = useParams<{ code?: string; sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryCode = searchParams.get('code');
  const querySessionId = searchParams.get('session');
  
  // Hard switch: QR should pass sessionId; manual entry uses 4-digit TV code.
  const initialCode = urlSessionId || querySessionId || urlCode || queryCode || '';
  
  const { phase, sessionId, questions, leaveSession, myPlayerId, players } = useTVGame();
  const [isJoined, setIsJoined] = useState(false);

  // Find current player from players array
  const myPlayer = players.find(p => p.id === myPlayerId);

  // Poll hook for detecting poll phase changes faster than context
  const pollHook = useTVPoll({
    sessionId: sessionId || null,
    userId: myPlayerId || null,
    nickname: myPlayer?.nickname || 'Player',
    avatarUrl: myPlayer?.avatar_url,
    isHost: false,
  });

  // If we have a session, we're joined
  useEffect(() => {
    if (sessionId) {
      setIsJoined(true);
    }
  }, [sessionId]);

  // Show code entry if not joined yet
  if (!isJoined) {
    return <ControllerCodeEntry initialCode={initialCode} onJoined={() => setIsJoined(true)} />;
  }

  // Detect invalid state: phase requires questions but none exist
  const requiresQuestions = ['question', 'playing', 'reveal'].includes(phase);
  const hasInvalidState = requiresQuestions && (!questions || questions.length === 0);

  if (hasInvalidState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">თამაში არ არის მზად</h2>
          <p className="text-purple-300 mb-6">სესია არასწორ მდგომარეობაშია. გთხოვ დაუბრუნდი მთავარ გვერდს.</p>
          <ChunkyButton
            variant="white"
            onClick={() => {
              leaveSession();
              navigate('/');
            }}
          >
            მთავარზე დაბრუნება
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // Use context phase as the source of truth - don't override with pollHook
  // This ensures guests stay in voting phase until the context updates from the database
  // The pollHook phase was causing premature transitions to results
  const effectivePhase = phase;

  // CRITICAL DEBUG: Log phase and questions to understand guest state after poll
  console.log('[TVJoin] 🎯 Phase debug:', { 
    contextPhase: phase, 
    effectivePhase,
    questionsLength: questions.length,
    myPlayerId: myPlayerId ? myPlayerId.substring(0, 8) + '...' : 'NULL',
    sessionId: sessionId ? sessionId.substring(0, 8) + '...' : 'NULL',
  });

  // Show appropriate screen based on phase
  // Handle both TVPhase values and database status values
  switch (effectivePhase) {
    case 'pairing':
    case 'waiting':
    case 'lobby':
      return <ControllerLobby />;
    case 'poll-suggest':
    case 'poll-voting':
      return (
        <ControllerPollScreen
          sessionId={sessionId || ''}
          userId={myPlayerId || ''}
          nickname={myPlayer?.nickname || 'Player'}
          avatarUrl={myPlayer?.avatar_url}
          isHost={false}
          contextPhase={effectivePhase}
        />
      );
    case 'poll-results':
      return (
        <ControllerPollResultsGuest
          sessionId={sessionId || ''}
        />
      );
    case 'round-intro':
      return <ControllerRoundIntroWaiting />;
    case 'countdown':
      return <ControllerCountdown />;
    case 'question':
    case 'playing': // Database status maps to question phase
      return <ControllerQuestion />;
    case 'reveal':
      return <ControllerReveal />;
    case 'results':
    case 'completed': // Database status maps to results phase
      return <ControllerResults />;
    case 'idle':
    default:
      return <ControllerLobby />;
  }
};

const TVJoin: React.FC = () => {
  return (
    <TVGameProvider>
      <TVJoinContent />
    </TVGameProvider>
  );
};

export default TVJoin;
