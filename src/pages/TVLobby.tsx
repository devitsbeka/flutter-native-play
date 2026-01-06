import React, { useEffect } from 'react';
import { TVGameProvider, useTVGame } from '@/contexts/TVGameContext';
import { TVPairingScreenV3 } from '@/components/tv/TVPairingScreenV3';
import { TVLobbyScreenV2 } from '@/components/tv/TVLobbyScreenV2';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreenV3 } from '@/components/tv/TVQuestionScreenV3';
import { TVRevealScreenV2 } from '@/components/tv/TVRevealScreenV2';
import { TVResultsScreen } from '@/components/tv/TVResultsScreen';
import { TVIdleScreen } from '@/components/tv/TVIdleScreen';
import { Loader2 } from 'lucide-react';

const TVLobbyContent: React.FC = () => {
  const { phase, code, createSession, players } = useTVGame();

  useEffect(() => {
    createSession();
  }, [createSession]);

  if (!code) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-purple-300" />
      </div>
    );
  }

  switch (phase) {
    case 'pairing':
      return <TVPairingScreenV3 />;
    case 'lobby':
      return players.length === 0 ? <TVPairingScreenV3 /> : <TVLobbyScreenV2 />;
    case 'countdown':
      return <TVCountdownScreenV2 />;
    case 'question':
      return <TVQuestionScreenV3 />;
    case 'reveal':
      return <TVRevealScreenV2 />;
    case 'results':
      return <TVResultsScreen />;
    case 'idle':
      return <TVIdleScreen />;
    default:
      return <TVPairingScreenV3 />;
  }
};

const TVLobby: React.FC = () => {
  return (
    <TVGameProvider>
      <div className="tv-display-container overflow-hidden">
        <TVLobbyContent />
      </div>
    </TVGameProvider>
  );
};

export default TVLobby;
