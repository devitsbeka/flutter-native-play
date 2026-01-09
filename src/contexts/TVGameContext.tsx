import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { tvLog, tvLogPhase, tvLogPlayer, tvLogError, tvLogPresence, tvLogTimer } from '@/utils/tvDebug';
import { 
  calculatePoints, 
  calculateTimeRemaining, 
  getQuestionTime, 
  getSessionBinding, 
  setSessionBinding,
  clearExpiredBindings 
} from '@/utils/tvScoring';

// Types
export interface TVPlayer {
  id: string;
  nickname: string;
  avatar_url: string | null;
  score: number;
  hasAnswered: boolean;
  lastAnswerCorrect: boolean | null;
  lastAnswer: string | null;
  isHost: boolean;
}

export interface TVQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  options: string[];
}

export type TVPhase = 'pairing' | 'waiting' | 'lobby' | 'countdown' | 'question' | 'playing' | 'reveal' | 'results' | 'completed' | 'idle';

interface TVGameState {
  code: string | null;
  sessionId: string | null;
  phase: TVPhase;
  players: TVPlayer[];
  questions: TVQuestion[];
  currentQuestionIndex: number;
  timeRemaining: number;
  roundNumber: number;
  categoryName: string | null;
  categoryIcon: string | null;
  roomName: string | null;
  totalRoundsPlayed: number;
  accumulatedScores: Record<string, number>;
  isPaired: boolean;
}

interface TVGameContextType extends TVGameState {
  // TV Display actions
  createSession: () => Promise<string | null>;
  // Controller actions
  joinSession: (code: string, nickname: string, avatarUrl?: string | null) => Promise<boolean>;
  // Host actions
  startGame: (categoryId?: string) => Promise<void>;
  startPlaying: () => Promise<void>; // Trigger playing phase after countdown
  startNextRound: () => Promise<void>;
  updateRoomName: (name: string) => Promise<void>;
  updateCategory: (categoryId: string, categoryName: string) => Promise<void>;
  saveRoundHistory: () => Promise<void>;
  resetGame: () => Promise<void>; // Reset game for play again
  // Player actions
  submitAnswer: (answer: string) => Promise<{ correct: boolean; points: number }>;
  // Shared
  leaveSession: () => void;
  isHost: boolean;
  myPlayerId: string | null;
  myScore: number;
  myAnswer: string | null;
}

const TVGameContext = createContext<TVGameContextType | null>(null);

const QUESTION_TIME = getQuestionTime();

// Map database status values to TVPhase for consistency
export const mapDbStatusToPhase = (status: string): TVPhase => {
  const mapping: Record<string, TVPhase> = {
    'waiting': 'pairing',
    'paired': 'lobby',   // DB uses 'paired' for lobby state
    'lobby': 'lobby',    // Backwards compatibility
    'countdown': 'countdown',
    'playing': 'question',
    'question': 'question',
    'reveal': 'reveal',
    'results': 'results',
    'completed': 'results',
    'idle': 'idle',
    'pairing': 'pairing',
  };
  return mapping[status] || (status as TVPhase);
};

// Get or create a consistent player ID
// For authenticated users: use user.id
// For guests: generate UUID once and store in localStorage
const getOrCreatePlayerId = (userId?: string): string => {
  if (userId) return userId;
  
  const STORAGE_KEY = 'tv_guest_player_id';
  let guestId = localStorage.getItem(STORAGE_KEY);
  
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, guestId);
    tvLog('Created new guest player ID', { id: guestId.slice(0, 8) });
  }
  
  return guestId;
};

// Helper to generate 6-char code
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Generate 4-digit code from 6-char code
const generate4DigitCode = (code: string): string => {
  const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return String(hash % 10000).padStart(4, '0');
};

// Shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const TVGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TVGameState>({
    code: null,
    sessionId: null,
    phase: 'pairing',
    players: [],
    questions: [],
    currentQuestionIndex: 0,
    timeRemaining: QUESTION_TIME,
    roundNumber: 1,
    categoryName: null,
    categoryIcon: null,
    roomName: null,
    totalRoundsPlayed: 0,
    accumulatedScores: {},
    isPaired: false,
  });

  const [isHost, setIsHost] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
    };
  }, []);

  // Timer effect for question phase
  useEffect(() => {
    if (state.phase === 'question' && state.timeRemaining > 0) {
      tvLogTimer('start', state.timeRemaining);
      timerRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            tvLogTimer('expired');
            // Time's up - move to reveal (only host triggers this)
            if (isHost && prev.phase === 'question') {
              tvLogPhase('question', 'reveal', 'timer expired');
              supabase
                .from('tv_sessions')
                .update({ status: 'reveal' })
                .eq('id', prev.sessionId)
                .then(() => tvLog('Moved to reveal phase'));
            }
            return { ...prev, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase, state.timeRemaining, isHost, state.sessionId]);

  // Create TV session (called by TV display)
  const createSession = useCallback(async (): Promise<string | null> => {
    try {
      const code = generateCode();
      const fourDigitCode = generate4DigitCode(code);
      
      const { data, error } = await supabase
        .from('tv_sessions')
        .insert({
          pairing_code: code,
          tv_pairing_code: fourDigitCode,
          status: 'waiting',
          is_paired: false,
          current_question_index: 0,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        code,
        sessionId: data.id,
        phase: 'pairing',
      }));

      // Subscribe to session changes
      setupSessionSubscription(data.id);
      setupPresenceChannel(data.id, 'TV_DISPLAY', null, false, true); // isTVDisplay = true

      return code;
    } catch (error) {
      console.error('Error creating TV session:', error);
      return null;
    }
  }, []);

  // Join session (called by controller or TV display)
  const joinSession = useCallback(async (code: string, nickname: string, avatarUrl?: string | null): Promise<boolean> => {
    try {
      // Clear any expired session bindings on join attempt
      clearExpiredBindings();
      
      const upperCode = code.toUpperCase();
      
      // Get current auth user if any
      const { data: { user } } = await supabase.auth.getUser();
      const authUserId = user?.id || null;
      
      // Try to find session by 6-char pairing_code first
      let { data: session, error } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('pairing_code', upperCode)
        .in('status', ['waiting', 'paired', 'countdown', 'playing', 'reveal'])
        .single();

      // If not found, try 4-digit tv_pairing_code
      if (error || !session) {
        const { data: session4Digit, error: error4Digit } = await supabase
          .from('tv_sessions')
          .select('*')
          .eq('tv_pairing_code', upperCode)
          .in('status', ['waiting', 'paired', 'countdown', 'playing', 'reveal'])
          .single();
        
        if (!error4Digit && session4Digit) {
          session = session4Digit;
          error = null;
        }
      }

      if (error || !session) {
        console.error('Session not found:', error);
        return false;
      }

      // Check for existing session binding (join idempotency)
      // This prevents duplicate player entries when double-clicking join
      let playerId = getSessionBinding(session.id);
      
      if (playerId) {
        tvLog('Reusing existing player ID from session binding', { playerId: playerId.slice(0, 8) });
      } else {
        // Generate new player ID
        playerId = getOrCreatePlayerId();
        // Store the binding for future rejoins
        setSessionBinding(session.id, playerId);
        tvLog('Created new player ID and session binding', { playerId: playerId.slice(0, 8) });
      }
      
      // Check if this player is the host:
      // 1. They're the first player (no host set yet), OR
      // 2. Their player ID matches the stored host_user_id, OR
      // 3. Their auth user ID matches the stored host_user_id (for authenticated hosts)
      const isHostPlayer = !session.host_user_id || 
                           session.host_user_id === playerId || 
                           (authUserId && session.host_user_id === authUserId);
      const isTVDisplay = nickname === 'TV_DISPLAY';
      
      tvLog('Host check', { 
        authUserId: authUserId?.slice(0, 8), 
        playerId: playerId.slice(0, 8), 
        storedHostId: session.host_user_id?.slice(0, 8),
        isHostPlayer,
        isTVDisplay
      });

      // If first player (no host yet) and NOT a TV display, become host
      // Use auth user ID if available, otherwise use player ID
      if (!session.host_user_id && !isTVDisplay) {
        const hostIdToStore = authUserId || playerId;
        tvLog('Setting host_user_id', { hostIdToStore: hostIdToStore.slice(0, 8) });
        await supabase
          .from('tv_sessions')
          .update({ 
            host_user_id: hostIdToStore,
            is_paired: true,
            status: 'paired'  // Use 'paired' for DB (constraint-compatible)
          })
          .eq('id', session.id);
      }

      // Parse existing questions if any
      let questions: TVQuestion[] = [];
      if (session.questions) {
        const rawQuestions = session.questions as unknown as Array<{
          id: string;
          question_text: string;
          correct_answer: string;
          options: string[];
        }>;
        questions = rawQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          options: q.options,
        }));
      }

      tvLog('Setting initial state from session', { 
        status: session.status, 
        phase: mapDbStatusToPhase(session.status),
        questionCount: questions.length 
      });
      
      setState(prev => ({
        ...prev,
        code: code.toUpperCase(),
        sessionId: session.id,
        phase: mapDbStatusToPhase(session.status),  // Use proper mapping!
        questions,
        currentQuestionIndex: session.current_question_index || 0,
        categoryName: session.category_name,
        categoryIcon: session.category_icon,
      }));

      setMyPlayerId(playerId);
      setIsHost(isHostPlayer);

      // Setup subscriptions
      setupSessionSubscription(session.id);
      setupPresenceChannel(session.id, nickname, avatarUrl || null, isHostPlayer, false); // isTVDisplay = false

      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      return false;
    }
  }, []);

  // Setup realtime subscription for session changes
  const setupSessionSubscription = (sessionId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`tv-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tv_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newData = payload.new as {
            status: string;
            current_question_index: number;
            questions: Json | null;
            question_start_time: string | null;
            category_name: string | null;
            category_icon: string | null;
            is_paired: boolean;
            room_name: string | null;
          };
          
          // Parse questions if present
          let questions: TVQuestion[] = [];
          if (newData.questions) {
            const rawQuestions = newData.questions as unknown as Array<{
              id: string;
              question_text: string;
              correct_answer: string;
              options: string[];
            }>;
            questions = rawQuestions.map(q => ({
              id: q.id,
              question_text: q.question_text,
              correct_answer: q.correct_answer,
              options: q.options,
            }));
          }

          setState(prev => {
            // Calculate time remaining if question just started
            let timeRemaining = prev.timeRemaining;
            if (newData.status === 'playing' && newData.question_start_time) {
              const startTime = new Date(newData.question_start_time).getTime();
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              timeRemaining = Math.max(0, QUESTION_TIME - elapsed);
            }

            // Log phase changes
            const newPhase = mapDbStatusToPhase(newData.status);
            if (prev.phase !== newPhase) {
              tvLogPhase(prev.phase, newPhase, 'session subscription');
            }

            // Reset answer when moving to new question
            const isNewQuestion = newData.current_question_index !== prev.currentQuestionIndex;
            if (isNewQuestion) {
              tvLog('New question', { index: newData.current_question_index });
              setMyAnswer(null);
            }

            return {
              ...prev,
              phase: newPhase,
              currentQuestionIndex: newData.current_question_index,
              questions: questions.length > 0 ? questions : prev.questions,
              timeRemaining: newData.status === 'playing' ? timeRemaining : QUESTION_TIME,
              categoryName: newData.category_name || prev.categoryName,
              categoryIcon: newData.category_icon || prev.categoryIcon,
              isPaired: newData.is_paired ?? prev.isPaired,
              roomName: newData.room_name || prev.roomName,
            };
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // Setup presence channel for players
  const setupPresenceChannel = (sessionId: string, nickname: string, avatarUrl: string | null, isHostPlayer: boolean, isTVDisplay: boolean = false) => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    // Use consistent player ID
    const playerId = isTVDisplay ? 'TV_DISPLAY' : getOrCreatePlayerId(myPlayerId || undefined);
    if (!myPlayerId && !isTVDisplay) setMyPlayerId(playerId);

    tvLog('Setting up presence', { playerId: playerId.slice(0, 8), nickname, isHost: isHostPlayer, isTVDisplay });

    const channel = supabase.channel(`tv-presence-${sessionId}`, {
      config: { presence: { key: playerId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const players: TVPlayer[] = [];

        Object.entries(presenceState).forEach(([key, presences]) => {
          const rawPresence = presences[0] as Record<string, unknown> | undefined;
          
          // Filter out TV_DISPLAY - it's not a player
          if (rawPresence && key !== 'TV_DISPLAY' && 'nickname' in rawPresence) {
            players.push({
              id: key,
              nickname: (rawPresence.nickname as string) || 'Player',
              avatar_url: rawPresence.avatar_url as string | null,
              score: (rawPresence.score as number) || 0,
              hasAnswered: (rawPresence.hasAnswered as boolean) || false,
              lastAnswerCorrect: rawPresence.lastAnswerCorrect as boolean | null,
              lastAnswer: rawPresence.lastAnswer as string | null,
              isHost: (rawPresence.isHost as boolean) || false,
            });
          }
        });

        // Sort by score descending
        players.sort((a, b) => b.score - a.score);

        setState(prev => ({ ...prev, players }));
        
        tvLogPresence('sync', players.length, players.map(p => p.nickname));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        tvLogPlayer('join', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        tvLogPlayer('leave', key);
        // Log player disconnect for debugging
        if (leftPresences && leftPresences.length > 0) {
          const leftPlayer = leftPresences[0] as { nickname?: string };
          tvLog('Player disconnected', { nickname: leftPlayer.nickname || key });
        }
      })
      .on('broadcast', { event: 'RESET_SCORES' }, () => {
        tvLog('Received RESET_SCORES broadcast');
        // Reset local score state
        setMyScore(0);
        setMyAnswer(null);
        
        // Re-track with score: 0 if we have a presence channel
        if (presenceChannelRef.current) {
          const myPlayer = state.players.find(p => p.id === myPlayerId);
          presenceChannelRef.current.track({
            nickname: myPlayer?.nickname || nickname,
            avatar_url: myPlayer?.avatar_url || avatarUrl,
            score: 0,
            hasAnswered: false,
            lastAnswerCorrect: null,
            lastAnswer: null,
            isHost: isHostPlayer,
          });
        }
      })
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          // Only track if not TV display, or track as TV_DISPLAY for awareness
          await channel.track({
            nickname,
            avatar_url: avatarUrl,
            score: 0,
            hasAnswered: false,
            lastAnswerCorrect: null,
            isHost: isHostPlayer,
            isTVDisplay,
          });
          tvLog('Presence tracked', { nickname, isTV: isTVDisplay });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Handle connection errors - attempt to reconnect after delay
          tvLogError('Presence channel error, will reconnect', { status, err });
          setTimeout(() => {
            if (presenceChannelRef.current) {
              supabase.removeChannel(presenceChannelRef.current);
              presenceChannelRef.current = null;
            }
            // Reconnect
            setupPresenceChannel(sessionId, nickname, avatarUrl, isHostPlayer, isTVDisplay);
          }, 2000);
        }
      });

    presenceChannelRef.current = channel;
  };

  // Start the game (host only)
  const startGame = useCallback(async (categoryId?: string) => {
    if (!state.sessionId || !isHost) return;

    // P1-2: Validate category is provided
    if (!categoryId) {
      tvLogError('startGame', 'No category ID provided');
      return;
    }

    try {
      // Get language preference for P1-3
      const language = typeof window !== 'undefined' 
        ? localStorage.getItem('preferredLanguage') || 'ka' 
        : 'ka';

      // P1-1: Get previously asked questions + all seen questions to avoid repetition
      const { getAskedQuestionIds, markQuestionsAsAsked, clearCategoryAskedQuestions, getSeenQuestionIds, clearSeenQuestions, shouldResetSeenPool } = await import('@/services/questionTracker');
      const trackerKey = `tv_${categoryId}`;
      const categoryAskedIds = getAskedQuestionIds(trackerKey);
      const allSeenIds = getSeenQuestionIds();
      // Combine for maximum freshness
      let excludeIds = [...new Set([...categoryAskedIds, ...allSeenIds])];

      // P0-3: Add in_production and language filters
      let questionsQuery = supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, difficulty')
        .eq('is_active', true)
        .eq('in_production', true)
        .eq('language', language)
        .eq('category_id', categoryId);

      // Exclude previously seen questions (prioritize fresh content)
      if (excludeIds.length > 0) {
        questionsQuery = questionsQuery.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      // Fetch more than needed to allow for filtering
      questionsQuery = questionsQuery.limit(50);

      let { data: rawQuestions, error } = await questionsQuery;

      if (error) throw error;

      // If not enough questions, reset tracker and refetch
      if (!rawQuestions || rawQuestions.length < 10) {
        tvLog('Not enough fresh questions, resetting tracker', { 
          available: rawQuestions?.length || 0, 
          trackerKey 
        });
        clearCategoryAskedQuestions(trackerKey);
        
        // Refetch without exclusions
        const { data: resetQuestions, error: resetError } = await supabase
          .from('questions')
          .select('id, question_text, correct_answer, incorrect_answers, difficulty')
          .eq('is_active', true)
          .eq('in_production', true)
          .eq('language', language)
          .eq('category_id', categoryId)
          .limit(50);
        
        if (resetError) throw resetError;
        rawQuestions = resetQuestions || [];
      }

      // Format questions with shuffled options (single shuffle - P1-4)
      const formattedQuestions = shuffleArray(rawQuestions).slice(0, 10).map(q => {
        const incorrectAnswers = Array.isArray(q.incorrect_answers) 
          ? q.incorrect_answers 
          : JSON.parse(q.incorrect_answers as string);
        
        return {
          id: q.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          options: shuffleArray([q.correct_answer, ...incorrectAnswers]),
        };
      });

      // Track these questions as asked (P1-1)
      markQuestionsAsAsked(trackerKey, formattedQuestions.map(q => q.id));

      tvLog('Starting game', { questionCount: formattedQuestions.length, categoryId, language });

      // Get category info for session
      const { data: category } = await supabase
        .from('categories')
        .select('name, icon')
        .eq('id', categoryId)
        .single();

      // Start countdown with questions and category info
      await supabase
        .from('tv_sessions')
        .update({
          status: 'countdown',
          questions: formattedQuestions as unknown as Json,
          current_question_index: 0,
          category_name: category?.name || null,
          category_icon: category?.icon || null,
        })
        .eq('id', state.sessionId);

      tvLogPhase('lobby', 'countdown', 'startGame');

    } catch (error) {
      tvLogError('startGame', error);
      console.error('Error starting game:', error);
    }
  }, [state.sessionId, isHost]);

  // Start playing phase (called after countdown ends)
  const startPlaying = useCallback(async () => {
    if (!state.sessionId) return;

    tvLog('Starting playing phase');
    
    try {
      await supabase
        .from('tv_sessions')
        .update({
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', state.sessionId);

      tvLogPhase('countdown', 'playing', 'startPlaying');
      tvLogTimer('start', QUESTION_TIME);
    } catch (error) {
      tvLogError('startPlaying', error);
    }
  }, [state.sessionId]);

  // Submit answer (player)
  const submitAnswer = useCallback(async (answer: string): Promise<{ correct: boolean; points: number }> => {
    if (!state.sessionId || !myPlayerId || myAnswer) {
      tvLog('Submit answer blocked', { sessionId: !!state.sessionId, playerId: !!myPlayerId, alreadyAnswered: !!myAnswer });
      return { correct: false, points: 0 };
    }

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) {
      tvLogError('submitAnswer', 'No current question');
      return { correct: false, points: 0 };
    }

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = calculatePoints(isCorrect, state.timeRemaining);

    tvLogPlayer('answer', myPlayerId, { isCorrect, points, timeRemaining: state.timeRemaining });

    setMyAnswer(answer);
    const newScore = myScore + points;
    setMyScore(newScore);

    try {
      // Update presence first (most important for live display)
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.track({
          nickname: state.players.find(p => p.id === myPlayerId)?.nickname || 'Player',
          avatar_url: state.players.find(p => p.id === myPlayerId)?.avatar_url,
          score: newScore,
          hasAnswered: true,
          lastAnswerCorrect: isCorrect,
          lastAnswer: answer,
          isHost,
        });
      }

      // Record answer in database
      const { error } = await supabase.from('player_answers').insert({
        tv_session_id: state.sessionId,
        room_id: state.sessionId, // Using session ID as room ID for simplicity
        user_id: myPlayerId,
        question_index: state.currentQuestionIndex,
        answer,
        is_correct: isCorrect,
        points_earned: points,
        time_remaining: state.timeRemaining,
      });

      if (error) {
        tvLogError('submitAnswer DB insert', error);
      }

      return { correct: isCorrect, points };
    } catch (error) {
      tvLogError('submitAnswer', error);
      // Still return result even if DB fails - presence update is more important
      return { correct: isCorrect, points };
    }
  }, [state.sessionId, state.questions, state.currentQuestionIndex, state.timeRemaining, state.players, myPlayerId, myAnswer, myScore, isHost]);

  // Start next round (host only)
  const startNextRound = useCallback(async () => {
    tvLog('startNextRound called', { sessionId: state.sessionId, isHost, phase: state.phase });
    
    if (!state.sessionId) {
      tvLog('startNextRound aborted: no sessionId');
      return;
    }
    
    if (!isHost) {
      tvLog('startNextRound aborted: not host');
      return;
    }

    const nextIndex = state.currentQuestionIndex + 1;
    tvLog('Starting next round', { nextIndex, totalQuestions: state.questions.length });

    try {
      if (nextIndex >= state.questions.length) {
        // Game over - use 'completed' which is a valid DB constraint value
        tvLogPhase('question', 'results', 'all questions answered');
        await supabase
          .from('tv_sessions')
          .update({ status: 'completed' })
          .eq('id', state.sessionId);
      } else {
        // Reset all players' hasAnswered status via presence update
        // Move to next question
        await supabase
          .from('tv_sessions')
          .update({
            status: 'playing',
            current_question_index: nextIndex,
            question_start_time: new Date().toISOString(),
          })
          .eq('id', state.sessionId);

        tvLogTimer('reset', QUESTION_TIME);

        // Reset own answer state
        setMyAnswer(null);

        // Update presence to reset hasAnswered
        if (presenceChannelRef.current) {
          await presenceChannelRef.current.track({
            nickname: state.players.find(p => p.id === myPlayerId)?.nickname || 'Host',
            avatar_url: state.players.find(p => p.id === myPlayerId)?.avatar_url,
            score: myScore,
            hasAnswered: false,
            lastAnswerCorrect: null,
            lastAnswer: null,
            isHost: true,
          });
        }
      }
    } catch (error) {
      tvLogError('startNextRound', error);
    }
  }, [state.sessionId, state.currentQuestionIndex, state.questions.length, state.players, isHost, myPlayerId, myScore]);

  // Update room name (host only)
  const updateRoomName = useCallback(async (name: string) => {
    if (!state.sessionId || !isHost) return;
    
    await supabase
      .from('tv_sessions')
      .update({ room_name: name })
      .eq('id', state.sessionId);
    
    setState(prev => ({ ...prev, roomName: name }));
  }, [state.sessionId, isHost]);

  // Update category (host only)
  const updateCategory = useCallback(async (categoryId: string, categoryName: string) => {
    if (!state.sessionId || !isHost) return;
    
    const { data: category } = await supabase
      .from('categories')
      .select('icon')
      .eq('id', categoryId)
      .single();
    
    await supabase
      .from('tv_sessions')
      .update({ 
        category_name: categoryName,
        category_icon: category?.icon || null,
      })
      .eq('id', state.sessionId);
    
    setState(prev => ({ 
      ...prev, 
      categoryName, 
      categoryIcon: category?.icon || null 
    }));
  }, [state.sessionId, isHost]);

  // Save round history
  const saveRoundHistory = useCallback(async () => {
    if (!state.sessionId) return;
    
    const playerScores = state.players.reduce((acc, p) => ({
      ...acc,
      [p.id]: { 
        nickname: p.nickname, 
        score: p.score, 
        avatar_url: p.avatar_url,
        questions_answered: 0 // Could track this later
      }
    }), {});

    await supabase.from('tv_round_history').insert({
      tv_session_id: state.sessionId,
      round_number: state.roundNumber,
      category_name: state.categoryName,
      category_icon: state.categoryIcon,
      player_scores: playerScores,
      total_questions: state.questions.length,
    });

    // Update accumulated scores
    const newAccumulated = { ...state.accumulatedScores };
    state.players.forEach(p => {
      newAccumulated[p.id] = (newAccumulated[p.id] || 0) + p.score;
    });

    await supabase
      .from('tv_sessions')
      .update({ 
        total_rounds_played: state.totalRoundsPlayed + 1,
        accumulated_scores: newAccumulated,
      })
      .eq('id', state.sessionId);

    setState(prev => ({
      ...prev,
      totalRoundsPlayed: prev.totalRoundsPlayed + 1,
      accumulatedScores: newAccumulated,
    }));
  }, [state.sessionId, state.roundNumber, state.categoryName, state.categoryIcon, state.questions.length, state.players, state.accumulatedScores, state.totalRoundsPlayed]);

  // Reset game for "Play Again" - resets scores and state but keeps session
  const resetGame = useCallback(async () => {
    if (!state.sessionId) return;

    tvLog('Resetting game for play again', { sessionId: state.sessionId });

    try {
      // Broadcast reset to all players BEFORE database update
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'RESET_SCORES',
          payload: {},
        });
        tvLog('Broadcasted RESET_SCORES to all players');
      }

      // Reset database state
      await supabase
        .from('tv_sessions')
        .update({
          status: 'paired',  // Use 'paired' for DB (constraint-compatible)
          current_question_index: 0,
          questions: null,
          question_start_time: null,
        })
        .eq('id', state.sessionId);

      // Reset local state
      setMyScore(0);
      setMyAnswer(null);

      // Re-track presence with reset score
      if (presenceChannelRef.current) {
        const myPlayer = state.players.find(p => p.id === myPlayerId);
        await presenceChannelRef.current.track({
          nickname: myPlayer?.nickname || 'Player',
          avatar_url: myPlayer?.avatar_url,
          score: 0,  // Reset score
          hasAnswered: false,
          lastAnswerCorrect: null,
          lastAnswer: null,
          isHost,
        });
      }

      setState(prev => ({
        ...prev,
        phase: 'lobby',
        questions: [],
        currentQuestionIndex: 0,
        timeRemaining: QUESTION_TIME,
      }));

      tvLog('Game reset complete');
    } catch (error) {
      tvLogError('resetGame', error);
    }
  }, [state.sessionId, state.players, isHost, myPlayerId]);

  // Leave session
  const leaveSession = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState({
      code: null,
      sessionId: null,
      phase: 'pairing',
      players: [],
      questions: [],
      currentQuestionIndex: 0,
      timeRemaining: QUESTION_TIME,
      roundNumber: 1,
      categoryName: null,
      categoryIcon: null,
      roomName: null,
      totalRoundsPlayed: 0,
      accumulatedScores: {},
      isPaired: false,
    });
    setIsHost(false);
    setMyPlayerId(null);
    setMyScore(0);
    setMyAnswer(null);
  }, []);

  return (
    <TVGameContext.Provider
      value={{
        ...state,
        createSession,
        joinSession,
        startGame,
        startPlaying,
        startNextRound,
        updateRoomName,
        updateCategory,
        saveRoundHistory,
        resetGame,
        submitAnswer,
        leaveSession,
        isHost,
        myPlayerId,
        myScore,
        myAnswer,
      }}
    >
      {children}
    </TVGameContext.Provider>
  );
};

export const useTVGame = () => {
  const context = useContext(TVGameContext);
  if (!context) {
    throw new Error('useTVGame must be used within a TVGameProvider');
  }
  return context;
};
