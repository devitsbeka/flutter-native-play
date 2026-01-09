import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TVSessionProvider } from '@/contexts/TVSessionContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Check, X, Loader2, Tv, Star, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TVGameOverScreen } from '@/components/tv/TVGameOverScreen';

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

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
  hasAnswered?: boolean;
  isHost?: boolean;
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
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const hasJoinedRef = useRef(false);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  
  // Helper function to delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    const joinSession = async () => {
      if (!code) {
        setError('კოდი არ მოიძებნა');
        setLoading(false);
        return;
      }

      // Prevent double joining
      if (hasJoinedRef.current) return;
      hasJoinedRef.current = true;

      // Generate a guest ID if user is not logged in
      const guestId = user?.id || `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const guestNickname = `Player${Math.floor(Math.random() * 9999)}`;

      try {
        // Get user profile if logged in
        let playerNickname = guestNickname;
        let playerAvatarUrl: string | undefined;

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            playerNickname = profile.nickname || guestNickname;
            playerAvatarUrl = profile.avatar_url || undefined;
          }
        }

        setNickname(playerNickname);
        setAvatarUrl(playerAvatarUrl);
        setPlayerId(guestId);

        const upperCode = code.toUpperCase();

        // Retry session lookup up to 3 times with delay for resilience
        let sessionData = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts && !sessionData) {
          // Try to find session by 6-char pairing_code first
          const { data: dataByCode, error: lookupError } = await supabase
            .from('tv_sessions')
            .select('*')
            .eq('pairing_code', upperCode)
            .in('status', ['waiting', 'lobby', 'countdown', 'playing', 'reveal', 'completed'])
            .maybeSingle();

          if (dataByCode) {
            sessionData = dataByCode;
          } else {
            // If not found, try 4-digit tv_pairing_code
            const { data: dataBy4Digit } = await supabase
              .from('tv_sessions')
              .select('*')
              .eq('tv_pairing_code', upperCode)
              .in('status', ['waiting', 'lobby', 'countdown', 'playing', 'reveal', 'completed'])
              .maybeSingle();
            
            if (dataBy4Digit) {
              sessionData = dataBy4Digit;
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                console.log(`Session lookup attempt ${attempts} failed, retrying in 500ms...`);
                await delay(500);
              }
            }
          }
        }

        if (!sessionData) {
          console.error('Session not found for code:', upperCode);
          setError('სესია ვერ მოიძებნა. შეამოწმეთ კოდი და სცადეთ თავიდან.');
          setLoading(false);
          return;
        }

        console.log('Found session:', sessionData.id, 'Status:', sessionData.status);
        setSession(sessionData);
        
        // Set questions if available
        if (sessionData.questions && Array.isArray(sessionData.questions)) {
          setQuestions(sessionData.questions as unknown as Question[]);
        }

        // Set phase based on status
        const status = sessionData.status;
        if (status === 'waiting' || status === 'lobby') setPhase('waiting');
        else if (status === 'countdown') setPhase('countdown');
        else if (status === 'playing') {
          setPhase('playing');
          setCurrentQuestionIndex(sessionData.current_question_index || 0);
        }
        else if (status === 'reveal') setPhase('reveal');
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
              if (newData.status === 'waiting' || newData.status === 'lobby') setPhase('waiting');
              else if (newData.status === 'countdown') setPhase('countdown');
              else if (newData.status === 'playing') {
                // Check if question changed
                const newIndex = newData.current_question_index || 0;
                if (newIndex !== currentQuestionIndex) {
                  setCurrentQuestionIndex(newIndex);
                  setTimeRemaining(15);
                  setSelectedAnswer(null);
                  setHasAnswered(false);
                  setLastResult(null);
                }
                setPhase('playing');
              }
              else if (newData.status === 'reveal') setPhase('reveal');
              else if (newData.status === 'completed') setPhase('completed');
            }
          )
          .subscribe();

        channelRef.current = channel;

        // Join presence channel to show up in player list and track other players
        const presenceChannel = supabase.channel(`tv-presence-${sessionData.id}`);
        
        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const allPlayers: Player[] = [];
            
            Object.values(state).forEach((presences: any) => {
              presences.forEach((presence: any) => {
                allPlayers.push({
                  id: presence.user_id,
                  nickname: presence.nickname || 'Player',
                  avatar_url: presence.avatar_url,
                  score: presence.score || 0,
                  hasAnswered: presence.hasAnswered || false,
                  isHost: presence.isHost || false,
                });
              });
            });
            
            setPlayers(allPlayers);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await presenceChannel.track({
                user_id: guestId,
                nickname: playerNickname,
                avatar_url: playerAvatarUrl,
                isGuest: true,
                isHost: false,
                score: 0,
                hasAnswered: false,
                online_at: new Date().toISOString(),
              });
              console.log('Guest presence tracked successfully');
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
    if (hasAnswered || !session || !playerId || !currentQuestion) return;
    
    setSelectedAnswer(answer);
    setHasAnswered(true);

    const isCorrect = answer === currentQuestion.correct_answer;
    const timeBonus = Math.max(0, timeRemaining);
    const points = isCorrect ? 100 + (timeBonus * 5) : 0;
    const newScore = score + points;
    
    setScore(newScore);

    // Update presence with new score and answer status
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.track({
        user_id: playerId,
        nickname: nickname,
        avatar_url: avatarUrl,
        isGuest: !user,
        isHost: false,
        score: newScore,
        hasAnswered: true,
        online_at: new Date().toISOString(),
      });
    }

    // Submit answer to database only if user is logged in
    if (user) {
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
        console.log('Answer submitted successfully');
      } catch (err) {
        console.error('Error submitting answer:', err);
      }
    }
  };

  const handleExit = () => {
    navigate('/team');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
          <p className="text-purple-200">TV-სთან დაკავშირება...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Tv className="w-24 h-24 text-purple-300 mb-6" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white mb-2">დაკავშირებული! ✓</h1>
        <p className="text-purple-200 text-center mb-4">
          {phase === 'countdown' 
            ? 'მოემზადე! თამაში იწყება...'
            : 'უყურე TV ეკრანს. ველოდებით თამაშის დაწყებას...'}
        </p>
        
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center gap-2 text-purple-300"
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
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
        <h2 className="text-2xl font-bold text-white mb-2">
          {lastResult ? 'სწორია! 🎉' : 'არასწორია! 😔'}
        </h2>
        <div className="flex items-center gap-2 text-yellow-500">
          <Star className="w-5 h-5 fill-yellow-500" />
          <span className="font-bold text-xl">{score}</span>
        </div>
      </div>
    );
  }

  // Final scoreboard with game over screen
  if (phase === 'completed') {
    // Ensure current player is in the players list with correct score
    const allPlayers = [...players];
    const currentPlayerIdx = allPlayers.findIndex(p => p.id === playerId);
    if (currentPlayerIdx === -1 && playerId) {
      allPlayers.push({
        id: playerId,
        nickname: nickname,
        avatar_url: avatarUrl,
        score: score,
        isHost: false,
      });
    } else if (currentPlayerIdx !== -1) {
      allPlayers[currentPlayerIdx].score = score;
    }

    return (
      <TVGameOverScreen
        players={allPlayers}
        currentPlayerId={playerId || undefined}
        onExit={handleExit}
        isHost={false}
      />
    );
  }

  // Question phase - show answer buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="bg-white/10 border border-white/20 rounded-full px-4 py-2">
          <span className="text-purple-200 text-sm">Q </span>
          <span className="text-white font-bold">{currentQuestionIndex + 1}</span>
          <span className="text-purple-200 text-sm"> / {questions.length}</span>
        </div>
        <div className={`rounded-full px-4 py-2 ${timeRemaining <= 5 ? 'bg-red-500/30 border-red-500' : 'bg-white/10'} border border-white/20`}>
          <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>
            {timeRemaining}წმ
          </span>
        </div>
        <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-4 py-2">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-white font-bold">{score}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center mb-6">
        <p className="text-purple-200">
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
