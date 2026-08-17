import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Play, Users, Loader2, QrCode, Copy, Check, ChevronRight, Sparkles, ArrowLeft, Star, X, AlertCircle, Plus, RefreshCw, GripVertical, Clock, Edit2 } from 'lucide-react';
import { CategoryPickerModal } from '@/components/team/CategoryPickerModal';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeSVG } from 'qrcode.react';
import { Avatar } from '@/components/shared/Avatar';
import { TVGameOverScreen } from '@/components/tv/TVGameOverScreen';
import { useTVGame } from '@/contexts/TVGameContext';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { tvLog, tvLogError } from '@/utils/tvDebug';
import { useTVSessionQueue } from '@/hooks/useTVSessionQueue';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { ControllerPollScreen } from '@/components/controller/ControllerPollScreen';
import { ControllerPollResults } from '@/components/controller/ControllerPollResults';
import { ControllerDirectSelection } from '@/components/controller/ControllerDirectSelection';
import { useTVPoll } from '@/hooks/useTVPoll';
import { useMissions } from '@/hooks/useMissions';
import { RoomIconPickerModal } from '@/components/team/RoomIconPickerModal';

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
}
type LocalPhase = 'category-select' | 'waiting' | 'lobby' | 'countdown' | 'playing' | 'reveal' | 'completed' | 'round-intro' | 'poll-suggest' | 'poll-voting' | 'poll-results';

const isEmojiString = (value?: string | null) => {
  if (!value) return false;
  try {
    return /\p{Extended_Pictographic}/u.test(value);
  } catch {
    return false;
  }
};

const TVHostController: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Get state from TVGameContext instead of local state
  const {
    phase: contextPhase,
    players,
    questions,
    currentQuestionIndex,
    timeRemaining,
    myScore,
    myAnswer,
    code: gameCode,
    categoryName,
    categoryIcon,
    roundNumber,
    totalRounds,
    submitAnswer,
    joinSession,
    startGame,
    startPlaying,
    startNextRound,
    startDirectSelection,
    markReady,
    isHost,
    leaveSession,
    resetGame,
    myPlayerId,
    currentRoundSuggesterId,
    advanceDebug,
  } = useTVGame();
  
  // CRITICAL: Check if host is the suggester for this round (they can only observe)
  // This only applies to user trivias - library categories should NEVER trigger observer mode
  // The currentRoundSuggesterId should be null for library categories (set in startGame/startNextRound)
  const isSuggester = myPlayerId && currentRoundSuggesterId && myPlayerId === currentRoundSuggesterId;

  // Missions: playing on the big screen counts once per TV session, the
  // moment actual gameplay starts
  const { trackMissionEvent } = useMissions();
  const hasTrackedTvPlay = useRef(false);
  useEffect(() => {
    if (hasTrackedTvPlay.current) return;
    if (contextPhase === 'question' || contextPhase === 'playing' || contextPhase === 'countdown') {
      hasTrackedTvPlay.current = true;
      void trackMissionEvent('tv_played', 1);
    }
  }, [contextPhase, trackMissionEvent]);
  
  // Debug logging for observer state
  console.log('[HostObserver] 🎯 Suggester check:', {
    myPlayerId: myPlayerId?.slice(0, 8) || 'null',
    currentRoundSuggesterId: currentRoundSuggesterId?.slice(0, 8) || 'null',
    isSuggester,
  });

  // Auto-redirect to team page when game is idle for 60s
  useIdleTimeout(contextPhase, () => {
    tvLog('Host idle timeout — returning to team page');
    leaveSession();
    navigate('/team', { replace: true });
  });

  // Room ID for queue fallback
  const [roomId, setRoomId] = useState<string | null>(null);

  // Multi-round queue support - now with room fallback
  const { queue, addCategoryToQueue, addToQueue, removeFromQueue, reorderQueue, hasQueue } = useTVSessionQueue(sessionId || null, roomId);

  // UI-only local state (not game logic)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState('Host');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  
  // Track if we've already joined the session via context
  const hasJoinedRef = useRef(false);
  
  // Countdown state for triggering startPlaying
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const hasTriggeredPlayingRef = useRef(false);

  // Track observer score at start of each question for per-question delta
  const prevObserverScoreRef = useRef<number>(0);
  
  // Category picker modal state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  
  // Poll voting ended state - for transitioning from voting to results
  const [votingEnded, setVotingEnded] = useState(false);
  
  // Room editing state
  const [roomName, setRoomName] = useState('');
  const [roomIcon, setRoomIcon] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  // Poll hook - must be called unconditionally at top level to avoid React error #310
  const pollHook = useTVPoll({
    sessionId: sessionId || null,
    userId: user?.id || null,
    nickname,
    avatarUrl,
  });
  
  // Derive hasAnswered from context
  const hasAnswered = myAnswer !== null;

  // Snapshot observer score at start of each question (for per-question delta display)
  useEffect(() => {
    if (isSuggester && contextPhase === 'question') {
      const observerPlayer = players.find(p => p.id === myPlayerId);
      prevObserverScoreRef.current = observerPlayer?.score ?? myScore;
    }
  }, [isSuggester, contextPhase, currentQuestionIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map context phase to local phase for rendering
  const mapContextPhaseToLocal = (phase: string): LocalPhase => {
    const mapping: Record<string, LocalPhase> = {
      'idle': 'category-select',
      'pairing': 'category-select',
      'lobby': 'lobby', // Show lobby UI instead of waiting
      'countdown': 'countdown',
      'question': 'playing',
      'playing': 'playing', // Also handle 'playing' directly (DB status alias)
      'reveal': 'reveal',
      'results': 'completed',
      'completed': 'completed', // Also handle 'completed' directly
      'round-intro': 'round-intro',
      'poll-suggest': 'poll-suggest',
      'poll-voting': 'poll-voting',
      'poll-results': 'poll-results',
      'category-select': 'category-select',
    };
    return mapping[phase] || 'category-select';
  };
  
  // Determine actual phase - prioritize poll hook's state for poll phases
  // This handles the race condition where pollHook updates before contextPhase
  const rawLocalPhase = mapContextPhaseToLocal(contextPhase);
  // Don't convert category-select to lobby based on hasQueue
  // This ensures consistent screen regardless of queue fetch timing
  let localPhase: LocalPhase = rawLocalPhase;
  
  // Override with poll hook state if we're in poll phases
  // The poll hook subscribes to the same DB but updates its local state immediately after endVoting()
  // CRITICAL: Only override poll-voting → poll-results, NOT poll-suggest → poll-results
  // When starting a new poll (initiatePoll), pollHook.pollPhase may still be 'results' from stale state
  // We must NOT override poll-suggest to poll-results in that case
  if (votingEnded || (pollHook.pollPhase === 'results' && rawLocalPhase === 'poll-voting')) {
    // Host's onVotingEnded fired or pollHook detected results — skip waiting for realtime
    localPhase = 'poll-results';
  } else if (pollHook.pollPhase === 'voting' && rawLocalPhase !== 'poll-voting' && rawLocalPhase !== 'poll-results') {
    // If poll is in voting phase but context hasn't caught up, show voting
    if (contextPhase.includes('poll')) {
      localPhase = 'poll-voting';
    }
  }
  
  // Debug logging for phase issues
  console.log('[TVHostController] 🎮 Render state:', { 
    contextPhase, 
    localPhase,
    pollHookPhase: pollHook.pollPhase,
    questionsLength: questions.length,
    currentQuestionIndex,
    timeRemaining,
    playersCount: players.length,
    // CRITICAL: Log suggester state to debug round 2 blocking issue
    isSuggester,
    hasAnswered,
    myPlayerId: myPlayerId ? myPlayerId.substring(0, 8) + '...' : 'NULL',
    currentRoundSuggesterId: currentRoundSuggesterId ? currentRoundSuggesterId.substring(0, 8) + '...' : 'NULL',
  });

  const joinUrl = sessionId ? `${window.location.origin}/join/session/${sessionId}` : `${window.location.origin}/join`;
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Load session and categories - join via context
  useEffect(() => {
    const loadData = async () => {
      if (!sessionId) {
        setError('No session ID');
        setLoading(false);
        return;
      }
      // Wait for auth to resolve before proceeding
      if (!user) return;

      // Clear any stale error from previous render (e.g., auth was loading)
      setError(null);

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

      // Store room_id and fetch room details for editing
      if (sessionData.room_id) {
        setRoomId(sessionData.room_id);
        
        // Fetch room name and icon from game_rooms
        const { data: gameRoom } = await supabase
          .from('game_rooms')
          .select('room_name, room_icon')
          .eq('id', sessionData.room_id)
          .maybeSingle();
        
        if (gameRoom) {
          setRoomName(gameRoom.room_name || '');
          setRoomIcon(gameRoom.room_icon || null);
        }
      }

      // Note: Host verification is also handled by context's isHost state
      // This is a defensive check - the context will set isHost correctly after joining
      if (sessionData.host_user_id && sessionData.host_user_id !== user?.id) {
        setError('You are not the host of this session');
        setLoading(false);
        return;
      }

      // Session loaded successfully
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
      if (!hasJoinedRef.current) {
        hasJoinedRef.current = true;
        try {
          await joinSession(
            sessionId,
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

  // Real-time sync: When items are added to room_category_queue, sync them to tv_session_queue
  useEffect(() => {
    if (!roomId || !sessionId) return;
    
    const channel = supabase
      .channel(`room-queue-sync-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_category_queue',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newItem = payload.new as {
            id: string;
            source_type: string;
            category_id: string | null;
            category_name: string | null;
            icon_slug: string | null;
            user_trivia_id: string | null;
            position: number;
          };
          
          tvLog('Room queue INSERT detected, syncing to TV queue', newItem);
          
          // Get current TV queue length for position
          const { data: currentQueue } = await supabase
            .from('tv_session_queue')
            .select('position')
            .eq('session_id', sessionId)
            .order('position', { ascending: false })
            .limit(1);
          
          const nextPosition = currentQueue?.[0]?.position != null 
            ? currentQueue[0].position + 1 
            : 0;
          
          // Insert into TV queue
          const { error: insertError } = await supabase.from('tv_session_queue').insert({
            session_id: sessionId,
            position: nextPosition,
            source_type: newItem.source_type,
            category_id: newItem.category_id,
            category_name: newItem.category_name,
            icon_slug: newItem.icon_slug,
            user_trivia_id: newItem.user_trivia_id,
          });
          
          if (insertError) {
            tvLogError('Failed to sync room queue item to TV queue', insertError);
          } else {
            tvLog('Successfully synced queue item to TV queue at position', nextPosition);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, sessionId]);

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

  // Reset votingEnded when phase changes away from poll-voting
  useEffect(() => {
    if (contextPhase !== 'poll-voting') {
      setVotingEnded(false);
    }
  }, [contextPhase]);

  // P0-1, P0-2: Removed duplicate question fetching - only store category selection
  // Questions are now fetched ONLY in startGame (TVGameContext)
  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);

    try {
      // Only update category info in session, NOT questions (P0-2 fix)
      await supabase
        .from('tv_sessions')
        .update({
          category_name: category.name,
          category_icon: category.icon,
        })
        .eq('id', sessionId);

      toast.success(`${category.name} არჩეულია!`);
    } catch (error) {
      console.error('Error selecting category:', error);
      toast.error('კატეგორიის არჩევა ვერ მოხერხდა');
      setSelectedCategory(null);
    }
  };

  // P1-2: Start game from queue or selected category
  // Now accepts optional firstQueueItem from ControllerDirectSelection to avoid stale state issues
  const handleStartGame = async (firstQueueItem?: { categoryId?: string; userTriviaId?: string }) => {
    if (!sessionId) return;

    tvLog('Host starting game', { sessionId, firstQueueItem, selectedCategory, hasQueue, queueLength: queue.length });

    try {
      // If called from ControllerDirectSelection with fresh queue item, use it directly
      if (firstQueueItem) {
        if (firstQueueItem.userTriviaId) {
          await startGame(undefined, firstQueueItem.userTriviaId);
        } else if (firstQueueItem.categoryId) {
          await startGame(firstQueueItem.categoryId);
        } else {
          toast.error('არასწორი რაუნდის ტიპი');
          return;
        }
        
        // Remove from queue after starting (find by matching ID)
        if (queue.length > 0) {
          const firstQueued = queue[0];
          if (!firstQueued.id.startsWith('initial-')) {
            await removeFromQueue(firstQueued.id);
          }
        }
        return;
      }

      // Fallback: If queue has items (for other call sites like lobby)
      if (hasQueue && queue.length > 0) {
        const firstQueued = queue[0];
        
        // Handle based on available IDs (more resilient than source_type string matching)
        if (firstQueued.user_trivia_id) {
          await startGame(undefined, firstQueued.user_trivia_id);
        } else if (firstQueued.category_id) {
          await startGame(firstQueued.category_id);
        } else if (firstQueued.source_type === "random") {
          // Random mode - pick a random category and start
          const randomCat = categories[Math.floor(Math.random() * categories.length)];
          if (randomCat) {
            await startGame(randomCat.id);
          } else {
            toast.error('კატეგორიები ვერ მოიძებნა');
            return;
          }
        } else {
          toast.error('არასწორი რაუნდის ტიპი');
          return;
        }
        
        // Remove from queue (but not if it's the initial category marker from room)
        if (!firstQueued.id.startsWith('initial-')) {
          await removeFromQueue(firstQueued.id);
        }
        return;
      }

      // Otherwise use selected category
      if (!selectedCategory?.id) {
        toast.error('გთხოვთ აირჩიოთ კატეგორია');
        return;
      }

      await startGame(selectedCategory.id);
    } catch (error) {
      tvLogError('handleStartGame', error);
      toast.error('თამაშის დაწყება ვერ მოხერხდა');
    }
  };

  // Replace queue item handler
  const handleReplaceQueueItem = (itemId: string) => {
    setReplacingItemId(itemId);
    setShowCategoryPicker(true);
  };

  // Add to queue from picker modal
  const handlePickerAddToQueue = async (item: {
    source_type: "category" | "random" | "user_trivia";
    category_id?: string | null;
    category_name?: string | null;
    user_trivia_id?: string | null;
    icon_slug?: string | null;
  }) => {
    // If replacing, remove old item first
    if (replacingItemId) {
      await removeFromQueue(replacingItemId);
      setReplacingItemId(null);
    }
    
    // Add to queue using the generic addToQueue
    await addToQueue(item);
    
    if (item.source_type === "category") {
      toast.success(`${item.category_name} დაემატა რიგში`);
    } else if (item.source_type === "random") {
      toast.success('შემთხვევითი რაუნდი დაემატა');
    } else if (item.source_type === "user_trivia") {
      toast.success(`${item.category_name || 'ტრივია'} დაემატა რიგში`);
    }
    
    setShowCategoryPicker(false);
  };

  // Add category to queue (legacy)
  const handleAddToQueue = async (category: Category) => {
    await addCategoryToQueue({ id: category.id, name: category.name });
    toast.success(`${category.name} დაემატა რიგში`);
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

  const handleSaveRoomDetails = async (newIcon: string | null, newName: string) => {
    if (!roomId) return;
    
    await supabase
      .from('game_rooms')
      .update({ 
        room_name: newName.trim(),
        room_icon: newIcon 
      })
      .eq('id', roomId);
    
    setRoomName(newName.trim());
    setRoomIcon(newIcon);
    toast.success('ოთახი განახლდა!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode || '');
    setCopied(true);
    toast.success('კოდი დაკოპირდა!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnswer = async (answer: string) => {
    // DEBUG: Log click attempt to diagnose blocking issue
    console.log('[TVHostController] handleAnswer called:', {
      answer: answer.substring(0, 20) + '...',
      hasAnswered,
      myAnswer: myAnswer ? 'SET' : 'NULL',
      isSuggester,
      currentQuestionIndex,
      currentQuestion: !!currentQuestion,
    });
    
    if (hasAnswered || !currentQuestion) {
      console.log('[TVHostController] ⚠️ BLOCKED:', { hasAnswered, noQuestion: !currentQuestion });
      return;
    }
    
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
          <p className="text-purple-200">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <p className="text-orange-300 text-xl font-bold mb-2">{error}</p>
          <p className="text-purple-300/70 text-sm mb-6">
            {error === 'No session ID' 
              ? 'TV სესიის ID ვერ მოიძებნა. გთხოვთ სცადოთ თავიდან.' 
              : 'გთხოვთ სცადოთ თავიდან.'}
          </p>
          <ChunkyButton onClick={() => navigate('/team')}>
            უკან
          </ChunkyButton>
        </div>
      </div>
    );
  }

  const displayCode = gameCode || '';

  // Category selection phase - Direct selection (from game over screen)
  if (localPhase === 'category-select') {
    // Use ControllerDirectSelection for cleaner UI
    return (
      <ControllerDirectSelection
        sessionId={sessionId || ''}
        userId={user?.id || ''}
        roomId={roomId}
        onStartGame={handleStartGame}
        onBack={() => navigate('/team', { replace: true })}
      />
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

  // Round Intro phase - show ready screen between rounds
  if (localPhase === 'round-intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <span className="px-4 py-2 rounded-full bg-purple-500/30 border border-purple-400/50 text-purple-200 font-medium">
            რაუნდი {roundNumber}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 flex flex-col items-center"
        >
          <h2 className="text-xl font-bold text-white">{categoryName || 'კატეგორია'}</h2>
        </motion.div>

        <ChunkyButton
          variant="primary"
          size="lg"
          onClick={() => markReady()}
          icon={<Check className="w-5 h-5" />}
        >
          მზად ვარ
        </ChunkyButton>
      </div>
    );
  }

  // Reveal phase - show host's answer result (mirrors guest ControllerReveal)
  // CRITICAL FIX: Host must also see reveal screen to stay in sync with guests
  if (localPhase === 'reveal') {
    // CRITICAL FIX: Suggester sees observer reveal, not "Time expired"
    if (isSuggester) {
      // Find the observer's current score from players list
      const observerPlayer = players.find(p => p.id === myPlayerId);
      const observerScore = observerPlayer?.score ?? myScore;
      const scoreDelta = observerScore - prevObserverScoreRef.current;

      // CRITICAL: Use key to force re-render when question changes
      return (
        <div
          key={`observer-reveal-${currentQuestionIndex}`}
          className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center"
        >
          {/* Question text */}
          {currentQuestion && (
            <div className="bg-white/10 rounded-xl p-4 mb-4 max-w-sm w-full">
              <p className="text-purple-300 text-xs mb-1">კითხვა {currentQuestionIndex + 1}/{totalQuestions}</p>
              <p className="text-white font-semibold text-center text-sm">{currentQuestion.question_text}</p>
            </div>
          )}

          {/* Correct answer */}
          {currentQuestion && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 mb-4 max-w-sm w-full">
              <p className="text-green-300 text-xs mb-1">სწორი პასუხი:</p>
              <p className="text-white font-semibold text-center">{currentQuestion.correct_answer}</p>
            </div>
          )}

          {/* Per-question bonus delta */}
          {scoreDelta > 0 ? (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-6 py-3 mb-4">
              <p className="text-green-400 text-lg font-bold text-center">+{scoreDelta} ქულა</p>
              <p className="text-yellow-300/60 text-xs text-center">შეცდომებზე მოგების ბონუსი</p>
            </div>
          ) : (
            <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
              <p className="text-purple-400 text-lg font-semibold text-center">ბონუსი არაა</p>
              <p className="text-purple-300/60 text-xs text-center">ყველამ სწორად უპასუხა</p>
            </div>
          )}

          {/* Total score */}
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-white text-xl font-bold">{observerScore}</span>
            <span className="text-purple-300 text-sm">ქულა</span>
          </div>

          <p className="text-purple-300/60 text-sm">შემდეგი კითხვა მალე...</p>
        </div>
      );
    }
    
    const isCorrect = myAnswer && currentQuestion ? myAnswer === currentQuestion.correct_answer : false;
    const didAnswer = myAnswer !== null;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: 'spring' }}
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
            didAnswer ? (isCorrect ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-500'
          }`}
        >
          {didAnswer ? (
            isCorrect ? <Check className="w-12 h-12 text-white" /> : <X className="w-12 h-12 text-white" />
          ) : (
            <Clock className="w-12 h-12 text-white" />
          )}
        </motion.div>
        
        <h2 className={`text-3xl font-bold mb-2 ${
          didAnswer ? (isCorrect ? 'text-green-400' : 'text-red-400') : 'text-gray-400'
        }`}>
          {didAnswer ? (isCorrect ? 'სწორია!' : 'არასწორია!') : 'დრო ამოიწურა!'}
        </h2>
        
        {!isCorrect && currentQuestion && (
          <p className="text-purple-300 text-center mb-4">
            პასუხი: {currentQuestion.correct_answer}
          </p>
        )}
        
        <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
          <span className="text-purple-300">შენი ქულა: </span>
          <span className="text-white text-2xl font-bold">{myScore}</span>
        </div>
        
        <p className="text-purple-300/60">შემდეგი კითხვა მალე...</p>
      </div>
    );
  }


  // Completed phase - show game over screen with leaderboard
  if (localPhase === 'completed') {
    // Use players from context directly - they already have correct data
    // The host is already in the players list via presence tracking
    const allPlayers = players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      score: p.score,
      isHost: p.isHost,
    }));

    const handleDirectSelection = async () => {
      try {
        // Start direct category selection (no poll)
        await startDirectSelection();
        toast.success('აირჩიე კატეგორიები!');
      } catch (error) {
        console.error('Error starting direct selection:', error);
        toast.error('ვერ მოხერხდა');
      }
    };

    const handleStartPoll = async () => {
      try {
        // Initiate the category poll for voting
        await pollHook.initiatePoll();
        toast.success('ხმის მიცემა დაწყებულია!');
      } catch (error) {
        console.error('Error initiating poll:', error);
        toast.error('ვერ მოხერხდა');
      }
    };

    const handleExit = () => {
      leaveSession();
      navigate('/team');
    };

    const handleContinueNextRound = async () => {
      await startNextRound();
    };

    return (
      <TVGameOverScreen
        players={allPlayers}
        currentPlayerId={user?.id}
        onExit={handleExit}
        onDirectSelection={handleDirectSelection}
        onStartPoll={handleStartPoll}
        onContinueNextRound={handleContinueNextRound}
        isHost={true}
        hasMoreRounds={roundNumber < totalRounds}
      />
    );
  }

  // Poll suggestion phase - host can suggest and start voting
  if (localPhase === 'poll-suggest') {
    return (
      <ControllerPollScreen
        sessionId={sessionId || ''}
        userId={user?.id || ''}
        nickname={nickname}
        avatarUrl={avatarUrl}
        isHost={true}
        contextPhase={`poll-${localPhase.replace('poll-', '')}`}
        code={gameCode}
      />
    );
  }

  // Poll voting phase - database handles transition to poll-results
  if (localPhase === 'poll-voting') {
    return (
      <ControllerPollScreen
        sessionId={sessionId || ''}
        userId={user?.id || ''}
        nickname={nickname}
        avatarUrl={avatarUrl}
        isHost={true}
        contextPhase="poll-voting"
        code={gameCode}
        onVotingEnded={() => {
          // Immediately transition host to poll-results without waiting for realtime
          tvLog('Voting ended, transitioning to poll-results');
          setVotingEnded(true);
        }}
      />
    );
  }

  // Poll results phase - host selects how many rounds (fallback for any edge cases)
  if (localPhase === 'poll-results') {
    return (
      <ControllerPollResults
        sessionId={sessionId || ''}
        userId={user?.id || ''}
        nickname={nickname}
        avatarUrl={avatarUrl}
        onGameStart={() => {
          // After game is started, navigation will be handled by phase change
          tvLog('Game started from poll results');
        }}
      />
    );
  }

  // Lobby phase - shows queue and ready to start
  if (localPhase === 'lobby') {
    return (
      <div className="h-[100dvh] safe-bleed overflow-y-auto bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 mb-6"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button 
              onClick={() => navigate('/team', { replace: true })}
              className="p-2 rounded-full hover:bg-white/10 shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-purple-200" />
            </button>
            {/* Room icon */}
            {roomIcon ? (
              <img src={roomIcon} alt="Room" className="w-8 h-8 object-contain rounded-lg shrink-0" />
            ) : (
              <img src={retroTvIcon} alt="TV" className="w-7 h-7 object-contain shrink-0" />
            )}
            {/* Room name */}
            <span className="font-bold text-white truncate">{roomName || 'TV თამაში'}</span>
            {/* Edit button */}
            <button
              onClick={() => setShowIconPicker(true)}
              className="p-2 rounded-full hover:bg-white/10 shrink-0"
              title="შეცვალე სახელი/აიკონი"
            >
              <Edit2 className="w-4 h-4 text-purple-300" />
            </button>
          </div>
        </motion.div>

        {/* QR Code section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-4"
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
        {players.length > 0 && (
          <motion.div 
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
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
                  {player.isHost && (
                    <span className="text-xs bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded">HOST</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Queue Display - prominent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-28 bg-purple-500/10 rounded-xl p-4 border border-purple-400/30"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-300" />
              რაუნდების რიგი ({queue.length})
            </h3>
            {/* Add round button */}
            <button
              onClick={() => setShowCategoryPicker(true)}
              className="w-8 h-8 rounded-lg bg-purple-500/30 border border-purple-400/40 flex items-center justify-center hover:bg-purple-500/50 transition-colors"
            >
              <Plus className="w-5 h-5 text-purple-200" />
            </button>
          </div>

          {queue.length === 0 ? (
            <button
              onClick={() => setShowCategoryPicker(true)}
              className="w-full p-4 border-2 border-dashed border-purple-400/40 rounded-xl hover:border-purple-400/60 hover:bg-purple-500/10 transition-all"
            >
              <div className="flex flex-col items-center gap-2">
                <Plus className="w-8 h-8 text-purple-300" />
                <p className="text-purple-300 text-sm">აირჩიე კატეგორიები</p>
              </div>
            </button>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={queue} 
              onReorder={reorderQueue}
              className="space-y-2"
            >
              {queue.map((item, index) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10 cursor-grab active:cursor-grabbing"
                  whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}
                >
                  {/* Drag handle */}
                  <GripVertical className="w-5 h-5 text-purple-400 shrink-0" />
                  
                  <span className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs text-purple-200 font-bold">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-white font-medium">{item.category_name}</span>
                  
                  {/* Replace button - stop drag propagation */}
                  <div 
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1"
                  >
                    <button
                      onClick={() => handleReplaceQueueItem(item.id)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="ჩანაცვლება"
                    >
                      <RefreshCw className="w-4 h-4 text-purple-300" />
                    </button>
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-colors"
                      title="წაშლა"
                    >
                      <X className="w-4 h-4 text-white/60 hover:text-red-300" />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </motion.div>

        {/* Start Game Button - hidden while the category picker is open so it
            can never cover the picker's own "choose"/"add to queue" buttons */}
        {!showCategoryPicker && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem_+_var(--safe-bottom))] bg-gradient-to-t from-purple-900 via-purple-900/95 to-transparent z-[100]">
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={() => handleStartGame()}
            disabled={players.length < 1 || queue.length === 0}
          >
            <Play className="w-5 h-5 mr-2" />
            {queue.length === 0
              ? 'დაამატე რაუნდები რიგში'
              : players.length < 1
                ? 'საჭიროა მინ. 1 მოთამაშე'
                : `დაწყება (${queue.length} რაუნდი)`}
          </ChunkyButton>
        </div>
        )}

        {/* Category Picker Modal */}
        <CategoryPickerModal
          isOpen={showCategoryPicker}
          onClose={() => {
            setShowCategoryPicker(false);
            setReplacingItemId(null);
          }}
          onSelectCategory={(cat) => {
            handlePickerAddToQueue({
              source_type: "category",
              category_id: cat.id,
              category_name: cat.name,
              icon_slug: cat.iconSlug,
            });
          }}
          onSelectRandom={() => {
            handlePickerAddToQueue({
              source_type: "random",
              category_name: "შემთხვევითი",
            });
          }}
          onSelectTrivia={(trivia) => {
            handlePickerAddToQueue({
              source_type: "user_trivia",
              category_name: trivia.title,
              user_trivia_id: trivia.id,
            });
          }}
          onAddToQueue={handlePickerAddToQueue}
          showQueueOption={true}
        />

        {/* Room Icon/Name Editor Modal */}
        <RoomIconPickerModal
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          currentIconUrl={roomIcon}
          roomName={roomName}
          onConfirm={(newIcon, newName) => {
            handleSaveRoomDetails(newIcon, newName);
            setShowIconPicker(false);
          }}
        />
      </div>
    );
  }

  if (localPhase === 'waiting') {
    const joinUrlCustom = `https://mytrivia.io/join?code=${displayCode}`;
    
    return (
      <div className="h-[100dvh] safe-bleed overflow-y-auto bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-2">
            <img src={retroTvIcon} alt="TV" className="w-7 h-7 object-contain" />
            <span className="font-bold text-white">მართვის პანელი</span>
          </div>
          <button 
            onClick={() => navigate('/team')}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </motion.div>

        {/* Code section - simplified without QR */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-4"
        >
          <div className="flex items-center justify-between">
            <div>
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
              <p className="text-xs text-purple-300 mt-1">{joinUrlCustom}</p>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <Users className="w-5 h-5" />
              <span className="font-medium">{players.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Players section */}
        {players.length > 0 && (
          <motion.div 
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
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
                  {player.isHost && (
                    <span className="text-xs bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded">HOST</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Category selector - always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-300" />
            აირჩიე კატეგორია
          </h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {categories.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedCategory(category)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  selectedCategory?.id === category.id
                    ? 'bg-purple-500/30 border-purple-400'
                    : 'bg-white/10 border-white/20 hover:border-purple-400/50'
                }`}
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="flex-1 text-left font-medium text-white">{category.name}</span>
                {selectedCategory?.id === category.id ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-purple-300" />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Start Game Button - fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem_+_var(--safe-bottom))] bg-gradient-to-t from-purple-900 via-purple-900/95 to-transparent">
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={() => {
              if (selectedCategory) {
                handleSelectCategory(selectedCategory).then(() => {
                  startGame(selectedCategory.id);
                });
              }
            }}
            disabled={players.length < 1 || !selectedCategory}
          >
            <Play className="w-5 h-5 mr-2" />
            {!selectedCategory 
              ? 'აირჩიე კატეგორია' 
              : players.length < 1 
                ? 'საჭიროა მინ. 1 მოთამაშე' 
                : `დაწყება: ${selectedCategory.name}`}
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
  // CRITICAL: If host is the suggester, show observer UI instead
  // IMPORTANT: Only show during 'playing' phase - other phases have their own handlers
  if (isSuggester && localPhase === 'playing') {
    // Find the observer's current score from players list
    const observerPlayer = players.find(p => p.id === myPlayerId);
    const observerScore = observerPlayer?.score ?? myScore;

    // CRITICAL: Use key to force re-render when question changes
    return (
      <div
        key={`observer-playing-${currentQuestionIndex}`}
        className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col"
      >
        {/* Header - Question counter, Timer, Score */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-purple-300 text-sm">Q{currentQuestionIndex + 1}/{totalQuestions}</span>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeRemaining <= 5 ? 'bg-red-500/30' : 'bg-white/10'}`}>
            <Clock className="w-4 h-4 text-purple-300" />
            <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>{timeRemaining}წმ</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-white font-bold text-sm">{observerScore}</span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <p className="text-white font-semibold text-center">{currentQuestion?.question_text}</p>
        </div>

        {/* Read-only answer options */}
        <div className="flex-1 flex flex-col gap-3">
          {currentQuestion?.options.map((option, index) => (
            <div
              key={index}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/10 opacity-60 pointer-events-none"
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
                <span className="text-purple-200">{option}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Observer badge + end game */}
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="text-yellow-300/60 text-xs">აკვირდები — ქულებს იღებ შეცდომებზე</span>
          <ChunkyButton
            variant="secondary"
            onClick={handleEndGame}
          >
            დასრულება
          </ChunkyButton>
        </div>
      </div>
    );
  }
  
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

      {/* Auto-advance diagnostics: answered/expected · active-roster · presence.
          Kept tiny but always visible so a screenshot of a stalled question
          shows exactly which signal is wrong. */}
      {advanceDebug && (
        <p className="text-purple-400/50 text-[10px] text-center -mt-3 mb-2">{advanceDebug}</p>
      )}

      {/* Question Card - Full question text like guest UI */}
      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <p className="text-white font-semibold text-center">{currentQuestion?.question_text}</p>
      </div>

      {hasAnswered ? (
        // After answering - show confirmation
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center">
            <Check className="w-16 h-16 text-green-400 mb-4" />
            <p className="text-white text-xl font-bold">პასუხი გაგზავნილია!</p>
            <p className="text-purple-300">დაველოდოთ სხვა მოთამაშეებს...</p>
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

      {/* Host control - ALWAYS available during the question, not just in the
          brief window after answering */}
      <div className="w-full mt-4 pb-4">
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
