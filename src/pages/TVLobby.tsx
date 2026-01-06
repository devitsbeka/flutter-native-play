import React, { useEffect } from 'react';
import { TVGameProvider, useTVGame } from '@/contexts/TVGameContext';
import { TVPairingScreenV2 } from '@/components/tv/TVPairingScreenV2';
import { TVLobbyScreen } from '@/components/tv/TVLobbyScreen';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreenV2 } from '@/components/tv/TVQuestionScreenV2';
import { TVRevealScreenV2 } from '@/components/tv/TVRevealScreenV2';
import { TVResultsScreen } from '@/components/tv/TVResultsScreen';
import { TVIdleScreen } from '@/components/tv/TVIdleScreen';
import { Loader2 } from 'lucide-react';

const TVLobbyContent: React.FC = () => {
  const { phase, code, createSession, players } = useTVGame();

  useEffect(() => {
    // Create a new session when TV loads
    createSession();
  }, [createSession]);

  if (!code) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-purple-300" />
      </div>
    );
  }

  // Determine which screen to show based on phase
  switch (phase) {
    case 'pairing':
      return <TVPairingScreenV2 />;
    case 'lobby':
      return players.length === 0 ? <TVPairingScreenV2 /> : <TVLobbyScreen />;
    case 'countdown':
      return <TVCountdownScreenV2 />;
    case 'question':
      return <TVQuestionScreenV2 />;
    case 'reveal':
      return <TVRevealScreenV2 />;
    case 'results':
      return <TVResultsScreen />;
    case 'idle':
      return <TVIdleScreen />;
    default:
      return <TVPairingScreenV2 />;
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
