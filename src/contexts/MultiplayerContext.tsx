import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { GameRoom, RoomParticipant, RoomStatus, useGameRoom } from "@/hooks/useGameRoom";
import { useRoomParticipants } from "@/hooks/useRoomParticipants";
import { TriviaQuestion } from "@/hooks/useTrivia";
import { toast } from "sonner";

export type MultiplayerPhase = 
  | "idle" 
  | "creating" 
  | "joining" 
  | "lobby" 
  | "countdown" 
  | "playing" 
  | "question-result" 
  | "waiting-for-opponent"
  | "match-result"
  | "async-result";

export interface PlayerAnswer {
  id: string;
  room_id: string;
  user_id: string;
  question_index: number;
  answer: string;
  is_correct: boolean;
  time_remaining: number;
  points_earned: number;
  answered_at: string;
}

interface MultiplayerState {
  phase: MultiplayerPhase;
  room: GameRoom | null;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  myScore: number;
  lastAnswerCorrect: boolean | null;
  lastPointsEarned: number;
  timePerQuestion: number;
  // Multi-player: track all opponent answers for current question
  opponentAnswers: Record<string, PlayerAnswer>;
  // Async challenge info
  asyncChallengerInfo: {
    nickname: string;
    avatar: string | null;
    score: number | null;
  } | null;
  asyncOpponentCompleted: boolean;
}

interface MultiplayerContextType extends MultiplayerState {
  // Room management
  participants: RoomParticipant[];
  allReady: boolean;
  isHost: boolean;
  loading: boolean;
  
  // Actions
  createRoom: (categoryId?: string, categoryName?: string) => Promise<void>;
  createChallengeRoom: (friendId: string, categoryId: string, categoryName: string, isOnline: boolean) => Promise<boolean>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  startGameSolo: () => Promise<void>;
  submitAnswer: (answer: string, timeRemaining: number) => Promise<void>;
  nextQuestion: () => void;
  resetMultiplayer: () => void;
  
  // Modal control
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  showJoinModal: boolean;
  setShowJoinModal: (show: boolean) => void;
}

const initialState: MultiplayerState = {
  phase: "idle",
  room: null,
  questions: [],
  currentQuestionIndex: 0,
  myScore: 0,
  lastAnswerCorrect: null,
  lastPointsEarned: 0,
  timePerQuestion: 15,
  opponentAnswers: {},
  asyncChallengerInfo: null,
  asyncOpponentCompleted: false,
};

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [state, setState] = useState<MultiplayerState>(initialState);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const {
    loading,
    currentRoom,
    setCurrentRoom,
    createRoom: createRoomHook,
    joinRoom: joinRoomHook,
    leaveRoom: leaveRoomHook,
    updateRoomStatus,
    setParticipantReady,
  } = useGameRoom();

  const { 
    participants, 
    allReady, 
    hostParticipant,
  } = useRoomParticipants(currentRoom?.id || null);

  const isHost = currentRoom?.host_user_id === user?.id;

  // Sync room to state
  useEffect(() => {
    if (currentRoom) {
      setState(prev => ({ ...prev, room: currentRoom }));
    }
  }, [currentRoom]);

  // Subscribe to room status changes
  useEffect(() => {
    if (!currentRoom?.id) return;

    const channel = supabase
      .channel(`room-status-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${currentRoom.id}`,
        },
        async (payload) => {
          const updated = payload.new as GameRoom;
          setCurrentRoom(updated);
          
          // Handle status transitions
          if (updated.status === "playing") {
            // Non-host needs to fetch questions when game starts
            if (!isHost && state.questions.length === 0) {
              const { data: roomQuestions } = await supabase
                .from("room_questions")
                .select("*")
                .eq("room_id", currentRoom.id)
                .order("question_index", { ascending: true });

              if (roomQuestions && roomQuestions.length > 0) {
                const questions: TriviaQuestion[] = roomQuestions.map((q: any) => ({
                  id: `${currentRoom.id}-${q.question_index}`,
                  question: q.question_text,
                  correctAnswer: q.correct_answer,
                  incorrectAnswers: q.incorrect_answers,
                  allAnswers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
                  difficulty: q.difficulty || "medium",
                  category: updated.category_name || "ზოგადი ცოდნა",
                }));

                setState(prev => ({
                  ...prev,
                  questions,
                  currentQuestionIndex: 0,
                  myScore: 0,
                  opponentScore: 0,
                  phase: "playing",
                }));
              }
            } else if (state.phase === "countdown") {
              setState(prev => ({ ...prev, phase: "playing" }));
            }
          } else if (updated.status === "cancelled") {
            toast.info("ოთახი დაიხურა");
            resetMultiplayer();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id, state.phase, state.questions.length, isHost]);

  // Subscribe to room questions being added (for non-host to enter countdown)
  useEffect(() => {
    if (!currentRoom?.id || isHost || state.phase !== "lobby") return;

    const channel = supabase
      .channel(`room-questions-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_questions",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        () => {
          // Questions are being added - game is starting
          if (state.phase === "lobby") {
            setState(prev => ({ ...prev, phase: "countdown" }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id, isHost, state.phase]);

  // Subscribe to all player answers (multi-player support)
  useEffect(() => {
    if (!currentRoom?.id || (state.phase !== "playing" && state.phase !== "question-result")) return;

    const channel = supabase
      .channel(`player-answers-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_answers",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        (payload) => {
          const answer = payload.new as PlayerAnswer;
          // Track all players' answers (except own)
          if (answer.user_id !== user?.id && answer.question_index === state.currentQuestionIndex) {
            setState(prev => ({
              ...prev,
              opponentAnswers: {
                ...prev.opponentAnswers,
                [answer.user_id]: answer,
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id, state.phase, state.currentQuestionIndex, user?.id]);

  // Watch for all players to finish when we're waiting
  useEffect(() => {
    if (state.phase !== "waiting-for-opponent") return;
    
    // Check if all other players have finished
    const otherPlayers = participants.filter(p => p.user_id !== user?.id);
    const allOthersFinished = otherPlayers.length > 0 && otherPlayers.every(p => p.status === "finished");
    
    if (allOthersFinished) {
      // All players finished - now we can show results
      if (currentRoom) {
        updateRoomStatus(currentRoom.id, "completed");
      }
      
      // Use database scores as single source of truth
      const myParticipant = participants.find(p => p.user_id === user?.id);
      setState(prev => ({ 
        ...prev, 
        phase: "match-result",
        myScore: myParticipant?.score || prev.myScore,
      }));
    }
  }, [state.phase, participants, user?.id, currentRoom, updateRoomStatus]);

  // Subscribe to async challenge completion (when opponent finishes their game)
  useEffect(() => {
    if (state.phase !== "async-result" || !currentRoom?.id || state.asyncOpponentCompleted) return;
    
    const isChallenger = currentRoom?.host_user_id === user?.id;
    const opponentId = isChallenger ? currentRoom?.challenged_user_id : currentRoom?.host_user_id;
    
    if (!opponentId) return;

    // Subscribe to room_participants changes to detect when opponent finishes
    const channel = supabase
      .channel(`async-completion-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        async (payload) => {
          const updated = payload.new as RoomParticipant;
          
          // Check if this is the opponent finishing
          if (updated.user_id === opponentId && updated.status === "finished") {
            // Fetch opponent profile for display
            const { data: opponentProfile } = await supabase
              .from("profiles")
              .select("nickname, avatar_url")
              .eq("user_id", opponentId)
              .single();
            
            setState(prev => ({
              ...prev,
              asyncOpponentCompleted: true,
              asyncChallengerInfo: {
                nickname: opponentProfile?.nickname || "მოწინააღმდეგე",
                avatar: opponentProfile?.avatar_url || null,
                score: updated.score,
              },
            }));
            
            // Show toast notification
            toast.success(`${opponentProfile?.nickname || "მეგობარმა"} დაასრულა თამაში!`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.phase, currentRoom?.id, currentRoom?.host_user_id, currentRoom?.challenged_user_id, state.asyncOpponentCompleted, user?.id]);

  const createRoom = useCallback(async (categoryId?: string, categoryName?: string) => {
    setState(prev => ({ ...prev, phase: "creating" }));
    
    const room = await createRoomHook(categoryId, categoryName);
    
    if (room) {
      setState(prev => ({ 
        ...prev, 
        phase: "lobby",
        room,
      }));
      setShowCreateModal(false);
    } else {
      setState(prev => ({ ...prev, phase: "idle" }));
    }
  }, [createRoomHook]);

  const createChallengeRoom = useCallback(async (
    friendId: string, 
    categoryId: string, 
    categoryName: string, 
    isOnline: boolean
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, phase: "creating" }));
    
    try {
      const { data: codeData } = await supabase.rpc("generate_room_code");
      const roomCode = codeData || Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({
          host_user_id: user!.id,
          room_code: roomCode,
          category_id: categoryId,
          category_name: categoryName,
          game_type: isOnline ? "realtime" : "async",
          challenged_user_id: friendId,
          challenge_expires_at: isOnline ? null : expiresAt.toISOString(),
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: user!.id,
        nickname: profile?.nickname || "Player",
        avatar_url: profile?.avatar_url,
        country_code: profile?.country_code,
        is_host: true,
        status: "ready",
      });

      setCurrentRoom(room);
      setState(prev => ({ ...prev, phase: "lobby", room }));
      toast.success(isOnline ? "ოთახი შეიქმნა!" : "გამოწვევა გაიგზავნა!");
      return true;
    } catch (error) {
      console.error("Error creating challenge room:", error);
      toast.error("ოთახის შექმნა ვერ მოხერხდა");
      setState(prev => ({ ...prev, phase: "idle" }));
      return false;
    }
  }, [user, profile, setCurrentRoom]);

  const joinRoom = useCallback(async (code: string) => {
    setState(prev => ({ ...prev, phase: "joining" }));
    
    const room = await joinRoomHook(code);
    
    if (room) {
      setState(prev => ({ 
        ...prev, 
        phase: "lobby",
        room,
      }));
      setShowJoinModal(false);
    } else {
      setState(prev => ({ ...prev, phase: "idle" }));
    }
  }, [joinRoomHook]);

  const leaveRoom = useCallback(async () => {
    if (currentRoom) {
      await leaveRoomHook(currentRoom.id);
    }
    resetMultiplayer();
  }, [currentRoom, leaveRoomHook]);

  const setReady = useCallback(async (ready: boolean) => {
    if (!currentRoom) return;
    await setParticipantReady(currentRoom.id, ready);
  }, [currentRoom, setParticipantReady]);

  const startGame = useCallback(async () => {
    if (!currentRoom || !isHost) return;

    setState(prev => ({ ...prev, phase: "countdown" }));
    
    // Auto-set all participants to ready when game starts
    await supabase
      .from("room_participants")
      .update({ status: "ready" })
      .eq("room_id", currentRoom.id);

    // Generate questions
    try {
      const response = await supabase.functions.invoke("generate-category-trivia", {
        body: { 
          category: currentRoom.category_name || "ზოგადი ცოდნა",
          count: currentRoom.total_questions,
        },
      });

      if (response.error) throw response.error;

      const questions: TriviaQuestion[] = response.data.questions.map((q: any, index: number) => ({
        id: `${currentRoom.id}-${index}`,
        question: q.question,
        correctAnswer: q.correct_answer,
        incorrectAnswers: q.incorrect_answers,
        allAnswers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
        difficulty: q.difficulty || "medium",
        category: currentRoom.category_name || "ზოგადი ცოდნა",
      }));

      // Store questions in database for sync
      for (let i = 0; i < questions.length; i++) {
        await supabase.from("room_questions").insert({
          room_id: currentRoom.id,
          question_index: i,
          question_text: questions[i].question,
          correct_answer: questions[i].correctAnswer,
          incorrect_answers: questions[i].incorrectAnswers,
          difficulty: questions[i].difficulty,
        });
      }

      setState(prev => ({
        ...prev,
        questions,
        currentQuestionIndex: 0,
        myScore: 0,
        opponentScore: 0,
      }));

      // Update room status after countdown
      setTimeout(async () => {
        await updateRoomStatus(currentRoom.id, "playing");
        setState(prev => ({ ...prev, phase: "playing" }));
      }, 4000); // 3-2-1-GO countdown

    } catch (error) {
      console.error("Failed to generate questions:", error);
      toast.error("კითხვების გენერირება ვერ მოხერხდა");
      setState(prev => ({ ...prev, phase: "lobby" }));
    }
  }, [currentRoom, isHost, allReady, updateRoomStatus]);

  // Start game solo - converts to async challenge for friends to play later
  const startGameSolo = useCallback(async () => {
    if (!currentRoom || !isHost) return;

    setState(prev => ({ ...prev, phase: "countdown" }));

    try {
      // First, convert the room to async challenge with expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      await supabase
        .from("game_rooms")
        .update({ 
          game_type: "async",
          challenge_expires_at: expiresAt.toISOString(),
        })
        .eq("id", currentRoom.id);

      // Generate questions
      const response = await supabase.functions.invoke("generate-category-trivia", {
        body: { 
          category: currentRoom.category_name || "ზოგადი ცოდნა",
          count: currentRoom.total_questions,
        },
      });

      if (response.error) throw response.error;

      const questions: TriviaQuestion[] = response.data.questions.map((q: any, index: number) => ({
        id: `${currentRoom.id}-${index}`,
        question: q.question,
        correctAnswer: q.correct_answer,
        incorrectAnswers: q.incorrect_answers,
        allAnswers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
        difficulty: q.difficulty || "medium",
        category: currentRoom.category_name || "ზოგადი ცოდნა",
      }));

      // Store questions in database for the challenged user to play later
      for (let i = 0; i < questions.length; i++) {
        await supabase.from("room_questions").insert({
          room_id: currentRoom.id,
          question_index: i,
          question_text: questions[i].question,
          correct_answer: questions[i].correctAnswer,
          incorrect_answers: questions[i].incorrectAnswers,
          difficulty: questions[i].difficulty,
        });
      }

      setState(prev => ({
        ...prev,
        questions,
        currentQuestionIndex: 0,
        myScore: 0,
      }));

      // Update room status after countdown
      setTimeout(async () => {
        await updateRoomStatus(currentRoom.id, "playing");
        setState(prev => ({ ...prev, phase: "playing" }));
      }, 4000); // 3-2-1-GO countdown

      toast.success("მეგობარი მოგვიანებით ითამაშებს!");
    } catch (error) {
      console.error("Failed to start solo game:", error);
      toast.error("თამაშის დაწყება ვერ მოხერხდა");
      setState(prev => ({ ...prev, phase: "lobby" }));
    }
  }, [currentRoom, isHost, updateRoomStatus]);

  const submitAnswer = useCallback(async (answer: string, timeRemaining: number) => {
    if (!currentRoom || !user) return;

    const question = state.questions[state.currentQuestionIndex];
    if (!question) return;

    const isCorrect = answer === question.correctAnswer;
    const basePoints = isCorrect ? 100 : 0;
    const timeBonus = isCorrect ? Math.floor(timeRemaining * 10) : 0;
    const points = basePoints + timeBonus;

    // Save answer
    await supabase.from("player_answers").insert({
      room_id: currentRoom.id,
      user_id: user.id,
      question_index: state.currentQuestionIndex,
      answer,
      is_correct: isCorrect,
      time_remaining: timeRemaining,
      points_earned: points,
    });

    // Update participant score
    const currentParticipant = participants.find(p => p.user_id === user.id);
    if (currentParticipant) {
      await supabase
        .from("room_participants")
        .update({ 
          score: (currentParticipant.score || 0) + points,
          current_question: state.currentQuestionIndex + 1,
        })
        .eq("id", currentParticipant.id);
    }

    setState(prev => ({
      ...prev,
      phase: "question-result",
      lastAnswerCorrect: isCorrect,
      lastPointsEarned: points,
      myScore: prev.myScore + points,
    }));
  }, [currentRoom, user, state.questions, state.currentQuestionIndex, participants]);

  const nextQuestion = useCallback(async () => {
    const nextIndex = state.currentQuestionIndex + 1;
    
    if (nextIndex >= state.questions.length) {
      // Mark this player as finished in the database
      const currentParticipant = participants.find(p => p.user_id === user?.id);
      if (currentParticipant) {
        await supabase
          .from("room_participants")
          .update({ status: "finished" })
          .eq("id", currentParticipant.id);
      }
      
      // Check if this is an async game
      const isAsyncGame = currentRoom?.game_type === "async";
      
      if (isAsyncGame) {
        // For async games, mark challenger as completed and show async result screen
        const isChallenger = currentRoom?.host_user_id === user?.id;
        
        if (isChallenger) {
          // Update challenger_completed_at timestamp
          await supabase
            .from("game_rooms")
            .update({ challenger_completed_at: new Date().toISOString() })
            .eq("id", currentRoom?.id);
        } else {
          // Challenged user completed - mark room as completed
          await supabase
            .from("game_rooms")
            .update({ 
              status: "completed" as const,
              completed_at: new Date().toISOString() 
            })
            .eq("id", currentRoom?.id);
        }
        
        // Fetch opponent info for async result
        const opponentId = isChallenger ? currentRoom?.challenged_user_id : currentRoom?.host_user_id;
        let asyncChallengerInfo = null;
        let asyncOpponentCompleted = false;
        
        if (opponentId) {
          const { data: opponentProfile } = await supabase
            .from("profiles")
            .select("nickname, avatar_url")
            .eq("user_id", opponentId)
            .single();
          
          // Check if opponent has played (check room_participants)
          const { data: opponentParticipant } = await supabase
            .from("room_participants")
            .select("score, status")
            .eq("room_id", currentRoom?.id)
            .eq("user_id", opponentId)
            .single();
          
          asyncChallengerInfo = {
            nickname: opponentProfile?.nickname || "მოწინააღმდეგე",
            avatar: opponentProfile?.avatar_url || null,
            score: opponentParticipant?.status === "finished" ? opponentParticipant.score : null,
          };
          
          asyncOpponentCompleted = opponentParticipant?.status === "finished";
        }
        
        setState(prev => ({ 
          ...prev, 
          phase: "async-result",
          asyncChallengerInfo,
          asyncOpponentCompleted,
        }));
        return;
      }
      
      // Check if all other players have also finished (realtime games)
      // Refetch participants to get latest status
      const { data: latestParticipants } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", currentRoom?.id);
      
      const otherPlayers = (latestParticipants || []).filter(p => p.user_id !== user?.id);
      const allOthersFinished = otherPlayers.length === 0 || otherPlayers.every(p => p.status === "finished");
      
      if (allOthersFinished) {
        // All finished - go to result
        if (currentRoom) {
          await updateRoomStatus(currentRoom.id, "completed");
        }
        setState(prev => ({ ...prev, phase: "match-result" }));
      } else {
        // Wait for other players
        setState(prev => ({ ...prev, phase: "waiting-for-opponent" }));
      }
    } else {
      setState(prev => ({
        ...prev,
        phase: "playing",
        currentQuestionIndex: nextIndex,
        lastAnswerCorrect: null,
        lastPointsEarned: 0,
        opponentAnswers: {}, // Reset opponent answers for new question
      }));
    }
  }, [state.currentQuestionIndex, state.questions.length, currentRoom, updateRoomStatus, participants, user?.id]);

  const resetMultiplayer = useCallback(() => {
    setState(initialState);
    setCurrentRoom(null);
  }, [setCurrentRoom]);

  return (
    <MultiplayerContext.Provider
      value={{
        ...state,
        participants,
        allReady,
        isHost,
        loading,
        createRoom,
        createChallengeRoom,
        joinRoom,
        leaveRoom,
        setReady,
        startGame,
        startGameSolo,
        submitAnswer,
        nextQuestion,
        resetMultiplayer,
        showCreateModal,
        setShowCreateModal,
        showJoinModal,
        setShowJoinModal,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
}
