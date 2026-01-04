import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Tv, Loader2 } from 'lucide-react';
import { TVAwaitingPairingScreen } from '@/components/tv/TVAwaitingPairingScreen';
import { TVWaitingForPlayersScreen } from '@/components/tv/TVWaitingForPlayersScreen';
import { TVCountdownScreen } from '@/components/tv/TVCountdownScreen';
import { TVQuestionScreen } from '@/components/tv/TVQuestionScreen';
import { TVRevealScreen } from '@/components/tv/TVRevealScreen';
import { TVScoreboardScreen } from '@/components/tv/TVScoreboardScreen';
import { TVSessionProvider, useTVSession } from '@/contexts/TVSessionContext';

// This page is displayed on the TV itself
// It generates its own 4-digit pairing code and waits for a host to connect

const TVReceiverContent: React.FC = () => {
  const navigate = useNavigate();
  const [tvPairingCode, setTvPairingCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'awaiting' | 'waiting' | 'countdown' | 'question' | 'reveal' | 'scoreboard'>('awaiting');
  const [players, setPlayers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      // host_user_id and pairing_code are now nullable for TV-initiated sessions
      const { data, error } = await supabase
        .from('tv_sessions')
        .insert([{
          tv_pairing_code: code,
          status: 'awaiting',
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
              setHostId(newData.host_user_id);
              setPhase('waiting');
              if (newData.questions) {
                setQuestions(newData.questions);
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
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'player_answers',
            filter: `tv_session_id=eq.${data.id}`,
          },
          async (payload) => {
            const answer = payload.new as any;
            // Fetch player profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('nickname, avatar_url')
              .eq('user_id', answer.user_id)
              .single();

            setPlayers(prev => {
              const existing = prev.find(p => p.id === answer.user_id);
              if (existing) {
                return prev.map(p =>
                  p.id === answer.user_id
                    ? {
                        ...p,
                        hasAnswered: true,
                        lastAnswer: answer.answer,
                        lastAnswerCorrect: answer.is_correct,
                        score: p.score + (answer.points_earned || 0),
                      }
                    : p
                );
              } else {
                return [
                  ...prev,
                  {
                    id: answer.user_id,
                    nickname: profile?.nickname || 'Player',
                    avatar_url: profile?.avatar_url,
                    score: answer.points_earned || 0,
                    hasAnswered: true,
                    lastAnswer: answer.answer,
                    lastAnswerCorrect: answer.is_correct,
                  },
                ];
              }
            });
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

  // Handle start game from host
  const handleStartGame = async () => {
    if (!sessionId) return;
    
    await supabase
      .from('tv_sessions')
      .update({ status: 'countdown', current_question_index: 0 })
      .eq('id', sessionId);

    setPhase('countdown');

    // After 3 seconds, start the first question
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
        <TVAwaitingPairingScreen
          pairingCode={tvPairingCode}
        />
      );
    case 'waiting':
      return (
        <TVWaitingForPlayersScreen
          sessionId={sessionId!}
          players={players}
          onStartGame={handleStartGame}
        />
      );
    case 'countdown':
      return <TVCountdownScreen />;
    case 'question':
      return (
        <TVQuestionScreen 
          // These props will be passed through context in the wrapper
        />
      );
    case 'reveal':
      return <TVRevealScreen />;
    case 'scoreboard':
      return <TVScoreboardScreen />;
    default:
      return (
        <TVAwaitingPairingScreen
          pairingCode={tvPairingCode}
        />
      );
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
