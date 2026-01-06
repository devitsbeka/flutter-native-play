import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Tv, Play, SkipForward, Users, Loader2, QrCode, Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
}

const TVHostController: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [guestJoinCode, setGuestJoinCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const joinUrl = `${window.location.origin}/controller/${guestJoinCode}`;

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setError('No session ID');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !data) {
        setError('Session not found');
        setLoading(false);
        return;
      }

      // Verify this user is the host
      if (data.host_user_id !== user?.id) {
        setError('You are not the host of this session');
        setLoading(false);
        return;
      }

      setSession(data);
      setGuestJoinCode(data.pairing_code || '');
      setLoading(false);

      // Subscribe to session updates
      const channel = supabase
        .channel(`host-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tv_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            setSession(payload.new);
          }
        )
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
                    ? { ...p, score: p.score + (answer.points_earned || 0) }
                    : p
                );
              }
              return [...prev, {
                id: answer.user_id,
                nickname: profile?.nickname || 'Player',
                avatar_url: profile?.avatar_url,
                score: answer.points_earned || 0,
              }];
            });
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    loadSession();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, user?.id]);

  const handleStartGame = async () => {
    if (!sessionId) return;

    await supabase
      .from('tv_sessions')
      .update({ status: 'countdown', current_question_index: 0 })
      .eq('id', sessionId);

    // After countdown, start the first question
    setTimeout(async () => {
      await supabase
        .from('tv_sessions')
        .update({ 
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }, 3000);
  };

  const handleNextQuestion = async () => {
    if (!sessionId || !session) return;

    const questions = session.questions || [];
    const currentIndex = session.current_question_index || 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      // End game
      await supabase
        .from('tv_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
    } else {
      await supabase
        .from('tv_sessions')
        .update({ 
          current_question_index: nextIndex,
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
  };

  const handleEndGame = async () => {
    if (!sessionId) return;
    
    await supabase
      .from('tv_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    toast.success('Game ended!');
    navigate('/team');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(guestJoinCode);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive text-xl mb-4">{error}</p>
          <ChunkyButton onClick={() => navigate('/team')}>
            Back
          </ChunkyButton>
        </div>
      </div>
    );
  }

  const status = session?.status || 'waiting';
  const currentQuestionIndex = session?.current_question_index || 0;
  const totalQuestions = session?.questions?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-2">
          <Tv className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground">Host Control</span>
        </div>
        <div className="bg-card border border-border rounded-full px-3 py-1">
          <span className="text-sm text-muted-foreground capitalize">{status}</span>
        </div>
      </motion.div>

      {/* QR Code for guests */}
      {status === 'waiting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">მოთამაშეებს გადაუგზავნე</h2>
          </div>

          <div className="flex gap-4">
            {/* QR Code */}
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={joinUrl} size={120} level="H" />
            </div>

            {/* Code and link */}
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">ან შეიყვანონ კოდი:</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-primary tracking-wider">
                  {guestJoinCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-primary" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 break-all">{joinUrl}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Players count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-4 mb-6"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <span className="text-foreground font-medium">{players.length} მოთამაშე</span>
        </div>
      </motion.div>

      {/* Game progress */}
      {status === 'playing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-4 mb-6"
        >
          <p className="text-muted-foreground text-sm mb-2">Progress</p>
          <p className="text-2xl font-bold text-foreground">
            Question {currentQuestionIndex + 1} / {totalQuestions}
          </p>
        </motion.div>
      )}

      {/* Control buttons */}
      <div className="space-y-3">
        {status === 'waiting' && (
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={handleStartGame}
            disabled={players.length < 1}
          >
            <Play className="w-5 h-5 mr-2" />
            თამაშის დაწყება
          </ChunkyButton>
        )}

        {status === 'playing' && (
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={handleNextQuestion}
          >
            <SkipForward className="w-5 h-5 mr-2" />
            {currentQuestionIndex + 1 >= totalQuestions ? 'შედეგების ჩვენება' : 'შემდეგი კითხვა'}
          </ChunkyButton>
        )}

        {status === 'completed' && (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">თამაში დასრულდა! 🎉</h2>
            <ChunkyButton onClick={() => navigate('/team')}>
              უკან დაბრუნება
            </ChunkyButton>
          </div>
        )}

        {status !== 'completed' && (
          <ChunkyButton
            variant="secondary"
            className="w-full"
            onClick={handleEndGame}
          >
            თამაშის დასრულება
          </ChunkyButton>
        )}
      </div>
    </div>
  );
};

export default TVHostController;