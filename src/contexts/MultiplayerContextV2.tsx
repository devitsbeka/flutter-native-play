// Multiplayer Context V2 - Manages room-based trivia games
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "./AuthContext";
import { TriviaQuestion } from "@/hooks/useTrivia";
import { toast } from "sonner";
import { getRandomGradient } from "@/config/roomGradients";
import { getQuestions } from "@/services/questionService";
import { shuffleArray } from "@/utils/shuffle";
import { getSeenQuestionIds, markQuestionsAsSeen } from "@/services/questionTracker";

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
  total_score: number; // Cumulative score across all rounds
  joined_at: string;
  last_played_at: string | null;
  has_seen_results: boolean;
  status?: "joined" | "ready" | "playing" | "finished" | "disconnected";
}

export interface GameRoom {
  id: string;
  room_code: string;
  room_name: string | null;
  room_icon: string | null;
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
  used_question_ids?: string[];
  background_gradient?: string | null;
  tv_session_id?: string | null;
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
  createRoom: (categoryId?: string, categoryName?: string, customQuestions?: any[], roomName?: string | null, roomIcon?: string | null) => Promise<GameRoom | null>;
  enterRoom: (roomCode: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  startNewRound: () => Promise<void>; // Any player can start a new round
  startNextFromQueue: () => Promise<void>; // Continue with next queued category
  submitAnswer: (answer: string, timeRemaining: number) => Promise<void>;
  nextQuestion: () => void;
  exitRoom: () => void;
  continueInRoom: () => void; // Return to lobby after results
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

// NOTE: We use a non-undefined default value to avoid hard crashes (blank screen)
// in rare cases where the tree momentarily renders without the provider (e.g. HMR/suspense edge).
// All stub methods will throw if invoked without the real provider.
const missingProvider = () => {
  throw new Error("MultiplayerProviderV2 missing: attempted to use multiplayer context outside provider");
};

const MultiplayerContext = createContext<MultiplayerContextType>({
  ...initialState,
  participants: [],
  isHost: false,
  loading: false,
  createRoom: async () => { missingProvider(); return null; },
  enterRoom: async () => { missingProvider(); return false; },
  startGame: async () => missingProvider(),
  startNewRound: async () => missingProvider(),
  startNextFromQueue: async () => missingProvider(),
  submitAnswer: async () => missingProvider(),
  nextQuestion: () => missingProvider(),
  exitRoom: () => missingProvider(),
  continueInRoom: () => missingProvider(),
  leaveRoomPermanently: async () => missingProvider(),
  deleteRoom: async () => missingProvider(),
  resetMultiplayer: () => missingProvider(),
  showCreateModal: false,
  setShowCreateModal: () => missingProvider(),
  showJoinModal: false,
  setShowJoinModal: () => missingProvider(),
});

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

  // Fetch participants for current room with fresh profile data
  const fetchParticipants = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    
    if (!error && data) {
      // Fetch fresh profile data for all participants
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.avatar_url]) || []);

      // Merge fresh avatar_url from profiles
      const participantsWithFreshAvatars = data.map(p => ({
        ...p,
        avatar_url: profileMap.get(p.user_id) || p.avatar_url,
      }));

      setParticipants(participantsWithFreshAvatars as RoomParticipant[]);
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
          if (updated.status === "playing" && (state.phase === "lobby" || state.phase === "results")) {
            // Non-host: fetch questions when game starts - USE shuffled_answers from DB
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
                  // Use stored shuffled_answers so all players see same order
                  allAnswers: q.shuffled_answers && q.shuffled_answers.length > 0 
                    ? q.shuffled_answers 
                    : [...q.incorrect_answers, q.correct_answer],
                  difficulty: q.difficulty || "medium",
                  category: updated.category_name || "General",
                  iconSlug: q.icon_slug || undefined, // Include icon for custom questions
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
            toast.info("ოთახი დაიხურა");
            setState(initialState);
            cleanupChannels();
          }
        }
      )
      .subscribe();
    
    // Subscribe to participants with callback to handle status
    const participantsChannel = supabase
      .channel(`participants-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
        () => fetchParticipants(roomId)
      )
      .subscribe((status) => {
        // When subscription is ready, do an initial fetch to ensure we have latest data
        if (status === 'SUBSCRIBED') {
          fetchParticipants(roomId);
        }
      });

    // Subscribe to profiles changes to update avatars in real-time
    const profilesChannel = supabase
      .channel(`profiles-lobby-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updatedProfile = payload.new as { user_id: string; avatar_url: string | null; animated_avatar_url: string | null };
          // Update both avatar_url and animated_avatar_url for matching participant
          setParticipants(prev =>
            prev.map(p => p.user_id === updatedProfile.user_id 
              ? { ...p, avatar_url: updatedProfile.avatar_url, animated_avatar_url: updatedProfile.animated_avatar_url }
              : p
            )
          );
        }
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
    
    channelsRef.current = [roomChannel, participantsChannel, profilesChannel, answersChannel];
    
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
  const createRoom = useCallback(async (
    categoryId?: string, 
    categoryName?: string, 
    customQuestions?: any[],
    providedRoomName?: string | null,
    providedRoomIcon?: string | null
  ): Promise<GameRoom | null> => {
    if (!user || !profile) {
      toast.error("ჯერ გაიარე ავტორიზაცია");
      return null;
    }
    
    setLoading(true);
    try {
      const roomCode = await generateRoomCode();
      
      // Use provided room name/icon or generate new ones
      let finalRoomName: string | null = providedRoomName || null;
      let finalRoomIcon: string | null = providedRoomIcon || null;
      
      // Only generate if not provided
      if (!finalRoomName) {
        try {
          const { data: nameData, error: nameError } = await supabase.functions.invoke('generate-room-name');
          if (!nameError && nameData?.name) {
            finalRoomName = nameData.name;
            finalRoomIcon = nameData.icon_url || null;
          }
        } catch (e) {
          console.log('Using default room name, edge function failed:', e);
        }
      }
      
      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({
          host_user_id: user.id,
          room_code: roomCode,
          category_id: categoryId === "custom" ? null : categoryId,
          category_name: categoryName,
          status: "waiting",
          is_permanent: true,
          background_gradient: getRandomGradient(),
          total_questions: customQuestions?.length || 5,
          room_name: finalRoomName,
          room_icon: finalRoomIcon,
          last_activity_at: new Date().toISOString(),
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

      // If custom questions provided, store them immediately with icon_slug
      if (customQuestions && customQuestions.length > 0) {
        await Promise.all(customQuestions.map((q, index) => {
          const allAnswers = [q.correct_answer, ...(q.incorrect_answers || [])];
          const shuffledAnswers = shuffleArray(allAnswers);
          
          return supabase.from("room_questions").insert({
            room_id: room.id,
            question_index: index,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            incorrect_answers: q.incorrect_answers,
            difficulty: q.difficulty || "medium",
            shuffled_answers: shuffledAnswers,
            icon_slug: q.icon_slug || null, // Store custom icon for MyTrivia questions
          });
        }));
      }
      
      setState(prev => ({ ...prev, phase: "lobby", currentRoom: room as GameRoom }));
      setShowCreateModal(false);
      toast.success("ოთახი შეიქმნა!");
      
      return room as GameRoom;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("ოთახის შექმნა ვერ მოხერხდა");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // Enter room (join or re-enter)
  const enterRoom = useCallback(async (roomCode: string): Promise<boolean> => {
    if (!user || !profile) {
      toast.error("ჯერ გაიარე ავტორიზაცია");
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
        toast.error("ოთახი ვერ მოიძებნა");
        return false;
      }
      
      if (room.status === "cancelled") {
        toast.error("ეს ოთახი დაიხურა");
        return false;
      }
      
      // Check if already participant
      const { data: existing } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (existing) {
        // If user was invited, promote their seat to joined (reserved-seat behavior)
        if ((existing as any).status === 'invited') {
          await supabase
            .from('room_participants')
            .update({ status: 'joined' })
            .eq('room_id', room.id)
            .eq('user_id', user.id);
        }

        // Check if user has already finished their questions in this round
        const userFinished = (existing.current_question || 0) >= (room.total_questions || 5);
        
        // Determine correct phase based on room status and user completion
        let newPhase: GamePhase = "lobby";
        if (room.status === "completed") {
          newPhase = "results";
        } else if (room.status === "playing" && !userFinished) {
          newPhase = "playing";
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
              // Use stored shuffled_answers so all players see same order
              allAnswers: q.shuffled_answers && q.shuffled_answers.length > 0 
                ? q.shuffled_answers 
                : [...q.incorrect_answers, q.correct_answer],
              difficulty: q.difficulty || "medium",
              category: room.category_name || "General",
              iconSlug: q.icon_slug || undefined, // Include icon for custom questions
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
        // New participant (not invited). Don't allow late-join into a running match.
        if (room.status === 'playing') {
          toast.error('თამაში უკვე დაწყებულია');
          return false;
        }

        // New participant
        const { count } = await supabase
          .from("room_participants")
          .select('id', { count: 'exact', head: true })
          .eq("room_id", room.id);
        
        if (typeof count === 'number' && count >= room.max_players) {
          toast.error("ოთახი სავსეა");
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
      toast.error("ოთახში შესვლა ვერ მოხერხდა");
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
    const usedIds = state.currentRoom.used_question_ids || [];
    
    try {
      // CHECK: For custom MyTrivia rooms (no category_id), use existing custom questions
      if (!state.currentRoom.category_id) {
        const { data: existingQuestions } = await supabase
          .from("room_questions")
          .select("*")
          .eq("room_id", roomId)
          .order("question_index", { ascending: true });
        
        if (existingQuestions && existingQuestions.length > 0) {
          // Use existing custom questions - reshuffle answers for new game
          const questions: TriviaQuestion[] = existingQuestions.map((q: any) => {
            const allAnswers = [q.correct_answer, ...(q.incorrect_answers || [])];
            const shuffledAnswers = shuffleArray(allAnswers);
            return {
              id: `${roomId}-${q.question_index}`,
              question: q.question_text,
              correctAnswer: q.correct_answer,
              incorrectAnswers: q.incorrect_answers,
              allAnswers: shuffledAnswers,
              difficulty: q.difficulty || "medium",
              category: state.currentRoom!.category_name || "Custom",
              iconSlug: q.icon_slug || undefined, // Preserve icon from custom questions
            };
          });
          
          // Update shuffled_answers in DB for sync across players
          await Promise.all(questions.map((q, index) => 
            supabase.from("room_questions")
              .update({ shuffled_answers: q.allAnswers })
              .eq("room_id", roomId)
              .eq("question_index", index)
          ));
          
          // Clear old answers only (keep questions)
          await supabase.from("player_answers").delete().eq("room_id", roomId);
          
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
              questions_data: structuredClone(questions) as unknown as Json,
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
            lastQuestionResult: null,
            opponentAnswers: {},
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
          
          return; // Exit early - custom questions handled
        }
      }
      
      // Standard category-based room: fetch from database
      const result = await getQuestions({
        mode: 'vs',
        categorySlug: state.currentRoom.category_id || undefined,
        count: questionCount,
        excludeIds: usedIds,
      });
      
      if (result.questions.length === 0) {
        toast.error("კითხვები ვერ მოიძებნა");
        return;
      }
      
      // Map to TriviaQuestion format
      const questions: TriviaQuestion[] = result.questions.map(q => ({
        id: q.id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        allAnswers: q.allAnswers,
        difficulty: q.difficulty,
        category: state.currentRoom!.category_name || q.category || "General",
        iconSlug: q.iconSlug,
      }));
      
      // Update used_question_ids on game_rooms
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];
      await supabase
        .from("game_rooms")
        .update({ used_question_ids: newUsedIds })
        .eq("id", roomId);
      
      // Mark questions as seen globally (unified tracking)
      markQuestionsAsSeen(questions.map(q => q.id));
      
      await saveQuestionsAndStartGame(roomId, questions);
      
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("თამაშის დაწყება ვერ მოხერხდა");
    }
  }, [state.currentRoom, isHost]);

  // Helper to save questions and update room status
  const saveQuestionsAndStartGame = useCallback(async (roomId: string, questions: TriviaQuestion[]) => {
    // Clear old questions/answers
    await supabase.from("room_questions").delete().eq("room_id", roomId);
    await supabase.from("player_answers").delete().eq("room_id", roomId);
    
    // Store questions in parallel WITH shuffled_answers for sync
    await Promise.all(questions.map((q, index) => 
      supabase.from("room_questions").insert({
        room_id: roomId,
        question_index: index,
        question_text: q.question,
        correct_answer: q.correctAnswer,
        incorrect_answers: q.incorrectAnswers,
        shuffled_answers: q.allAnswers, // Store pre-shuffled order for all players
        difficulty: q.difficulty,
        icon_slug: q.iconSlug, // Store icon for display
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
        questions_data: structuredClone(questions) as unknown as Json,
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
      lastQuestionResult: null,
      opponentAnswers: {},
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

  // Continue in room after results (go back to lobby)
  const continueInRoom = useCallback(async () => {
    if (!state.currentRoom) return;
    
    // Reset room status to waiting if all players finished
    await supabase
      .from("game_rooms")
      .update({ status: "waiting" })
      .eq("id", state.currentRoom.id);
    
    setState(prev => ({
      ...prev,
      phase: "lobby",
      questions: [],
      currentQuestionIndex: 0,
      myScore: 0,
      lastQuestionResult: null,
      opponentAnswers: {},
    }));
  }, [state.currentRoom]);

  // Start new round (any player can call this)
  const startNewRound = useCallback(async () => {
    if (!state.currentRoom || !user) return;
    
    const roomId = state.currentRoom.id;
    const questionCount = state.currentRoom.total_questions || 5;
    
    try {
      // CHECK: For custom MyTrivia rooms (no category_id), reuse existing custom questions
      if (!state.currentRoom.category_id) {
        const { data: existingQuestions } = await supabase
          .from("room_questions")
          .select("*")
          .eq("room_id", roomId)
          .order("question_index", { ascending: true });
        
        if (existingQuestions && existingQuestions.length > 0) {
          // Reshuffle answers for new round
          const questions: TriviaQuestion[] = existingQuestions.map((q: any) => {
            const allAnswers = [q.correct_answer, ...(q.incorrect_answers || [])];
            const shuffledAnswers = shuffleArray(allAnswers);
            return {
              id: `${roomId}-${q.question_index}`,
              question: q.question_text,
              correctAnswer: q.correct_answer,
              incorrectAnswers: q.incorrect_answers,
              allAnswers: shuffledAnswers,
              difficulty: q.difficulty || "medium",
              category: state.currentRoom!.category_name || "Custom",
              iconSlug: q.icon_slug || undefined,
            };
          });
          
          // Update shuffled_answers in DB for sync
          await Promise.all(questions.map((q, index) => 
            supabase.from("room_questions")
              .update({ shuffled_answers: q.allAnswers })
              .eq("room_id", roomId)
              .eq("question_index", index)
          ));
          
          // Clear old answers only
          await supabase.from("player_answers").delete().eq("room_id", roomId);
          
          // Reset only my score and current_question
          await supabase
            .from("room_participants")
            .update({ score: 0, current_question: 0, status: "playing" })
            .eq("room_id", roomId)
            .eq("user_id", user.id);
          
          // Create room_game record
          const { data: game } = await supabase
            .from("room_games")
            .insert([{
              room_id: roomId,
              game_number: 1,
              questions_data: structuredClone(questions) as unknown as Json,
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
            lastQuestionResult: null,
            opponentAnswers: {},
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
          
          return; // Exit early - custom questions handled
        }
      }
      
      // Standard category room: Get fresh room data
      const { data: freshRoom } = await supabase
        .from("game_rooms")
        .select("used_question_ids")
        .eq("id", roomId)
        .single();
      
      const usedIds = (freshRoom?.used_question_ids as string[]) || [];
      
      // Fetch new questions from database
      const result = await getQuestions({
        mode: 'vs',
        categorySlug: state.currentRoom.category_id || undefined,
        count: questionCount,
        excludeIds: usedIds,
      });
      
      if (result.questions.length === 0) {
        toast.error("კითხვები ვერ მოიძებნა");
        return;
      }
      
      // Map to TriviaQuestion format (include iconSlug!)
      const questions: TriviaQuestion[] = result.questions.map(q => ({
        id: q.id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        allAnswers: q.allAnswers,
        difficulty: q.difficulty,
        category: state.currentRoom!.category_name || q.category || "General",
        iconSlug: q.iconSlug,
      }));
      
      // Clear old questions/answers for this room
      await supabase.from("room_questions").delete().eq("room_id", roomId);
      await supabase.from("player_answers").delete().eq("room_id", roomId);
      
      // Store questions WITH shuffled_answers and icon_slug
      await Promise.all(questions.map((q, index) => 
        supabase.from("room_questions").insert({
          room_id: roomId,
          question_index: index,
          question_text: q.question,
          correct_answer: q.correctAnswer,
          incorrect_answers: q.incorrectAnswers,
          shuffled_answers: q.allAnswers,
          difficulty: q.difficulty,
          icon_slug: q.iconSlug || null,
        })
      ));
      
      // Update used_question_ids on game_rooms
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];
      await supabase
        .from("game_rooms")
        .update({ used_question_ids: newUsedIds })
        .eq("id", roomId);
      
      // Mark questions as seen globally
      markQuestionsAsSeen(questions.map(q => q.id));
      
      // Reset only my score and current_question
      await supabase
        .from("room_participants")
        .update({ score: 0, current_question: 0, status: "playing" })
        .eq("room_id", roomId)
        .eq("user_id", user.id);
      
      // Create room_game record
      const { data: game } = await supabase
        .from("room_games")
        .insert([{
          room_id: roomId,
          game_number: 1,
          questions_data: structuredClone(questions) as unknown as Json,
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
        lastQuestionResult: null,
        opponentAnswers: {},
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
    } catch (error) {
      console.error("Error starting new round:", error);
      toast.error("ახალი რაუნდის დაწყება ვერ მოხერხდა");
    }
  }, [state.currentRoom, user]);

  // Start next round from queue - pop queue item and start with that category
  // This function DIRECTLY fetches questions with the new category to avoid race conditions
  const startNextFromQueue = useCallback(async () => {
    if (!state.currentRoom || !user) return;
    
    const roomId = state.currentRoom.id;
    const questionCount = state.currentRoom.total_questions || 5;
    
    // Fetch first queue item
    const { data: queueItems } = await supabase
      .from("room_category_queue")
      .select("*")
      .eq("room_id", roomId)
      .order("position", { ascending: true })
      .limit(1);
    
    const nextItem = queueItems?.[0];
    
    if (!nextItem) {
      // No queue items - just start regular round
      await startNewRound();
      return;
    }
    
    try {
      // Remove from queue first
      await supabase
        .from("room_category_queue")
        .delete()
        .eq("id", nextItem.id);
      
      // Reorder remaining queue items
      const { data: remaining } = await supabase
        .from("room_category_queue")
        .select("id")
        .eq("room_id", roomId)
        .order("position", { ascending: true });
      
      if (remaining && remaining.length > 0) {
        await Promise.all(
          remaining.map((item, index) =>
            supabase.from("room_category_queue")
              .update({ position: index })
              .eq("id", item.id)
          )
        );
      }
      
      // Handle custom trivia separately
      if (nextItem.source_type === "user_trivia" && nextItem.user_trivia_id) {
        const { data: triviaPost } = await supabase
          .from("user_quiz_posts")
          .select("questions, title")
          .eq("id", nextItem.user_trivia_id)
          .single();
        
        if (triviaPost?.questions) {
          const customQuestions = triviaPost.questions as any[];
          const categoryName = triviaPost.title || nextItem.category_name || "Custom";
          
          // Clear old data
          await supabase.from("room_questions").delete().eq("room_id", roomId);
          await supabase.from("player_answers").delete().eq("room_id", roomId);
          
          // Build questions with proper format
          const questions: TriviaQuestion[] = customQuestions.map((q: any, index: number) => {
            const allAnswers = [q.correct_answer, ...(q.incorrect_answers || [])];
            const shuffledAnswers = shuffleArray(allAnswers);
            return {
              id: `${roomId}-custom-${index}`,
              question: q.question_text,
              correctAnswer: q.correct_answer,
              incorrectAnswers: q.incorrect_answers || [],
              allAnswers: shuffledAnswers,
              difficulty: q.difficulty || "medium",
              category: categoryName,
              iconSlug: q.icon_slug || undefined,
            };
          });
          
          // Store in room_questions
          await Promise.all(questions.map((q, index) => 
            supabase.from("room_questions").insert({
              room_id: roomId,
              question_index: index,
              question_text: q.question,
              correct_answer: q.correctAnswer,
              incorrect_answers: q.incorrectAnswers,
              difficulty: q.difficulty,
              shuffled_answers: q.allAnswers,
              icon_slug: q.iconSlug || null,
            })
          ));
          
          // Reset ALL participant scores for fair game start
          await supabase
            .from("room_participants")
            .update({ score: 0, current_question: 0, status: "playing" })
            .eq("room_id", roomId);
          
          // Create room_game record
          const { data: game } = await supabase
            .from("room_games")
            .insert([{
              room_id: roomId,
              game_number: 1,
              questions_data: structuredClone(questions) as unknown as Json,
            }])
            .select()
            .single();
          
          // Update room
          await supabase
            .from("game_rooms")
            .update({
              category_id: null,
              category_name: categoryName,
              total_questions: questions.length,
              status: "playing",
              started_at: new Date().toISOString(),
              current_game_id: game?.id,
            })
            .eq("id", roomId);
          
          // Update state
          setState(prev => ({
            ...prev,
            currentRoom: prev.currentRoom ? {
              ...prev.currentRoom,
              category_id: null,
              category_name: categoryName,
              total_questions: questions.length,
            } : null,
            questions,
            currentQuestionIndex: 0,
            myScore: 0,
            lastQuestionResult: null,
            opponentAnswers: {},
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
          
          return; // Done with custom trivia
        }
      }
      
      // Regular category or random - fetch new questions directly with correct category
      const newCategoryId = nextItem.source_type === "random" ? null : nextItem.category_id;
      const newCategoryName = nextItem.source_type === "random" ? "შემთხვევითი" : (nextItem.category_name || "კატეგორია");
      
      // Get used question IDs
      const { data: freshRoom } = await supabase
        .from("game_rooms")
        .select("used_question_ids")
        .eq("id", roomId)
        .single();
      
      const usedIds = (freshRoom?.used_question_ids as string[]) || [];
      
      // Fetch questions with the NEW category (not from stale state!)
      const result = await getQuestions({
        mode: 'vs',
        categorySlug: newCategoryId || undefined,
        count: questionCount,
        excludeIds: usedIds,
      });
      
      if (result.questions.length === 0) {
        toast.error("კითხვები ვერ მოიძებნა");
        return;
      }
      
      // Map to TriviaQuestion format with iconSlug
      const questions: TriviaQuestion[] = result.questions.map(q => ({
        id: q.id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        allAnswers: q.allAnswers,
        difficulty: q.difficulty,
        category: newCategoryName,
        iconSlug: q.iconSlug,
      }));
      
      // Clear old data
      await supabase.from("room_questions").delete().eq("room_id", roomId);
      await supabase.from("player_answers").delete().eq("room_id", roomId);
      
      // Store questions with icon_slug
      await Promise.all(questions.map((q, index) => 
        supabase.from("room_questions").insert({
          room_id: roomId,
          question_index: index,
          question_text: q.question,
          correct_answer: q.correctAnswer,
          incorrect_answers: q.incorrectAnswers,
          shuffled_answers: q.allAnswers,
          difficulty: q.difficulty,
          icon_slug: q.iconSlug || null,
        })
      ));
      
      // Update used_question_ids
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];
      
      // Reset ALL participants for fair game start
      await supabase
        .from("room_participants")
        .update({ score: 0, current_question: 0, status: "playing" })
        .eq("room_id", roomId);
      
      // Mark questions as seen
      markQuestionsAsSeen(questions.map(q => q.id));
      
      // Create room_game record
      const { data: game } = await supabase
        .from("room_games")
        .insert([{
          room_id: roomId,
          game_number: 1,
          questions_data: structuredClone(questions) as unknown as Json,
        }])
        .select()
        .single();
      
      // Update room with new category and game info
      await supabase
        .from("game_rooms")
        .update({
          category_id: newCategoryId,
          category_name: newCategoryName,
          used_question_ids: newUsedIds,
          status: "playing",
          started_at: new Date().toISOString(),
          current_game_id: game?.id,
        })
        .eq("id", roomId);
      
      // Update state with new category and questions
      setState(prev => ({
        ...prev,
        currentRoom: prev.currentRoom ? {
          ...prev.currentRoom,
          category_id: newCategoryId,
          category_name: newCategoryName,
        } : null,
        questions,
        currentQuestionIndex: 0,
        myScore: 0,
        lastQuestionResult: null,
        opponentAnswers: {},
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
      
    } catch (error) {
      console.error("Error starting next from queue:", error);
      toast.error("რაუნდის დაწყება ვერ მოხერხდა");
    }
  }, [state.currentRoom, user, startNewRound]);

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
      toast.success("ოთახი დატოვე");
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error("ოთახის დატოვება ვერ მოხერხდა");
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
      toast.success("ოთახი წაიშალა");
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("ოთახის წაშლა ვერ მოხერხდა");
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

  const value = useMemo<MultiplayerContextType>(() => ({
    ...state,
    participants,
    isHost,
    loading,
    createRoom,
    enterRoom,
    startGame,
    startNewRound,
    startNextFromQueue,
    submitAnswer,
    nextQuestion,
    exitRoom,
    continueInRoom,
    leaveRoomPermanently,
    deleteRoom,
    resetMultiplayer,
    showCreateModal,
    setShowCreateModal,
    showJoinModal,
    setShowJoinModal,
  }), [
    state,
    participants,
    isHost,
    loading,
    createRoom,
    enterRoom,
    startGame,
    startNewRound,
    startNextFromQueue,
    submitAnswer,
    nextQuestion,
    exitRoom,
    continueInRoom,
    leaveRoomPermanently,
    deleteRoom,
    resetMultiplayer,
    showCreateModal,
    showJoinModal,
  ]);

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayerV2() {
  return useContext(MultiplayerContext);
}

// Helper to get share link
export function getShareLink(roomCode: string) {
  const domain = window.location.hostname === "localhost" 
    ? window.location.origin 
    : PRODUCTION_DOMAIN;
  return `${domain}/room/${roomCode}`;
}
