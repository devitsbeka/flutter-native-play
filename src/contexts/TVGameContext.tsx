import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

// Types
export interface TVPlayer {
  id: string;
  nickname: string;
  avatar_url: string | null;
  score: number;
  hasAnswered: boolean;
  lastAnswerCorrect: boolean | null;
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
  joinSession: (code: string, nickname: string, avatarUrl?: string) => Promise<boolean>;
  // Host actions
  startGame: (categoryId?: string) => Promise<void>;
  startNextRound: () => Promise<void>;
  updateRoomName: (name: string) => Promise<void>;
  updateCategory: (categoryId: string, categoryName: string) => Promise<void>;
  saveRoundHistory: () => Promise<void>;
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

const QUESTION_TIME = 15; // seconds per question

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
      timerRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            // Time's up - move to reveal (only host triggers this)
            if (isHost && prev.phase === 'question') {
              supabase
                .from('tv_sessions')
                .update({ status: 'reveal' })
                .eq('id', prev.sessionId)
                .then(() => console.log('Moved to reveal phase'));
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

  // Join session (called by controller)
  const joinSession = useCallback(async (code: string, nickname: string, avatarUrl?: string): Promise<boolean> => {
    try {
      const upperCode = code.toUpperCase();
      
      // Try to find session by 6-char pairing_code first
      let { data: session, error } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('pairing_code', upperCode)
        .in('status', ['waiting', 'lobby', 'countdown', 'playing', 'reveal'])
        .single();

      // If not found, try 4-digit tv_pairing_code
      if (error || !session) {
        const { data: session4Digit, error: error4Digit } = await supabase
          .from('tv_sessions')
          .select('*')
          .eq('tv_pairing_code', upperCode)
          .in('status', ['waiting', 'lobby', 'countdown', 'playing', 'reveal'])
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

      const playerId = crypto.randomUUID();
      const isFirstPlayer = !session.host_user_id;

      // If first player, become host
      if (isFirstPlayer) {
        await supabase
          .from('tv_sessions')
          .update({ 
            host_user_id: playerId,
            is_paired: true,
            status: 'lobby'
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

      setState(prev => ({
        ...prev,
        code: code.toUpperCase(),
        sessionId: session.id,
        phase: session.status as TVPhase || 'lobby',
        questions,
        currentQuestionIndex: session.current_question_index || 0,
        categoryName: session.category_name,
        categoryIcon: session.category_icon,
      }));

      setMyPlayerId(playerId);
      setIsHost(isFirstPlayer);

      // Setup subscriptions
      setupSessionSubscription(session.id);
      setupPresenceChannel(session.id, nickname, avatarUrl || null, isFirstPlayer, false); // isTVDisplay = false

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

            // Reset answer when moving to new question
            const isNewQuestion = newData.current_question_index !== prev.currentQuestionIndex;
            if (isNewQuestion) {
              setMyAnswer(null);
            }

            // Map database status to TVPhase
            const mapStatusToPhase = (status: string): TVPhase => {
              switch (status) {
                case 'playing': return 'question';
                case 'completed': return 'results';
                default: return status as TVPhase;
              }
            };

            return {
              ...prev,
              phase: mapStatusToPhase(newData.status),
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

    // Use 'TV_DISPLAY' as key for TV, otherwise generate UUID
    const playerId = isTVDisplay ? 'TV_DISPLAY' : (myPlayerId || crypto.randomUUID());
    if (!myPlayerId && !isTVDisplay) setMyPlayerId(playerId);

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
              isHost: (rawPresence.isHost as boolean) || false,
            });
          }
        });

        // Sort by score descending
        players.sort((a, b) => b.score - a.score);

        setState(prev => ({ ...prev, players }));
        
        console.log('Presence sync - players:', players.length, players.map(p => p.nickname));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('Player left:', key);
      })
      .subscribe(async (status) => {
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
          console.log('Presence tracked:', nickname, 'isTV:', isTVDisplay);
        }
      });

    presenceChannelRef.current = channel;
  };

  // Start the game (host only)
  const startGame = useCallback(async (categoryId?: string) => {
    if (!state.sessionId || !isHost) return;

    try {
      // Fetch random questions
      let questionsQuery = supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers')
        .eq('is_active', true)
        .limit(10);

      if (categoryId) {
        questionsQuery = questionsQuery.eq('category_id', categoryId);
        
        // Also get category info
        const { data: category } = await supabase
          .from('categories')
          .select('name, icon')
          .eq('id', categoryId)
          .single();

        if (category) {
          await supabase
            .from('tv_sessions')
            .update({
              category_name: category.name,
              category_icon: category.icon,
            })
            .eq('id', state.sessionId);
        }
      }

      const { data: rawQuestions, error } = await questionsQuery;

      if (error) throw error;

      // Format questions with shuffled options
      const formattedQuestions = shuffleArray(rawQuestions || []).slice(0, 10).map(q => {
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

      // Start countdown
      await supabase
        .from('tv_sessions')
        .update({
          status: 'countdown',
          questions: formattedQuestions as unknown as Json,
          current_question_index: 0,
        })
        .eq('id', state.sessionId);

      // After 3 seconds, start first question
      setTimeout(async () => {
        await supabase
          .from('tv_sessions')
          .update({
            status: 'playing',
            question_start_time: new Date().toISOString(),
          })
          .eq('id', state.sessionId);
      }, 3000);

    } catch (error) {
      console.error('Error starting game:', error);
    }
  }, [state.sessionId, isHost]);

  // Submit answer (player)
  const submitAnswer = useCallback(async (answer: string): Promise<{ correct: boolean; points: number }> => {
    if (!state.sessionId || !myPlayerId || myAnswer) {
      return { correct: false, points: 0 };
    }

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) return { correct: false, points: 0 };

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = isCorrect ? Math.max(100, state.timeRemaining * 10) : 0;

    setMyAnswer(answer);
    const newScore = myScore + points;
    setMyScore(newScore);

    // Update presence with answer status
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.track({
        nickname: state.players.find(p => p.id === myPlayerId)?.nickname || 'Player',
        avatar_url: state.players.find(p => p.id === myPlayerId)?.avatar_url,
        score: newScore,
        hasAnswered: true,
        lastAnswerCorrect: isCorrect,
        isHost,
      });
    }

    // Record answer in database
    await supabase.from('player_answers').insert({
      tv_session_id: state.sessionId,
      room_id: state.sessionId, // Using session ID as room ID for simplicity
      user_id: myPlayerId,
      question_index: state.currentQuestionIndex,
      answer,
      is_correct: isCorrect,
      points_earned: points,
      time_remaining: state.timeRemaining,
    });

    return { correct: isCorrect, points };
  }, [state.sessionId, state.questions, state.currentQuestionIndex, state.timeRemaining, state.players, myPlayerId, myAnswer, myScore, isHost]);

  // Start next round (host only)
  const startNextRound = useCallback(async () => {
    if (!state.sessionId || !isHost) return;

    const nextIndex = state.currentQuestionIndex + 1;

    if (nextIndex >= state.questions.length) {
      // Game over
      await supabase
        .from('tv_sessions')
        .update({ status: 'results' })
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
          isHost: true,
        });
      }
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
        startNextRound,
        updateRoomName,
        updateCategory,
        saveRoundHistory,
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
