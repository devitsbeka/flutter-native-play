import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Tv, Play, SkipForward, Users, Loader2, QrCode, Copy, Check, ChevronRight, Sparkles, ArrowLeft, Star, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar } from '@/components/shared/Avatar';
import { TVGameOverScreen } from '@/components/tv/TVGameOverScreen';
import { useTVGame } from '@/contexts/TVGameContext';
import { tvLog, tvLogError } from '@/utils/tvDebug';

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
}

const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', label: 'A' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', label: 'B' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', label: 'C' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', label: 'D' },
];

type LocalPhase = 'category-select' | 'waiting' | 'lobby' | 'countdown' | 'playing' | 'reveal' | 'completed';

const TVHostController: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get state from TVGameContext instead of local state
  const {
    phase: contextPhase,
    players,
    questions,
    currentQuestionIndex,
    timeRemaining,
    myScore,
    myAnswer,
    sessionId: contextSessionId,
    code: gameCode,
    submitAnswer,
    startNextRound,
    joinSession,
    startGame,
    startPlaying,
    isHost,
    leaveSession,
    resetGame,
  } = useTVGame();

  // UI-only local state (not game logic)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [guestJoinCode, setGuestJoinCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState('Host');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  
  // Track if we've already joined the session via context
  const hasJoinedRef = useRef(false);
  
  // Countdown state for triggering startPlaying
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const hasTriggeredPlayingRef = useRef(false);
  
  // Derive hasAnswered from context
  const hasAnswered = myAnswer !== null;
  
  // Map context phase to local phase for rendering
  const mapContextPhaseToLocal = (phase: string): LocalPhase => {
    const mapping: Record<string, LocalPhase> = {
      'idle': 'category-select',
      'pairing': 'category-select',
      'lobby': 'waiting',
      'countdown': 'countdown',
      'question': 'playing',
      'reveal': 'reveal',
      'results': 'completed',
    };
    return mapping[phase] || 'category-select';
  };
  
  const localPhase = mapContextPhaseToLocal(contextPhase);
  
  // Debug logging for phase issues
  console.log('[TVHostController] Phase debug:', { 
    contextPhase, 
    localPhase, 
    questionsLength: questions.length,
    currentQuestionIndex,
    playersCount: players.length 
  });

  const joinUrl = `${window.location.origin}/join?code=${guestJoinCode || gameCode}`;
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Load session and categories - join via context
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

      // Note: Host verification is also handled by context's isHost state
      // This is a defensive check - the context will set isHost correctly after joining
      if (sessionData.host_user_id && sessionData.host_user_id !== user?.id) {
        setError('You are not the host of this session');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setGuestJoinCode(sessionData.pairing_code || '');

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, category_id, name, icon, color')
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Join session via context (handles presence channel)
      if (!hasJoinedRef.current && sessionData.pairing_code) {
        hasJoinedRef.current = true;
        try {
          await joinSession(
            sessionData.pairing_code,
            profile?.nickname || 'Host',
            profile?.avatar_url
          );
          tvLog('Host joined session via context', { sessionId });
        } catch (err) {
          tvLogError('Host failed to join via context', err);
        }
      }

      setLoading(false);
    };

    loadData();

    return () => {
      // Cleanup handled by context
    };
  }, [sessionId, user?.id, joinSession]);

  // Update lastResult when phase changes to reveal
  useEffect(() => {
    if (localPhase === 'reveal' && myAnswer && currentQuestion) {
      const isCorrect = myAnswer === currentQuestion.correct_answer;
      setLastResult(isCorrect);
    }
  }, [localPhase, myAnswer, currentQuestion]);

  // Reset lastResult when question changes
  useEffect(() => {
    setLastResult(null);
  }, [currentQuestionIndex]);

  // Handle countdown phase - start timer and trigger startPlaying when host
  useEffect(() => {
    if (localPhase === 'countdown' && isHost) {
      // Reset trigger flag when entering countdown
      hasTriggeredPlayingRef.current = false;
      setCountdownValue(3);
      
      const timer = setInterval(() => {
        setCountdownValue(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else if (localPhase !== 'countdown') {
      // Reset when leaving countdown
      setCountdownValue(null);
      hasTriggeredPlayingRef.current = false;
    }
  }, [localPhase, isHost]);

  // Trigger startPlaying when countdown reaches 0 and user is host
  useEffect(() => {
    if (countdownValue === 0 && isHost && !hasTriggeredPlayingRef.current) {
      hasTriggeredPlayingRef.current = true;
      tvLog('Host controller countdown ended, triggering startPlaying');
      
      const transitionTimer = setTimeout(() => {
        startPlaying();
      }, 500);

      return () => clearTimeout(transitionTimer);
    }
  }, [countdownValue, isHost, startPlaying]);

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

    tvLog('Host starting game', { sessionId });

    try {
      await supabase
        .from('tv_sessions')
        .update({ status: 'countdown', current_question_index: 0 })
        .eq('id', sessionId);

      // TV display's countdown screen will trigger startPlaying when countdown ends
    } catch (error) {
      tvLogError('handleStartGame', error);
      toast.error('Failed to start game');
    }
  };

  const handleNextQuestion = async () => {
    if (!sessionId) return;

    try {
      // Use context's startNextRound which handles question advancement
      await startNextRound();
    } catch (error) {
      tvLogError('handleNextQuestion', error);
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
    navigator.clipboard.writeText(guestJoinCode || gameCode || '');
    setCopied(true);
    toast.success('კოდი დაკოპირდა!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnswer = async (answer: string) => {
    if (hasAnswered || !currentQuestion) return;
    
    try {
      // Use context's submitAnswer which handles scoring and presence
      const result = await submitAnswer(answer);
      setLastResult(result.correct);
    } catch (err) {
      tvLogError('handleAnswer', err);
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

  const displayCode = guestJoinCode || gameCode || '';

  // Category selection phase
  if (localPhase === 'category-select') {
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
                  {displayCode}
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
                    <Avatar imageUrl={player.avatar_url || undefined} emoji={player.nickname?.[0] || '👤'} size="sm" />
                    <span className="text-xs text-purple-200 truncate max-w-[60px]">{player.nickname}</span>
                    {player.isHost && <span className="text-xs text-yellow-500">HOST</span>}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories grid */}
        <div className="space-y-2 mb-6">
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
              ) : selectedCategory?.id === category.id ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-purple-300" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Start Game Button - shows when category is selected and players joined */}
        <AnimatePresence>
          {selectedCategory && !isLoadingQuestions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-purple-900 to-transparent"
            >
              <ChunkyButton
                variant="primary"
                size="lg"
                onClick={handleStartGame}
                disabled={players.length === 0}
                icon={<Play className="w-5 h-5" />}
                className="w-full"
              >
                {players.length === 0 
                  ? 'მოთამაშეები უნდა შემოუერთდნენ' 
                  : `თამაშის დაწყება (${players.length} მოთამაშე)`}
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Countdown phase
  if (localPhase === 'countdown') {
    const displayValue = countdownValue === 0 ? 'GO!' : countdownValue || 3;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayValue}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${
              countdownValue === 0 ? 'bg-green-500' : 'bg-purple-600'
            }`}
          >
            <span className="text-white text-5xl font-bold">{displayValue}</span>
          </motion.div>
        </AnimatePresence>
        <p className="text-2xl text-white font-bold">
          {countdownValue === 0 ? 'დაიწყო!' : 'მოემზადე!'}
        </p>
        <p className="text-purple-200 mt-2">მოემზადე პასუხებისთვის!</p>
      </div>
    );
  }

  // Reveal phase
  if (localPhase === 'reveal') {
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
          <span className="font-bold text-xl">{myScore}</span>
        </div>
        <ChunkyButton variant="primary" onClick={handleNextQuestion}>
          {currentQuestionIndex + 1 >= totalQuestions ? 'შედეგები' : 'შემდეგი კითხვა'}
        </ChunkyButton>
      </div>
    );
  }

  // Completed phase - show game over screen with leaderboard
  if (localPhase === 'completed') {
    // Map players to expected format
    const allPlayers = players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      score: p.score,
      isHost: p.isHost,
    }));

    // Ensure host is in the players list with correct score
    const hostPlayerIdx = allPlayers.findIndex(p => p.id === user?.id);
    if (hostPlayerIdx === -1 && user) {
      allPlayers.push({
        id: user.id,
        nickname: nickname,
        score: myScore,
        isHost: true,
        avatar_url: avatarUrl,
      });
    } else if (hostPlayerIdx !== -1) {
      allPlayers[hostPlayerIdx].score = myScore;
      allPlayers[hostPlayerIdx].isHost = true;
    }

    const handlePlayAgain = async () => {
      try {
        // Use context's resetGame which handles DB, presence scores, and local state
        await resetGame();
        
        // Reset local UI state
        setLastResult(null);
        setSelectedCategory(null);
      } catch (error) {
        console.error('Error resetting game:', error);
        window.location.reload();
      }
    };

    const handleExit = () => {
      leaveSession();
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
  if (localPhase === 'waiting') {
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
                  {displayCode}
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
                  <Avatar imageUrl={player.avatar_url || undefined} emoji={player.nickname?.[0] || '👤'} size="sm" />
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

  // Handle edge case: questions not loaded but we're in a playing-like state
  const requiresQuestions = ['playing', 'reveal'].includes(localPhase);
  if (requiresQuestions && (!currentQuestion || totalQuestions === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">თამაში არ არის მზად</h2>
          <p className="text-purple-300 mb-2">კითხვები ვერ ჩაიტვირთა</p>
          <p className="text-purple-400 text-sm mb-6">გთხოვ დაიწყე ახალი თამაში</p>
          <div className="flex gap-3 justify-center">
            <ChunkyButton onClick={() => navigate('/team')} variant="secondary">
              უკან
            </ChunkyButton>
            <ChunkyButton onClick={handleEndGame} variant="white">
              ახალი თამაში
            </ChunkyButton>
          </div>
        </div>
      </div>
    );
  }

  // Playing phase - host can answer questions with FULL question UI (like guests)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
      {/* Header - Question counter, Timer, Score */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-purple-300 text-sm">Q{currentQuestionIndex + 1}/{totalQuestions}</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeRemaining <= 5 ? 'bg-red-500/30' : 'bg-white/10'}`}>
          <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>{timeRemaining}წმ</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-white font-bold text-sm">{myScore} ქულა</span>
        </div>
      </div>

      {/* Question Card - Full question text like guest UI */}
      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <p className="text-white font-semibold text-center">{currentQuestion?.question_text}</p>
      </div>

      {hasAnswered ? (
        // After answering - show confirmation and host controls
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
          <Check className="w-16 h-16 text-green-400 mb-4" />
          <p className="text-white text-xl font-bold">პასუხი გაგზავნილია!</p>
          <p className="text-purple-300 mb-6">უყურე TV-ს...</p>
          
          {/* Host control buttons - only show after answering */}
          <div className="w-full space-y-3 mt-4">
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
        </motion.div>
      ) : (
        // Answer options - Full text buttons like guest UI
        <div className="flex-1 flex flex-col gap-3">
          {currentQuestion?.options.map((option, index) => (
            <ChunkyButton
              key={index}
              variant="white"
              size="md"
              onClick={() => handleAnswer(option)}
              className="w-full text-left justify-start"
            >
              <span className="inline-flex items-center gap-3">
                <span 
                  className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ 
                    background: ['#A855F7', '#7C3AED', '#6366F1', '#8B5CF6'][index] 
                  }}
                >
                  {['A', 'B', 'C', 'D'][index]}
                </span>
                <span className="text-gray-800">{option}</span>
              </span>
            </ChunkyButton>
          ))}
        </div>
      )}
    </div>
  );
};

export default TVHostController;
