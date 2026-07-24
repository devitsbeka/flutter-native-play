// Multiplayer Context V2 - Manages room-based trivia games
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { t as tStandalone } from "@/utils/standaloneTranslation";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "./AuthContext";
import { TriviaQuestion } from "@/hooks/useTrivia";
import { toast } from "sonner";
import { getRandomGradient } from "@/config/roomGradients";
import { getQuestions } from "@/services/questionService";
import { shuffleArray } from "@/utils/shuffle";
import { getSeenQuestionIds, markQuestionsAsSeen } from "@/services/questionTracker";
import { useUserPresence } from "@/hooks/useUserPresence";
import { createNotification } from "@/hooks/useNotifications";

// Helper to notify trivia creator when their trivia is played in multiplayer
const notifyTriviaCreator = async (userTriviaId: string, playerId: string) => {
  try {
    // Get trivia details
    const { data: triviaPost } = await supabase
      .from("user_quiz_posts")
      .select("user_id, title")
      .eq("id", userTriviaId)
      .maybeSingle();
    
    // Don't notify if no trivia found or creator is the one playing
    if (!triviaPost || triviaPost.user_id === playerId) return;
    
    // Get player profile
    const { data: playerProfile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("user_id", playerId)
      .maybeSingle();
    
    await createNotification(
      triviaPost.user_id,
      "trivia_played",
      tStandalone("extra.mpSomeonePlayedTrivia").replace("{name}", playerProfile?.nickname || "Someone"),
      triviaPost.title || undefined,
      { post_id: userTriviaId, player_id: playerId }
    );
  } catch (error) {
    console.error("Error notifying trivia creator:", error);
  }
};

// Helper to determine if host should observe (knows answers)
// Policy: Host observes if they own the trivia AND (it's not blind OR they've already played it)
const shouldHostObserve = async (
  userTriviaId: string | null,
  hostUserId: string
): Promise<boolean> => {
  if (!userTriviaId) return false; // Library/random categories: host always plays
  
  const { data: trivia } = await supabase
    .from("user_quiz_posts")
    .select("user_id, is_blind, plays_count")
    .eq("id", userTriviaId)
    .maybeSingle();
  
  if (!trivia) return false;
  
  // Host knows answers if: they own it AND (it's not blind OR they've already played it)
  const ownsTrivia = trivia.user_id === hostUserId;
  const knowsAnswers = !trivia.is_blind || (trivia.plays_count || 0) > 0;
  
  console.log(`[MP] shouldHostObserve check: owns=${ownsTrivia}, knowsAnswers=${knowsAnswers}, isBlind=${trivia.is_blind}, playsCount=${trivia.plays_count}`);
  
  return ownsTrivia && knowsAnswers;
};

// Check if a room is stale (inactive for more than 1 hour)
const isRoomStale = (lastActivityAt: string | null, createdAt: string): boolean => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour in ms
  const activityTime = new Date(lastActivityAt || createdAt).getTime();
  return activityTime < oneHourAgo;
};

// Helper to safely delete room questions with verification (prevents race condition)
const safeDeleteRoomQuestions = async (roomId: string): Promise<boolean> => {
  await supabase.from("room_questions").delete().eq("room_id", roomId);
  await supabase.from("player_answers").delete().eq("room_id", roomId);
  
  let verified = false;
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { count } = await supabase
      .from("room_questions")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId);
    
    if (!count || count === 0) {
      verified = true;
      console.log(`[MP] Questions deleted and verified (attempt ${i + 1})`);
      break;
    }
    
    console.warn(`[MP] ${count} questions still exist, retrying delete...`);
    await supabase.from("room_questions").delete().eq("room_id", roomId);
  }
  
  return verified;
};

// Reset ALL participants' round state at game start.
// RLS on room_participants only allows updating your own row, so a direct
// client-side update silently no-ops for other players. The SECURITY DEFINER
// RPC resets every row; if the migration isn't applied yet we fall back to
// the direct update (own row only - other clients self-reset on round entry).
const resetAllParticipants = async (roomId: string, status: "playing" | "joined" = "playing") => {
  // Cast needed until Supabase types are regenerated after the migration
  // (supabase/migrations/20260724120000_reset_room_participants_rpc.sql) is applied
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>)("reset_room_participants", {
    p_room_id: roomId,
    p_status: status,
  });
  if (error) {
    console.error("[MP] reset_room_participants RPC failed, falling back to own-row reset:", error);
    await supabase
      .from("room_participants")
      .update({ score: 0, current_question: 0, status })
      .eq("room_id", roomId);
  }
};

// Read-back barrier: non-host clients start fetching by game_id the moment
// status flips to "playing", so every question row must be visible before that
// write. A fixed setTimeout can't guarantee this - poll the actual count.
const verifyQuestionsCommitted = async (
  roomId: string,
  gameId: string | null | undefined,
  expectedCount: number
): Promise<boolean> => {
  if (!gameId) return false;
  for (let i = 0; i < 10; i++) {
    const { count } = await supabase
      .from("room_questions")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("game_id", gameId);
    if (count === expectedCount) return true;
    await new Promise(resolve => setTimeout(resolve, 300)); // max ~3s total
  }
  return false;
};

// Atomic score increment via SECURITY DEFINER RPC. Absolute-value score writes
// race across devices (e.g. observer bonus vs answer points landing together)
// and can clobber each other; the RPC applies the delta server-side. Falls back
// to false if the migration (20260724130000_mp_sync_rpcs.sql) isn't applied yet.
const incrementParticipantScore = async (roomId: string, delta: number): Promise<boolean> => {
  // Cast needed until Supabase types are regenerated after the migration is applied
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>)("increment_participant_score", {
    p_room_id: roomId,
    p_delta: delta,
  });
  if (error) {
    console.error("[MP] increment_participant_score RPC failed, falling back to absolute write:", error);
    return false;
  }
  return true;
};

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
  started_at?: string | null; // When game was started (for question freshness validation)
  used_question_ids?: string[];
  background_gradient?: string | null;
  tv_session_id?: string | null;
  user_trivia_id?: string | null; // Track which user trivia is being played
  last_activity_at?: string | null; // Track last activity for room staleness detection
  host_is_observer?: boolean | null; // Track if host is in observer mode
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
  // Keyed by question_index -> user_id so late-arriving realtime inserts are
  // never dropped when a player has already advanced to the next question
  opponentAnswers: Record<number, Record<string, PlayerAnswer>>;
  hostIsObserver: boolean; // Host can't answer but earns points from player mistakes
  observerBonusThisRound: number; // Accumulated observer bonus for current round
  lastPlayedTriviaId: string | null; // Track the last played trivia ID for "already played" indicator
  justReturnedFromResults: boolean; // True when returning from results to lobby, false when game starts or new category picked
}

interface MultiplayerContextType extends MultiplayerState {
  participants: RoomParticipant[];
  isHost: boolean;
  loading: boolean;
  // Answers for the question currently on screen (derived from opponentAnswers)
  currentOpponentAnswers: Record<string, PlayerAnswer>;
  
  // Actions
  createRoom: (categoryId?: string, categoryName?: string, customQuestions?: any[], roomName?: string | null, roomIcon?: string | null) => Promise<GameRoom | null>;
  enterRoom: (roomCode: string) => Promise<boolean>;
  startGame: (hostShouldObserve?: boolean) => Promise<void>;
  startNewRound: () => Promise<void>; // Any player can start a new round
  startNextFromQueue: () => Promise<void>; // Continue with next queued category
  submitAnswer: (answer: string, timeRemaining: number) => Promise<void>;
  nextQuestion: () => void;
  exitRoom: () => void;
  continueInRoom: () => void; // Return to lobby after results
  leaveRoomPermanently: () => Promise<void>;
  deleteRoom: () => Promise<void>;
  resetMultiplayer: () => void;
  awardObserverBonus: (bonusAmount: number) => Promise<void>; // Award pre-calculated bonus to observer host
  
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
  hostIsObserver: false,
  observerBonusThisRound: 0,
  lastPlayedTriviaId: null,
  justReturnedFromResults: false,
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
  currentOpponentAnswers: {},
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
  awardObserverBonus: async () => missingProvider(),
  showCreateModal: false,
  setShowCreateModal: () => missingProvider(),
  showJoinModal: false,
  setShowJoinModal: () => missingProvider(),
});

// Production domain for share links
const PRODUCTION_DOMAIN = "https://mytrivia.io";

export function MultiplayerProviderV2({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const { setRoomPresence } = useUserPresence();
  const [state, setState] = useState<MultiplayerState>(initialState);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  
  // Phase ref for stable subscription access (prevents recreation on phase change)
  const phaseRef = useRef<GamePhase>(state.phase);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  const isHost = state.currentRoom?.host_user_id === user?.id;
  // NOTE: room-start sync no longer keys off isHost - any player can start a
  // round, and initiator-vs-follower is tracked via expectedGameIdRef instead

  // Ref for current question index to avoid stale closure in subscriptions
  const currentQuestionIndexRef = useRef(state.currentQuestionIndex);
  useEffect(() => {
    currentQuestionIndexRef.current = state.currentQuestionIndex;
  }, [state.currentQuestionIndex]);

  // Ref to track expected game_id - prevents stale fetch loops from overwriting state
  const expectedGameIdRef = useRef<string | null>(null);

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
      if (data.length === 0) {
        setParticipants([]);
        return;
      }

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

  // Trailing debounce: bursts of participant events (round resets touch every
  // row) would otherwise trigger a profile-join fetch per event
  const fetchParticipantsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetchParticipants = useCallback((roomId: string) => {
    if (fetchParticipantsDebounceRef.current) clearTimeout(fetchParticipantsDebounceRef.current);
    fetchParticipantsDebounceRef.current = setTimeout(() => {
      fetchParticipantsDebounceRef.current = null;
      fetchParticipants(roomId);
    }, 300);
  }, [fetchParticipants]);

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
          
          // Use refs for stable access (prevents stale closure issues)
          const currentPhase = phaseRef.current;

          // A new round can start while this player is still finishing the previous
          // one (e.g. a slow player on the last question). Detect it via a changed
          // game_id so they get pulled into the new round instead of finishing a
          // dead round and polluting the room with a stale "finished" status.
          const isNewGameWhilePlaying =
            currentPhase === "playing" &&
            !!updated.current_game_id &&
            !!expectedGameIdRef.current &&
            updated.current_game_id !== expectedGameIdRef.current;

          // ANY player can start a round (results-screen "Play again", queue),
          // so the discriminator for "should this client sync into the game"
          // is whether it INITIATED the round (initiators set expectedGameIdRef
          // before flipping the room to playing) - NOT whether it is the host.
          // Gating on isHost left the host stranded in the lobby whenever the
          // other player started the next round.
          const alreadySyncedThisGame =
            !!updated.current_game_id &&
            updated.current_game_id === expectedGameIdRef.current;

          // Handle status changes
          if (updated.status === "playing" && (currentPhase === "lobby" || currentPhase === "results" || isNewGameWhilePlaying)) {
            // Fetch questions when a game someone else started begins - USE shuffled_answers from DB
            if (!alreadySyncedThisGame) {
              // CRITICAL: Clear local questions FIRST to prevent stale data showing
              setState(prev => ({
                ...prev,
                questions: [], // Clear old questions immediately
                currentQuestionIndex: 0,
                myScore: 0,
                opponentAnswers: {},
                lastQuestionResult: null, // CRITICAL: Reset to prevent answer reveal on new round
                currentRoom: updated, // Sync room state immediately
              }));
              
              // CRITICAL: Reset OWN participant row for the new round. RLS blocks the
              // host from resetting other players' rows, so without this the stale
              // "finished" status/current_question from the previous round survives
              // and can falsely mark the new game as completed.
              if (user?.id) {
                await supabase
                  .from("room_participants")
                  .update({ score: 0, current_question: 0, status: "playing" })
                  .eq("room_id", roomId)
                  .eq("user_id", user.id);
              }

              // Get expected game_id FRESH from database (realtime payload could be stale)
              const { data: freshRoomCheck } = await supabase
                .from("game_rooms")
                .select("current_game_id, total_questions")
                .eq("id", roomId)
                .maybeSingle();

              const expectedGameId = freshRoomCheck?.current_game_id || updated.current_game_id;
              const expectedTotal = freshRoomCheck?.total_questions || updated.total_questions || 0;
              
              // CRITICAL: Store expected game_id in ref so stale fetches can detect they're outdated
              expectedGameIdRef.current = expectedGameId;
              
              console.log(`[MP] Non-host fetching questions with verified game_id: ${expectedGameId}`);
              
              // Wait for questions to be fully committed by host (increased delay)
              await new Promise(resolve => setTimeout(resolve, 800));
              
              // Fetch with retry logic AND game_id validation to handle race conditions
              let attempts = 0;
              const MAX_ATTEMPTS = 8;  // Increased from 5
              const RETRY_DELAY = 600; // Increased from 400
              let roomQuestions: any[] | null = null;
              let validQuestionsFound = false;
              
              while (attempts < MAX_ATTEMPTS && !validQuestionsFound) {
                // CRITICAL: Check if a newer game has started - abort this stale fetch
                if (expectedGameIdRef.current !== expectedGameId) {
                  console.log(`[MP] Aborting fetch loop - newer game started (was: ${expectedGameId}, now: ${expectedGameIdRef.current})`);
                  return;
                }
                
                // CRITICAL: Filter by game_id to ONLY get questions for current game
                const { data } = await supabase
                  .from("room_questions")
                  .select("*")
                  .eq("room_id", roomId)
                  .eq("game_id", expectedGameId) // Filter by current game_id
                  .order("question_index", { ascending: true });
                
                roomQuestions = data;

                // Only accept a COMPLETE set - a partial read means the host's
                // inserts are still landing and would leave this client with
                // fewer questions than everyone else
                const fetchedCount = roomQuestions?.length || 0;
                if (fetchedCount > 0 && (expectedTotal <= 0 || fetchedCount === expectedTotal)) {
                  console.log(`[MP] Found ${fetchedCount}/${expectedTotal} questions matching game_id: ${expectedGameId}`);
                  validQuestionsFound = true;
                  break;
                }

                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                attempts++;
                console.log(`[MP] Waiting for ${expectedTotal} questions with game_id ${expectedGameId}, have ${fetchedCount} (attempt ${attempts}/${MAX_ATTEMPTS})`);
              }
              
              if (validQuestionsFound && roomQuestions && roomQuestions.length > 0) {
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
                
                console.log(`[MP] Non-host loaded ${questions.length} validated questions for game_id: ${expectedGameId}, host_is_observer: ${updated.host_is_observer}`);
                
                setState(prev => ({
                  ...prev,
                  questions,
                  currentQuestionIndex: 0,
                  myScore: 0,
                  phase: "playing",
                  lastQuestionResult: null, // CRITICAL: Reset to prevent answer reveal on new round
                  opponentAnswers: {}, // Reset opponent answers for fresh round
                  currentRoom: updated, // Ensure room state is synced
                  hostIsObserver: updated.host_is_observer || false, // FIX: Read from room for non-hosts
                  observerBonusThisRound: 0,
                }));
              } else {
                // CRITICAL: Check if game_id changed before returning to lobby
                // This prevents stale fetch loops from overwriting new game state
                if (expectedGameIdRef.current !== expectedGameId) {
                  console.log(`[MP] Aborting stale fetch failure handler - game_id changed from ${expectedGameId} to ${expectedGameIdRef.current}`);
                  return; // Exit without modifying state - new game already started
                }
                
                // CRITICAL: Do NOT fallback to stale data - this causes the sync issue!
                console.error(`[MP] Failed to fetch questions for game_id ${expectedGameId} after ${MAX_ATTEMPTS} attempts`);
                toast.error(tStandalone("extra.mpSyncFailed"));

                // Clear the ref so a later event for this game retries the sync
                // (alreadySyncedThisGame would otherwise skip it forever)
                expectedGameIdRef.current = null;

                // Return to lobby instead of playing with stale/wrong data
                setState(prev => ({
                  ...prev,
                  phase: "lobby",
                  currentRoom: updated,
                }));
              }
            }
          } else if (updated.status === "completed") {
            setState(prev => ({ ...prev, phase: "results" }));
          } else if (updated.status === "cancelled") {
            toast.info(tStandalone("extra.mpRoomClosed"));
            setState(initialState);
            cleanupChannels();
          } else if (updated.status === "waiting" && currentPhase === "results") {
            // Host returned to lobby - non-host should follow
            console.log(`[MP] Room returned to waiting state, transitioning to lobby`);
            setState(prev => ({
              ...prev,
              phase: "lobby",
              questions: [],
              currentQuestionIndex: 0,
              myScore: 0,
              lastQuestionResult: null,
              opponentAnswers: {},
              currentRoom: updated,
            }));
          }
        }
      )
      .subscribe(async (status) => {
        // When subscription is ready, check if room is already playing (handle race condition)
        if (status === 'SUBSCRIBED') {
          const { data: freshRoom } = await supabase
            .from("game_rooms")
            .select("*")
            .eq("id", roomId)
            .single();
          
          if (freshRoom && freshRoom.status === "playing") {
            const currentPhase = phaseRef.current;

            // Sync any client (host included) that is in lobby/results while a
            // game IT DID NOT INITIATE is playing - any player can start rounds
            const alreadySyncedThisGame =
              !!freshRoom.current_game_id &&
              freshRoom.current_game_id === expectedGameIdRef.current;
            if ((currentPhase === "lobby" || currentPhase === "results") && !alreadySyncedThisGame) {
              console.log(`[MP] Subscription connected, room already playing. Fetching questions...`);
              
              // Clear local state first
              setState(prev => ({
                ...prev,
                questions: [],
                currentQuestionIndex: 0,
                myScore: 0,
                opponentAnswers: {},
                lastQuestionResult: null,
                currentRoom: freshRoom as GameRoom,
              }));
              
              // Reset OWN participant row (RLS blocks the host from doing it for us)
              if (user?.id) {
                await supabase
                  .from("room_participants")
                  .update({ score: 0, current_question: 0, status: "playing" })
                  .eq("room_id", roomId)
                  .eq("user_id", user.id);
              }

              const expectedGameId = freshRoom.current_game_id;
              const expectedTotal = freshRoom.total_questions || 0;

              // Track expected game_id so isNewGameWhilePlaying detection works
              // if another round starts while this client is mid-sync
              expectedGameIdRef.current = expectedGameId;

              // Wait for questions to be fully committed
              await new Promise(resolve => setTimeout(resolve, 800));

              // Fetch with retry logic
              let attempts = 0;
              const MAX_ATTEMPTS = 8;
              const RETRY_DELAY = 600;
              let roomQuestions: any[] | null = null;
              let validQuestionsFound = false;

              while (attempts < MAX_ATTEMPTS && !validQuestionsFound) {
                const { data } = await supabase
                  .from("room_questions")
                  .select("*")
                  .eq("room_id", roomId)
                  .eq("game_id", expectedGameId)
                  .order("question_index", { ascending: true });

                roomQuestions = data;

                // Only accept a COMPLETE set (partial reads = host still inserting)
                const fetchedCount = roomQuestions?.length || 0;
                if (fetchedCount > 0 && (expectedTotal <= 0 || fetchedCount === expectedTotal)) {
                  validQuestionsFound = true;
                  break;
                }

                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                attempts++;
              }
              
              if (validQuestionsFound && roomQuestions && roomQuestions.length > 0) {
                const questions = roomQuestions.map((q: any) => ({
                  id: `${roomId}-${q.question_index}`,
                  question: q.question_text,
                  correctAnswer: q.correct_answer,
                  incorrectAnswers: q.incorrect_answers,
                  allAnswers: q.shuffled_answers?.length > 0 
                    ? q.shuffled_answers 
                    : [...q.incorrect_answers, q.correct_answer],
                  difficulty: q.difficulty || "medium",
                  category: freshRoom.category_name || "General",
                  iconSlug: q.icon_slug || undefined,
                }));
                
                console.log(`[MP] Initial sync: loaded ${questions.length} questions for game_id: ${expectedGameId}`);
                
                setState(prev => ({
                  ...prev,
                  questions,
                  currentQuestionIndex: 0,
                  myScore: 0,
                  phase: "playing",
                  lastQuestionResult: null,
                  opponentAnswers: {},
                  currentRoom: freshRoom as GameRoom,
                }));
              } else {
                console.error(`[MP] Initial sync: failed to fetch questions after ${MAX_ATTEMPTS} attempts`);
                toast.error(tStandalone("extra.mpSyncFailed"));
                // Clear the ref so a later event for this game retries the sync
                expectedGameIdRef.current = null;
                setState(prev => ({
                  ...prev,
                  phase: "lobby",
                  currentRoom: freshRoom as GameRoom,
                }));
              }
            }
          }
        }
      });
    
    // Subscribe to participants with callback to handle status
    const participantsChannel = supabase
      .channel(`participants-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          debouncedFetchParticipants(roomId);

          // Check if all playing participants have finished → mark room completed.
          // Each client only reacts to its OWN "finished" transition - every player
          // reports their own finish, so running the check for every event just
          // multiplies identical queries and race windows.
          if (
            payload.eventType === "UPDATE" &&
            (payload.new as any).status === "finished" &&
            (payload.new as any).user_id === user?.id
          ) {
            const { data: allParticipants } = await supabase
              .from("room_participants")
              .select("status, user_id, current_question")
              .eq("room_id", roomId);

            if (allParticipants && allParticipants.length > 0) {
              // Get room to check host_is_observer
              const { data: roomCheck } = await supabase
                .from("game_rooms")
                .select("host_user_id, host_is_observer, status, total_questions")
                .eq("id", roomId)
                .maybeSingle();

              // Only proceed if the room is still "playing"
              if (roomCheck && roomCheck.status === "playing") {
                const activePlayers = allParticipants.filter(p => {
                  // Skip observer host
                  if (roomCheck.host_is_observer && p.user_id === roomCheck.host_user_id) return false;
                  // Skip players who left mid-round - waiting on them blocks completion forever
                  if (p.status === "disconnected") return false;
                  return true;
                });

                // CRITICAL: RLS only lets each user update their OWN participant row,
                // so cross-player resets at round start silently fail and a player can
                // carry a stale "finished" status from the previous round. Require
                // actual progress through the current round's questions before counting
                // a player as finished, otherwise one answer into a new round the room
                // gets marked completed and everyone is kicked to results.
                const totalQ = roomCheck.total_questions || 5;
                const allFinished = activePlayers.every(
                  p => p.status === "finished" && (p.current_question || 0) >= totalQ
                );
                
                if (allFinished) {
                  console.log(`[MP] All ${activePlayers.length} players finished - marking room completed`);
                  await supabase
                    .from("game_rooms")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("id", roomId)
                    .eq("status", "playing"); // Prevent double-update race
                }
              }
            }
          }
        }
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
          // Store EVERY opponent insert keyed by question_index - players advance
          // at their own pace, so answers for past/future questions must not be
          // dropped (they're read back when this client reaches that question)
          if (answer.user_id !== user?.id) {
            setState(prev => ({
              ...prev,
              opponentAnswers: {
                ...prev.opponentAnswers,
                [answer.question_index]: {
                  ...(prev.opponentAnswers[answer.question_index] || {}),
                  [answer.user_id]: answer,
                },
              },
            }));
          }
        }
      )
      .subscribe();
    
    channelsRef.current = [roomChannel, participantsChannel, profilesChannel, answersChannel];
    
    // Initial fetch
    fetchParticipants(roomId);

    return () => {
      if (fetchParticipantsDebounceRef.current) {
        clearTimeout(fetchParticipantsDebounceRef.current);
        fetchParticipantsDebounceRef.current = null;
      }
      cleanupChannels();
    };
  }, [state.currentRoom?.id, user?.id, fetchParticipants, debouncedFetchParticipants, cleanupChannels]); // Removed state.phase and isHost - use refs instead

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
      toast.error(tStandalone("extra.mpAuthRequired"));
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
      toast.success(tStandalone("extra.mpRoomCreated"));
      
      return room as GameRoom;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error(tStandalone("extra.mpRoomCreateFailed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // Enter room (join or re-enter)
  const enterRoom = useCallback(async (roomCode: string): Promise<boolean> => {
    if (!user || !profile) {
      toast.error(tStandalone("extra.mpAuthRequired"));
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
        toast.error(tStandalone("extra.mpRoomNotFound"));
        return false;
      }
      
      if (room.status === "cancelled") {
        toast.error(tStandalone("extra.mpRoomIsClosed"));
        return false;
      }
      
      // Check if room is stale (1+ hour of inactivity) and needs reset
      const stale = isRoomStale(room.last_activity_at, room.created_at);
      
      if (stale && (room.status === "playing" || room.status === "completed")) {
        console.log(`[MP] Room ${room.room_code} is stale (${room.status}), resetting to lobby`);
        
        // Reset room to waiting state
        await supabase
          .from("game_rooms")
          .update({ 
            status: "waiting", 
            current_game_id: null,
            last_activity_at: new Date().toISOString() 
          })
          .eq("id", room.id);
          
        // Reset participant progress for new round (RPC resets ALL rows;
        // direct updates would be RLS-limited to the caller's own row)
        await resetAllParticipants(room.id, "joined");
        
        // Update local room object
        room.status = "waiting";
        room.current_game_id = null;
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
          let questionQuery = supabase
            .from("room_questions")
            .select("*")
            .eq("room_id", room.id);

          // Filter by current game_id if available (prevents loading stale questions)
          if (room.current_game_id) {
            questionQuery = questionQuery.eq("game_id", room.current_game_id);
          }

          let { data: roomQuestions } = await questionQuery
            .order("question_index", { ascending: true });

          // Fallback: if game_id filter returned empty, retry without it
          if ((!roomQuestions || roomQuestions.length === 0) && room.current_game_id) {
            const { data: fallbackQuestions } = await supabase
              .from("room_questions")
              .select("*")
              .eq("room_id", room.id)
              .order("question_index", { ascending: true });
            roomQuestions = fallbackQuestions;
          }
          
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
              iconSlug: q.icon_slug || undefined,
              imageUrl: q.image_url || undefined,
              videoUrl: q.video_url || undefined,
              audioUrl: q.audio_url || undefined,
            }));
            
            // Get current progress from participant
            const currentQuestion = existing.current_question || 0;

            // Track expected game_id so isNewGameWhilePlaying detection works
            // for rejoining clients too
            expectedGameIdRef.current = room.current_game_id;

            // Rejoining a live round: clear a stale "disconnected" flag so the
            // completion check counts us again
            if ((existing as any).status === "disconnected") {
              await supabase
                .from("room_participants")
                .update({ status: "playing" })
                .eq("room_id", room.id)
                .eq("user_id", user.id);
            }

            setState(prev => ({
              ...prev,
              phase: "playing",
              currentRoom: room as GameRoom,
              questions,
              currentQuestionIndex: currentQuestion,
              myScore: existing.score || 0,
              hostIsObserver: room.host_is_observer || false,
              lastQuestionResult: null,
              opponentAnswers: {},
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
          toast.error(tStandalone("extra.mpGameAlreadyStarted"));
          return false;
        }

        // New participant
        const { count } = await supabase
          .from("room_participants")
          .select('id', { count: 'exact', head: true })
          .eq("room_id", room.id);
        
        if (typeof count === 'number' && count >= room.max_players) {
          toast.error(tStandalone("extra.mpRoomFull"));
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
      
      // Set room presence when successfully entering a room
      setRoomPresence(room.id);
      
      setShowJoinModal(false);
      return true;
    } catch (error) {
      console.error("Error entering room:", error);
      toast.error(tStandalone("extra.mpJoinFailed"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // Helper to consume matching queue item when game starts (prevents "next round" showing played category)
  const consumeMatchingQueueItem = useCallback(async (
    roomId: string, 
    categoryId: string | null, 
    userTriviaId: string | null
  ) => {
    try {
      const { data: queueItems } = await supabase
        .from("room_category_queue")
        .select("*")
        .eq("room_id", roomId)
        .order("position", { ascending: true })
        .limit(1);
      
      const firstQueueItem = queueItems?.[0];
      
      if (!firstQueueItem) return; // No queue items
      
      // Check if first queue item matches what we just played
      const matchesCategory = categoryId && firstQueueItem.category_id === categoryId;
      const matchesUserTrivia = userTriviaId && firstQueueItem.user_trivia_id === userTriviaId;
      
      if (matchesCategory || matchesUserTrivia) {
        // Delete the matching queue item
        await supabase
          .from("room_category_queue")
          .delete()
          .eq("id", firstQueueItem.id);
        
        // Reorder remaining items
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
      }
    } catch (error) {
      console.error("Error consuming queue item:", error);
    }
  }, []);

  // Start game (host only)
  // hostShouldObserve: when undefined, auto-detect based on trivia ownership
  const startGame = useCallback(async (hostShouldObserve?: boolean) => {
    if (!state.currentRoom || !isHost || !user) return;
    
    const roomId = state.currentRoom.id;
    
    // CRITICAL FIX: Always fetch fresh room data to avoid stale category after selection
    // The realtime subscription may not have updated state.currentRoom yet when startAfterPick triggers
    const { data: freshRoom, error: roomError } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    
    if (roomError || !freshRoom) {
      console.error("[startGame] Failed to fetch fresh room:", roomError);
      toast.error(tStandalone("extra.mpRoomDataNotFound"));
      return;
    }
    
    console.log('[startGame] State category:', state.currentRoom.category_id, '| Fresh category:', freshRoom.category_id, freshRoom.category_name);
    
    // FIX: Always use fresh default for new games
    // Don't rely on stale total_questions from previous round
    const questionCount = 5;
    const usedIds = (freshRoom.used_question_ids as string[]) || [];
    
    // AUTO-DETECT observer mode if not explicitly provided
    const shouldObserve = hostShouldObserve ?? 
      await shouldHostObserve(freshRoom.user_trivia_id, user.id);
    
    console.log(`[startGame] Observer mode: provided=${hostShouldObserve}, detected=${shouldObserve}`);
    
    // NOTE: host_is_observer is now set in the final room update (merged to prevent premature realtime triggers)
    
    try {
      // CHECK: For custom MyTrivia rooms (no category_id), ALWAYS fetch fresh from user_trivia_id
      // This prevents stale questions from previous rounds when user switches trivia
      if (!freshRoom.category_id && freshRoom.user_trivia_id) {
        console.log('[startGame] User trivia detected, fetching fresh from user_quiz_posts:', freshRoom.user_trivia_id);
        
        const { data: triviaPost } = await supabase
          .from("user_quiz_posts")
          .select("questions, title")
          .eq("id", freshRoom.user_trivia_id)
          .single();
        
        if (!triviaPost?.questions) {
          console.error('[startGame] Failed to load trivia questions');
          toast.error(tStandalone("extra.mpTriviaQuestionsNotFound"));
          return;
        }
        
        const customQuestions = triviaPost.questions as any[];
        const categoryName = triviaPost.title || freshRoom.category_name || "Custom";
        
        // CRITICAL: Clear ALL old questions before inserting new ones (with verification)
        const deleteSuccess1 = await safeDeleteRoomQuestions(roomId);
        if (!deleteSuccess1) {
          console.error("[MP startGame] Failed to delete old questions after retries");
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }
        
        // Build questions with proper format
        const questions: TriviaQuestion[] = customQuestions.map((q: any, index: number) => {
          const allAnswers = [q.correct_answer || q.correctAnswer, ...(q.incorrect_answers || q.incorrectAnswers || [])];
          const shuffledAnswers = shuffleArray(allAnswers);
          return {
            id: `${roomId}-custom-${index}`,
            question: q.question_text || q.question,
            correctAnswer: q.correct_answer || q.correctAnswer,
            incorrectAnswers: q.incorrect_answers || q.incorrectAnswers || [],
            allAnswers: shuffledAnswers,
            difficulty: q.difficulty || "medium",
            category: categoryName,
            iconSlug: q.icon_slug || undefined,
            imageUrl: q.image_url || undefined,
            videoUrl: q.video_url || undefined,
            audioUrl: q.audio_url || undefined,
          };
        });
        
        // Create room_game record FIRST to get game_id
        const { data: game } = await supabase
          .from("room_games")
          .insert([{
            room_id: roomId,
            game_number: 1,
            questions_data: structuredClone(questions) as unknown as Json,
          }])
          .select()
          .single();
        
        // Store in room_questions for sync WITH game_id for validation
        const insertResults = await Promise.all(questions.map((q, index) => 
          supabase.from("room_questions").insert({
            room_id: roomId,
            question_index: index,
            question_text: q.question,
            correct_answer: q.correctAnswer,
            incorrect_answers: q.incorrectAnswers,
            difficulty: q.difficulty,
            shuffled_answers: q.allAnswers,
            icon_slug: q.iconSlug || null,
            image_url: q.imageUrl || null,
            video_url: q.videoUrl || null,
            audio_url: q.audioUrl || null,
            game_id: game?.id, // CRITICAL: Link to current game for non-host validation
          }).select()
        ));
        
        // Abort BEFORE flipping status to "playing" if any insert failed or the
        // full set isn't readable yet - otherwise non-hosts sync a partial round
        const failedInserts = insertResults.filter(r => r.error);
        if (failedInserts.length > 0) {
          console.error("[MP startGame] Some question inserts failed:", failedInserts.map(f => f.error));
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }
        if (!(await verifyQuestionsCommitted(roomId, game?.id, questions.length))) {
          console.error(`[MP startGame] Questions not fully committed for game ${game?.id}, aborting round start`);
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }

        // Reset ALL participant scores for fair game start
        await resetAllParticipants(roomId);
        
        // FIX: Immediately reset local participants to prevent stale auto-advance
        setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));
        
        // Update room status (includes host_is_observer to prevent premature realtime trigger)
        await supabase
          .from("game_rooms")
          .update({
            category_name: categoryName,
            total_questions: questions.length,
            status: "playing",
            started_at: new Date().toISOString(),
            current_game_id: game?.id,
            host_is_observer: shouldObserve,
          })
          .eq("id", roomId);

        // Track expected game_id so isNewGameWhilePlaying detection works for the host too
        expectedGameIdRef.current = game?.id ?? null;

        setState(prev => ({
          ...prev,
          currentRoom: prev.currentRoom ? {
            ...prev.currentRoom,
            category_name: categoryName,
            total_questions: questions.length,
          } : null,
          questions,
          currentQuestionIndex: 0,
          myScore: 0,
          lastQuestionResult: null,
          opponentAnswers: {},
          hostIsObserver: shouldObserve,
          observerBonusThisRound: 0,
          justReturnedFromResults: false,
          lastPlayedTriviaId: freshRoom.user_trivia_id,
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
        
        // Consume matching queue item for custom trivia
        await consumeMatchingQueueItem(roomId, null, freshRoom.user_trivia_id);
        
        // Increment plays_count for user trivia (enables host-observer policy after first play)
        await supabase.rpc('increment_quiz_plays', { 
          post_id: freshRoom.user_trivia_id 
        });
        
        // Notify trivia creator for each non-host participant
        const nonHostParticipants = participants.filter(p => p.user_id !== freshRoom.host_user_id);
        for (const participant of nonHostParticipants) {
          await notifyTriviaCreator(freshRoom.user_trivia_id, participant.user_id);
        }
        
        console.log(`[startGame] Started with ${questions.length} fresh questions from user_trivia_id: ${freshRoom.user_trivia_id}`);
        return; // Exit early - custom questions handled
      }
      
      // Standard category-based room: fetch from database using FRESH data
      // Handle __mixed__ category - triggers multi-category mode (getMultiCategoryVSQuestions)
      const isMixedCategory = freshRoom.category_id === "__mixed__";
      console.log('[startGame] Fetching questions for category:', freshRoom.category_id, freshRoom.category_name, 'isMixed:', isMixedCategory);
      const result = await getQuestions({
        mode: 'vs',
        categorySlug: isMixedCategory ? undefined : (freshRoom.category_id || undefined),
        count: questionCount,
        excludeIds: usedIds,
      });
      
      if (result.questions.length === 0) {
        toast.error(tStandalone("extra.mpQuestionsNotFound"));
        return;
      }
      
      // Map to TriviaQuestion format using FRESH category name
      const questions: TriviaQuestion[] = result.questions.map(q => ({
        id: q.id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        allAnswers: q.allAnswers,
        difficulty: q.difficulty,
        category: freshRoom.category_name || q.category || "General",
        iconSlug: q.iconSlug,
        imageUrl: q.imageUrl,
        videoUrl: q.videoUrl,
        audioUrl: q.audioUrl,
      }));
      
      // Update used_question_ids on game_rooms
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];
      await supabase
        .from("game_rooms")
        .update({ used_question_ids: newUsedIds })
        .eq("id", roomId);
      
      // Mark questions as seen globally (unified tracking)
      markQuestionsAsSeen(questions.map(q => q.id));
      
      await saveQuestionsAndStartGame(roomId, questions, shouldObserve);
      
      // Consume matching queue item if it exists (prevents "next round" showing played category)
      await consumeMatchingQueueItem(roomId, freshRoom.category_id, null);
      
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error(tStandalone("extra.mpGameStartError"));
    }
  }, [state.currentRoom, isHost, user]);

  // Helper to save questions and update room status
  const saveQuestionsAndStartGame = useCallback(async (
    roomId: string, 
    questions: TriviaQuestion[],
    hostShouldObserve: boolean = false
  ) => {
    // Clear old questions/answers with verification
    const deleteSuccess2 = await safeDeleteRoomQuestions(roomId);
    if (!deleteSuccess2) {
      console.error("[MP saveQuestionsAndStartGame] Failed to delete old questions after retries");
      toast.error(tStandalone("extra.mpGameStartFailed"));
      return;
    }
    
    // Create room_game record FIRST to get game_id
    const { data: game } = await supabase
      .from("room_games")
      .insert([{
        room_id: roomId,
        game_number: 1,
        questions_data: structuredClone(questions) as unknown as Json,
      }])
      .select()
      .single();
    
    // Store questions in parallel WITH shuffled_answers for sync AND game_id for validation
    const insertResults = await Promise.all(questions.map((q, index) => 
      supabase.from("room_questions").insert({
        room_id: roomId,
        question_index: index,
        question_text: q.question,
        correct_answer: q.correctAnswer,
        incorrect_answers: q.incorrectAnswers,
        shuffled_answers: q.allAnswers, // Store pre-shuffled order for all players
        difficulty: q.difficulty,
        icon_slug: q.iconSlug, // Store icon for display
        image_url: q.imageUrl || null,
        video_url: q.videoUrl || null,
        audio_url: q.audioUrl || null,
        game_id: game?.id, // CRITICAL: Link to current game for non-host validation
      }).select()
    ));
    
    // Abort BEFORE flipping status to "playing" if any insert failed or the
    // full set isn't readable yet - otherwise non-hosts sync a partial round
    const failedInserts = insertResults.filter(r => r.error);
    if (failedInserts.length > 0) {
      console.error("[MP saveQuestionsAndStartGame] Some question inserts failed:", failedInserts.map(f => f.error));
      toast.error(tStandalone("extra.mpGameStartFailed"));
      return;
    }
    if (!(await verifyQuestionsCommitted(roomId, game?.id, questions.length))) {
      console.error(`[MP saveQuestionsAndStartGame] Questions not fully committed for game ${game?.id}, aborting round start`);
      toast.error(tStandalone("extra.mpGameStartFailed"));
      return;
    }

    // Reset all participants scores
    // CRITICAL: Also reset status to "playing" - a stale "finished" status from the
    // previous round makes the completion check mark the room "completed" as soon as
    // any player answers the first question, kicking everyone to results mid-game
    await resetAllParticipants(roomId);

    // FIX: Immediately reset local participants to prevent stale auto-advance
    setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0, status: "playing" as const })));
    
    // Update room status (includes host_is_observer to prevent premature realtime trigger)
    // Also sync total_questions - a stale count from a previous custom-trivia round
    // breaks the "finished" detection when players re-enter the room
    await supabase
      .from("game_rooms")
      .update({
        status: "playing",
        started_at: new Date().toISOString(),
        current_game_id: game?.id,
        host_is_observer: hostShouldObserve,
        total_questions: questions.length,
      })
      .eq("id", roomId);

    // Track expected game_id so isNewGameWhilePlaying detection works for the host too
    expectedGameIdRef.current = game?.id ?? null;

    setState(prev => ({
      ...prev,
      questions,
      currentQuestionIndex: 0,
      myScore: 0,
      lastQuestionResult: null,
      opponentAnswers: {},
      hostIsObserver: hostShouldObserve,
      observerBonusThisRound: 0,
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
    
    // Update participant score (round to prevent floating point accumulation)
    const newScore = Math.round(state.myScore + points);
    // Atomic delta via RPC so concurrent writes (e.g. observer bonus) can't be
    // clobbered by an absolute score; fall back to the absolute write if the
    // migration isn't applied yet
    const scoreApplied = points > 0
      ? await incrementParticipantScore(state.currentRoom.id, points)
      : true;
    await supabase
      .from("room_participants")
      .update(
        scoreApplied
          ? { current_question: state.currentQuestionIndex + 1 }
          : { score: newScore, current_question: state.currentQuestionIndex + 1 }
      )
      .eq("room_id", state.currentRoom.id)
      .eq("user_id", user.id);

    setState(prev => ({
      ...prev,
      myScore: newScore,
      lastQuestionResult: { correct: isCorrect, points },
    }));
  }, [state.currentRoom, state.questions, state.currentQuestionIndex, state.myScore, user]);

  // Next question
  const nextQuestion = useCallback(async () => {
    const isLastQuestion = state.currentQuestionIndex >= state.questions.length - 1;
    
    if (isLastQuestion) {
      // Mark THIS player as finished (not the whole room)
      if (state.currentRoom && user) {
        await supabase
          .from("room_participants")
          .update({ status: "finished" })
          .eq("room_id", state.currentRoom.id)
          .eq("user_id", user.id);
      }
      
      // Wait for score to propagate (increased from 200ms to allow observer bonus to sync)
      await new Promise(resolve => setTimeout(resolve, 500));
      setState(prev => ({ ...prev, phase: "results" }));
    } else {
      // Keep opponentAnswers - it's keyed per question_index, wiping it here
      // would drop answers already received for upcoming questions
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        lastQuestionResult: null,
      }));
    }
  }, [state.currentQuestionIndex, state.questions.length, state.currentRoom, user]);

  // Exit room (UI only - stay as participant)
  const exitRoom = useCallback(() => {
    // Leaving mid-round: mark own row disconnected (fire-and-forget) so the
    // remaining players' completion check doesn't wait on us forever
    const roomId = state.currentRoom?.id;
    if (phaseRef.current === "playing" && roomId && user) {
      void supabase
        .from("room_participants")
        .update({ status: "disconnected" })
        .eq("room_id", roomId)
        .eq("user_id", user.id);
    }
    // Clear room presence when exiting
    setRoomPresence(null);
    cleanupChannels();
    setState(initialState);
  }, [cleanupChannels, setRoomPresence, state.currentRoom?.id, user]);

  // Continue in room after results (go back to lobby)
  const continueInRoom = useCallback(async () => {
    if (!state.currentRoom) return;
    
    const roomId = state.currentRoom.id;
    
    // Remember what was just played for "already played" indicator
    const justPlayedTriviaId = state.currentRoom.user_trivia_id;
    
    // Check if queue is empty - if so, clear current category to prompt new selection
    const { data: queueItems } = await supabase
      .from("room_category_queue")
      .select("id")
      .eq("room_id", roomId)
      .limit(1);
    
    const hasQueueItems = queueItems && queueItems.length > 0;
    
    // CRITICAL FIX: Check current room status - if already "waiting", skip the DB update
    // This prevents redundant writes when handleAddToQueue already set status atomically
    const { data: currentRoomState } = await supabase
      .from("game_rooms")
      .select("status")
      .eq("id", roomId)
      .single();

    // Only update DB if not already in waiting state.
    // NEVER downgrade a "playing" room - another player may have already started
    // the next round, and flipping it to "waiting" would derail their live game.
    if (currentRoomState?.status !== "waiting" && currentRoomState?.status !== "playing") {
      // Reset room status to waiting
      // If queue is empty, clear category so lobby shows "აირჩიე კატეგორია"
      await supabase
        .from("game_rooms")
        .update({ 
          status: "waiting",
          // Clear category data only if queue is empty (forces new selection)
          ...(hasQueueItems ? {} : {
            category_id: null,
            category_name: null,
            user_trivia_id: null,
          }),
        })
        .eq("id", roomId);
    }
    
    setState(prev => ({
      ...prev,
      phase: "lobby",
      questions: [],
      currentQuestionIndex: 0,
      myScore: 0,
      lastQuestionResult: null,
      opponentAnswers: {},
      lastPlayedTriviaId: justPlayedTriviaId || null, // Store for "already played" indicator
      justReturnedFromResults: !hasQueueItems, // Only set if queue is empty - allows proper display when queue has items
      // Also clear in local state if queue is empty
      ...(hasQueueItems ? {} : {
        currentRoom: prev.currentRoom ? {
          ...prev.currentRoom,
          category_id: null,
          category_name: null,
          user_trivia_id: null,
        } : null,
      }),
    }));
  }, [state.currentRoom]);

  // Start new round (any player can call this)
  const startNewRound = useCallback(async () => {
    if (!state.currentRoom || !user) return;
    
    const roomId = state.currentRoom.id;
    
    // CRITICAL FIX: Fetch fresh room data to get current category after selection
    const { data: freshRoom, error: roomError } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    
    if (roomError || !freshRoom) {
      console.error("[startNewRound] Failed to fetch fresh room:", roomError);
      return;
    }
    
    console.log('[startNewRound] Fresh category:', freshRoom.category_id, freshRoom.category_name);
    
    // FIX: Always use fresh default for new rounds
    // Don't rely on stale total_questions from previous round
    const questionCount = 5;
    
    // Determine if host should observe (only applies if current user is host)
    const currentUserIsHost = freshRoom.host_user_id === user.id;
    const hostShouldObserve = currentUserIsHost
      ? await shouldHostObserve(freshRoom.user_trivia_id, user.id)
      : false;
    
    console.log(`[startNewRound] Observer mode: isHost=${currentUserIsHost}, shouldObserve=${hostShouldObserve}`);
    
    // NOTE: host_is_observer is now set in the final room update (merged to prevent premature realtime triggers)
    
    try {
      // CHECK: For custom MyTrivia rooms (no category_id), ALWAYS fetch fresh from user_trivia_id
      // This prevents stale questions from previous rounds when user switches trivia
      if (!freshRoom.category_id && freshRoom.user_trivia_id) {
        console.log('[startNewRound] User trivia detected, fetching fresh from user_quiz_posts:', freshRoom.user_trivia_id);
        
        const { data: triviaPost } = await supabase
          .from("user_quiz_posts")
          .select("questions, title")
          .eq("id", freshRoom.user_trivia_id)
          .single();
        
        if (!triviaPost?.questions) {
          console.error('[startNewRound] Failed to load trivia questions');
          toast.error(tStandalone("extra.mpTriviaQuestionsNotFound"));
          return;
        }
        
        const customQuestions = triviaPost.questions as any[];
        const categoryName = triviaPost.title || freshRoom.category_name || "Custom";
        
        // Reshuffle answers for new round
        const questions: TriviaQuestion[] = customQuestions.map((q: any, index: number) => {
          const allAnswers = [q.correct_answer || q.correctAnswer, ...(q.incorrect_answers || q.incorrectAnswers || [])];
          const shuffledAnswers = shuffleArray(allAnswers);
          return {
            id: `${roomId}-${index}`,
            question: q.question_text || q.question,
            correctAnswer: q.correct_answer || q.correctAnswer,
            incorrectAnswers: q.incorrect_answers || q.incorrectAnswers || [],
            allAnswers: shuffledAnswers,
            difficulty: q.difficulty || "medium",
            category: categoryName,
            iconSlug: q.icon_slug || undefined,
          };
        });
        
        // Clear old answers and questions with verification
        const deleteSuccess3 = await safeDeleteRoomQuestions(roomId);
        if (!deleteSuccess3) {
          console.error("[MP startNewRound/userTrivia] Failed to delete old questions after retries");
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }
        
        // FIX: Reset ALL participants' scores (not just caller)
        await resetAllParticipants(roomId);
        
        // FIX: Immediately reset local participants to prevent stale auto-advance
        setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));
        
        // Create room_game record FIRST to get game_id
        const { data: game } = await supabase
          .from("room_games")
          .insert([{
            room_id: roomId,
            game_number: 1,
            questions_data: structuredClone(questions) as unknown as Json,
          }])
          .select()
          .single();
        
        // Insert fresh questions with new game_id
        const insertResults1 = await Promise.all(questions.map((q, index) => 
          supabase.from("room_questions").insert({
            room_id: roomId,
            question_index: index,
            question_text: q.question,
            correct_answer: q.correctAnswer,
            incorrect_answers: q.incorrectAnswers,
            shuffled_answers: q.allAnswers,
            difficulty: q.difficulty,
            icon_slug: q.iconSlug || null,
            game_id: game?.id, // CRITICAL: Link to current game for non-host validation
          }).select()
        ));
        
        // Abort BEFORE flipping status to "playing" if any insert failed or the
        // full set isn't readable yet - otherwise non-hosts sync a partial round
        const failedInserts1 = insertResults1.filter(r => r.error);
        if (failedInserts1.length > 0) {
          console.error("[MP startNewRound/userTrivia] Some question inserts failed:", failedInserts1.map(f => f.error));
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }
        if (!(await verifyQuestionsCommitted(roomId, game?.id, questions.length))) {
          console.error(`[MP startNewRound/userTrivia] Questions not fully committed for game ${game?.id}, aborting round start`);
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }

        // Update room status (after questions are committed, includes host_is_observer)
        await supabase
          .from("game_rooms")
          .update({
            status: "playing",
            started_at: new Date().toISOString(),
            current_game_id: game?.id,
            host_is_observer: hostShouldObserve,
            total_questions: questions.length,
          })
          .eq("id", roomId);

        // Track expected game_id so isNewGameWhilePlaying detection works for the caller too
        expectedGameIdRef.current = game?.id ?? null;

        setState(prev => ({
          ...prev,
          questions,
          currentQuestionIndex: 0,
          myScore: 0,
          lastQuestionResult: null,
          opponentAnswers: {},
          hostIsObserver: hostShouldObserve, // FIX: Set observer mode
          observerBonusThisRound: 0,
          lastPlayedTriviaId: freshRoom.user_trivia_id,
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
        
        console.log(`[startNewRound] Started with ${questions.length} fresh questions from user_trivia_id: ${freshRoom.user_trivia_id}`);
        return; // Exit early - custom questions handled
      }
      
      // Standard category room: use freshRoom already fetched above
      const usedIds = (freshRoom.used_question_ids as string[]) || [];
      
      // Fetch new questions from database using FRESH category
      console.log('[startNewRound] Fetching questions for category:', freshRoom.category_id);
      const result = await getQuestions({
        mode: 'vs',
        categorySlug: freshRoom.category_id || undefined,
        count: questionCount,
        excludeIds: usedIds,
      });
      
      if (result.questions.length === 0) {
        toast.error(tStandalone("extra.mpQuestionsNotFound"));
        return;
      }
      
      // Map to TriviaQuestion format using FRESH category name
      const questions: TriviaQuestion[] = result.questions.map(q => ({
        id: q.id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        allAnswers: q.allAnswers,
        difficulty: q.difficulty,
        category: freshRoom.category_name || q.category || "General",
        iconSlug: q.iconSlug,
      }));
      
      // Clear old questions/answers with verification
      const deleteSuccess4 = await safeDeleteRoomQuestions(roomId);
      if (!deleteSuccess4) {
        console.error("[MP startNewRound/library] Failed to delete old questions after retries");
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }
      
      // Update used_question_ids on game_rooms
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];
      await supabase
        .from("game_rooms")
        .update({ used_question_ids: newUsedIds })
        .eq("id", roomId);
      
      // Mark questions as seen globally
      markQuestionsAsSeen(questions.map(q => q.id));
      
      // FIX: Reset ALL participants' scores (not just caller)
      await resetAllParticipants(roomId);
      
      // FIX: Immediately reset local participants to prevent stale auto-advance
      setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));
      
      // Create room_game record FIRST to get game_id
      const { data: game } = await supabase
        .from("room_games")
        .insert([{
          room_id: roomId,
          game_number: 1,
          questions_data: structuredClone(questions) as unknown as Json,
        }])
        .select()
        .single();
      
      // Store questions WITH shuffled_answers, icon_slug, AND game_id for validation
      const insertResults2 = await Promise.all(questions.map((q, index) => 
        supabase.from("room_questions").insert({
          room_id: roomId,
          question_index: index,
          question_text: q.question,
          correct_answer: q.correctAnswer,
          incorrect_answers: q.incorrectAnswers,
          shuffled_answers: q.allAnswers,
          difficulty: q.difficulty,
          icon_slug: q.iconSlug || null,
          game_id: game?.id, // CRITICAL: Link to current game for non-host validation
        }).select()
      ));
      
      // Abort BEFORE flipping status to "playing" if any insert failed or the
      // full set isn't readable yet - otherwise non-hosts sync a partial round
      const failedInserts2 = insertResults2.filter(r => r.error);
      if (failedInserts2.length > 0) {
        console.error("[MP startNewRound/library] Some question inserts failed:", failedInserts2.map(f => f.error));
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }
      if (!(await verifyQuestionsCommitted(roomId, game?.id, questions.length))) {
        console.error(`[MP startNewRound/library] Questions not fully committed for game ${game?.id}, aborting round start`);
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }

      // Update room status (after questions are committed, includes host_is_observer)
      await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
          current_game_id: game?.id,
          host_is_observer: hostShouldObserve,
          total_questions: questions.length,
        })
        .eq("id", roomId);

      // Track expected game_id so isNewGameWhilePlaying detection works for the caller too
      expectedGameIdRef.current = game?.id ?? null;

      setState(prev => ({
        ...prev,
        questions,
        currentQuestionIndex: 0,
        myScore: 0,
        lastQuestionResult: null,
        opponentAnswers: {},
        hostIsObserver: hostShouldObserve, // FIX: Set observer mode (always false for library categories)
        observerBonusThisRound: 0,
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
      toast.error(tStandalone("extra.mpGameStartError"));
    }
  }, [state.currentRoom, user]);

  // Start next round from queue - pop queue item and start with that category
  // This function DIRECTLY fetches questions with the new category to avoid race conditions
  const startNextFromQueue = useCallback(async () => {
    if (!state.currentRoom || !user) return;
    
    const roomId = state.currentRoom.id;
    // FIX: Use fresh default for new rounds from queue
    // Don't read from stale state which may have old value from previous round
    const questionCount = 5;
    
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
      
      // Determine if host should observe (only for user trivia, not library categories)
      const currentUserIsHost = state.currentRoom.host_user_id === user.id;
      const hostShouldObserve = currentUserIsHost && nextItem.source_type === "user_trivia" && nextItem.user_trivia_id
        ? await shouldHostObserve(nextItem.user_trivia_id, user.id)
        : false;
      
      console.log(`[startNextFromQueue] Observer mode: isHost=${currentUserIsHost}, sourceType=${nextItem.source_type}, shouldObserve=${hostShouldObserve}`);
      
      // NOTE: host_is_observer is now merged into the final room update
      // to prevent premature realtime triggers that cause non-hosts to fetch stale data
      
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
          
          // Clear old data with verification
          const deleteSuccess5 = await safeDeleteRoomQuestions(roomId);
          if (!deleteSuccess5) {
            console.error("[MP startNextFromQueue/userTrivia] Failed to delete old questions after retries");
            toast.error(tStandalone("extra.mpGameStartFailed"));
            return;
          }
          
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
          
          // Reset ALL participant scores for fair game start
          await resetAllParticipants(roomId);
          
          // FIX: Immediately reset local participants to prevent stale auto-advance
          setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));
          
          // Create room_game record FIRST to get game_id
          const { data: game } = await supabase
            .from("room_games")
            .insert([{
              room_id: roomId,
              game_number: 1,
              questions_data: structuredClone(questions) as unknown as Json,
            }])
            .select()
            .single();
          
          // Store in room_questions WITH game_id for validation
          const insertResults3 = await Promise.all(questions.map((q, index) => 
            supabase.from("room_questions").insert({
              room_id: roomId,
              question_index: index,
              question_text: q.question,
              correct_answer: q.correctAnswer,
              incorrect_answers: q.incorrectAnswers,
              difficulty: q.difficulty,
              shuffled_answers: q.allAnswers,
              icon_slug: q.iconSlug || null,
              game_id: game?.id, // CRITICAL: Link to current game for non-host validation
            }).select()
          ));
          
          // Abort BEFORE flipping status to "playing" if any insert failed or the
          // full set isn't readable yet - otherwise non-hosts sync a partial round
          const failedInserts3 = insertResults3.filter(r => r.error);
          if (failedInserts3.length > 0) {
            console.error("[MP startNextFromQueue/userTrivia] Some question inserts failed:", failedInserts3.map(f => f.error));
            toast.error(tStandalone("extra.mpGameStartFailed"));
            return;
          }
          if (!(await verifyQuestionsCommitted(roomId, game?.id, questions.length))) {
            console.error(`[MP startNextFromQueue/userTrivia] Questions not fully committed for game ${game?.id}, aborting round start`);
            toast.error(tStandalone("extra.mpGameStartFailed"));
            return;
          }

          // Update room (after questions are committed)
          await supabase
            .from("game_rooms")
            .update({
              category_id: null,
              category_name: categoryName,
              total_questions: questions.length,
              status: "playing",
              started_at: new Date().toISOString(),
              current_game_id: game?.id,
              host_is_observer: hostShouldObserve,
            })
            .eq("id", roomId);

          // Track expected game_id so isNewGameWhilePlaying detection works for the caller too
          expectedGameIdRef.current = game?.id ?? null;

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
            hostIsObserver: hostShouldObserve, // FIX: Set observer mode
            observerBonusThisRound: 0,
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
          
          // Increment plays_count for user trivia (enables host-observer policy after first play)
          await supabase.rpc('increment_quiz_plays', { 
            post_id: nextItem.user_trivia_id 
          });
          // Notify trivia creator - notify for each non-host participant
          const nonHostParticipants = participants.filter(p => p.user_id !== state.currentRoom?.host_user_id);
          for (const participant of nonHostParticipants) {
            await notifyTriviaCreator(nextItem.user_trivia_id, participant.user_id);
          }
          
          return; // Done with custom trivia
        }
      }
      
      // Regular category or random - fetch new questions directly with correct category
      // Handle __mixed__ category - triggers multi-category mode
      const isMixedCategory = nextItem.category_id === "__mixed__";
      const newCategoryId = nextItem.source_type === "random" ? null : (isMixedCategory ? undefined : nextItem.category_id);
      const newCategoryName = nextItem.source_type === "random" 
        ? "შემთხვევითი" 
        : isMixedCategory
          ? "სხვადასხვა"
          : (nextItem.category_name || "კატეგორია");
      
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
        toast.error(tStandalone("extra.mpQuestionsNotFound"));
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
      
      // Clear old data with verification
      const deleteSuccess6 = await safeDeleteRoomQuestions(roomId);
      if (!deleteSuccess6) {
        console.error("[MP startNextFromQueue/library] Failed to delete old questions after retries");
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }
      
      // Update used_question_ids
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];
      
      // Reset ALL participants for fair game start
      await resetAllParticipants(roomId);
      
      // FIX: Immediately reset local participants to prevent stale auto-advance
      setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));
      
      // Mark questions as seen
      markQuestionsAsSeen(questions.map(q => q.id));
      
      // Create room_game record FIRST to get game_id
      const { data: game } = await supabase
        .from("room_games")
        .insert([{
          room_id: roomId,
          game_number: 1,
          questions_data: structuredClone(questions) as unknown as Json,
        }])
        .select()
        .single();
      
      // Store questions with icon_slug AND game_id for validation
      const insertResults4 = await Promise.all(questions.map((q, index) => 
        supabase.from("room_questions").insert({
          room_id: roomId,
          question_index: index,
          question_text: q.question,
          correct_answer: q.correctAnswer,
          incorrect_answers: q.incorrectAnswers,
          shuffled_answers: q.allAnswers,
          difficulty: q.difficulty,
          icon_slug: q.iconSlug || null,
          game_id: game?.id, // CRITICAL: Link to current game for non-host validation
        }).select()
      ));
      
      // Abort BEFORE flipping status to "playing" if any insert failed or the
      // full set isn't readable yet - otherwise non-hosts sync a partial round
      const failedInserts4 = insertResults4.filter(r => r.error);
      if (failedInserts4.length > 0) {
        console.error("[MP startNextFromQueue/library] Some question inserts failed:", failedInserts4.map(f => f.error));
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }
      if (!(await verifyQuestionsCommitted(roomId, game?.id, questions.length))) {
        console.error(`[MP startNextFromQueue/library] Questions not fully committed for game ${game?.id}, aborting round start`);
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }

      // Update room with new category and game info (after questions are committed)
      await supabase
        .from("game_rooms")
        .update({
          category_id: newCategoryId,
          category_name: newCategoryName,
          used_question_ids: newUsedIds,
          total_questions: questions.length,
          status: "playing",
          started_at: new Date().toISOString(),
          current_game_id: game?.id,
          host_is_observer: hostShouldObserve,
        })
        .eq("id", roomId);

      // Track expected game_id so isNewGameWhilePlaying detection works for the caller too
      expectedGameIdRef.current = game?.id ?? null;

      // Update state with new category and questions
      setState(prev => ({
        ...prev,
        currentRoom: prev.currentRoom ? {
          ...prev.currentRoom,
          category_id: newCategoryId,
          category_name: newCategoryName,
          total_questions: questions.length,
        } : null,
        questions,
        currentQuestionIndex: 0,
        myScore: 0,
        lastQuestionResult: null,
        opponentAnswers: {},
        hostIsObserver: hostShouldObserve, // FIX: Set observer mode (always false for library categories)
        observerBonusThisRound: 0,
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
      toast.error(tStandalone("extra.mpGameStartError"));
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
      toast.success(tStandalone("extra.mpLeftRoom"));
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error(tStandalone("extra.mpLeaveRoomFailed"));
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
      toast.success(tStandalone("extra.mpRoomDeleted"));
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(tStandalone("extra.mpDeleteRoomFailed"));
    }
  }, [state.currentRoom, isHost, cleanupChannels]);

  // Reset multiplayer
  const resetMultiplayer = useCallback(() => {
    cleanupChannels();
    setState(initialState);
    setParticipants([]);
  }, [cleanupChannels]);

  // Award observer bonus - called when host is observing and players make mistakes
  // Accepts pre-calculated bonus amount (fair scoring is calculated by caller)
  const awardObserverBonus = useCallback(async (bonusAmount: number) => {
    if (!state.currentRoom || !user || !state.hostIsObserver) return;
    if (bonusAmount <= 0) return;
    
    const newScore = state.myScore + bonusAmount;
    const newBonusTotal = state.observerBonusThisRound + bonusAmount;

    // Atomic delta via RPC (falls back to absolute write pre-migration)
    const applied = await incrementParticipantScore(state.currentRoom.id, bonusAmount);
    if (!applied) {
      await supabase
        .from("room_participants")
        .update({ score: newScore })
        .eq("room_id", state.currentRoom.id)
        .eq("user_id", user.id);
    }

    // Keep local myScore optimistic
    setState(prev => ({
      ...prev,
      myScore: newScore,
      observerBonusThisRound: newBonusTotal,
    }));
  }, [state.currentRoom, state.hostIsObserver, state.myScore, state.observerBonusThisRound, user]);

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
    currentOpponentAnswers: state.opponentAnswers[state.currentQuestionIndex] || {},
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
    awardObserverBonus,
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
    awardObserverBonus,
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
