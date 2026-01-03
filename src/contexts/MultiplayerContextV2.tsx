import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { TriviaQuestion } from "@/hooks/useTrivia";
import { toast } from "sonner";

// Simplified 4-phase system
export type GamePhase = "idle" | "lobby" | "playing" | "results";

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  is_host: boolean;
  score: number;
  current_question: number;
  total_rounds_played: number;
  total_wins: number;
  joined_at: string;
  last_played_at: string | null;
  has_seen_results: boolean;
}

export interface GameRoom {
  id: string;
  room_code: string;
  room_name: string | null;
  host_user_id: string;
  category_id: string | null;
  category_name: string | null;
  status: "waiting" | "ready" | "playing" | "completed" | "cancelled";
  max_players: number;
  min_players: number;
  total_questions: number;
  is_permanent: boolean;
  current_game_id: string | null;
  created_at: string;
}

export interface RoomGame {
  id: string;
  room_id: string;
  game_number: number;
  started_at: string;
  completed_at: string | null;
  winner_user_id: string | null;
  player_scores: unknown; // JSON type from database
}

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
  phase: GamePhase;
  currentRoom: GameRoom | null;
  currentGame: RoomGame | null;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  myScore: number;
  lastQuestionResult: { correct: boolean; points: number } | null;
  timePerQuestion: number;
  opponentAnswers: Record<string, PlayerAnswer>;
}

interface MultiplayerContextType extends MultiplayerState {
  participants: RoomParticipant[];
  isHost: boolean;
  loading: boolean;
  
  // Actions
  createRoom: (categoryId?: string, categoryName?: string) => Promise<GameRoom | null>;
  enterRoom: (roomCode: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  submitAnswer: (answer: string, timeRemaining: number) => Promise<void>;
  nextQuestion: () => void;
  exitRoom: () => void;
  leaveRoomPermanently: () => Promise<void>;
  deleteRoom: () => Promise<void>;
  resetMultiplayer: () => void;
  
  // Modals
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  showJoinModal: boolean;
  setShowJoinModal: (show: boolean) => void;
}

const initialState: MultiplayerState = {
  phase: "idle",
  currentRoom: null,
  currentGame: null,
  questions: [],
  currentQuestionIndex: 0,
  myScore: 0,
  lastQuestionResult: null,
  timePerQuestion: 15,
  opponentAnswers: {},
};

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

// Production domain for share links
const PRODUCTION_DOMAIN = "https://mytrivia.io";

export function MultiplayerProviderV2({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [state, setState] = useState<MultiplayerState>(initialState);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const isHost = state.currentRoom?.host_user_id === user?.id;

  // Cleanup channels
  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  // Fetch participants for current room
  const fetchParticipants = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    
    if (!error && data) {
      setParticipants(data as RoomParticipant[]);
    }
  }, []);

  // Subscribe to room changes
  useEffect(() => {
    if (!state.currentRoom?.id) return;
    
    const roomId = state.currentRoom.id;
    
    // Subscribe to room updates
    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` },
        async (payload) => {
          const updated = payload.new as GameRoom;
          setState(prev => ({ ...prev, currentRoom: updated }));
          
          // Handle status changes
          if (updated.status === "playing" && state.phase === "lobby") {
            // Non-host: fetch questions when game starts
            if (!isHost) {
              const { data: roomQuestions } = await supabase
                .from("room_questions")
                .select("*")
                .eq("room_id", roomId)
                .order("question_index", { ascending: true });
              
              if (roomQuestions && roomQuestions.length > 0) {
                const questions: TriviaQuestion[] = roomQuestions.map((q: any) => ({
                  id: `${roomId}-${q.question_index}`,
                  question: q.question_text,
                  correctAnswer: q.correct_answer,
                  incorrectAnswers: q.incorrect_answers,
                  allAnswers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
                  difficulty: q.difficulty || "medium",
                  category: updated.category_name || "General",
                }));
                
                setState(prev => ({
                  ...prev,
                  questions,
                  currentQuestionIndex: 0,
                  myScore: 0,
                  phase: "playing",
                }));
              }
            }
          } else if (updated.status === "completed") {
            setState(prev => ({ ...prev, phase: "results" }));
          } else if (updated.status === "cancelled") {
            toast.info("Room was closed");
            setState(initialState);
            cleanupChannels();
          }
        }
      )
      .subscribe();
    
    // Subscribe to participants
    const participantsChannel = supabase
      .channel(`participants-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
        () => fetchParticipants(roomId)
      )
      .subscribe();
    
    // Subscribe to player answers during game
    const answersChannel = supabase
      .channel(`answers-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "player_answers", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const answer = payload.new as PlayerAnswer;
          if (answer.user_id !== user?.id && answer.question_index === state.currentQuestionIndex) {
            setState(prev => ({
              ...prev,
              opponentAnswers: { ...prev.opponentAnswers, [answer.user_id]: answer },
            }));
          }
        }
      )
      .subscribe();
    
    channelsRef.current = [roomChannel, participantsChannel, answersChannel];
    
    // Initial fetch
    fetchParticipants(roomId);
    
    return () => cleanupChannels();
  }, [state.currentRoom?.id, state.phase, state.currentQuestionIndex, isHost, user?.id, fetchParticipants, cleanupChannels]);

  // Generate room code
  const generateRoomCode = async (): Promise<string> => {
    const { data } = await supabase.rpc("generate_room_code");
    return data || Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Create room
  const createRoom = useCallback(async (categoryId?: string, categoryName?: string): Promise<GameRoom | null> => {
    if (!user || !profile) {
      toast.error("Please login first");
      return null;
    }
    
    setLoading(true);
    try {
      const roomCode = await generateRoomCode();
      
      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({
          host_user_id: user.id,
          room_code: roomCode,
          category_id: categoryId,
          category_name: categoryName,
          status: "waiting",
          is_permanent: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add host as participant
      await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: user.id,
        nickname: profile.nickname || "Player",
        avatar_url: profile.avatar_url,
        country_code: profile.country_code,
        is_host: true,
      });
      
      setState(prev => ({ ...prev, phase: "lobby", currentRoom: room as GameRoom }));
      setShowCreateModal(false);
      toast.success("Room created!");
      
      return room as GameRoom;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // Enter room (join or re-enter)
  const enterRoom = useCallback(async (roomCode: string): Promise<boolean> => {
    if (!user || !profile) {
      toast.error("Please login first");
      return false;
    }
    
    setLoading(true);
    try {
      // Find room
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", roomCode.toUpperCase())
        .single();
      
      if (roomError || !room) {
        toast.error("Room not found");
        return false;
      }
      
      if (room.status === "cancelled") {
        toast.error("This room was closed");
        return false;
      }
      
      // Check if already participant
      const { data: existing } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .single();
      
      if (existing) {
        // Re-entering - determine phase based on room status
        let newPhase: GamePhase = "lobby";
        if (room.status === "playing") {
          newPhase = "playing";
        } else if (room.status === "completed") {
          newPhase = "results";
        }
        
        // If game is playing, load the questions
        if (newPhase === "playing") {
          const { data: roomQuestions } = await supabase
            .from("room_questions")
            .select("*")
            .eq("room_id", room.id)
            .order("question_index", { ascending: true });
          
          if (roomQuestions && roomQuestions.length > 0) {
            const questions: TriviaQuestion[] = roomQuestions.map((q: any) => ({
              id: `${room.id}-${q.question_index}`,
              question: q.question_text,
              correctAnswer: q.correct_answer,
              incorrectAnswers: q.incorrect_answers,
              allAnswers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
              difficulty: q.difficulty || "medium",
              category: room.category_name || "General",
            }));
            
            // Get current progress from participant
            const currentQuestion = existing.current_question || 0;
            
            setState(prev => ({
              ...prev,
              phase: "playing",
              currentRoom: room as GameRoom,
              questions,
              currentQuestionIndex: currentQuestion,
              myScore: existing.score || 0,
            }));
          } else {
            // No questions yet, go to lobby
            setState(prev => ({
              ...prev,
              phase: "lobby",
              currentRoom: room as GameRoom,
            }));
          }
        } else {
          setState(prev => ({
            ...prev,
            phase: newPhase,
            currentRoom: room as GameRoom,
          }));
        }
      } else {
        // New participant
        const { data: participantCount } = await supabase
          .from("room_participants")
          .select("id", { count: "exact" })
          .eq("room_id", room.id);
        
        if ((participantCount?.length || 0) >= room.max_players) {
          toast.error("Room is full");
          return false;
        }
        
        await supabase.from("room_participants").insert({
          room_id: room.id,
          user_id: user.id,
          nickname: profile.nickname || "Player",
          avatar_url: profile.avatar_url,
          country_code: profile.country_code,
          is_host: false,
        });
        
        setState(prev => ({ ...prev, phase: "lobby", currentRoom: room as GameRoom }));
      }
      
      setShowJoinModal(false);
      return true;
    } catch (error) {
      console.error("Error entering room:", error);
      toast.error("Failed to join room");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // Start game (host only)
  const startGame = useCallback(async () => {
    if (!state.currentRoom || !isHost) return;
    
    const roomId = state.currentRoom.id;
    const questionCount = state.currentRoom.total_questions || 5;
    
    try {
      // Fetch random questions from database based on category
      let questionsQuery = supabase
        .from("questions")
        .select("id, question_text, correct_answer, incorrect_answers, difficulty, category_id")
        .eq("is_active", true);
      
      // If category is specified, try to match by category_id or get mixed
      if (state.currentRoom.category_id) {
        // First try to get questions from the specific category
        const { data: categoryQuestions, error: catError } = await supabase
          .from("questions")
          .select("id, question_text, correct_answer, incorrect_answers, difficulty, category_id")
          .eq("is_active", true)
          .eq("category_id", state.currentRoom.category_id);
        
        if (!catError && categoryQuestions && categoryQuestions.length >= questionCount) {
          // Shuffle and pick random questions from this category
          const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
          const selectedQuestions = shuffled.slice(0, questionCount);
          
          const questions: TriviaQuestion[] = selectedQuestions.map((q, index) => ({
            id: `${roomId}-${index}`,
            question: q.question_text,
            correctAnswer: q.correct_answer,
            incorrectAnswers: q.incorrect_answers as string[],
            allAnswers: [...(q.incorrect_answers as string[]), q.correct_answer].sort(() => Math.random() - 0.5),
            difficulty: (q.difficulty || "medium") as "easy" | "medium" | "hard",
            category: state.currentRoom!.category_name || "General",
          }));
        }
      }
      
      // Fallback: get random questions from entire library
      const { data: allQuestions, error: allError } = await supabase
        .from("questions")
        .select("id, question_text, correct_answer, incorrect_answers, difficulty, category_id")
        .eq("is_active", true);
      
      if (allError || !allQuestions || allQuestions.length === 0) {
        throw new Error("No questions available in database");
      }
      
      // Shuffle and pick random questions
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, questionCount);
      
      const questions: TriviaQuestion[] = selectedQuestions.map((q, index) => ({
        id: `${roomId}-${index}`,
        question: q.question_text,
        correctAnswer: q.correct_answer,
        incorrectAnswers: q.incorrect_answers as string[],
        allAnswers: [...(q.incorrect_answers as string[]), q.correct_answer].sort(() => Math.random() - 0.5),
        difficulty: (q.difficulty || "medium") as "easy" | "medium" | "hard",
        category: state.currentRoom!.category_name || "General",
      }));
      
      await saveQuestionsAndStartGame(roomId, questions);
      
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game");
    }
  }, [state.currentRoom, isHost]);

  // Helper to save questions and update room status
  const saveQuestionsAndStartGame = useCallback(async (roomId: string, questions: TriviaQuestion[]) => {
    // Clear old questions/answers
    await supabase.from("room_questions").delete().eq("room_id", roomId);
    await supabase.from("player_answers").delete().eq("room_id", roomId);
    
    // Store questions in parallel
    await Promise.all(questions.map((q, index) => 
      supabase.from("room_questions").insert({
        room_id: roomId,
        question_index: index,
        question_text: q.question,
        correct_answer: q.correctAnswer,
        incorrect_answers: q.incorrectAnswers,
        difficulty: q.difficulty,
      })
    ));
    
    // Reset all participants scores
    await supabase
      .from("room_participants")
      .update({ score: 0, current_question: 0 })
      .eq("room_id", roomId);
    
    // Create room_game record
    const { data: game } = await supabase
      .from("room_games")
      .insert([{
        room_id: roomId,
        game_number: 1,
        questions_data: JSON.parse(JSON.stringify(questions)),
      }])
      .select()
      .single();
    
    // Update room status
    await supabase
      .from("game_rooms")
      .update({
        status: "playing",
        started_at: new Date().toISOString(),
        current_game_id: game?.id,
      })
      .eq("id", roomId);
    
    setState(prev => ({
      ...prev,
      questions,
      currentQuestionIndex: 0,
      myScore: 0,
      currentGame: game ? {
        id: game.id,
        room_id: game.room_id,
        game_number: game.game_number,
        started_at: game.started_at,
        completed_at: game.completed_at,
        winner_user_id: game.winner_user_id,
        player_scores: game.player_scores,
      } : null,
      phase: "playing",
    }));
  }, []);

  // Submit answer
  const submitAnswer = useCallback(async (answer: string, timeRemaining: number) => {
    if (!state.currentRoom || !user) return;
    
    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) return;
    
    const isCorrect = answer === currentQuestion.correctAnswer;
    const points = isCorrect ? Math.round(100 + timeRemaining * 10) : 0;
    
    // Save answer
    await supabase.from("player_answers").insert({
      room_id: state.currentRoom.id,
      user_id: user.id,
      question_index: state.currentQuestionIndex,
      answer,
      is_correct: isCorrect,
      time_remaining: timeRemaining,
      points_earned: points,
    });
    
    // Update participant score
    const newScore = state.myScore + points;
    await supabase
      .from("room_participants")
      .update({ score: newScore, current_question: state.currentQuestionIndex + 1 })
      .eq("room_id", state.currentRoom.id)
      .eq("user_id", user.id);
    
    setState(prev => ({
      ...prev,
      myScore: newScore,
      lastQuestionResult: { correct: isCorrect, points },
    }));
  }, [state.currentRoom, state.questions, state.currentQuestionIndex, state.myScore, user]);

  // Next question
  const nextQuestion = useCallback(() => {
    const isLastQuestion = state.currentQuestionIndex >= state.questions.length - 1;
    
    if (isLastQuestion) {
      // Mark game as completed
      if (state.currentRoom && isHost) {
        supabase
          .from("game_rooms")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", state.currentRoom.id);
      }
      
      setState(prev => ({ ...prev, phase: "results" }));
    } else {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        lastQuestionResult: null,
        opponentAnswers: {},
      }));
    }
  }, [state.currentQuestionIndex, state.questions.length, state.currentRoom, isHost]);

  // Exit room (UI only - stay as participant)
  const exitRoom = useCallback(() => {
    cleanupChannels();
    setState(initialState);
  }, [cleanupChannels]);

  // Leave room permanently
  const leaveRoomPermanently = useCallback(async () => {
    if (!state.currentRoom || !user) return;
    
    try {
      await supabase
        .from("room_participants")
        .delete()
        .eq("room_id", state.currentRoom.id)
        .eq("user_id", user.id);
      
      // If host leaving, transfer or delete
      if (isHost && participants.length > 1) {
        const newHost = participants.find(p => p.user_id !== user.id);
        if (newHost) {
          await supabase
            .from("game_rooms")
            .update({ host_user_id: newHost.user_id })
            .eq("id", state.currentRoom.id);
          
          await supabase
            .from("room_participants")
            .update({ is_host: true })
            .eq("id", newHost.id);
        }
      } else if (isHost && participants.length === 1) {
        await supabase
          .from("game_rooms")
          .update({ status: "cancelled" })
          .eq("id", state.currentRoom.id);
      }
      
      cleanupChannels();
      setState(initialState);
      toast.success("Left room");
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error("Failed to leave room");
    }
  }, [state.currentRoom, user, isHost, participants, cleanupChannels]);

  // Delete room (host only)
  const deleteRoom = useCallback(async () => {
    if (!state.currentRoom || !isHost) return;
    
    try {
      await supabase
        .from("game_rooms")
        .delete()
        .eq("id", state.currentRoom.id);
      
      cleanupChannels();
      setState(initialState);
      toast.success("Room deleted");
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    }
  }, [state.currentRoom, isHost, cleanupChannels]);

  // Reset multiplayer
  const resetMultiplayer = useCallback(() => {
    cleanupChannels();
    setState(initialState);
    setParticipants([]);
  }, [cleanupChannels]);

  // Get share link
  const getShareLink = useCallback((roomCode: string) => {
    // Use production domain or fallback to current origin
    const domain = window.location.hostname === "localhost" 
      ? window.location.origin 
      : PRODUCTION_DOMAIN;
    return `${domain}/room/${roomCode}`;
  }, []);

  const value: MultiplayerContextType = {
    ...state,
    participants,
    isHost,
    loading,
    createRoom,
    enterRoom,
    startGame,
    submitAnswer,
    nextQuestion,
    exitRoom,
    leaveRoomPermanently,
    deleteRoom,
    resetMultiplayer,
    showCreateModal,
    setShowCreateModal,
    showJoinModal,
    setShowJoinModal,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayerV2() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayerV2 must be used within MultiplayerProviderV2");
  }
  return context;
}

// Helper to get share link
export function getShareLink(roomCode: string) {
  const domain = window.location.hostname === "localhost" 
    ? window.location.origin 
    : PRODUCTION_DOMAIN;
  return `${domain}/room/${roomCode}`;
}
