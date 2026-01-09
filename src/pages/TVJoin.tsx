import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { TVGameProvider, useTVGame } from '@/contexts/TVGameContext';
import { ControllerCodeEntry } from '@/components/controller/ControllerCodeEntry';
import { ControllerLobby } from '@/components/controller/ControllerLobby';
import { ControllerCountdown } from '@/components/controller/ControllerCountdown';
import { ControllerQuestion } from '@/components/controller/ControllerQuestion';
import { ControllerReveal } from '@/components/controller/ControllerReveal';
import { ControllerResults } from '@/components/controller/ControllerResults';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Loader2, AlertCircle } from 'lucide-react';

const TVJoinContent: React.FC = () => {
  const { code: urlCode } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryCode = searchParams.get('code');
  
  const initialCode = urlCode || queryCode || '';
  
  const { phase, sessionId, questions, leaveSession } = useTVGame();
  const [isJoined, setIsJoined] = useState(false);

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

  // Show appropriate screen based on phase
  // Handle both TVPhase values and database status values
  switch (phase) {
    case 'pairing':
    case 'waiting':
    case 'lobby':
      return <ControllerLobby />;
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
