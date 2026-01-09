import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Tv, Play, SkipForward, Users, Loader2, QrCode, Copy, Check, ChevronRight, Sparkles, ArrowLeft, Star, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar } from '@/components/shared/Avatar';
import { TVGameOverScreen } from '@/components/tv/TVGameOverScreen';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
  isHost?: boolean;
}

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', label: 'A' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', label: 'B' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', label: 'C' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', label: 'D' },
];

type Phase = 'category-select' | 'waiting' | 'countdown' | 'playing' | 'reveal' | 'completed';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [phase, setPhase] = useState<Phase>('category-select');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState('Host');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const joinUrl = `${window.location.origin}/join?code=${guestJoinCode}`;
  const currentQuestion = questions[currentQuestionIndex];

  // Load session and categories
  useEffect(() => {
    const loadData = async () => {
      if (!sessionId || !user) {
        setError('No session ID');
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setNickname(profile.nickname || 'Host');
        setAvatarUrl(profile.avatar_url || undefined);
      }

      // Load session
      const { data: sessionData, error: fetchError } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !sessionData) {
        setError('Session not found');
        setLoading(false);
        return;
      }

      // Verify this user is the host
      if (sessionData.host_user_id !== user?.id) {
        setError('You are not the host of this session');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setGuestJoinCode(sessionData.pairing_code || '');
      
      // Check if questions already loaded
      if (sessionData.questions && Array.isArray(sessionData.questions) && sessionData.questions.length > 0) {
        setQuestions(sessionData.questions as unknown as Question[]);
        const status = sessionData.status;
        if (status === 'waiting') setPhase('waiting');
        else if (status === 'countdown') setPhase('countdown');
        else if (status === 'playing') {
          setPhase('playing');
          setCurrentQuestionIndex(sessionData.current_question_index || 0);
        }
        else if (status === 'completed') setPhase('completed');
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, category_id, name, icon, color')
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      setLoading(false);

      // Subscribe to session updates
      const channel = supabase
        .channel(`host-session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tv_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            const newData = payload.new as any;
            setSession(newData);
            
            if (newData.questions && Array.isArray(newData.questions)) {
              setQuestions(newData.questions as unknown as Question[]);
            }
            
            // Update phase based on status
            if (newData.status === 'countdown') setPhase('countdown');
            else if (newData.status === 'playing') {
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

      // Set up presence channel - host tracks their presence too!
      const presenceChannel = supabase
        .channel(`tv-presence-${sessionId}`, {
          config: { presence: { key: user.id } }, // Use user.id as presence key
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = presenceChannel.presenceState();
          const connectedPlayers: Player[] = [];
          
          Object.entries(presenceState).forEach(([key, presences]: [string, any]) => {
            const presence = presences[0];
            if (presence && key !== 'TV_DISPLAY') {
              connectedPlayers.push({
                id: key,
                nickname: presence.nickname || 'Player',
                avatar_url: presence.avatar_url,
                score: presence.score || 0,
                isHost: presence.isHost || false,
              });
            }
          });
          
          setPlayers(connectedPlayers);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Host tracks their own presence with hasAnswered for leaderboard
            await presenceChannel.track({
              nickname: profile?.nickname || 'Host',
              avatar_url: profile?.avatar_url,
              isHost: true,
              score: 0,
              hasAnswered: false,
              lastAnswerCorrect: null,
            });
            console.log('Host presence tracked');
          }
        });

      presenceChannelRef.current = presenceChannel;
    };

    loadData();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId, user?.id]);

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
    }
  }, [phase, selectedAnswer, currentQuestion]);

  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);
    setIsLoadingQuestions(true);

    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, difficulty')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .eq('in_production', true)
        .limit(10);

      if (questionsError) throw questionsError;

      const formattedQuestions = (questionsData || []).map(q => {
        const incorrectAnswers = Array.isArray(q.incorrect_answers) 
          ? q.incorrect_answers as string[] 
          : [];
        const allOptions = [q.correct_answer, ...incorrectAnswers].filter(Boolean);
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        return {
          id: q.id,
          question_text: q.question_text,
          options: shuffledOptions,
          correct_answer: q.correct_answer,
        };
      });

      if (formattedQuestions.length === 0) {
        toast.error('ამ კატეგორიაში კითხვები ვერ მოიძებნა');
        setIsLoadingQuestions(false);
        setSelectedCategory(null);
        return;
      }

      setQuestions(formattedQuestions);

      // Update session with questions and category info
      await supabase
        .from('tv_sessions')
        .update({
          questions: formattedQuestions as unknown as any,
          status: 'waiting',
          category_name: category.name,
          category_icon: category.icon,
        })
        .eq('id', sessionId);

      setPhase('waiting');
      toast.success(`${category.name} არჩეულია!`);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('კითხვების ჩატვირთვა ვერ მოხერხდა');
      setSelectedCategory(null);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

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
      setPhase('playing');
      setTimeRemaining(15);
    }, 3000);
  };

  const handleNextQuestion = async () => {
    if (!sessionId || !session) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= questions.length) {
      await supabase
        .from('tv_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
      setPhase('completed');
    } else {
      await supabase
        .from('tv_sessions')
        .update({ 
          current_question_index: nextIndex,
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', sessionId);
      setCurrentQuestionIndex(nextIndex);
      setTimeRemaining(15);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setLastResult(null);

      // Reset host's hasAnswered in presence for next question
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.track({
          nickname,
          avatar_url: avatarUrl,
          isHost: true,
          score,
          hasAnswered: false,
          lastAnswerCorrect: null,
        });
      }
    }
  };

  const handleEndGame = async () => {
    if (!sessionId) return;
    
    await supabase
      .from('tv_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    toast.success('თამაში დასრულდა!');
    navigate('/team');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(guestJoinCode);
    setCopied(true);
    toast.success('კოდი დაკოპირდა!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnswer = async (answer: string) => {
    if (hasAnswered || !session || !user || !currentQuestion) return;
    
    setSelectedAnswer(answer);
    setHasAnswered(true);

    const isCorrect = answer === currentQuestion.correct_answer;
    const timeBonus = Math.max(0, timeRemaining);
    const points = isCorrect ? 100 + (timeBonus * 5) : 0;
    const newScore = score + points;
    
    setScore(newScore);

    // Update presence to show host answered and their new score on TV leaderboard
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.track({
        nickname,
        avatar_url: avatarUrl,
        isHost: true,
        score: newScore,
        hasAnswered: true,
        lastAnswerCorrect: isCorrect,
      });
    }

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
          <p className="text-purple-200">იტვირთება...</p>
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

  const totalQuestions = questions.length;

  // Category selection phase
  if (phase === 'category-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button onClick={() => navigate('/team')} className="p-2 rounded-full hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-purple-200" />
          </button>
          <Tv className="w-6 h-6 text-purple-300" />
          <span className="font-bold text-white">აირჩიე კატეგორია</span>
        </motion.div>

        {/* QR Code section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-purple-300" />
            <h2 className="font-bold text-white">მოთამაშეებმა დაასკანერონ</h2>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={joinUrl} size={100} level="H" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm text-purple-200 mb-1">კოდი:</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-bold text-white tracking-wider">
                  {guestJoinCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-purple-300" />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Users className="w-4 h-4 text-purple-300" />
                <span className="text-sm text-purple-200">{players.length} მოთამაშე</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Connected players */}
        <AnimatePresence>
          {players.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex gap-2 overflow-x-auto pb-2">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex flex-col items-center gap-1 min-w-[60px] ${player.isHost ? 'ring-2 ring-yellow-500 rounded-xl p-1' : ''}`}
                  >
                    <Avatar imageUrl={player.avatar_url} emoji={player.nickname?.[0] || '👤'} size="sm" />
                    <span className="text-xs text-purple-200 truncate max-w-[60px]">{player.nickname}</span>
                    {player.isHost && <span className="text-xs text-yellow-500">HOST</span>}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories grid */}
        <div className="space-y-2">
          {categories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelectCategory(category)}
              disabled={isLoadingQuestions}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                selectedCategory?.id === category.id
                  ? 'bg-purple-500/30 border-purple-400'
                  : 'bg-white/10 border-white/20 hover:border-purple-400/50'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="flex-1 text-left font-medium text-white">{category.name}</span>
              {isLoadingQuestions && selectedCategory?.id === category.id ? (
                <Loader2 className="w-5 h-5 animate-spin text-purple-300" />
              ) : (
                <ChevronRight className="w-5 h-5 text-purple-300" />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="text-8xl mb-4"
        >
          🎮
        </motion.div>
        <p className="text-2xl text-white font-bold">თამაში იწყება...</p>
        <p className="text-purple-200 mt-2">მოემზადე პასუხებისთვის!</p>
      </div>
    );
  }

  // Reveal phase
  if (phase === 'reveal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
        <AnimatePresence>
          {lastResult !== null && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
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
        <div className="flex items-center gap-2 text-yellow-500 mb-6">
          <Star className="w-5 h-5 fill-yellow-500" />
          <span className="font-bold text-xl">{score}</span>
        </div>
        <ChunkyButton variant="primary" onClick={handleNextQuestion}>
          {currentQuestionIndex + 1 >= totalQuestions ? 'შედეგები' : 'შემდეგი კითხვა'}
        </ChunkyButton>
      </div>
    );
  }

  // Completed phase - show game over screen with leaderboard
  if (phase === 'completed') {
    // Ensure host is in the players list with correct score
    const allPlayers = [...players];
    const hostPlayerIdx = allPlayers.findIndex(p => p.id === user?.id);
    if (hostPlayerIdx === -1 && user) {
      allPlayers.push({
        id: user.id,
        nickname: 'Host',
        score: score,
        isHost: true,
      });
    } else if (hostPlayerIdx !== -1) {
      allPlayers[hostPlayerIdx].score = score;
      allPlayers[hostPlayerIdx].isHost = true;
    }

    const handlePlayAgain = () => {
      window.location.reload();
    };

    const handleExit = () => {
      navigate('/team');
    };

    return (
      <TVGameOverScreen
        players={allPlayers}
        currentPlayerId={user?.id}
        onExit={handleExit}
        onPlayAgain={handlePlayAgain}
        isHost={true}
      />
    );
  }

  // Waiting phase - show QR and start button
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-2">
            <Tv className="w-6 h-6 text-purple-300" />
            <span className="font-bold text-white">მართვის პანელი</span>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-full px-3 py-1">
            <span className="text-sm text-purple-200">მოლოდინი</span>
          </div>
        </motion.div>

        {/* QR Code for guests */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-purple-300" />
            <h2 className="font-bold text-white">მოთამაშეებს გადაუგზავნე</h2>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={joinUrl} size={120} level="H" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm text-purple-200 mb-1">კოდი:</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {guestJoinCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-purple-300" />}
                </button>
              </div>
              <p className="text-xs text-purple-300 mt-2 break-all">{joinUrl}</p>
            </div>
          </div>
        </motion.div>

        {/* Players section */}
        <motion.div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-purple-300" />
            <span className="text-white font-medium">{players.length} მოთამაშე</span>
          </div>
          
          {players.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-2 bg-white/10 rounded-full px-3 py-2 border ${player.isHost ? 'border-yellow-500' : 'border-white/20'}`}
                >
                  <Avatar imageUrl={player.avatar_url} emoji={player.nickname?.[0] || '👤'} size="sm" />
                  <span className="text-sm font-medium text-white">{player.nickname}</span>
                  {player.isHost ? (
                    <span className="text-xs bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded">HOST</span>
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-300" />
                  )}
                </motion.div>
              ))}
            </div>
          )}
          
          {players.length === 0 && (
            <p className="text-purple-200 text-sm">ველოდებით მოთამაშეებს...</p>
          )}
        </motion.div>

        {/* Control buttons */}
        <div className="space-y-3">
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={handleStartGame}
            disabled={players.length < 1}
          >
            <Play className="w-5 h-5 mr-2" />
            თამაშის დაწყება {players.length < 1 && '(საჭიროა მინ. 1 მოთამაშე)'}
          </ChunkyButton>

          <ChunkyButton
            variant="secondary"
            className="w-full"
            onClick={handleEndGame}
          >
            თამაშის დასრულება
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // Playing phase - host can answer questions AND has control buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="bg-white/10 border border-white/20 rounded-full px-4 py-2">
          <span className="text-purple-200 text-sm">Q </span>
          <span className="text-white font-bold">{currentQuestionIndex + 1}</span>
          <span className="text-purple-200 text-sm"> / {totalQuestions}</span>
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
      <div className="text-center mb-4">
        <p className="text-purple-200">
          {hasAnswered ? 'პასუხი გაგზავნილია!' : 'უყურე TV-ს და აირჩიე პასუხი:'}
        </p>
      </div>

      {/* Answer Buttons */}
      <div className="flex-1 grid grid-cols-2 gap-3 mb-4">
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

      {/* Host controls */}
      <div className="space-y-2">
        <ChunkyButton
          variant="primary"
          className="w-full"
          onClick={handleNextQuestion}
        >
          <SkipForward className="w-5 h-5 mr-2" />
          {currentQuestionIndex + 1 >= totalQuestions ? 'შედეგების ჩვენება' : 'შემდეგი კითხვა'}
        </ChunkyButton>
        
        <ChunkyButton
          variant="secondary"
          className="w-full"
          onClick={handleEndGame}
        >
          თამაშის დასრულება
        </ChunkyButton>
      </div>
    </div>
  );
};

export default TVHostController;
