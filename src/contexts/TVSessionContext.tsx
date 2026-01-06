import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TVPlayer {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
  hasAnswered: boolean;
  lastAnswer?: string;
  lastAnswerCorrect?: boolean;
}

export interface TVQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  difficulty?: string;
}

export type TVPhase = 'pairing' | 'waiting' | 'paired' | 'countdown' | 'question' | 'playing' | 'reveal' | 'scoreboard' | 'completed';

interface TVSessionState {
  sessionId: string | null;
  pairingCode: string | null;
  roomId: string | null;
  phase: TVPhase;
  players: TVPlayer[];
  questions: TVQuestion[];
  currentQuestionIndex: number;
  questionStartTime: Date | null;
  isHost: boolean;
  hostUserId: string | null;
}

interface TVSessionContextType extends TVSessionState {
  // Host actions
  createTVSession: (roomId: string, categoryId: string) => Promise<string | null>;
  startGame: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  endGame: () => Promise<void>;
  
  // Player actions
  joinSession: (code: string) => Promise<boolean>;
  submitAnswer: (answer: string) => Promise<void>;
  
  // Shared
  leaveSession: () => Promise<void>;
  
  // Timer
  timeRemaining: number;
}

const initialState: TVSessionState = {
  sessionId: null,
  pairingCode: null,
  roomId: null,
  phase: 'pairing',
  players: [],
  questions: [],
  currentQuestionIndex: 0,
  questionStartTime: null,
  isHost: false,
  hostUserId: null,
};

const TVSessionContext = createContext<TVSessionContextType | null>(null);

const QUESTION_DURATION = 15; // seconds per question
const REVEAL_DURATION = 4; // seconds to show results

export const TVSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<TVSessionState>(initialState);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_DURATION);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Generate a random 6-digit code
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  // Create a new TV session (host only)
  const createTVSession = useCallback(async (roomId: string, categoryId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Fetch questions for this category
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, difficulty')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .eq('in_production', true)
        .limit(10);

      if (questionsError) throw questionsError;

      const formattedQuestions: TVQuestion[] = (questionsData || []).map(q => {
        const incorrectAnswers = Array.isArray(q.incorrect_answers) 
          ? q.incorrect_answers as string[] 
          : [];
        const allOptions = [q.correct_answer, ...incorrectAnswers].filter(Boolean);
        // Shuffle options
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        return {
          id: q.id,
          question_text: q.question_text,
          options: shuffledOptions,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty || undefined,
        };
      });

      if (formattedQuestions.length === 0) {
        console.error('No questions found for category');
        return null;
      }

      const code = generateCode();

      const { data, error } = await supabase
        .from('tv_sessions')
        .insert([{
          room_id: roomId,
          pairing_code: code,
          host_user_id: user.id,
          status: 'waiting',
          questions: formattedQuestions as unknown as any,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update game room
      await supabase
        .from('game_rooms')
        .update({ 
          game_mode: 'tv_show',
          tv_session_id: data.id 
        })
        .eq('id', roomId);

      setState(prev => ({
        ...prev,
        sessionId: data.id,
        pairingCode: code,
        roomId,
        phase: 'pairing',
        questions: formattedQuestions,
        isHost: true,
        hostUserId: user.id,
        players: [{
          id: user.id,
          nickname: 'Host',
          score: 0,
          hasAnswered: false,
        }],
      }));

      return code;
    } catch (error) {
      console.error('Error creating TV session:', error);
      return null;
    }
  }, [user]);

  // Join an existing session (player/guest)
  // This is used by guests scanning the QR code or entering the 6-char pairing_code
  const joinSession = useCallback(async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const upperCode = code.toUpperCase();
      
      // Find session by pairing_code (6-char guest join code)
      // This is the code displayed on TV and host's phone for guests to join
      const { data: session, error } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('pairing_code', upperCode)
        .eq('is_paired', true) // Only allow joining paired sessions
        .maybeSingle();

      if (error || !session) {
        console.error('Session not found or not yet paired:', error);
        return false;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('user_id', user.id)
        .single();

      const sessionQuestions = Array.isArray(session.questions) 
        ? session.questions as unknown as TVQuestion[]
        : [];
      
      const sessionPhase = ['waiting', 'paired', 'countdown', 'playing', 'reveal', 'completed'].includes(session.status || '')
        ? (session.status === 'playing' ? 'question' : session.status === 'completed' ? 'scoreboard' : session.status) as TVPhase
        : 'pairing';

      // Add this player to the players list
      const newPlayer: TVPlayer = {
        id: user.id,
        nickname: profile?.nickname || 'Player',
        avatar_url: profile?.avatar_url || undefined,
        score: 0,
        hasAnswered: false,
      };

      setState(prev => ({
        ...prev,
        sessionId: session.id,
        pairingCode: upperCode,
        roomId: session.room_id,
        phase: sessionPhase,
        questions: sessionQuestions,
        currentQuestionIndex: session.current_question_index || 0,
        isHost: false, // Guests joining via this code are never hosts
        hostUserId: session.host_user_id,
        players: [...prev.players.filter(p => p.id !== user.id), newPlayer],
      }));

      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      return false;
    }
  }, [user]);

  // Start the game (host only)
  const startGame = useCallback(async () => {
    if (!state.sessionId || !state.isHost) return;

    try {
      await supabase
        .from('tv_sessions')
        .update({ 
          status: 'countdown',
          current_question_index: 0,
        })
        .eq('id', state.sessionId);

      setState(prev => ({ ...prev, phase: 'countdown' }));

      // After countdown, start first question
      setTimeout(async () => {
        const startTime = new Date();
        await supabase
          .from('tv_sessions')
          .update({ 
            status: 'playing',
            question_start_time: startTime.toISOString(),
          })
          .eq('id', state.sessionId);

        setState(prev => ({ 
          ...prev, 
          phase: 'question',
          questionStartTime: startTime,
        }));
        setTimeRemaining(QUESTION_DURATION);
      }, 3000);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }, [state.sessionId, state.isHost]);

  // Submit an answer (player)
  const submitAnswer = useCallback(async (answer: string) => {
    if (!state.sessionId || !user) return;

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) return;

    const isCorrect = answer === currentQuestion.correct_answer;
    const timeBonus = Math.max(0, timeRemaining);
    const points = isCorrect ? 100 + (timeBonus * 5) : 0;

    try {
      // Insert answer into player_answers
      await supabase
        .from('player_answers')
        .insert([{
          user_id: user.id,
          room_id: state.roomId!,
          question_index: state.currentQuestionIndex,
          answer: answer,
          is_correct: isCorrect,
          time_remaining: timeRemaining,
          points_earned: points,
          tv_session_id: state.sessionId,
        }]);

      // Update local state
      setState(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.id === user.id 
            ? { 
                ...p, 
                hasAnswered: true, 
                lastAnswer: answer,
                lastAnswerCorrect: isCorrect,
                score: p.score + points,
              }
            : p
        ),
      }));
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  }, [state.sessionId, state.questions, state.currentQuestionIndex, timeRemaining, user]);

  // Next question (host only)
  const nextQuestion = useCallback(async () => {
    if (!state.sessionId || !state.isHost) return;

    const nextIndex = state.currentQuestionIndex + 1;
    const isLastQuestion = nextIndex >= state.questions.length;

    if (isLastQuestion) {
      await supabase
        .from('tv_sessions')
        .update({ status: 'completed' })
        .eq('id', state.sessionId);

      setState(prev => ({ ...prev, phase: 'scoreboard' }));
    } else {
      const startTime = new Date();
      await supabase
        .from('tv_sessions')
        .update({ 
          current_question_index: nextIndex,
          question_start_time: startTime.toISOString(),
          status: 'playing',
        })
        .eq('id', state.sessionId);

      setState(prev => ({
        ...prev,
        currentQuestionIndex: nextIndex,
        phase: 'question',
        questionStartTime: startTime,
        players: prev.players.map(p => ({ ...p, hasAnswered: false })),
      }));
      setTimeRemaining(QUESTION_DURATION);
    }
  }, [state.sessionId, state.isHost, state.currentQuestionIndex, state.questions.length]);

  // End game
  const endGame = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await supabase
        .from('tv_sessions')
        .update({ status: 'completed' })
        .eq('id', state.sessionId);

      setState(prev => ({ ...prev, phase: 'scoreboard' }));
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }, [state.sessionId]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setState(initialState);
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    if (!state.sessionId) return;

    const channel = supabase
      .channel(`tv-session-${state.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_sessions',
          filter: `id=eq.${state.sessionId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData) {
            setState(prev => ({
              ...prev,
              phase: newData.status as TVPhase,
              currentQuestionIndex: newData.current_question_index || 0,
              questionStartTime: newData.question_start_time ? new Date(newData.question_start_time) : null,
            }));

            if (newData.status === 'playing') {
              setTimeRemaining(QUESTION_DURATION);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_answers',
          filter: `tv_session_id=eq.${state.sessionId}`,
        },
        async (payload) => {
          const answer = payload.new as any;
          // Fetch the user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('user_id', answer.user_id)
            .single();

          setState(prev => {
            const existingPlayer = prev.players.find(p => p.id === answer.user_id);
            if (existingPlayer) {
              return {
                ...prev,
                players: prev.players.map(p =>
                  p.id === answer.user_id
                    ? {
                        ...p,
                        hasAnswered: true,
                        lastAnswer: answer.selected_answer,
                        lastAnswerCorrect: answer.is_correct,
                        score: p.score + (answer.points_earned || 0),
                      }
                    : p
                ),
              };
            } else {
              return {
                ...prev,
                players: [
                  ...prev.players,
                  {
                    id: answer.user_id,
                    nickname: profile?.nickname || 'Player',
                    avatar_url: profile?.avatar_url,
                    score: answer.points_earned || 0,
                    hasAnswered: true,
                    lastAnswer: answer.selected_answer,
                    lastAnswerCorrect: answer.is_correct,
                  },
                ],
              };
            }
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.sessionId]);

  // Timer logic
  useEffect(() => {
    if (state.phase === 'question' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Auto-advance to reveal when time runs out
            if (state.isHost) {
              setState(p => ({ ...p, phase: 'reveal' }));
              supabase
                .from('tv_sessions')
                .update({ status: 'reveal' })
                .eq('id', state.sessionId);
              
              // After reveal, move to next question
              setTimeout(() => {
                nextQuestion();
              }, REVEAL_DURATION * 1000);
            }
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
    }
  }, [state.phase, state.isHost, state.sessionId, nextQuestion]);

  // Check if all players answered
  useEffect(() => {
    if (state.phase === 'question' && state.players.length > 0) {
      const allAnswered = state.players.every(p => p.hasAnswered);
      if (allAnswered && state.isHost) {
        // Move to reveal phase
        setState(p => ({ ...p, phase: 'reveal' }));
        supabase
          .from('tv_sessions')
          .update({ status: 'reveal' })
          .eq('id', state.sessionId);

        // After reveal, move to next question
        setTimeout(() => {
          nextQuestion();
        }, REVEAL_DURATION * 1000);
      }
    }
  }, [state.players, state.phase, state.isHost, state.sessionId, nextQuestion]);

  const value: TVSessionContextType = {
    ...state,
    timeRemaining,
    createTVSession,
    joinSession,
    startGame,
    submitAnswer,
    nextQuestion,
    endGame,
    leaveSession,
  };

  return (
    <TVSessionContext.Provider value={value}>
      {children}
    </TVSessionContext.Provider>
  );
};

export const useTVSession = () => {
  const context = useContext(TVSessionContext);
  if (!context) {
    throw new Error('useTVSession must be used within a TVSessionProvider');
  }
  return context;
};
