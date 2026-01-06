import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { TVAwaitingPairingScreen } from '@/components/tv/TVAwaitingPairingScreen';
import { TVWaitingForPlayersScreen } from '@/components/tv/TVWaitingForPlayersScreen';
import { TVCountdownScreen } from '@/components/tv/TVCountdownScreen';
import { TVQuestionScreen } from '@/components/tv/TVQuestionScreen';
import { TVRevealScreen } from '@/components/tv/TVRevealScreen';
import { TVScoreboardScreen } from '@/components/tv/TVScoreboardScreen';
import { TVBroadcastMode } from '@/components/tv/TVBroadcastMode';
import { TVSessionProvider } from '@/contexts/TVSessionContext';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

type Phase = 'awaiting' | 'waiting' | 'countdown' | 'question' | 'reveal' | 'scoreboard';

const TVReceiverContent: React.FC = () => {
  const navigate = useNavigate();
  const [tvPairingCode, setTvPairingCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestJoinCode, setGuestJoinCode] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [phase, setPhase] = useState<Phase>('awaiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Generate 4-digit code
  const generatePairingCode = () => {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  // Initialize TV session on mount
  useEffect(() => {
    const initTV = async () => {
      const code = generatePairingCode();
      setTvPairingCode(code);

      // Create a TV session with just the pairing code (no host yet)
      const { data, error } = await supabase
        .from('tv_sessions')
        .insert([{
          tv_pairing_code: code,
          status: 'waiting',
          is_paired: false,
          host_user_id: null,
          pairing_code: null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating TV session:', error);
        return;
      }

      setSessionId(data.id);
      setLoading(false);

      // Subscribe to changes on this session
      const channel = supabase
        .channel(`tv-receiver-${data.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tv_sessions',
            filter: `id=eq.${data.id}`,
          },
          (payload) => {
            const newData = payload.new as any;
            console.log('TV session updated:', newData);
            
            if (newData.is_paired && !isPaired) {
              setIsPaired(true);
              setGuestJoinCode(newData.pairing_code);
            }

            // Update questions if available
            if (newData.questions && Array.isArray(newData.questions)) {
              setQuestions(newData.questions);
              if (newData.status === 'waiting' && phase === 'awaiting') {
                setPhase('waiting');
              }
            }

            // Update phase based on status
            if (newData.status === 'countdown') {
              setPhase('countdown');
            } else if (newData.status === 'playing') {
              setPhase('question');
              setCurrentQuestionIndex(newData.current_question_index || 0);
            } else if (newData.status === 'reveal') {
              setPhase('reveal');
            } else if (newData.status === 'completed') {
              setPhase('scoreboard');
            } else if (newData.status === 'waiting' && newData.questions) {
              setPhase('waiting');
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    initTV();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Set up presence channel when session is paired
  useEffect(() => {
    if (!sessionId || !isPaired) return;

    const presenceChannel = supabase
      .channel(`tv-presence-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const connectedPlayers: Player[] = [];
        
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            // Add all players from presence (guests have isGuest: true)
            if (presence.isGuest) {
              connectedPlayers.push({
                id: presence.user_id,
                nickname: presence.nickname || 'Player',
                avatar_url: presence.avatar_url,
                score: 0,
              });
            }
          });
        });
        
        setPlayers(connectedPlayers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Player joined TV session:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Player left TV session:', leftPresences);
      })
      .subscribe();

    presenceChannelRef.current = presenceChannel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [sessionId, isPaired]);

  // Handle start game from TV (fallback, usually host controls this)
  const handleStartGame = async () => {
    if (!sessionId) return;
    
    await supabase
      .from('tv_sessions')
      .update({ status: 'countdown', current_question_index: 0 })
      .eq('id', sessionId);

    setPhase('countdown');

    setTimeout(async () => {
      await supabase
        .from('tv_sessions')
        .update({ 
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', sessionId);
      setPhase('question');
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-xl">მზადდება...</p>
        </div>
      </div>
    );
  }

  // Render based on phase
  switch (phase) {
    case 'awaiting':
      return (
        <div className="relative">
          {sessionId && (
            <TVBroadcastMode
              sessionId={sessionId}
              pairingCode={tvPairingCode}
              deviceName="Living Room TV"
            />
          )}
          <TVAwaitingPairingScreen pairingCode={tvPairingCode} />
        </div>
      );
    case 'waiting':
      return (
        <TVWaitingForPlayersScreen
          guestJoinCode={guestJoinCode || ''}
          players={players}
          onStartGame={handleStartGame}
        />
      );
    case 'countdown':
      return <TVCountdownScreen />;
    case 'question':
      return <TVQuestionScreen />;
    case 'reveal':
      return <TVRevealScreen />;
    case 'scoreboard':
      return <TVScoreboardScreen />;
    default:
      return <TVAwaitingPairingScreen pairingCode={tvPairingCode} />;
  }
};

const TVReceiver: React.FC = () => {
  return (
    <TVSessionProvider>
      <div className="tv-display-container overflow-hidden">
        <TVReceiverContent />
      </div>
    </TVSessionProvider>
  );
};

export default TVReceiver;
