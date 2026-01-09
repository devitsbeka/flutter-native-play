import React, { useEffect, useRef, useCallback } from 'react';
import { TVGameProvider, useTVGame } from '@/contexts/TVGameContext';
import { TVPairingScreenV3 } from '@/components/tv/TVPairingScreenV3';
import { TVLobbyScreenV2 } from '@/components/tv/TVLobbyScreenV2';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreenV3 } from '@/components/tv/TVQuestionScreenV3';
import { TVRevealScreenV2 } from '@/components/tv/TVRevealScreenV2';
import { TVResultsScreen } from '@/components/tv/TVResultsScreen';
import { TVIdleScreen } from '@/components/tv/TVIdleScreen';
import { Loader2 } from 'lucide-react';

const CODE_REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh code every 5 minutes if no players

const TVLobbyContent: React.FC = () => {
  const { phase, code, createSession, players, sessionId } = useTVGame();
  const lastRefreshRef = useRef<number>(Date.now());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // Initialize session once
  const initSession = useCallback(async () => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    await createSession();
    lastRefreshRef.current = Date.now();
  }, [createSession]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Auto-refresh code if no players have joined after interval
  useEffect(() => {
    const checkAndRefresh = async () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // Only refresh if:
      // 1. We're in pairing phase (no players yet)
      // 2. Enough time has passed since last refresh
      if (phase === 'pairing' && players.length === 0 && timeSinceLastRefresh >= CODE_REFRESH_INTERVAL) {
        console.log('Auto-refreshing TV code - no players joined in', CODE_REFRESH_INTERVAL / 1000, 'seconds');
        hasInitializedRef.current = false; // Allow re-initialization
        await createSession();
        lastRefreshRef.current = Date.now();
      }
    };

    // Check every 30 seconds
    refreshIntervalRef.current = setInterval(checkAndRefresh, 30 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [phase, players.length, createSession]);

  // Debug logging
  useEffect(() => {
    console.log('TV State - Phase:', phase, 'Players:', players.length, 'Code:', code);
  }, [phase, players, code]);

  if (!code) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-purple-300" />
      </div>
    );
  }

  // Show lobby as soon as we have players, regardless of phase
  const hasPlayers = players.length > 0;

  switch (phase) {
    case 'pairing':
      return hasPlayers ? <TVLobbyScreenV2 /> : <TVPairingScreenV3 />;
    case 'lobby':
      return hasPlayers ? <TVLobbyScreenV2 /> : <TVPairingScreenV3 />;
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
      return hasPlayers ? <TVLobbyScreenV2 /> : <TVPairingScreenV3 />;
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
