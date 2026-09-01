// Multiplayer Context V2 - Manages room-based trivia games
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { t as tStandalone } from "@/utils/standaloneTranslation";
import { supabase } from "@/integrations/supabase/client";
import { roomVisibilityFields } from "@/utils/roomVisibility";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "./AuthContext";
import { TriviaQuestion } from "@/hooks/useTrivia";
import { toast } from "@/lib/toast";
import { getRandomGradient } from "@/config/roomGradients";
import { siteUrl } from "@/config/site";
import { getQuestions } from "@/services/questionService";
import { shuffleArray } from "@/utils/shuffle";
import { readAppLanguage } from "@/utils/appLanguage";
import { getSeenQuestionIds, markQuestionsAsSeen } from "@/services/questionTracker";
import { useUserPresence } from "@/hooks/useUserPresence";
import { createNotification } from "@/hooks/useNotifications";
import { calculatePoints, FIRST_ANSWER_BONUS } from "@/utils/scoring";
import { activeRoundPlayers } from "@/utils/roundPlayers";
import { getMostLikelyPrompts } from "@/services/questionService";
import {
  MOST_LIKELY_CATEGORY_ID,
  MOST_LIKELY_QUESTIONS_PER_ROUND,
  MOST_LIKELY_VOTE_SENTINEL,
  mostLikelyAnswerOptions,
  mostLikelyBallot,
} from "@/config/partyCategories";

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
      // See QuizPlayModal: the list reads data.sender_nickname to fill {name},
      // so writing the name only into the title text left it showing "someone".
      { post_id: userTriviaId, player_id: playerId, sender_nickname: playerProfile?.nickname ?? null }
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
  // Independent tables - delete in parallel to save a round-trip
  await Promise.all([
    supabase.from("room_questions").delete().eq("room_id", roomId),
    supabase.from("player_answers").delete().eq("room_id", roomId),
  ]);
  
  let verified = false;
  for (let i = 0; i < 3; i++) {
    // Verify immediately - the delete above already completed, so waiting
    // before the first check just slows every round start down
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
    await new Promise(resolve => setTimeout(resolve, 100));
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

// Whether a room is set to the "Most Likely To" party category.
// game_rooms.category_id holds either the slug or the category UUID depending
// on which path wrote it (see utils/categoryIdentity.ts), so a uuid has to be
// resolved through the category row rather than compared to the slug.
const isMostLikelyCategoryId = async (categoryId: string | null | undefined): Promise<boolean> => {
  if (!categoryId) return false;
  if (categoryId === MOST_LIKELY_CATEGORY_ID) return true;
  if (!categoryId.includes("-")) return false; // some other slug
  const { data } = await supabase
    .from("categories")
    .select("category_id")
    .eq("id", categoryId)
    .maybeSingle();
  return data?.category_id === MOST_LIKELY_CATEGORY_ID;
};

// Build a "Most Likely To" round: vote prompts in the initiator's language,
// with the room's player names as every question's answers. correctAnswer
// carries the '__vote__' sentinel — there IS no correct answer until the
// votes are tallied server-side (settle_most_likely_votes).
const buildMostLikelyQuestions = async (
  categoryId: string,
  categoryName: string | null,
  players: Array<{ user_id: string; nickname: string }>,
  usedIds: string[],
): Promise<TriviaQuestion[]> => {
  const options = mostLikelyAnswerOptions(players);
  if (options.length === 0) return [];
  const prompts = await getMostLikelyPrompts(categoryId, MOST_LIKELY_QUESTIONS_PER_ROUND, usedIds);
  return prompts.map(p => ({
    id: p.id,
    question: p.question,
    correctAnswer: MOST_LIKELY_VOTE_SENTINEL,
    incorrectAnswers: [],
    // Big rooms don't scroll a wall of names: each question ballots a random
    // 4-name subset, rotating who is on the ballot question to question.
    allAnswers: mostLikelyBallot(options),
    difficulty: "easy" as const,
    category: categoryName || "Party",
    iconSlug: p.iconSlug || undefined,
  }));
};

// Settle a vote question (or, with null, every still-open one of the game).
// Idempotent server-side; every device calls it when it sees all votes in and
// exactly one claim wins. Cast needed until Supabase types are regenerated.
// Exported for the results screen's catch-all sweep before complete_room_round.
export const settleMostLikelyVotes = async (
  roomId: string,
  gameId: string,
  questionIndex: number | null
): Promise<boolean> => {
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>)("settle_most_likely_votes", {
    p_room_id: roomId,
    p_game_id: gameId,
    p_question_index: questionIndex,
  });
  if (error) {
    console.error("[MP] settle_most_likely_votes failed:", error);
    return false;
  }
  return true;
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

/** The settled outcome of one "Most Likely To" question, as written by
 *  settle_most_likely_votes and delivered over realtime. */
export interface VoteResult {
  winners: string[];
  voteCounts: Record<string, number>;
}

interface MultiplayerState {
  phase: GamePhase;
  currentRoom: GameRoom | null;
  currentGame: RoomGame | null;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  myScore: number;
  /**
   * The result of the last answer *this device* submitted.
   *
   * Carries the question it belongs to. submitAnswer only sets this after
   * four network round trips, and the player can be two questions further on
   * by the time it lands — without the index there is no way to tell a result
   * for the question on screen from one for a question already gone.
   */
  lastQuestionResult: { correct: boolean; points: number; questionIndex: number } | null;
  timePerQuestion: number;
  // Keyed by question_index -> user_id so late-arriving realtime inserts are
  // never dropped when a player has already advanced to the next question
  opponentAnswers: Record<number, Record<string, PlayerAnswer>>;
  // "Most Likely To" rounds: settled outcomes by question_index for the
  // CURRENT game (reset wherever opponentAnswers is). Empty on trivia rounds.
  voteResults: Record<number, VoteResult>;
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
  // True when the current round is a "Most Likely To" vote round — derived
  // from the sentinel every vote question carries, so it is right on every
  // device (initiator and synced) without resolving the category.
  isMostLikelyRound: boolean;

  // Actions
  createRoom: (categoryId?: string, categoryName?: string, customQuestions?: any[], roomName?: string | null, roomIcon?: string | null, preferredRoomCode?: string, isPublic?: boolean) => Promise<GameRoom | null>;
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
  applyMissedTime: (awaySeconds: number) => Promise<{ skipped: number; finished: boolean }>; // Skip questions missed while the app was backgrounded
  
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
  voteResults: {},
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
  isMostLikelyRound: false,
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
  applyMissedTime: async () => { missingProvider(); return { skipped: 0, finished: false }; },
  showCreateModal: false,
  setShowCreateModal: () => missingProvider(),
  showJoinModal: false,
  setShowJoinModal: () => missingProvider(),
});

// Production domain for share links

export function MultiplayerProviderV2({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const { setRoomPresence } = useUserPresence();
  const [state, setState] = useState<MultiplayerState>(initialState);

  /**
   * Mirror onto the local room the start the database was just told about.
   *
   * Every path that begins a round writes status/started_at/current_game_id to
   * game_rooms and then flips local phase to "playing" — but left the local
   * room row untouched, still carrying the previous round's timestamp. The
   * round-start screen is driven by that row, so on the client that pressed
   * start the gate saw a room that had not begun: it rendered question one,
   * and the 3-2-1 appeared a beat later when realtime delivered the row back.
   * Question first, countdown second, which is exactly backwards.
   *
   * Called immediately after the write and before the phase flip, so the room
   * is already "playing" by the time anything reads it.
   */
  const stampRoomStarted = useCallback((startedAt: string, gameId: string | null | undefined) => {
    setState(prev => prev.currentRoom
      ? {
          ...prev,
          currentRoom: {
            ...prev.currentRoom,
            status: "playing" as const,
            started_at: startedAt,
            current_game_id: gameId ?? prev.currentRoom.current_game_id,
          },
        }
      : prev);
  }, []);
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

  // A "Most Likely To" round is recognised by the sentinel its questions
  // carry — identical on the initiator and on devices that synced the round
  // from room_questions, with no category resolution needed.
  const isMostLikelyRound =
    state.questions.length > 0 &&
    state.questions[0]?.correctAnswer === MOST_LIKELY_VOTE_SENTINEL;

  // Vote bookkeeping for the settlement trigger below. Keyed by
  // `${gameId}:${questionIndex}` so stale entries from finished rounds are
  // never read and nothing needs clearing on round changes.
  const ownVoteKeysRef = useRef<Set<string>>(new Set());
  const settleRequestedRef = useRef<Set<string>>(new Set());

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
                voteResults: {},
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

              // No warm-up delay needed: every start path verifies the full
              // question set is committed BEFORE flipping the room to
              // "playing", so the first fetch normally succeeds immediately.
              // The retry loop below covers the rare replication lag.
              let attempts = 0;
              const MAX_ATTEMPTS = 10;
              const RETRY_DELAY = 400;
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
                  // Media MUST survive the sync - image questions render the picture
                  // instead of the question text, so dropping these leaves the
                  // non-initiating player with an unanswerable text-only question
                  imageUrl: q.image_url || undefined,
                  videoUrl: q.video_url || undefined,
                  audioUrl: q.audio_url || undefined,
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
                  voteResults: {},
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
            // A "completed" event can be stale: a slow player finishing the
            // PREVIOUS round can mark the room completed right as (or just
            // after) the host starts the next one. If this client is already
            // synced into a newer game, dropping to results would strand it
            // there - the follow-up "playing" event is skipped as
            // alreadySyncedThisGame. Only honor completions for the game this
            // client is actually in.
            const staleCompletion =
              !!updated.current_game_id &&
              !!expectedGameIdRef.current &&
              updated.current_game_id !== expectedGameIdRef.current;
            if (staleCompletion) {
              console.log(`[MP] Ignoring stale completed event for game ${updated.current_game_id} (current: ${expectedGameIdRef.current})`);
            } else {
              setState(prev => ({ ...prev, phase: "results" }));
            }
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
              voteResults: {},
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
                voteResults: {},
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

              // No warm-up delay: question commit is verified before the room
              // flips to "playing" (see verifyQuestionsCommitted) - fetch now,
              // retry only on the rare replication lag
              let attempts = 0;
              const MAX_ATTEMPTS = 10;
              const RETRY_DELAY = 400;
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
                  imageUrl: q.image_url || undefined,
                  videoUrl: q.video_url || undefined,
                  audioUrl: q.audio_url || undefined,
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
                  voteResults: {},
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
                .select("host_user_id, host_is_observer, status, total_questions, current_game_id")
                .eq("id", roomId)
                .maybeSingle();

              // The host can start the NEXT round while a slow player is still
              // finishing the previous one, so the room goes straight from
              // round-N "playing" to round-N+1 "playing" without ever leaving
              // "playing". A finish of the OLD round must then not complete the
              // room - it would kill the freshly started round and kick the
              // players already synced into it back to results.
              const finishedStaleGame =
                !!roomCheck?.current_game_id &&
                !!expectedGameIdRef.current &&
                roomCheck.current_game_id !== expectedGameIdRef.current;

              // Only proceed if the room is still "playing" the game WE finished
              if (roomCheck && roomCheck.status === "playing" && !finishedStaleGame) {
                // Same rule the observer screen uses, so the two cannot drift.
                // This filter already skipped the observer host and anyone who
                // had left; it did not skip an *invited* seat, which is a row
                // for a player who never arrived and whose current_question
                // therefore never leaves 0. One unanswered invitation could
                // hold a finished round open indefinitely.
                const activePlayers = activeRoundPlayers(allParticipants, {
                  hostIsObserver: roomCheck.host_is_observer,
                  hostUserId: roomCheck.host_user_id,
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
                  let completeQuery = supabase
                    .from("game_rooms")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("id", roomId)
                    .eq("status", "playing"); // Prevent double-update race
                  // CAS on the game id: if a new round started between our room
                  // read and this write, match 0 rows instead of completing the
                  // new round the instant it begins
                  if (roomCheck.current_game_id) {
                    completeQuery = completeQuery.eq("current_game_id", roomCheck.current_game_id);
                  }
                  await completeQuery;
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
      // "Most Likely To" settlements. Written only by settle_most_likely_votes;
      // the moment the row exists every device learns the winners. Rows from a
      // previous game (a stale settle racing a new round) are dropped by game id.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_vote_results", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as {
            game_id: string;
            question_index: number;
            winners: string[] | null;
            vote_counts: Record<string, number> | null;
          };
          setState(prev => {
            const currentGameId = prev.currentRoom?.current_game_id;
            if (currentGameId && row.game_id !== currentGameId) return prev;
            return {
              ...prev,
              voteResults: {
                ...prev.voteResults,
                [row.question_index]: {
                  winners: row.winners || [],
                  voteCounts: row.vote_counts || {},
                },
              },
            };
          });
        }
      )
      .subscribe();
    
    channelsRef.current = [roomChannel, participantsChannel, profilesChannel, answersChannel];

    // Initial fetch
    fetchParticipants(roomId);

    // Backfill answers already in the table. In async play — a friend
    // playing after the host already finished — the host's rows predate this
    // subscription, so no INSERT event will ever deliver them. Rows are
    // wiped on every round start (safeDeleteRoomQuestions), so everything
    // here belongs to the current round.
    void supabase
      .from("player_answers")
      .select("*")
      .eq("room_id", roomId)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setState(prev => {
          const merged = { ...prev.opponentAnswers };
          for (const row of data as PlayerAnswer[]) {
            if (row.user_id === user?.id) continue;
            merged[row.question_index] = {
              ...(merged[row.question_index] || {}),
              // Live events win over the backfill for the same user+question
              [row.user_id]: merged[row.question_index]?.[row.user_id] || row,
            };
          }
          return { ...prev, opponentAnswers: merged };
        });
      });

    // Backfill vote settlements the same way: a device syncing into a
    // "Most Likely To" round mid-game missed the INSERT events for questions
    // already settled. Cast needed until Supabase types are regenerated.
    void (supabase as any)
      .from("room_vote_results")
      .select("game_id, question_index, winners, vote_counts")
      .eq("room_id", roomId)
      .then(({ data }: { data: Array<{ game_id: string; question_index: number; winners: string[] | null; vote_counts: Record<string, number> | null }> | null }) => {
        if (!data || data.length === 0) return;
        setState(prev => {
          const currentGameId = prev.currentRoom?.current_game_id;
          const merged = { ...prev.voteResults };
          for (const row of data) {
            if (currentGameId && row.game_id !== currentGameId) continue;
            // Live events win over the backfill for the same question
            merged[row.question_index] = merged[row.question_index] || {
              winners: row.winners || [],
              voteCounts: row.vote_counts || {},
            };
          }
          return { ...prev, voteResults: merged };
        });
      })
      .catch(() => {
        // Table not migrated yet — vote rounds simply won't settle visibly
      });

    return () => {
      if (fetchParticipantsDebounceRef.current) {
        clearTimeout(fetchParticipantsDebounceRef.current);
        fetchParticipantsDebounceRef.current = null;
      }
      cleanupChannels();
    };
  }, [state.currentRoom?.id, user?.id, fetchParticipants, debouncedFetchParticipants, cleanupChannels]); // Removed state.phase and isHost - use refs instead

  // "Most Likely To" settlement trigger. Every device watches the votes land
  // (its own via ownVoteKeysRef, everyone else's via opponentAnswers) and
  // calls the settle RPC for a question the moment all active players have a
  // vote row for it. The RPC's claim makes concurrent calls harmless, so no
  // device needs to be elected — whoever sees completeness first settles.
  // Questions abandoned mid-round (a player quits without a vote row) are
  // caught by the results screen's sweep instead.
  useEffect(() => {
    if (!isMostLikelyRound || !user) return;
    const room = state.currentRoom;
    const gameId = room?.current_game_id;
    if (!room || !gameId) return;

    const expectedVoters = activeRoundPlayers(participants, {
      hostIsObserver: state.hostIsObserver,
      hostUserId: room.host_user_id,
    }).length;
    if (expectedVoters === 0) return;

    for (let idx = 0; idx < state.questions.length; idx++) {
      if (state.voteResults[idx]) continue;
      const key = `${gameId}:${idx}`;
      if (settleRequestedRef.current.has(key)) continue;
      const opponentVotes = Object.keys(state.opponentAnswers[idx] || {}).length;
      const ownVote = ownVoteKeysRef.current.has(key) ? 1 : 0;
      if (opponentVotes + ownVote < expectedVoters) continue;

      settleRequestedRef.current.add(key);
      void settleMostLikelyVotes(room.id, gameId, idx).then(ok => {
        // A failed call may retry on the next answer/participant event
        if (!ok) settleRequestedRef.current.delete(key);
      });
    }
  }, [
    isMostLikelyRound,
    state.opponentAnswers,
    state.voteResults,
    state.questions.length,
    state.currentRoom,
    state.hostIsObserver,
    participants,
    user,
  ]);

  // Generate room code locally - the server-side uniqueness RPC cost a full
  // round-trip on every create for a collision chance of ~1 in a billion
  // (32^6 codes). The insert below retries on a unique-constraint hit anyway.
  const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create room
  const createRoom = useCallback(async (
    categoryId?: string, 
    categoryName?: string, 
    customQuestions?: any[],
    providedRoomName?: string | null,
    providedRoomIcon?: string | null,
    /**
     * The code to use, when the caller has already told somebody what it will
     * be. Create Room shares an invite link naming the room before the room
     * exists, and that link only resolves if the room is created with the code
     * the link carries. A collision falls back to a fresh code on the next
     * attempt, which costs that one shared link and nothing else.
     */
    preferredRoomCode?: string,
    /**
     * Publish the room to the Public tab. Defaults to false, matching the
     * column default: a caller that has no opinion — matchmaking, a
     * challenge, anything added later — makes a private room, and only the
     * create screen's switch publishes one.
     */
    isPublic = false,
  ): Promise<GameRoom | null> => {
    if (!user || !profile) {
      toast.error(tStandalone("extra.mpAuthRequired"));
      return null;
    }
    
    setLoading(true);
    try {
      // Use provided room name/icon if given. When absent, the room is
      // created immediately with no name (the lobby shows a default) and
      // the cosmetic AI name arrives in the background — waiting on the
      // edge function here used to stall every room creation for up to 6
      // seconds on cold starts.
      const finalRoomName: string | null = providedRoomName || null;
      const finalRoomIcon: string | null = providedRoomIcon || null;

      // Insert with a locally generated code; on the (astronomically rare)
      // unique-constraint collision, regenerate and retry
      let room: GameRoom | null = null;
      let error: { code?: string; message?: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const roomCode = attempt === 0 && preferredRoomCode ? preferredRoomCode : generateRoomCode();
        const res = await supabase
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
            ...(await roomVisibilityFields(isPublic)),
            last_activity_at: new Date().toISOString(),
          })
          .select()
          .single();
        error = res.error;
        room = (res.data as unknown as GameRoom) ?? null;
        if (!error || error.code !== "23505") break; // 23505 = unique violation (code collision)
      }

      if (error || !room) throw error ?? new Error("Room insert returned no row");
      
      // Add host as participant. A room whose host isn't a participant breaks
      // everything downstream (completion checks, host transfer), so clean up
      // and fail loudly instead of entering a half-created lobby.
      const { error: hostInsertError } = await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: user.id,
        nickname: profile.nickname || "Player",
        avatar_url: profile.avatar_url,
        country_code: profile.country_code,
        is_host: true,
      });
      if (hostInsertError) {
        await supabase.from("game_rooms").delete().eq("id", room.id);
        throw hostInsertError;
      }

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
            image_url: q.image_url || null,
            video_url: q.video_url || null,
            audio_url: q.audio_url || null,
          });
        }));
      }
      
      // Fill in the AI-generated name after the fact; the lobby's realtime
      // subscription on game_rooms picks the update up automatically.
      if (!finalRoomName) {
        const createdRoomId = room.id;
        void supabase.functions
          // Same storage key LanguageContext writes; without it the server
          // falls back to Georgian regardless of the user's language.
          .invoke('generate-room-name', {
            body: { language: readAppLanguage() },
          })
          .then(({ data, error: nameError }) => {
            if (!nameError && data?.name) {
              return supabase
                .from("game_rooms")
                .update({ room_name: data.name, room_icon: data.icon_url || null })
                .eq("id", createdRoomId);
            }
          })
          .catch((e) => console.log('Room name generation skipped:', e));
      }

      expectedGameIdRef.current = null; // Fresh room - no game yet
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
    if (!user) {
      toast.error(tStandalone("extra.mpAuthRequired"));
      return false;
    }
    // The profile arrives after the session does. Refusing the whole join for
    // it meant a tap in that window died with an "auth required" toast on an
    // account that was signed in — the room only opened after a reload, once
    // the profile had landed. The row it fills in is cosmetic, so fall back
    // and let the realtime profile update correct it.
    const joiningProfile = profile ?? {
      nickname: user.email?.split("@")[0] || "Player",
      avatar_url: null,
      country_code: null,
    };
    
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
              voteResults: {},
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
          // Align the game-id ref with the room's current game so stale ids
          // from a previous room/round can't misclassify later status events
          expectedGameIdRef.current = newPhase === "results" ? room.current_game_id : null;
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
          nickname: joiningProfile.nickname || "Player",
          avatar_url: joiningProfile.avatar_url,
          country_code: joiningProfile.country_code,
          is_host: false,
        });

        expectedGameIdRef.current = null; // Joining fresh - not synced into any game
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
        // RLS may block this insert (e.g. migration not applied for guest
        // starters) - abort loudly instead of starting a round with no game id
        if (!game) {
          console.error("[MP] Failed to create room_games record - aborting round start");
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }
        
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
        const roundStartedAt = new Date().toISOString();
        await supabase
          .from("game_rooms")
          .update({
            category_name: categoryName,
            total_questions: questions.length,
            status: "playing",
            started_at: roundStartedAt,
            current_game_id: game?.id,
            host_is_observer: shouldObserve,
          })
          .eq("id", roomId);
        stampRoomStarted(roundStartedAt, game?.id);

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
          voteResults: {},
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
      // Old-question cleanup is independent of the question fetch - overlap
      // the two waits (the old rows belong to an already-finished round)
      const pendingDelete = safeDeleteRoomQuestions(roomId);

      let questions: TriviaQuestion[];
      if (!isMixedCategory && await isMostLikelyCategoryId(freshRoom.category_id)) {
        // "Most Likely To": vote prompts with the room's player names as the
        // answers. Everything downstream (room_questions rows, non-host sync,
        // rendering) rides the normal shape; the '__vote__' sentinel in
        // correct_answer is what flips play into vote mode.
        questions = await buildMostLikelyQuestions(
          freshRoom.category_id!,
          freshRoom.category_name,
          activeRoundPlayers(participants, {
            hostIsObserver: shouldObserve,
            hostUserId: freshRoom.host_user_id,
          }),
          usedIds,
        );
      } else {
        const result = await getQuestions({
          mode: 'vs',
          categorySlug: isMixedCategory ? undefined : (freshRoom.category_id || undefined),
          count: questionCount,
          excludeIds: usedIds,
        });
        // Map to TriviaQuestion format using FRESH category name
        questions = result.questions.map(q => ({
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
      }

      if (questions.length === 0) {
        await pendingDelete;
        toast.error(tStandalone("extra.mpQuestionsNotFound"));
        return;
      }

      // Mark questions as seen globally (unified tracking)
      markQuestionsAsSeen(questions.map(q => q.id));

      // used_question_ids rides along on the final status update - no
      // dedicated round-trip (and no extra realtime event) before the start
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];
      await saveQuestionsAndStartGame(
        roomId,
        questions,
        shouldObserve,
        { used_question_ids: newUsedIds },
        pendingDelete
      );

      // Consume matching queue item if it exists (prevents "next round" showing played category)
      await consumeMatchingQueueItem(roomId, freshRoom.category_id, null);
      
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error(tStandalone("extra.mpGameStartError"));
    }
  }, [state.currentRoom, isHost, user, participants, stampRoomStarted]);

  // Helper to save questions and update room status.
  // pendingDelete: callers can start safeDeleteRoomQuestions BEFORE fetching
  // questions and pass the promise, overlapping the two network waits.
  // extraRoomFields: merged into the final status update so bookkeeping like
  // used_question_ids doesn't need its own round-trip (and its own spurious
  // realtime event) before the round starts.
  const saveQuestionsAndStartGame = useCallback(async (
    roomId: string,
    questions: TriviaQuestion[],
    hostShouldObserve: boolean = false,
    extraRoomFields: Record<string, unknown> = {},
    pendingDelete?: Promise<boolean>
  ) => {
    // Clear old questions/answers with verification
    const deleteSuccess2 = await (pendingDelete ?? safeDeleteRoomQuestions(roomId));
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
    // RLS may block this insert (e.g. migration not applied for guest
    // starters) - abort loudly instead of starting a round with no game id
    if (!game) {
      console.error("[MP] Failed to create room_games record - aborting round start");
      toast.error(tStandalone("extra.mpGameStartFailed"));
      return;
    }

    // Store questions WITH shuffled_answers for sync AND game_id for
    // validation. The participant reset is independent of the question rows -
    // run it in the same batch; both only need to finish before the room
    // flips to "playing" below.
    // CRITICAL (reset): a stale "finished" status from the previous round
    // makes the completion check mark the room "completed" as soon as any
    // player answers the first question, kicking everyone to results mid-game
    const [insertResults] = await Promise.all([
      Promise.all(questions.map((q, index) =>
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
      )),
      resetAllParticipants(roomId),
    ]);

    // FIX: Immediately reset local participants to prevent stale auto-advance
    setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0, status: "playing" as const })));

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

    // Update room status (includes host_is_observer to prevent premature realtime trigger)
    // Also sync total_questions - a stale count from a previous custom-trivia round
    // breaks the "finished" detection when players re-enter the room
    const roundStartedAt = new Date().toISOString();
    await supabase
      .from("game_rooms")
      .update({
        status: "playing",
        started_at: roundStartedAt,
        current_game_id: game?.id,
        host_is_observer: hostShouldObserve,
        total_questions: questions.length,
        ...extraRoomFields,
      })
      .eq("id", roomId);
    stampRoomStarted(roundStartedAt, game?.id);

    // Track expected game_id so isNewGameWhilePlaying detection works for the host too
    expectedGameIdRef.current = game?.id ?? null;

    setState(prev => ({
      ...prev,
      questions,
      currentQuestionIndex: 0,
      myScore: 0,
      lastQuestionResult: null,
      opponentAnswers: {},
      voteResults: {},
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
  }, [stampRoomStarted]);

  // Correct answers in the current round, tracked client-side (resets on the
  // round's first question). Used to record the player's result on the trivia
  // leaderboard (quiz_post_plays) when a custom-trivia round finishes.
  const correctAnswersRef = useRef(0);

  // Submit answer
  const submitAnswer = useCallback(async (answer: string, timeRemaining: number) => {
    if (!state.currentRoom || !user) return;

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) return;

    // "Most Likely To": the answer is a VOTE for a player, and nobody is
    // right or wrong until every vote is in. Record it with no points — the
    // idempotent server-side tally (settle_most_likely_votes) marks the
    // majority answers correct and pays them once all votes exist. No
    // first-correct claim, no local score: speed is irrelevant to a vote.
    if (currentQuestion.correctAnswer === MOST_LIKELY_VOTE_SENTINEL) {
      const gameId = state.currentRoom.current_game_id;
      if (gameId) {
        ownVoteKeysRef.current.add(`${gameId}:${state.currentQuestionIndex}`);
      }
      await supabase.from("player_answers").insert({
        room_id: state.currentRoom.id,
        user_id: user.id,
        question_index: state.currentQuestionIndex,
        answer,
        is_correct: false,
        time_remaining: timeRemaining,
        points_earned: 0,
      });
      await supabase
        .from("room_participants")
        .update({ current_question: state.currentQuestionIndex + 1 })
        .eq("room_id", state.currentRoom.id)
        .eq("user_id", user.id);
      setState(prev => ({
        ...prev,
        // Same stamp the reveal and applyMissedTime key off; points arrive
        // later, via the participants subscription, when the vote settles.
        lastQuestionResult: {
          correct: false,
          points: 0,
          questionIndex: state.currentQuestionIndex,
        },
      }));
      return;
    }

    const isCorrect = answer === currentQuestion.correctAnswer;
    correctAnswersRef.current = state.currentQuestionIndex === 0
      ? (isCorrect ? 1 : 0)
      : correctAnswersRef.current + (isCorrect ? 1 : 0);

    // First-correct bonus: the claim table's primary key decides the race —
    // exactly one correct answerer per question gets the insert through.
    // Rooms without a game id (legacy) simply skip the bonus.
    let firstCorrectBonus = 0;
    const gameId = state.currentRoom.current_game_id;
    if (isCorrect && gameId) {
      try {
        const { data: claim } = await (supabase as any)
          .from("room_first_correct")
          .upsert(
            { game_id: gameId, question_index: state.currentQuestionIndex, user_id: user.id },
            { onConflict: "game_id,question_index", ignoreDuplicates: true }
          )
          .select();
        if (claim && claim.length > 0) {
          firstCorrectBonus = FIRST_ANSWER_BONUS;
        }
      } catch {
        // Table not migrated yet — play on without the bonus
      }
    }

    const points = calculatePoints(isCorrect, timeRemaining) + firstCorrectBonus;

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
      // Stamped with the question this is the result *of*, captured before the
      // awaits above rather than read after them.
      lastQuestionResult: {
        correct: isCorrect,
        points,
        questionIndex: state.currentQuestionIndex,
      },
    }));
  }, [state.currentRoom, state.questions, state.currentQuestionIndex, state.myScore, user]);

  // Next question
  const nextQuestion = useCallback(async () => {
    const isLastQuestion = state.currentQuestionIndex >= state.questions.length - 1;
    
    if (isLastQuestion) {
      // Show the results screen on this tap, before any network call.
      //
      // This used to poll room_participants until every answering player read
      // "finished", to keep the score ranking honest. For whoever finishes
      // FIRST that condition is unreachable by definition — the others are
      // still answering — so the loop always ran its full course: six
      // sequential round-trips plus six 250ms sleeps, five-odd seconds of a
      // dead button, and then the same partial ranking it would have shown
      // immediately. The button had no pending state either, so the wait read
      // as a broken tap and got tapped again.
      //
      // Nothing on the results screen needs that wait: submitAnswer already
      // awaited this player's final score write before revealing the answer,
      // and the participants subscription re-ranks the board as the others
      // finish.
      setState(prev => ({ ...prev, phase: "results" }));

      const room = state.currentRoom;

      // Mark THIS player as finished (not the whole room). Fire-and-forget:
      // the room-completion check keys off the realtime event this produces,
      // and no rendered value reads the status.
      if (room && user) {
        void supabase
          .from("room_participants")
          .update({ status: "finished" })
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .then(() => {
            // Belt and braces for a dozing realtime channel: one refresh once
            // our own write has landed, so a last finisher sees the final
            // ranking even if no participants event arrives.
            void fetchParticipants(room.id);
          });
      }

      // Custom-trivia rounds bump plays_count at start but never wrote the
      // quiz_post_plays row the trivia leaderboard reads — record this
      // player's result now (observer hosts didn't answer, so skip them).
      if (room?.user_trivia_id && user && !(isHost && state.hostIsObserver)) {
        void supabase.from("quiz_post_plays").insert({
          user_id: user.id,
          post_id: room.user_trivia_id,
          score: correctAnswersRef.current,
        });
      }
    } else {
      // Keep opponentAnswers - it's keyed per question_index, wiping it here
      // would drop answers already received for upcoming questions
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        lastQuestionResult: null,
      }));
    }
  }, [state.currentQuestionIndex, state.questions.length, state.currentRoom, state.hostIsObserver, isHost, user, fetchParticipants]);

  // A locked/backgrounded phone must not pause the match for everyone else.
  // Called when the app returns to the foreground mid-round: every full
  // question-length (15s) spent away skips one question - recorded as an
  // unanswered 0-point answer so opponents' progress views and the round
  // completion check stay consistent - and the player resumes on the next
  // unanswered question. Consuming all remaining questions finishes the round
  // for them.
  const applyMissedTime = useCallback(async (awaySeconds: number): Promise<{ skipped: number; finished: boolean }> => {
    const none = { skipped: 0, finished: false };
    if (!state.currentRoom || !user) return none;
    if (state.phase !== "playing") return none;
    if (isHost && state.hostIsObserver) return none; // Observers don't answer
    const total = state.questions.length;
    if (total === 0) return none;

    // If the current question was already answered before the phone locked,
    // the away time only affects the questions after it.
    //
    // Compared by index, not by "a result exists": nothing clears the previous
    // question's result when the next one starts, so a bare null check called
    // every question after the first one already answered.
    const answeredCurrent = state.lastQuestionResult?.questionIndex === state.currentQuestionIndex;
    const firstUnanswered = state.currentQuestionIndex + (answeredCurrent ? 1 : 0);
    const questionsLeft = total - firstUnanswered;
    if (questionsLeft <= 0) return none;

    const skipCount = Math.min(Math.floor(awaySeconds / state.timePerQuestion), questionsLeft);
    if (skipCount <= 0) return none;

    const roomId = state.currentRoom.id;
    const newIndex = firstUnanswered + skipCount;
    const finished = newIndex >= total;

    console.log(`[MP] Player away ${Math.round(awaySeconds)}s - skipping ${skipCount} question(s), resuming at ${newIndex}`);

    // Record each skipped question as an empty answer (0 points)
    await Promise.all(
      Array.from({ length: skipCount }, (_, i) =>
        supabase.from("player_answers").insert({
          room_id: roomId,
          user_id: user.id,
          question_index: firstUnanswered + i,
          answer: "",
          is_correct: false,
          time_remaining: 0,
          points_earned: 0,
        })
      )
    );

    // Vote rounds: the skipped empty answers ARE this player's (non-)votes -
    // record them so the settlement trigger counts this device as done
    const missedGameId = state.currentRoom.current_game_id;
    if (isMostLikelyRound && missedGameId) {
      for (let i = 0; i < skipCount; i++) {
        ownVoteKeysRef.current.add(`${missedGameId}:${firstUnanswered + i}`);
      }
    }

    // Advance own progress; marking "finished" lets the (game-aware)
    // completion check close the round when everyone is done
    await supabase
      .from("room_participants")
      .update({
        current_question: newIndex,
        ...(finished ? { status: "finished" as const } : {}),
      })
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    // Finishing by skip still counts as a play on the trivia leaderboard
    if (finished && state.currentRoom.user_trivia_id) {
      void supabase.from("quiz_post_plays").insert({
        user_id: user.id,
        post_id: state.currentRoom.user_trivia_id,
        score: correctAnswersRef.current,
      });
    }

    setState(prev => ({
      ...prev,
      currentQuestionIndex: Math.min(newIndex, total - 1),
      lastQuestionResult: null,
      ...(finished ? { phase: "results" as GamePhase } : {}),
    }));

    return { skipped: skipCount, finished };
  }, [state.currentRoom, state.phase, state.questions.length, state.currentQuestionIndex, state.lastQuestionResult, state.timePerQuestion, state.hostIsObserver, isHost, user, isMostLikelyRound]);

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
    expectedGameIdRef.current = null;
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
      voteResults: {},
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
    // Product rule: ONLY the host starts rounds. Non-host clients are pulled
    // into host-started games via the room realtime subscription.
    if (state.currentRoom.host_user_id !== user.id) {
      console.warn("[MP] startNewRound blocked - only the host can start rounds");
      return;
    }
    
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

        // Old-round cleanup is independent of the trivia fetch - overlap them
        const pendingDelete3 = safeDeleteRoomQuestions(roomId);
        const { data: triviaPost } = await supabase
          .from("user_quiz_posts")
          .select("questions, title")
          .eq("id", freshRoom.user_trivia_id)
          .single();

        if (!triviaPost?.questions) {
          await pendingDelete3;
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
            imageUrl: q.image_url || undefined,
            videoUrl: q.video_url || undefined,
            audioUrl: q.audio_url || undefined,
          };
        });
        
        // Clear old answers and questions with verification (started above,
        // overlapped with the trivia fetch)
        const deleteSuccess3 = await pendingDelete3;
        if (!deleteSuccess3) {
          console.error("[MP startNewRound/userTrivia] Failed to delete old questions after retries");
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
        // RLS may block this insert (e.g. migration not applied for guest
        // starters) - abort loudly instead of starting a round with no game id
        if (!game) {
          console.error("[MP] Failed to create room_games record - aborting round start");
          toast.error(tStandalone("extra.mpGameStartFailed"));
          return;
        }

        // Insert fresh questions with new game_id; the participant reset is
        // independent - run in the same batch (both must finish before the
        // room flips to "playing")
        const [insertResults1] = await Promise.all([
          Promise.all(questions.map((q, index) =>
            supabase.from("room_questions").insert({
              room_id: roomId,
              question_index: index,
              question_text: q.question,
              correct_answer: q.correctAnswer,
              incorrect_answers: q.incorrectAnswers,
              shuffled_answers: q.allAnswers,
              difficulty: q.difficulty,
              icon_slug: q.iconSlug || null,
              image_url: q.imageUrl || null,
              video_url: q.videoUrl || null,
              audio_url: q.audioUrl || null,
              game_id: game?.id, // CRITICAL: Link to current game for non-host validation
            }).select()
          )),
          resetAllParticipants(roomId),
        ]);

        // FIX: Immediately reset local participants to prevent stale auto-advance
        setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));

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
        const roundStartedAt = new Date().toISOString();
        await supabase
          .from("game_rooms")
          .update({
            status: "playing",
            started_at: roundStartedAt,
            current_game_id: game?.id,
            host_is_observer: hostShouldObserve,
            total_questions: questions.length,
          })
          .eq("id", roomId);
        stampRoomStarted(roundStartedAt, game?.id);

        // Track expected game_id so isNewGameWhilePlaying detection works for the caller too
        expectedGameIdRef.current = game?.id ?? null;

        setState(prev => ({
          ...prev,
          questions,
          currentQuestionIndex: 0,
          myScore: 0,
          lastQuestionResult: null,
          opponentAnswers: {},
          voteResults: {},
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

      // Fetch new questions from database using FRESH category; overlap the
      // independent old-round cleanup with the fetch
      console.log('[startNewRound] Fetching questions for category:', freshRoom.category_id);
      const pendingDelete4 = safeDeleteRoomQuestions(roomId);

      let questions: TriviaQuestion[];
      if (await isMostLikelyCategoryId(freshRoom.category_id)) {
        // "Most Likely To" replay: fresh prompts (used ids excluded), same
        // vote mechanic — see startGame for the shape.
        questions = await buildMostLikelyQuestions(
          freshRoom.category_id!,
          freshRoom.category_name,
          activeRoundPlayers(participants, {
            hostIsObserver: hostShouldObserve,
            hostUserId: freshRoom.host_user_id,
          }),
          usedIds,
        );
      } else {
        const result = await getQuestions({
          mode: 'vs',
          categorySlug: freshRoom.category_id || undefined,
          count: questionCount,
          excludeIds: usedIds,
        });
        // Map to TriviaQuestion format using FRESH category name
        questions = result.questions.map(q => ({
          id: q.id,
          question: q.question,
          correctAnswer: q.correctAnswer,
          incorrectAnswers: q.incorrectAnswers,
          allAnswers: q.allAnswers,
          difficulty: q.difficulty,
          category: freshRoom.category_name || q.category || "General",
          iconSlug: q.iconSlug,
          imageUrl: q.imageUrl || undefined,
          videoUrl: q.videoUrl || undefined,
          audioUrl: q.audioUrl || undefined,
        }));
      }

      if (questions.length === 0) {
        await pendingDelete4;
        toast.error(tStandalone("extra.mpQuestionsNotFound"));
        return;
      }

      // Clear old questions/answers with verification (overlapped with the
      // question fetch above)
      const deleteSuccess4 = await pendingDelete4;
      if (!deleteSuccess4) {
        console.error("[MP startNewRound/library] Failed to delete old questions after retries");
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }

      // Mark questions as seen globally
      markQuestionsAsSeen(questions.map(q => q.id));

      // used_question_ids rides along on the final status update below - a
      // dedicated write here cost a round-trip and a spurious realtime event
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];

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
      // RLS may block this insert (e.g. migration not applied for guest
      // starters) - abort loudly instead of starting a round with no game id
      if (!game) {
        console.error("[MP] Failed to create room_games record - aborting round start");
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }

      // Store questions WITH shuffled_answers, icon_slug, AND game_id for
      // validation; the participant reset is independent - same batch (both
      // only need to finish before the room flips to "playing")
      const [insertResults2] = await Promise.all([
        Promise.all(questions.map((q, index) =>
          supabase.from("room_questions").insert({
            room_id: roomId,
            question_index: index,
            question_text: q.question,
            correct_answer: q.correctAnswer,
            incorrect_answers: q.incorrectAnswers,
            shuffled_answers: q.allAnswers,
            difficulty: q.difficulty,
            icon_slug: q.iconSlug || null,
            image_url: q.imageUrl || null,
            video_url: q.videoUrl || null,
            audio_url: q.audioUrl || null,
            game_id: game?.id, // CRITICAL: Link to current game for non-host validation
          }).select()
        )),
        resetAllParticipants(roomId),
      ]);

      // FIX: Immediately reset local participants to prevent stale auto-advance
      setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));

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
      const roundStartedAt = new Date().toISOString();
      await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          started_at: roundStartedAt,
          current_game_id: game?.id,
          host_is_observer: hostShouldObserve,
          total_questions: questions.length,
          used_question_ids: newUsedIds,
        })
        .eq("id", roomId);
      stampRoomStarted(roundStartedAt, game?.id);

      // Track expected game_id so isNewGameWhilePlaying detection works for the caller too
      expectedGameIdRef.current = game?.id ?? null;

      setState(prev => ({
        ...prev,
        questions,
        currentQuestionIndex: 0,
        myScore: 0,
        lastQuestionResult: null,
        opponentAnswers: {},
        voteResults: {},
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
  }, [state.currentRoom, user, participants, stampRoomStarted]);

  // Start next round from queue - pop queue item and start with that category
  // This function DIRECTLY fetches questions with the new category to avoid race conditions
  const startNextFromQueue = useCallback(async () => {
    if (!state.currentRoom || !user) return;
    // Product rule: ONLY the host starts rounds (see startNewRound)
    if (state.currentRoom.host_user_id !== user.id) {
      console.warn("[MP] startNextFromQueue blocked - only the host can start rounds");
      return;
    }
    
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
      // Queue maintenance (remove the played item + reorder the rest) only
      // affects queue DISPLAY, not the round being started - run it in the
      // background and settle it just before the room flips to "playing"
      const queueMaintenance = (async () => {
        await supabase
          .from("room_category_queue")
          .delete()
          .eq("id", nextItem.id);

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
      })().catch(e => console.error("[MP] Queue maintenance failed:", e));

      // Old-round cleanup is independent of everything until the new
      // question inserts - start it now and await before inserting
      const pendingDelete5 = safeDeleteRoomQuestions(roomId);

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

          // Clear old data with verification (started above, overlapped with
          // the observer check and trivia fetch)
          const deleteSuccess5 = await pendingDelete5;
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
          // RLS may block this insert (e.g. migration not applied for guest
          // starters) - abort loudly instead of starting a round with no game id
          if (!game) {
            console.error("[MP] Failed to create room_games record - aborting round start");
            toast.error(tStandalone("extra.mpGameStartFailed"));
            return;
          }

          // Store in room_questions WITH game_id for validation; the
          // participant reset is independent - same batch (both must finish
          // before the room flips to "playing")
          const [insertResults3] = await Promise.all([
            Promise.all(questions.map((q, index) =>
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
            )),
            resetAllParticipants(roomId),
          ]);

          // FIX: Immediately reset local participants to prevent stale auto-advance
          setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));

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

          // Queue display must be settled before others sync in
          await queueMaintenance;

          // Update room (after questions are committed)
          const roundStartedAt = new Date().toISOString();
          await supabase
            .from("game_rooms")
            .update({
              category_id: null,
              category_name: categoryName,
              total_questions: questions.length,
              status: "playing",
              started_at: roundStartedAt,
              current_game_id: game?.id,
              host_is_observer: hostShouldObserve,
            })
            .eq("id", roomId);
          stampRoomStarted(roundStartedAt, game?.id);

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
            voteResults: {},
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
      // Through t(), not hardcoded Georgian — TVGameContext already does
      // this with the same keys. (The name is still a snapshot in this
      // writer's language once persisted; per-viewer resolution is a wider
      // refactor tracked separately.)
      const newCategoryName = nextItem.source_type === "random"
        ? tStandalone("extra.randomOption")
        : isMixedCategory
          ? tStandalone("extra.tvMixedCategory")
          : (nextItem.category_name || tStandalone("extra.categoryType"));
      
      // Get used question IDs
      const { data: freshRoom } = await supabase
        .from("game_rooms")
        .select("used_question_ids")
        .eq("id", roomId)
        .single();
      
      const usedIds = (freshRoom?.used_question_ids as string[]) || [];
      
      // Fetch questions with the NEW category (not from stale state!)
      let questions: TriviaQuestion[];
      if (newCategoryId && await isMostLikelyCategoryId(newCategoryId)) {
        // "Most Likely To" queued round — see startGame for the shape.
        questions = await buildMostLikelyQuestions(
          newCategoryId,
          newCategoryName,
          activeRoundPlayers(participants, {
            hostIsObserver: hostShouldObserve,
            hostUserId: state.currentRoom.host_user_id,
          }),
          usedIds,
        );
      } else {
        const result = await getQuestions({
          mode: 'vs',
          categorySlug: newCategoryId || undefined,
          count: questionCount,
          excludeIds: usedIds,
        });
        // Map to TriviaQuestion format with iconSlug
        questions = result.questions.map(q => ({
          id: q.id,
          question: q.question,
          correctAnswer: q.correctAnswer,
          incorrectAnswers: q.incorrectAnswers,
          allAnswers: q.allAnswers,
          difficulty: q.difficulty,
          category: newCategoryName,
          iconSlug: q.iconSlug,
          imageUrl: q.imageUrl || undefined,
          videoUrl: q.videoUrl || undefined,
          audioUrl: q.audioUrl || undefined,
        }));
      }

      if (questions.length === 0) {
        await pendingDelete5;
        toast.error(tStandalone("extra.mpQuestionsNotFound"));
        return;
      }

      // Clear old data with verification (started before the question fetch,
      // the two network waits overlap)
      const deleteSuccess6 = await pendingDelete5;
      if (!deleteSuccess6) {
        console.error("[MP startNextFromQueue/library] Failed to delete old questions after retries");
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }

      // used_question_ids rides along on the final status update below
      const newUsedIds = [...usedIds, ...questions.map(q => q.id)];

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
      // RLS may block this insert (e.g. migration not applied for guest
      // starters) - abort loudly instead of starting a round with no game id
      if (!game) {
        console.error("[MP] Failed to create room_games record - aborting round start");
        toast.error(tStandalone("extra.mpGameStartFailed"));
        return;
      }

      // Store questions with icon_slug AND game_id for validation; the
      // participant reset is independent - same batch (both must finish
      // before the room flips to "playing")
      const [insertResults4] = await Promise.all([
        Promise.all(questions.map((q, index) =>
        supabase.from("room_questions").insert({
          room_id: roomId,
          question_index: index,
          question_text: q.question,
          correct_answer: q.correctAnswer,
          incorrect_answers: q.incorrectAnswers,
          shuffled_answers: q.allAnswers,
          difficulty: q.difficulty,
          icon_slug: q.iconSlug || null,
          image_url: q.imageUrl || null,
          video_url: q.videoUrl || null,
          audio_url: q.audioUrl || null,
          game_id: game?.id, // CRITICAL: Link to current game for non-host validation
        }).select()
        )),
        resetAllParticipants(roomId),
      ]);

      // FIX: Immediately reset local participants to prevent stale auto-advance
      setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));

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

      // Queue display must be settled before others sync in
      await queueMaintenance;

      // Update room with new category and game info (after questions are committed)
      const roundStartedAt = new Date().toISOString();
      await supabase
        .from("game_rooms")
        .update({
          category_id: newCategoryId,
          category_name: newCategoryName,
          used_question_ids: newUsedIds,
          total_questions: questions.length,
          status: "playing",
          started_at: roundStartedAt,
          current_game_id: game?.id,
          host_is_observer: hostShouldObserve,
        })
        .eq("id", roomId);
      stampRoomStarted(roundStartedAt, game?.id);

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
        voteResults: {},
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
  }, [state.currentRoom, user, participants, startNewRound, stampRoomStarted]);

  // Leave room permanently
  const leaveRoomPermanently = useCallback(async () => {
    if (!state.currentRoom || !user) return;
    
    try {
      // Hand the room over BEFORE deleting our own row: the transfer RPC
      // requires the caller to still be the host. The old order updated
      // game_rooms first (allowed) and then the new host's is_host flag
      // directly — an own-row-only RLS policy reduced that to a silent
      // zero-row no-op, so no room whose host left ever had a participant
      // row saying is_host = true: the room vanished from the new host's
      // "my parties", the crown disappeared, TV mode treated them as a
      // guest. transfer_room_host does both writes atomically server-side.
      if (isHost && participants.length > 1) {
        const newHost = participants.find(p => p.user_id !== user.id);
        if (newHost) {
          const { error: transferError } = await supabase.rpc("transfer_room_host", {
            p_room_id: state.currentRoom.id,
            p_new_host: newHost.user_id,
          });
          if (transferError) throw transferError;
        }
      } else if (isHost && participants.length === 1) {
        await supabase
          .from("game_rooms")
          .update({ status: "cancelled" })
          .eq("id", state.currentRoom.id);
      }

      await supabase
        .from("room_participants")
        .delete()
        .eq("room_id", state.currentRoom.id)
        .eq("user_id", user.id);
      
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
    expectedGameIdRef.current = null;
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

  // Get share link. siteUrl, never window.location: on device the webview
  // origin is capacitor://localhost, and the hostname check built
  // capacitor://localhost/room/CODE — a dead link for every recipient.
  const getShareLink = useCallback((roomCode: string) => {
    return siteUrl(`/room/${roomCode}`);
  }, []);

  const value = useMemo<MultiplayerContextType>(() => ({
    ...state,
    participants,
    isHost,
    loading,
    currentOpponentAnswers: state.opponentAnswers[state.currentQuestionIndex] || {},
    isMostLikelyRound,
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
    applyMissedTime,
    showCreateModal,
    setShowCreateModal,
    showJoinModal,
    setShowJoinModal,
  }), [
    state,
    participants,
    isHost,
    isMostLikelyRound,
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
    applyMissedTime,
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

// Helper to get share link — see the context method above for why this is
// siteUrl and not window.location (capacitor://localhost on device).
export function getShareLink(roomCode: string) {
  return siteUrl(`/room/${roomCode}`);
}
