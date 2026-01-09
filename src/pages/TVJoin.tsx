import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { TVGameProvider, useTVGame } from '@/contexts/TVGameContext';
import { ControllerCodeEntry } from '@/components/controller/ControllerCodeEntry';
import { ControllerLobby } from '@/components/controller/ControllerLobby';
import { ControllerQuestion } from '@/components/controller/ControllerQuestion';
import { ControllerReveal } from '@/components/controller/ControllerReveal';
import { ControllerResults } from '@/components/controller/ControllerResults';
import { Loader2 } from 'lucide-react';

const TVJoinContent: React.FC = () => {
  const { code: urlCode } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code');
  
  const initialCode = urlCode || queryCode || '';
  
  const { phase, sessionId } = useTVGame();
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

  // Show appropriate screen based on phase
  // Handle both TVPhase values and database status values
  switch (phase) {
    case 'pairing':
    case 'waiting':
    case 'lobby':
      return <ControllerLobby />;
    case 'countdown':
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-purple-200 text-lg mb-4">მოემზადე!</p>
            <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto" />
          </div>
        </div>
      );
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
