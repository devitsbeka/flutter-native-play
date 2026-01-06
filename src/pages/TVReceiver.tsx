import React, { useEffect, useState, useRef } from 'react';
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
  hasAnswered?: boolean;
  isHost?: boolean;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

type Phase = 'awaiting' | 'waiting' | 'countdown' | 'question' | 'reveal' | 'scoreboard';

const QUESTION_DURATION = 15;

const TVReceiverContent: React.FC = () => {
  const [tvPairingCode, setTvPairingCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestJoinCode, setGuestJoinCode] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [phase, setPhase] = useState<Phase>('awaiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_DURATION);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryIcon, setCategoryIcon] = useState<string>('');
  const [gameName, setGameName] = useState<string>('TV კვიზი');
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const answersChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

            // Update category info
            if (newData.category_name) setCategoryName(newData.category_name);
            if (newData.category_icon) setCategoryIcon(newData.category_icon);
            if (newData.game_name) setGameName(newData.game_name);

            // Update questions if available
            if (newData.questions && Array.isArray(newData.questions)) {
              setQuestions(newData.questions);
              if (newData.status === 'waiting' && phase === 'awaiting') {
                setPhase('waiting');
              }
            }

            // Update current question index
            if (typeof newData.current_question_index === 'number') {
              setCurrentQuestionIndex(newData.current_question_index);
            }

            // Update phase based on status
            if (newData.status === 'countdown') {
              setPhase('countdown');
            } else if (newData.status === 'playing') {
              setPhase('question');
              setTimeRemaining(QUESTION_DURATION);
              // Reset answer status for all players
              setPlayers(prev => prev.map(p => ({ ...p, hasAnswered: false })));
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Set up presence channel when session is paired - track ALL players including host
  useEffect(() => {
    if (!sessionId || !isPaired) return;

    const presenceChannel = supabase
      .channel(`tv-presence-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const connectedPlayers: Player[] = [];
        
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            // Include ALL players (both host and guests)
            connectedPlayers.push({
              id: presence.user_id,
              nickname: presence.nickname || 'Player',
              avatar_url: presence.avatar_url,
              score: presence.score || 0,
              hasAnswered: false,
              isHost: presence.isHost || false,
            });
          });
        });
        
        // Merge with existing player scores
        setPlayers(prev => {
          return connectedPlayers.map(newPlayer => {
            const existing = prev.find(p => p.id === newPlayer.id);
            return existing 
              ? { ...newPlayer, score: existing.score, hasAnswered: existing.hasAnswered }
              : newPlayer;
          });
        });
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

  // Subscribe to player answers to update who has answered
  useEffect(() => {
    if (!sessionId || phase !== 'question') return;

    const answersChannel = supabase
      .channel(`tv-answers-${sessionId}-${currentQuestionIndex}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_answers',
          filter: `tv_session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const answer = payload.new as any;
          
          // Only update if it's for the current question
          if (answer.question_index !== currentQuestionIndex) return;

          // Update player's hasAnswered status and score
          setPlayers(prev => prev.map(p => {
            if (p.id === answer.user_id) {
              return {
                ...p,
                hasAnswered: true,
                score: p.score + (answer.points_earned || 0),
              };
            }
            return p;
          }));
        }
      )
      .subscribe();

    answersChannelRef.current = answersChannel;

    return () => {
      if (answersChannelRef.current) {
        supabase.removeChannel(answersChannelRef.current);
      }
    };
  }, [sessionId, phase, currentQuestionIndex]);

  // Timer for questions
  useEffect(() => {
    if (phase !== 'question') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    setTimeRemaining(QUESTION_DURATION);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, currentQuestionIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-purple-300 mx-auto mb-4" />
          <p className="text-purple-200 text-xl">მზადდება...</p>
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
          gameName={gameName}
          categoryName={categoryName}
          categoryIcon={categoryIcon}
        />
      );
    case 'countdown':
      return <TVCountdownScreen />;
    case 'question':
      return (
        <TVQuestionScreen
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          timeRemaining={timeRemaining}
          players={players}
        />
      );
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
