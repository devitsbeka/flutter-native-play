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
import { Loader2 } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { useIdleTimeout, tvPhaseCanStall } from '@/hooks/useIdleTimeout';

const TVJoinContent: React.FC = () => {
  const { code: urlCode, sessionId: urlSessionId } = useParams<{ code?: string; sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryCode = searchParams.get('code');
  const querySessionId = searchParams.get('session');
  
  // Hard switch: QR should pass sessionId; manual entry uses 4-digit TV code.
  const initialCode = urlSessionId || querySessionId || urlCode || queryCode || '';
  
  const { phase, sessionId, questions, leaveSession, myPlayerId, players, refetchSessionData, currentQuestionIndex } = useTVGame();
  const [isJoined, setIsJoined] = useState(false);
  const { t } = useLanguage();

  // Leave a session that has genuinely stalled. The composite value means a
  // new question resets the timer, so a long round is not mistaken for a
  // stuck one — and the phase gate means the wait BEFORE the game starts is
  // not either. A player who scans the QR while the host is still adding
  // rounds sits in the lobby for as long as the host takes; that is the
  // screen working, not failing.
  useIdleTimeout(
    `${phase}-${currentQuestionIndex}`,
    () => {
      console.log('[TVJoin] Idle timeout — leaving session', { phase });
      leaveSession();
      navigate('/', { replace: true });
    },
    120_000,
    { enabled: tvPhaseCanStall(phase) },
  );

  // Find current player from players array
  const myPlayer = players.find(p => p.id === myPlayerId);

  // If we have a session, we're joined
  useEffect(() => {
    if (sessionId) {
      setIsJoined(true);
    }
  }, [sessionId]);

  // Detect invalid state: phase requires questions but none exist
  const requiresQuestions = ['question', 'playing', 'reveal'].includes(phase);
  const hasInvalidState = isJoined && requiresQuestions && (!questions || questions.length === 0);

  // CRITICAL FIX: Auto-refetch questions when in invalid state
  // This recovers from missed realtime updates during poll->game transitions
  // IMPORTANT: This hook must be called unconditionally (before any early returns)
  useEffect(() => {
    if (hasInvalidState && sessionId) {
      console.log('[TVJoin] ⚠️ Invalid state detected - triggering context refetch...');
      
      // Use context's refetchSessionData which properly updates state
      const timer = setTimeout(() => {
        refetchSessionData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasInvalidState, sessionId, refetchSessionData]);

  // Show code entry if not joined yet
  if (!isJoined) {
    return <ControllerCodeEntry initialCode={initialCode} onJoined={() => setIsJoined(true)} />;
  }

  // Show loading instead of error when waiting for questions
  if (hasInvalidState) {
    return (
      <div className="h-[100dvh] safe-bleed bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-300 mx-auto mb-4 animate-spin" />
          <h2 className="text-white text-xl font-bold mb-2">{t("extra.loadingQuestions")}</h2>
          <p className="text-purple-300 mb-6">{t("extra.pleaseWait")}</p>
        </div>
      </div>
    );
  }

  // Use context phase as the source of truth
  // This ensures guests stay in voting phase until the context updates from the database
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
