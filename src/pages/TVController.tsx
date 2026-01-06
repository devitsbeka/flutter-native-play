import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TVSessionProvider } from '@/contexts/TVSessionContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Check, X, Loader2, Tv, Star, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', label: 'A' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', label: 'B' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', label: 'C' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', label: 'D' },
];

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

type Phase = 'connecting' | 'waiting' | 'countdown' | 'playing' | 'reveal' | 'completed';

const TVControllerContent: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('connecting');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [nickname, setNickname] = useState('Player');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const joinSession = async () => {
      if (!code || !user) {
        setError('კოდი ან მომხმარებელი არ მოიძებნა');
        setLoading(false);
        return;
      }

      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setNickname(profile.nickname || 'Player');
          setAvatarUrl(profile.avatar_url || undefined);
        }

        // Find session by pairing_code (6-char guest join code)
        const { data: sessionData, error: sessionError } = await supabase
          .from('tv_sessions')
          .select('*')
          .eq('pairing_code', code.toUpperCase())
          .eq('is_paired', true)
          .single();

        if (sessionError || !sessionData) {
          setError('სესია ვერ მოიძებნა ან არ არის აქტიური');
          setLoading(false);
          return;
        }

        setSession(sessionData);
        
        // Set questions if available
        if (sessionData.questions && Array.isArray(sessionData.questions)) {
          setQuestions(sessionData.questions as unknown as Question[]);
        }

        // Set phase based on status
        const status = sessionData.status;
        if (status === 'waiting') setPhase('waiting');
        else if (status === 'countdown') setPhase('countdown');
        else if (status === 'playing') {
          setPhase('playing');
          setCurrentQuestionIndex(sessionData.current_question_index || 0);
        }
        else if (status === 'completed') setPhase('completed');

        setLoading(false);

        // Subscribe to session updates
        const channel = supabase
          .channel(`guest-session-${sessionData.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tv_sessions',
              filter: `id=eq.${sessionData.id}`,
            },
            (payload) => {
              const newData = payload.new as any;
              setSession(newData);
              
              // Update questions
              if (newData.questions && Array.isArray(newData.questions)) {
                setQuestions(newData.questions as unknown as Question[]);
              }
              
              // Update phase
              if (newData.status === 'waiting') setPhase('waiting');
              else if (newData.status === 'countdown') setPhase('countdown');
              else if (newData.status === 'playing') {
                setPhase('playing');
                setCurrentQuestionIndex(newData.current_question_index || 0);
                setTimeRemaining(15);
                setSelectedAnswer(null);
                setHasAnswered(false);
                setLastResult(null);
              }
              else if (newData.status === 'reveal') setPhase('reveal');
              else if (newData.status === 'completed') setPhase('completed');
            }
          )
          .subscribe();

        channelRef.current = channel;

        // Join presence channel to show up in player list
        const presenceChannel = supabase
          .channel(`tv-presence-${sessionData.id}`)
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await presenceChannel.track({
                user_id: user.id,
                nickname: profile?.nickname || 'Player',
                avatar_url: profile?.avatar_url,
                isGuest: true, // Mark as guest so TV knows to show them
                online_at: new Date().toISOString(),
              });
            }
          });

        presenceChannelRef.current = presenceChannel;

      } catch (err) {
        console.error('Error joining session:', err);
        setError('შეცდომა სესიასთან დაკავშირებისას');
        setLoading(false);
      }
    };

    joinSession();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [code, user]);

  // Timer for questions
  useEffect(() => {
    if (phase === 'playing' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentQuestionIndex]);

  // Check answer result on reveal
  useEffect(() => {
    if (phase === 'reveal' && selectedAnswer && currentQuestion) {
      const isCorrect = selectedAnswer === currentQuestion.correct_answer;
      setLastResult(isCorrect);
      if ('vibrate' in navigator) {
        navigator.vibrate(isCorrect ? [100] : [100, 50, 100]);
      }
    }
  }, [phase, selectedAnswer, currentQuestion]);

  const handleAnswer = async (answer: string) => {
    if (hasAnswered || !session || !user || !currentQuestion) return;
    
    setSelectedAnswer(answer);
    setHasAnswered(true);

    const isCorrect = answer === currentQuestion.correct_answer;
    const timeBonus = Math.max(0, timeRemaining);
    const points = isCorrect ? 100 + (timeBonus * 5) : 0;
    
    setScore(prev => prev + points);

    // Submit answer to database
    try {
      await supabase
        .from('player_answers')
        .insert([{
          user_id: user.id,
          room_id: session.room_id || session.id,
          question_index: currentQuestionIndex,
          answer: answer,
          is_correct: isCorrect,
          time_remaining: timeRemaining,
          points_earned: points,
          tv_session_id: session.id,
        }]);
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">TV-სთან დაკავშირება...</p>
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
            უკან
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // Waiting for game to start
  if (phase === 'waiting' || phase === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Tv className="w-24 h-24 text-primary mb-6" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2">დაკავშირებული! ✓</h1>
        <p className="text-muted-foreground text-center mb-4">
          {phase === 'countdown' 
            ? 'მოემზადე! თამაში იწყება...'
            : 'უყურე TV ეკრანს. ველოდებით თამაშის დაწყებას...'}
        </p>
        
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center gap-2 text-primary"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">{nickname}</span>
        </motion.div>
      </div>
    );
  }

  // Reveal phase - show if answer was correct
  if (phase === 'reveal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-6">
        <AnimatePresence>
          {lastResult !== null && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${
                lastResult ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {lastResult ? (
                <Check className="w-16 h-16 text-white" />
              ) : (
                <X className="w-16 h-16 text-white" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {lastResult ? 'სწორია! 🎉' : 'არასწორია! 😔'}
        </h2>
        <div className="flex items-center gap-2 text-yellow-500">
          <Star className="w-5 h-5 fill-yellow-500" />
          <span className="font-bold text-xl">{score}</span>
        </div>
      </div>
    );
  }

  // Final scoreboard
  if (phase === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">თამაში დასრულდა!</h1>
          <p className="text-muted-foreground mb-6">შეხედე TV-ს სრული შედეგებისთვის</p>
          
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <p className="text-muted-foreground mb-2">შენი ქულა</p>
            <div className="flex items-center justify-center gap-2 text-yellow-500">
              <Star className="w-8 h-8 fill-yellow-500" />
              <span className="font-bold text-4xl">{score}</span>
            </div>
          </div>

          <ChunkyButton onClick={() => navigate('/team')}>
            უკან დაბრუნება
          </ChunkyButton>
        </motion.div>
      </div>
    );
  }

  // Question phase - show answer buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="bg-card border border-border rounded-full px-4 py-2">
          <span className="text-muted-foreground text-sm">Q </span>
          <span className="text-primary font-bold">{currentQuestionIndex + 1}</span>
          <span className="text-muted-foreground text-sm"> / {questions.length}</span>
        </div>
        <div className={`rounded-full px-4 py-2 ${timeRemaining <= 5 ? 'bg-red-500/20 border-red-500' : 'bg-card'} border border-border`}>
          <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-500' : 'text-foreground'}`}>
            {timeRemaining}წმ
          </span>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-full px-4 py-2">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-foreground font-bold">{score}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center mb-6">
        <p className="text-muted-foreground">
          {hasAnswered ? 'პასუხი გაგზავნილია! უყურე TV-ს...' : 'უყურე TV-ს და აირჩიე პასუხი:'}
        </p>
      </div>

      {/* Answer Buttons */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {currentQuestion?.options.map((option, index) => {
          const color = OPTION_COLORS[index];
          const isSelected = selectedAnswer === option;

          return (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              disabled={hasAnswered}
              onClick={() => handleAnswer(option)}
              className={`${color.bg} ${!hasAnswered && color.hover} rounded-2xl flex items-center justify-center transition-all ${
                hasAnswered && !isSelected ? 'opacity-30' : ''
              } ${isSelected ? 'ring-4 ring-white' : ''}`}
            >
              <span className="text-white text-5xl font-bold">{color.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

const TVController: React.FC = () => {
  return (
    <TVSessionProvider>
      <TVControllerContent />
    </TVSessionProvider>
  );
};

export default TVController;
