import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { t } from '@/utils/standaloneTranslation';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { tvLog, tvLogPhase, tvLogPlayer, tvLogError, tvLogPresence, tvLogTimer } from '@/utils/tvDebug';
import { 
  calculatePoints, 
  calculateTimeRemaining,
  calculateObserverBonus,
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
  isActive?: boolean; // Tracks whether the player is currently connected
  isReadyForNextRound?: boolean;
  answeredTimeRemaining?: number; // Time remaining when answer was given (for observer bonus)
}

export interface TVQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  options: string[];
  icon_slug?: string | null; // Per-question icon for display
  image_url?: string | null; // For image trivia questions
  video_url?: string | null; // For video trivia questions
  audio_url?: string | null; // For sound trivia questions
}

export type TVPhase = 'pairing' | 'waiting' | 'lobby' | 'countdown' | 'question' | 'playing' | 'reveal' | 'results' | 'completed' | 'idle' | 'round-intro' | 'poll-suggest' | 'poll-voting' | 'poll-results' | 'category-select';

interface TVGameState {
  code: string | null;
  sessionId: string | null;
  roomId: string | null; // The actual game_rooms ID for FK constraints
  phase: TVPhase;
  players: TVPlayer[];
  questions: TVQuestion[];
  currentQuestionIndex: number;
  timeRemaining: number;
  roundNumber: number;
  totalRounds: number;
  categoryName: string | null;
  categoryIcon: string | null;
  roomName: string | null;
  totalRoundsPlayed: number;
  accumulatedScores: Record<string, number>;
  isPaired: boolean;
  // Suggester info - the player who suggested the current round category
  currentRoundSuggesterId: string | null;
  currentRoundSuggesterNickname: string | null;
  currentRoundSuggesterAvatarUrl: string | null;
}

interface TVGameContextType extends TVGameState {
  // TV Display actions
  createSession: () => Promise<string | null>;
  mirrorSession: (code: string) => Promise<boolean>; // Mirror an existing TV session
  // Controller actions
  joinSession: (code: string, nickname: string, avatarUrl?: string | null) => Promise<boolean>;
  // Host actions
  startGame: (categoryId?: string, userTriviaId?: string) => Promise<void>;
  startPlaying: () => Promise<void>; // Trigger playing phase after countdown
  startNextRound: () => Promise<void>;
  startDirectSelection: () => Promise<void>; // NEW: Start direct category selection phase
  updateRoomName: (name: string) => Promise<void>;
  updateCategory: (categoryId: string, categoryName: string) => Promise<void>;
  saveRoundHistory: () => Promise<void>;
  resetGame: () => Promise<void>; // Reset game for play again
  // Player actions
  submitAnswer: (answer: string) => Promise<{ correct: boolean; points: number }>;
  markReady: () => Promise<void>; // Mark player as ready for next round
  // Shared
  leaveSession: () => void;
  refetchSessionData: () => Promise<void>; // Force refetch session state from DB
  isHost: boolean;
  isMirror: boolean; // Whether this is a mirror display (read-only)
  myPlayerId: string | null;
  myScore: number;
  myAnswer: string | null;
}

export const TVGameContext = createContext<TVGameContextType | null>(null);

const QUESTION_TIME = getQuestionTime();

// Quick highlight only (no separate reveal screen)
// Keep it in the 1–2s range for readability before auto-advancing.
const REVEAL_DURATION_MS = 1400;

// Extended reveal duration when no one answered (shows correct answer longer)
const REVEAL_DURATION_LONG_MS = 10000;

// Note: Questions always run full QUESTION_TIME (15s). Extended reveal is used when no one answered.

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
    'round-intro': 'round-intro',
    'poll-suggest': 'poll-suggest',
    'poll-voting': 'poll-voting',
    'poll-results': 'poll-results',
    'category-select': 'category-select',
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

// Helper to generate 4-digit TV code
const generate4DigitCode = (): string => String(Math.floor(1000 + Math.random() * 9000));

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

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
    roomId: null,
    phase: 'pairing',
    players: [],
    questions: [],
    currentQuestionIndex: 0,
    timeRemaining: QUESTION_TIME,
    roundNumber: 1,
    totalRounds: 1,
    categoryName: null,
    categoryIcon: null,
    roomName: null,
    totalRoundsPlayed: 0,
    accumulatedScores: {},
    isPaired: false,
    currentRoundSuggesterId: null,
    currentRoundSuggesterNickname: null,
    currentRoundSuggesterAvatarUrl: null,
  });

  const [isHost, setIsHost] = useState(false);
  const [isMirror, setIsMirror] = useState(false); // Mirror display mode (read-only)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const answersChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep latest state available to realtime callbacks (avoid stale-closure bugs)
  const stateRef = useRef<TVGameState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Keep myAnswer in a ref for visibility callbacks
  const myAnswerRef = useRef(myAnswer);
  useEffect(() => {
    myAnswerRef.current = myAnswer;
  }, [myAnswer]);

  // Keep myScore in a ref for visibility callbacks
  const myScoreRef = useRef(myScore);
  useEffect(() => {
    myScoreRef.current = myScore;
  }, [myScore]);

  // Keep myPlayerId in a ref for callbacks to avoid stale closures
  const myPlayerIdRef = useRef(myPlayerId);
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
  }, [myPlayerId]);

  // Keep isHost in a ref for presence callbacks to avoid stale closures
  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // ============================================================================
  // CLEAN REWRITE: Question Advancement Logic
  // ============================================================================
  // Two triggers only:
  // 1. Timer expires (15 seconds) → advance to reveal
  // 2. All players answered (verified from DB) → advance to reveal
  // ============================================================================

  // Flag to prevent double-advance per question (reset on each new question)
  const hasAdvancedRef = useRef(false);

  // Track when the current question started (for safety guard)
  // CRITICAL: Set to 0 during countdown/transitions to DISABLE auto-advance checks
  // Only set to Date.now() in startPlaying AFTER the DB transition to 'playing'
  const questionStartedAtRef = useRef<number>(0);

  // CRITICAL FIX: Debounce ref to prevent concurrent checkAndAdvanceIfAllAnswered calls
  // Multiple triggers (realtime, interval, timer) can cause race conditions
  const checkInProgressRef = useRef(false);

  // TIMER FIX: Track which question index the timer was initialized for
  // This prevents subscription updates from overwriting the local countdown timer
  const timerInitializedForQuestionRef = useRef<number | null>(null);
  
  // CRITICAL FIX: Track if this client was present during countdown or reveal phase
  // This distinguishes between "was here during pre-question phase but network lagged"
  // vs "actually joining mid-question" for timer sync decisions
  // Gets set to true during: countdown phase, reveal phase
  // Gets read during: playing phase to decide if client needs timer sync
  const wasInPreQuestionPhaseRef = useRef(false);

  // ============================================================================
  // CORE FUNCTION: Advance to reveal phase
  // ============================================================================
  // This is the ONLY function that triggers the reveal transition.
  // It's idempotent - calling it multiple times per question has no effect.
  // ============================================================================
  const advanceToReveal = useCallback(async (reason: string) => {
    // Idempotent: only advance once per question
    if (hasAdvancedRef.current) {
      console.log('[advanceToReveal] Blocked: already advanced this question');
      return;
    }
    
    const current = stateRef.current;
    
    // Guard: must be in question phase
    if (current.phase !== 'question') {
      console.log('[advanceToReveal] Blocked: not in question phase, current:', current.phase);
      return;
    }
    
    // Guard: must have session
    if (!current.sessionId) {
      console.log('[advanceToReveal] Blocked: no sessionId');
      return;
    }
    
    // Guard: only host can advance
    if (!isHostRef.current) {
      console.log('[advanceToReveal] Blocked: not host');
      return;
    }

    // Mark as advanced BEFORE the async call to prevent race conditions
    hasAdvancedRef.current = true;
    
    console.log('[advanceToReveal] ✅ ADVANCING TO REVEAL!', { reason });
    tvLogPhase('question', 'reveal', reason);

    // ============================================================================
    // OBSERVER SCORING: Award points to suggester when majority answers wrong
    // ============================================================================
    // The suggester (who knows answers) observes this round. They earn ONE
    // question's worth of points if more than half of active players answered
    // incorrectly or didn't answer. The bonus amount is time-based (average of
    // wrong answers' time remaining), same range as a normal correct answer.
    // If majority answered correctly → no bonus.
    // ============================================================================
    const suggesterId = current.currentRoundSuggesterId;
    if (suggesterId) {
      try {
        // Calculate observer points based on incorrect/unanswered players
        // Rule: observer earns ONE question worth of points if MAJORITY answered wrong.
        // Not per-player — a single bonus like any other player would earn.
        const activePlayers = current.players.filter(p => p.id !== suggesterId && p.isActive !== false);
        const wrongPlayers = activePlayers.filter(p => !p.hasAnswered || p.lastAnswerCorrect === false);
        const incorrectCount = wrongPlayers.length;

        const totalActive = activePlayers.length;
        if (totalActive > 0 && incorrectCount > totalActive / 2) {
          // Majority answered wrong → award a single question's worth of points
          // Use average time remaining of wrong answers for fair time-based bonus
          let totalTimeRemaining = 0;
          for (const player of wrongPlayers) {
            totalTimeRemaining += (player.answeredTimeRemaining ?? 0);
          }
          const avgTimeRemaining = incorrectCount > 0 ? totalTimeRemaining / incorrectCount : 0;
          let observerBonus = calculateObserverBonus(avgTimeRemaining);
          
          console.log('[advanceToReveal] 🏆 OBSERVER BONUS CALC:', {
            suggesterId: suggesterId.slice(0, 8),
            incorrectCount,
            totalActive,
            bonus: observerBonus,
          });
          
          // Only update score if bonus was earned
          if (observerBonus > 0) {
            // Update the suggester's score in presence (if they're in our player list)
            const suggesterPlayer = current.players.find(p => p.id === suggesterId);
            if (suggesterPlayer && presenceChannelRef.current) {
              const newScore = (suggesterPlayer.score || 0) + observerBonus;
              
              // Track the updated score for the observer
              await presenceChannelRef.current.track({
                nickname: suggesterPlayer.nickname,
                avatar_url: suggesterPlayer.avatar_url,
                score: newScore,
                hasAnswered: false, // Observer never "answers"
                lastAnswerCorrect: null,
                lastAnswer: null,
                answeredQuestionIndex: undefined,
                isHost: isHostRef.current,
                isActive: true,
                observerBonusEarned: observerBonus, // Track bonus for UI
              });
              
              console.log('[advanceToReveal] ✅ Observer score updated:', {
                nickname: suggesterPlayer.nickname,
                oldScore: suggesterPlayer.score || 0,
                bonus: observerBonus,
                newScore,
              });

              // CRITICAL FIX: Sync observer bonus to local myScore
              // Without this, all views using myScore show wrong values for the suggester
              if (suggesterId === myPlayerIdRef.current) {
                setMyScore(newScore);
              }
            }
          }
        }
      } catch (err) {
        console.error('[advanceToReveal] Failed to calculate observer bonus:', err);
        // Non-blocking - don't fail the reveal transition
      }
    }

    await supabase
      .from('tv_sessions')
      .update({
        status: 'reveal',
        reveal_start_time: new Date().toISOString(),
      })
      .eq('id', current.sessionId);
  }, []);

  //
  // ============================================================================
  // CENTRALIZED UTILITY: Confirm active players with robust verification
  // ============================================================================
  // This utility uses presence channel to determine who is ACTUALLY connected
  // It activates connected players and leaves quitters inactive
  // ============================================================================
  const confirmActivePlayers = useCallback(async (sessionId: string): Promise<number> => {
    console.log('[confirmActivePlayers] 🔒 Starting robust player verification...');
    
    // CRITICAL: System devices that should NEVER be counted as players
    const systemDeviceIdentifiers = ['TV_DISPLAY', 'TV_MIRROR'];
    
    // Step 1: Get player_ids from presence (these are ACTUALLY connected players)
    // Use the presence channel to get real-time connected users
    const presenceState = presenceChannelRef.current?.presenceState() || {};
    const connectedPlayerIds: string[] = [];
    
    Object.entries(presenceState).forEach(([key, presences]) => {
      const rawPresence = presences[0] as Record<string, unknown> | undefined;
      // Filter out system devices
      if (rawPresence && !systemDeviceIdentifiers.includes(key)) {
        const nickname = rawPresence.nickname as string | undefined;
        if (nickname && !systemDeviceIdentifiers.includes(nickname)) {
          connectedPlayerIds.push(key);
        }
      }
    });
    
    console.log('[confirmActivePlayers] 📡 Connected players from presence:', connectedPlayerIds.length, connectedPlayerIds.map((id: string) => id.slice(0, 8)));
    
    // CRITICAL: Only modify is_active status if we have presence data
    // If presence returns 0, it might be a timing issue - don't deactivate everyone!
    if (connectedPlayerIds.length > 0) {
      // Step 2a: Activate players who are in presence channel
      const { error: activateError } = await supabase
        .from('tv_players')
        .update({ is_active: true })
        .eq('tv_session_id', sessionId)
        .in('player_id', connectedPlayerIds);

      if (activateError) {
        console.warn('[confirmActivePlayers] ⚠️ Activate error:', activateError);
      } else {
        console.log('[confirmActivePlayers] 🔄 Activated', connectedPlayerIds.length, 'connected players');
      }
      
      // Step 2b: Deactivate players NOT in presence (quitters)
      const { error: deactivateError } = await supabase
        .from('tv_players')
        .update({ is_active: false })
        .eq('tv_session_id', sessionId)
        .not('player_id', 'in', `(${connectedPlayerIds.join(',')})`)
        .not('player_id', 'in', `(${systemDeviceIdentifiers.join(',')})`)
        .not('nickname', 'in', `(${systemDeviceIdentifiers.join(',')})`);
      
      if (deactivateError) {
        console.warn('[confirmActivePlayers] ⚠️ Deactivate error:', deactivateError);
      } else {
        console.log('[confirmActivePlayers] 🔄 Deactivated players not in presence (quitters)');
      }
    } else {
      // Fallback: Presence is empty - don't modify is_active, just count current state
      console.log('[confirmActivePlayers] ⚠️ Presence returned 0 players - using existing is_active state from DB');
    }
    
    // Step 3: Short delay for DB consistency (50ms is sufficient for Supabase writes)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Step 4: Optimized verification loop (3 attempts, 100ms apart = 200ms max)
    // The 7-attempt loop was overly conservative - players are already connected during lobby
    let verifiedCount = 0;
    const isPaired = stateRef.current.isPaired;
    const minExpected = isPaired ? 2 : 1;
    
    // Early exit: If presence already shows enough players, skip DB verification loop
    if (connectedPlayerIds.length >= minExpected) {
      console.log('[confirmActivePlayers] ⚡ Early exit: presence already shows', connectedPlayerIds.length, 'players');
      verifiedCount = connectedPlayerIds.length;
    } else {
      for (let attempt = 0; attempt < 3; attempt++) {
        // CRITICAL: Exclude system devices from the count - they don't answer questions!
        const { count } = await supabase
          .from('tv_players')
          .select('*', { count: 'exact', head: true })
          .eq('tv_session_id', sessionId)
          .eq('is_active', true)
          .not('player_id', 'in', `(${systemDeviceIdentifiers.join(',')})`)
          .not('nickname', 'in', `(${systemDeviceIdentifiers.join(',')})`);
        
        verifiedCount = count ?? 0;
        console.log(`[confirmActivePlayers] Attempt ${attempt + 1}/3: ${verifiedCount} active players from DB`);
        
        if (verifiedCount >= minExpected) break;
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    // Step 5: Lock the verified count in session (with minimum for paired mode)
    const finalCount = isPaired ? Math.max(verifiedCount, 2) : verifiedCount;
    
    await supabase
      .from('tv_sessions')
      .update({ active_player_count: finalCount })
      .eq('id', sessionId);
    
    console.log('[confirmActivePlayers] ✅ Locked player count:', finalCount, '(quitters excluded, mid-game joiners included if connected)');
    return finalCount;
  }, []);

  // ============================================================================
  // CENTRALIZED UTILITY: Prepare for Playing Phase (SINGLE SOURCE OF TRUTH)
  // ============================================================================
  // ALL code paths that transition to 'playing' MUST use this function.
  // This ensures consistent behavior for:
  // - First round (startGame → countdown → startPlaying)
  // - Poll → Game (finalizePoll → countdown → startPlaying)  
  // - Queue rounds (startNextRoundFromQueue → round-intro → markReady → startPlaying)
  // - Next question (reveal → playing in useEffect)
  // - Subscription catch-up (client receives status='playing')
  // ============================================================================
  const prepareForPlaying = useCallback(async (
    sessionId: string, 
    questionIndex: number,
    options?: { skipAnswerCleanup?: boolean; skipPlayerCountVerify?: boolean }
  ): Promise<{ expectedCount: number; ready: boolean }> => {
    console.log('[prepareForPlaying] 🎯 UNIFIED initialization starting...', { sessionId: sessionId.slice(0, 8), questionIndex });

    // Step 1: Clear ALL answers for this session to prevent stale answer pollution
    // This is idempotent - running multiple times is safe
    if (!options?.skipAnswerCleanup) {
      console.log('[prepareForPlaying] 🗑️ Cleaning ALL session answers...');
      const { error: cleanupError, count } = await supabase
        .from('player_answers')
        .delete()
        .eq('tv_session_id', sessionId);

      if (cleanupError) {
        console.warn('[prepareForPlaying] ⚠️ Answer cleanup error:', cleanupError);
      } else {
        console.log('[prepareForPlaying] ✅ Cleaned', count, 'stale answers');
      }

      // FIX P0: Wait 300ms (was 100ms) for DB consistency + replication
      // This prevents checkAndAdvanceIfAllAnswered from seeing empty table as "all answered"
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Step 2: Verify and lock active player count (WITH suggester adjustment)
    let expectedCount = 0;
    let suggesterId: string | null = null;
    
    if (!options?.skipPlayerCountVerify) {
      console.log('[prepareForPlaying] 🔒 Verifying player count...');
      expectedCount = await confirmActivePlayers(sessionId);

      // Check for suggester and adjust count ONCE (single source of truth)
      const { data: session } = await supabase
        .from('tv_sessions')
        .select('current_round_suggester_id')
        .eq('id', sessionId)
        .single();

      suggesterId = (session as any)?.current_round_suggester_id as string | null;
      if (suggesterId) {
        // Check if suggester is actually active
        const { data: suggesterData } = await supabase
          .from('tv_players')
          .select('is_active')
          .eq('tv_session_id', sessionId)
          .eq('player_id', suggesterId)
          .single();

        if (suggesterData?.is_active) {
          expectedCount = Math.max(1, expectedCount - 1);
          console.log('[prepareForPlaying] 👤 Adjusted for active suggester:', { suggesterId: suggesterId.slice(0, 8), adjusted: expectedCount });

          // Persist the adjusted count - this is THE authoritative count
          await supabase
            .from('tv_sessions')
            .update({ active_player_count: expectedCount })
            .eq('id', sessionId);
        }
      }
    } else {
      // Fallback: read from session (already adjusted)
      const { data: session } = await supabase
        .from('tv_sessions')
        .select('active_player_count')
        .eq('id', sessionId)
        .single();
      expectedCount = session?.active_player_count ?? 0;
    }

    // Step 3: Reset hasAdvanced flag (timing ref set by caller AFTER DB transition)
    // FIX P0: Do NOT set questionStartedAtRef here - caller sets it after DB update
    hasAdvancedRef.current = false;

    console.log('[prepareForPlaying] ✅ UNIFIED initialization complete:', {
      expectedCount,
      hasAdvanced: hasAdvancedRef.current,
      note: 'questionStartedAtRef will be set by caller after DB transition',
    });

    return { expectedCount, ready: true };
  }, [confirmActivePlayers]);

  // Store ref for use in subscription handler (avoids stale closure)
  const prepareForPlayingRef = useRef(prepareForPlaying);
  prepareForPlayingRef.current = prepareForPlaying;

  // ============================================================================
  // CRITICAL: Session Refetch Function for Recovering Missed Realtime Updates
  // ============================================================================
  // This function is called when guests transition from poll to game phases
  // but don't receive the questions via realtime subscription. It forces a
  // full session fetch from the database to recover the game state.
  // ============================================================================
  const refetchSessionData = useCallback(async (sessionId: string) => {
    console.log('[refetchSessionData] 🔄 Force-fetching session state...');
    
    try {
      const { data: session, error } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (error || !session) {
        console.error('[refetchSessionData] Failed:', error);
        return;
      }
      
      // Parse questions
      let questions: TVQuestion[] = [];
      if (session.questions) {
        const rawQuestions = session.questions as unknown as Array<{
          id: string;
          question_text: string;
          correct_answer: string;
          options: string[];
          icon_slug?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          audio_url?: string | null;
        }>;
        questions = rawQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          options: q.options,
          icon_slug: q.icon_slug,
          image_url: q.image_url,
          video_url: q.video_url,
          audio_url: q.audio_url,
        }));
      }
      
      console.log('[refetchSessionData] ✅ Fetched session:', {
        status: session.status,
        questionsCount: questions.length,
        suggesterId: session.current_round_suggester_id,
      });
      
      // Update state with fetched data
      setState(prev => ({
        ...prev,
        phase: mapDbStatusToPhase(session.status),
        questions: questions.length > 0 ? questions : prev.questions,
        currentQuestionIndex: session.current_question_index ?? prev.currentQuestionIndex,
        categoryName: session.category_name || prev.categoryName,
        categoryIcon: session.category_icon || prev.categoryIcon,
        isPaired: session.is_paired ?? prev.isPaired,
        roomName: session.room_name || prev.roomName,
        roundNumber: session.round_number ?? prev.roundNumber,
        totalRounds: session.total_rounds ?? prev.totalRounds,
        roomId: session.room_id || prev.roomId,
        currentRoundSuggesterId: session.current_round_suggester_id ?? prev.currentRoundSuggesterId,
        currentRoundSuggesterNickname: session.current_round_suggester_nickname ?? prev.currentRoundSuggesterNickname,
        currentRoundSuggesterAvatarUrl: session.current_round_suggester_avatar_url ?? prev.currentRoundSuggesterAvatarUrl,
      }));
      
      console.log('[refetchSessionData] ✅ State updated with', questions.length, 'questions');
    } catch (err) {
      console.error('[refetchSessionData] Error:', err);
    }
  }, []);

  // ============================================================================
  // TRIGGER 2: Check if all players answered (from DB)
  // Simple logic: count active players, count answers, if equal → advance
  // ============================================================================
  const checkAndAdvanceIfAllAnswered = useCallback(async () => {
    // Debounce — skip if another check is in flight
    if (checkInProgressRef.current) return;
    if (!isHostRef.current) return;

    checkInProgressRef.current = true;
    checkInProgressSinceRef.current = Date.now();

    try {
      const current = stateRef.current;

      // Basic guards
      if (current.phase !== 'question') return;
      if (hasAdvancedRef.current) return;
      if (!current.sessionId) return;

      // Don't check during countdown (questionStartedAtRef = 0 until playing)
      const questionStartTime = questionStartedAtRef.current;
      if (!questionStartTime) return;

      // Brief safety window: wait 1.5s after question start for DB to settle
      const timeSinceStart = Date.now() - questionStartTime;
      if (timeSinceStart < 1500) return;

      // ── Single source of truth: active_player_count set by prepareForPlaying ──
      // This count is already adjusted for suggester and verified against presence
      const { data: session, error: sessionError } = await supabase
        .from('tv_sessions')
        .select('active_player_count, current_round_suggester_id')
        .eq('id', current.sessionId)
        .single();

      if (sessionError || !session) return;

      let expectedCount = session.active_player_count ?? 0;
      const roundSuggesterId =
        (session as { current_round_suggester_id?: string | null }).current_round_suggester_id ?? null;

      // ── Presence-based advance (primary) ────────────────────────────────
      // Presence hasAnswered flags are per-question (the sync handler only
      // sets them when answeredQuestionIndex matches the current question),
      // so "every connected non-suggester player answered" is a safe, drift-
      // immune signal - it doesn't depend on the locked count or on answer
      // rows surviving unique-key collisions.
      const connectedPlayers = current.players.filter(p => p.id !== roundSuggesterId);
      if (connectedPlayers.length > 0 && connectedPlayers.every(p => p.hasAnswered)) {
        console.log('[AutoAdvance] ✅ All', connectedPlayers.length, 'connected players answered (presence) → ADVANCE');
        advanceToReveal('all connected players answered (presence)');
        return;
      }

      // The locked count can exceed reality (paired-mode floor of 2, ghost
      // rows, a flickered presence sample at question start). Never require
      // more answers than there are actually-connected players.
      if (connectedPlayers.length > 0 && expectedCount > connectedPlayers.length) {
        console.log('[AutoAdvance] ⚖️ Clamping expectedCount', expectedCount, '→', connectedPlayers.length, '(live connections)');
        expectedCount = connectedPlayers.length;
      }

      // Fallback: if locked count is 0 (shouldn't happen), use live DB count
      if (expectedCount <= 0) {
        const systemIds = ['TV_DISPLAY', 'TV_MIRROR'];
        const { count: liveCount } = await supabase
          .from('tv_players')
          .select('*', { count: 'exact', head: true })
          .eq('tv_session_id', current.sessionId)
          .eq('is_active', true)
          .not('player_id', 'in', `(${systemIds.join(',')})`)
          .not('nickname', 'in', `(${systemIds.join(',')})`);

        const live = liveCount ?? 0;
        expectedCount = roundSuggesterId ? Math.max(1, live - 1) : live;

        if (expectedCount <= 0) {
          // No players at all — let timer handle it
          return;
        }
      }

      // Fetch WHO answered this question (not just how many rows) - the raw
      // row count vs active_player_count comparison stalls the whole room to
      // the full timer whenever the two drift (a duplicate-key insert that
      // produced no new row, a stale locked count, a ghost player row)
      const { data: answerRows, error: answersError } = await supabase
        .from('player_answers')
        .select('user_id')
        .eq('tv_session_id', current.sessionId)
        .eq('question_index', current.currentQuestionIndex);

      if (answersError) return;

      const answeredIds = new Set((answerRows || []).map(r => r.user_id).filter(Boolean));
      const actualCount = answeredIds.size;

      // Fast path: distinct answerers reached the locked count
      if (actualCount >= expectedCount && expectedCount > 0) {
        console.log('[AutoAdvance]', `${actualCount}/${expectedCount}`, '→ ADVANCE (count)');
        advanceToReveal('all players answered');
        return;
      }

      // Robust path: check the SET of players. If every currently-active,
      // non-system player (minus the round suggester, who doesn't answer)
      // has an answer in, advance - regardless of what the locked count says.
      const systemIds = ['TV_DISPLAY', 'TV_MIRROR'];
      const { data: activePlayers } = await supabase
        .from('tv_players')
        .select('player_id, nickname')
        .eq('tv_session_id', current.sessionId)
        .eq('is_active', true);

      const requiredIds = (activePlayers || [])
        .filter(p => !systemIds.includes(p.player_id) && !systemIds.includes(p.nickname || ''))
        .map(p => p.player_id)
        .filter(id => id !== roundSuggesterId);

      const everyActiveAnswered =
        requiredIds.length > 0 && requiredIds.every(id => answeredIds.has(id));

      console.log('[AutoAdvance]', `${actualCount}/${expectedCount}`,
        everyActiveAnswered ? '→ ADVANCE (set)' : '→ waiting',
        { qi: current.currentQuestionIndex, required: requiredIds.length, ms: Date.now() - questionStartTime });

      if (everyActiveAnswered) {
        advanceToReveal('all active players answered');
      }
    } catch (err) {
      console.error('[AutoAdvance] Exception:', err);
    } finally {
      checkInProgressRef.current = false;
      checkInProgressSinceRef.current = 0;
    }
  }, [advanceToReveal]);

  // ============================================================================
  // REALTIME: Subscribe to player_answers for instant all-answered detection
  // ============================================================================
  const setupAnswersSubscription = useCallback((sessionId: string) => {
    if (answersChannelRef.current) {
      supabase.removeChannel(answersChannelRef.current);
    }

    console.log('[AutoAdvance] 📡 Setting up realtime subscription for session:', sessionId.substring(0, 8) + '...');

    const channel = supabase
      .channel(`tv-answers-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_answers',
          filter: `tv_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const answer = payload.new as { user_id?: string; question_index?: number; is_correct?: boolean };
          const currentState = stateRef.current;
          
          console.log('[AutoAdvance] 📥 Realtime: New answer received!', {
            userId: answer.user_id?.substring(0, 8) + '...',
            questionIndex: answer.question_index,
            currentQuestionIndex: currentState.currentQuestionIndex,
            phase: currentState.phase,
            isCorrect: answer.is_correct,
            timestamp: new Date().toISOString(),
          });
          
          // CRITICAL FIX: Only trigger check if answer is for CURRENT question
          // This prevents stale answers from previous questions triggering advancement
          if (answer.question_index !== currentState.currentQuestionIndex) {
            console.log('[AutoAdvance] ⏭️ Ignoring stale answer for wrong question index:', {
              received: answer.question_index,
              expected: currentState.currentQuestionIndex,
            });
            return;
          }
          
          // CRITICAL FIX: Only check during playing phase
          if (currentState.phase !== 'question' && currentState.phase !== 'playing') {
            console.log('[AutoAdvance] ⏭️ Ignoring answer - not in playing phase:', currentState.phase);
            return;
          }
          
          // Trigger check on valid answer
          if (isHostRef.current) {
            console.log('[AutoAdvance] 🔄 Triggering check from realtime event...');
            checkAndAdvanceIfAllAnswered();
          }
        }
      )
      .subscribe((status) => {
        console.log('[AutoAdvance] 📡 Subscription status:', status);
      });

    answersChannelRef.current = channel;
  }, [checkAndAdvanceIfAllAnswered]);

  // Prevent double-click / concurrent next-round transitions from host
  const nextRoundInFlightRef = useRef(false);

  const startNextRoundFromQueueIfAny = useCallback(async () => {
    if (!isHost) return false;
    if (!state.sessionId) return false;

    // Hard stop: never exceed total rounds. If we've reached the configured
    // total, we should end the game and show final results.
    const currentRoundNumber = stateRef.current.roundNumber;
    const totalRoundsNow = stateRef.current.totalRounds;
    if (totalRoundsNow > 0 && currentRoundNumber >= totalRoundsNow) {
      tvLog('No next round: reached totalRounds', { currentRoundNumber, totalRoundsNow });
      return false;
    }

    // CRITICAL: Clear all answers from previous rounds for this session
    // This prevents 409 duplicate key conflicts when question_index resets to 0
    // and ensures accurate auto-advance answer counts for the new round
    const { error: roundCleanupError } = await supabase
      .from('player_answers')
      .delete()
      .eq('tv_session_id', state.sessionId);
    
    if (roundCleanupError) {
      tvLog('Warning: Could not clean previous round answers', roundCleanupError);
    } else {
      tvLog('Cleared answers from previous rounds for new round start');
    }

    // Prefer the explicit TV queue, but fallback to the room queue when TV queue is empty.
    const { data: queueItems } = await supabase
      .from('tv_session_queue')
      .select('*')
      .eq('session_id', state.sessionId)
      .order('position', { ascending: true })
      .limit(1);

    let nextItem = queueItems?.[0] as any | undefined;
    let consumeFrom: 'tv' | 'room' = 'tv';

    if (!nextItem) {
      // Fallback: get room_id for this TV session, then consume from room_category_queue.
      const { data: sessionRow } = await supabase
        .from('tv_sessions')
        .select('room_id')
        .eq('id', state.sessionId)
        .maybeSingle();

      const roomId = (sessionRow as any)?.room_id as string | null | undefined;
      if (!roomId) return false;

      const { data: roomQueueItems } = await supabase
        .from('room_category_queue')
        .select('*')
        .eq('room_id', roomId)
        .order('position', { ascending: true })
        .limit(1);

      nextItem = roomQueueItems?.[0] as any | undefined;
      if (!nextItem) return false;
      consumeFrom = 'room';
      tvLog('TV queue empty; falling back to room queue', { roomId });
    }

    if (!nextItem.category_id && !nextItem.user_trivia_id) return false;

    try {
      let formattedQuestions: { id: string; question_text: string; correct_answer: string; options: string[]; icon_slug?: string | null; image_url?: string | null; video_url?: string | null; audio_url?: string | null }[] = [];
      let nextCategoryName: string | null = nextItem.category_name || null;
      // NOTE: category_icon is historically an emoji; tv_session_queue.icon_slug is used similarly in UI.
      let nextCategoryIcon: string | null = nextItem.icon_slug || null;

      if (nextItem.user_trivia_id) {
        tvLog('Starting next round from queue (user trivia)', { userTriviaId: nextItem.user_trivia_id });

        // Fetch user trivia with questions from JSONB column
        const { data: triviaData, error: triviaError } = await supabase
          .from('user_quiz_posts')
          .select('title, questions, icon_slug')
          .eq('id', nextItem.user_trivia_id)
          .maybeSingle();

        if (triviaError || !triviaData?.questions) {
          tvLogError('startNextRoundFromQueueIfAny', 'No questions found for user trivia');
          return false;
        }

        const triviaQuestions = triviaData.questions as Array<{
          question_text: string;
          correct_answer: string;
          incorrect_answers: string[];
          icon_slug?: string;
        }>;

        if (triviaQuestions.length === 0) {
          tvLogError('startNextRoundFromQueueIfAny', 'User trivia has no questions');
          return false;
        }

        nextCategoryName = nextCategoryName || triviaData.title || 'User Trivia';
        // No-emoji policy: never fall back to emoji for category icons.
        nextCategoryIcon = nextCategoryIcon || triviaData.icon_slug || null;

        formattedQuestions = triviaQuestions.map((q, idx) => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers)
            ? q.incorrect_answers
            : [];
          const allAnswers = shuffleArray([q.correct_answer, ...incorrectAnswers]);
          return {
            id: `ut-${nextItem.user_trivia_id}-${idx}`,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            options: allAnswers,
            icon_slug: q.icon_slug || null,
          };
        });
      } else if (nextItem.category_id) {
        // Fetch questions for the queued category
        const { getQuestions, resolveCategoryUuid } = await import('@/services/questionService');
        const { markQuestionsAsAsked } = await import('@/services/questionTracker');

        const categoryUUID = await resolveCategoryUuid(nextItem.category_id);
        if (!categoryUUID) return false;

        const result = await getQuestions({
          mode: 'tv',
          categoryUuid: categoryUUID,
          count: 10,
        });

        formattedQuestions = result.questions.map(q => ({
          id: q.id,
          question_text: q.question,
          correct_answer: q.correctAnswer,
          options: q.allAnswers,
          icon_slug: q.iconSlug,
          image_url: q.imageUrl,
          video_url: q.videoUrl,
          audio_url: q.audioUrl,
        }));

        markQuestionsAsAsked(`tv_${categoryUUID}`, formattedQuestions.map((q) => q.id));

        const { data: category } = await supabase
          .from('categories')
          .select('name, icon')
          .eq('id', categoryUUID)
          .maybeSingle();

        nextCategoryName = nextCategoryName || category?.name || null;
        nextCategoryIcon = nextCategoryIcon || category?.icon || null;
      }

      if (formattedQuestions.length === 0) return false;

      // Go to round-intro phase instead of countdown - wait for all players to be ready
      // Extract suggester info from queue item
      // CRITICAL: Only honor suggester data for user trivias, not library categories
      // This protects against stale queue items created before the poll fix
      const isLibraryCategory = nextItem.category_id && !nextItem.user_trivia_id;
      const suggesterUserId = isLibraryCategory ? null : (nextItem as any).suggester_user_id as string | null;
      const suggesterNickname = isLibraryCategory ? null : (nextItem as any).suggester_nickname as string | null;
      const suggesterAvatarUrl = isLibraryCategory ? null : (nextItem as any).suggester_avatar_url as string | null;

      // CRITICAL: Use centralized confirmActivePlayers for robust player count verification
      console.log('[startNextRoundFromQueueIfAny] 🔒 Using confirmActivePlayers...');
      let expectedCount = await confirmActivePlayers(state.sessionId!);

      // Adjust for suggester skip rule
      if (suggesterUserId) {
        expectedCount = Math.max(1, expectedCount - 1);
        tvLog('startNextRoundFromQueueIfAny: Adjusted count for suggester', { 
          suggesterId: suggesterUserId.slice(0, 8), 
          adjustedCount: expectedCount 
        });
        
        // Update session with adjusted count
        await supabase
          .from('tv_sessions')
          .update({ active_player_count: expectedCount })
          .eq('id', state.sessionId);
      }

      console.log('[startNextRoundFromQueueIfAny] ✅ Verified player count:', expectedCount);

      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          status: 'round-intro',
          questions: formattedQuestions as unknown as Json,
          current_question_index: 0,
          question_start_time: null,
          reveal_start_time: null,
          category_name: nextCategoryName,
          category_icon: nextCategoryIcon,
          // Store suggester info in session for quick access
          current_round_suggester_id: suggesterUserId,
          current_round_suggester_nickname: suggesterNickname,
          current_round_suggester_avatar_url: suggesterAvatarUrl,
          // CRITICAL: Lock the player count at round initialization
          active_player_count: expectedCount,
        })
        .eq('id', state.sessionId);

      if (updateError) {
        tvLogError('startNextRoundFromQueueIfAny update session', updateError);
        const { toast } = await import('sonner');
        toast.error(t('extra.tvNextRoundFailed'));
        return false;
      }

      // Consume item after successful transition
      if (consumeFrom === 'tv') {
        await supabase.from('tv_session_queue').delete().eq('id', nextItem.id);

        // Reorder remaining items
        const { data: remaining } = await supabase
          .from('tv_session_queue')
          .select('id')
          .eq('session_id', state.sessionId)
          .order('position', { ascending: true });
        if (remaining?.length) {
          await Promise.all(
            remaining.map((item, index) =>
              supabase.from('tv_session_queue').update({ position: index }).eq('id', item.id)
            )
          );
        }
      } else {
        // Room queue consumption
        const { data: sessionRow } = await supabase
          .from('tv_sessions')
          .select('room_id')
          .eq('id', state.sessionId)
          .maybeSingle();
        const roomId = (sessionRow as any)?.room_id as string | null | undefined;
        if (roomId) {
          await supabase.from('room_category_queue').delete().eq('id', nextItem.id);

          const { data: remainingRoom } = await supabase
            .from('room_category_queue')
            .select('id')
            .eq('room_id', roomId)
            .order('position', { ascending: true });
          if (remainingRoom?.length) {
            await Promise.all(
              remainingRoom.map((item, index) =>
                supabase.from('room_category_queue').update({ position: index }).eq('id', item.id)
              )
            );
          }
        }
      }

      // Increment round number for the next round (update DB + local state)
      // IMPORTANT: use latest state from ref to avoid stale-closure bugs (this callback
      // intentionally doesn't depend on state.roundNumber).
      const currentRoundNumber2 = stateRef.current.roundNumber;
      const totalRoundsNow2 = stateRef.current.totalRounds;
      const newRoundNumber = currentRoundNumber2 + 1;

      // Defensive: don't let round_number exceed total_rounds
      if (totalRoundsNow2 > 0 && newRoundNumber > totalRoundsNow2) {
        tvLog('Prevented round overflow', { newRoundNumber, totalRoundsNow2 });
        return false;
      }
      await supabase
        .from('tv_sessions')
        .update({ round_number: newRoundNumber })
        .eq('id', state.sessionId);
      
      // CRITICAL: Sync suggester state locally (DB already updated above)
      // This prevents stale isSuggester checks before realtime handler catches up
      console.log('[startNextRoundFromQueueIfAny] 🔄 Syncing suggester state locally:', {
        suggesterId: suggesterUserId?.slice(0, 8) || 'null (library category)',
        isLibraryCategory,
      });
      
      setState(prev => ({
        ...prev,
        roundNumber: newRoundNumber,
        // ✅ CRITICAL FIX: Sync new questions locally to prevent stale round data
        // Realtime updates may not include JSONB questions field
        questions: formattedQuestions,
        currentQuestionIndex: 0,
        categoryName: nextCategoryName,
        categoryIcon: nextCategoryIcon,
        phase: 'round-intro',
        // CRITICAL: Sync suggester state from DB update
        currentRoundSuggesterId: suggesterUserId,
        currentRoundSuggesterNickname: suggesterNickname,
        currentRoundSuggesterAvatarUrl: suggesterAvatarUrl,
      }));
      
      // CRITICAL FIX: Reset timer and advance refs for new round
      // This ensures the next round starts fresh without stale state from previous round
      timerInitializedForQuestionRef.current = null; // Will be set on countdown->playing
      hasAdvancedRef.current = false;
      questionStartedAtRef.current = 0;
      wasInPreQuestionPhaseRef.current = false; // Reset pre-question presence flag for new round
      console.log('[Next Round] ✅ Reset timing refs for new round');
      
      tvLog('Advanced to next round', { newRoundNumber });

      hasAdvancedRef.current = false;
      return true;
    } catch (err) {
      tvLogError('startNextRoundFromQueueIfAny', err);
      const { toast } = await import('sonner');
      toast.error(t('extra.tvNextRoundFailed'));
      return false;
    }
  }, [isHost, state.sessionId, confirmActivePlayers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
      if (answersChannelRef.current) supabase.removeChannel(answersChannelRef.current);
    };
  }, []);

  // ============================================================================
  // TRIGGER 1: Timer countdown (15 seconds)
  // ============================================================================
  // Timer counts down from QUESTION_TIME. Questions always run full duration.
  // Only host triggers advancement when timer expires.
  // ============================================================================
  useEffect(() => {
    // Only run during question phase
    if (state.phase !== 'question') return;
    if (!state.sessionId) return;
    
    // Start the timer countdown
    tvLogTimer('start', state.timeRemaining);
    
    timerRef.current = setInterval(() => {
      setState(prev => {
        // Timer already at 0 or less = stop
        if (prev.timeRemaining <= 1) {
          tvLogTimer('expired');
          // Host triggers reveal when timer hits 0
          if (isHostRef.current && prev.phase === 'question') {
            advanceToReveal('timer expired');
          }
          return { ...prev, timeRemaining: 0 };
        }
        
        // Simply count down - no early timeout logic
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase, state.sessionId, advanceToReveal]);

  // ============================================================================
  // PERIODIC FALLBACK: Check every 2s if all players answered
  // This catches cases where realtime subscription missed an INSERT event
  // ============================================================================
  useEffect(() => {
    if (state.phase !== 'question') return;
    if (!isHost) return;
    if (!state.sessionId) return;
    
    // Check every 1.5s in case realtime subscription missed an INSERT
    const fallbackInterval = setInterval(() => {
      checkAndAdvanceIfAllAnswered();
    }, 1500);
    
    return () => clearInterval(fallbackInterval);
  }, [state.phase, isHost, state.sessionId, checkAndAdvanceIfAllAnswered]);

  // ============================================================================
  // VISIBILITY CHANGE: Re-sync when app returns to foreground
  // ============================================================================
  // When a player's screen locks/unlocks or they switch tabs, this ensures:
  // 1. Session state is re-fetched from DB
  // 2. Presence is re-tracked to mark them as active
  // 3. Timer is synced to server time for question phase
  // ============================================================================
  useEffect(() => {
    if (!state.sessionId) return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Visibility] 👀 App returned to foreground');
        
        // Step 1: Re-sync session state from database
        await refetchSessionData(stateRef.current.sessionId!);
        
        // Step 2: Re-track presence to mark as active
        if (presenceChannelRef.current && myPlayerId) {
          const me = stateRef.current.players.find(p => p.id === myPlayerId);
          await presenceChannelRef.current.track({
            nickname: me?.nickname || 'Player',
            avatar_url: me?.avatar_url ?? null,
            score: me?.score ?? myScoreRef.current,
            hasAnswered: myAnswerRef.current !== null,
            lastAnswerCorrect: me?.lastAnswerCorrect ?? null,
            lastAnswer: myAnswerRef.current,
            isHost: isHostRef.current,
            isActive: true,
          });
          console.log('[Visibility] ✅ Re-tracked presence as active');
        }
        
        // Step 3: If in question phase, sync timer to server time
        if (stateRef.current.phase === 'question') {
          const { data: session } = await supabase
            .from('tv_sessions')
            .select('question_start_time')
            .eq('id', stateRef.current.sessionId)
            .single();
          
          if (session?.question_start_time) {
            const startTime = new Date(session.question_start_time).getTime();
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, QUESTION_TIME - elapsed);
            
            setState(prev => ({ ...prev, timeRemaining: remaining }));
            console.log('[Visibility] ⏱️ Synced timer: elapsed', elapsed, 'remaining', remaining);
            
            // Host-specific: If timer should have expired, advance now
            if (isHostRef.current && remaining <= 0) {
              console.log('[Visibility] ⏰ Timer expired during sleep - advancing now');
              advanceToReveal('timer expired (visibility sync)');
            }
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.sessionId, myPlayerId, refetchSessionData, advanceToReveal]);

  // ============================================================================
  // HEARTBEAT: Fallback check for stuck games (host only)
  // ============================================================================
  // Runs every 5 seconds during question phase to catch stuck timers
  // This handles cases where the host's timer paused (screen locked) and
  // the visibility change event didn't fire or was missed
  // SAFETY: Force-resets stuck refs (checkInProgressRef, hasAdvancedRef)
  // ============================================================================
  const checkInProgressSinceRef = useRef<number>(0); // Timestamp when checkInProgressRef was set to true

  useEffect(() => {
    if (!isHost) return;
    if (state.phase !== 'question') return;
    if (!state.sessionId) return;
    
    const heartbeatCheck = async () => {
      // SAFETY: Force-reset checkInProgressRef if it's been stuck for >5 seconds
      if (checkInProgressRef.current && checkInProgressSinceRef.current > 0) {
        const stuckDuration = Date.now() - checkInProgressSinceRef.current;
        if (stuckDuration > 5000) {
          console.log('[Heartbeat] ⚠️ checkInProgressRef stuck for', Math.round(stuckDuration / 1000), 's — force-resetting');
          checkInProgressRef.current = false;
          checkInProgressSinceRef.current = 0;
        }
      }

      const { data: session } = await supabase
        .from('tv_sessions')
        .select('question_start_time, status')
        .eq('id', stateRef.current.sessionId)
        .single();
      
      if (!session?.question_start_time || session.status !== 'playing') return;
      
      const startTime = new Date(session.question_start_time).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      // If more than QUESTION_TIME + 10 seconds have passed, force advance
      // This is a stuck-game RECOVERY path — bypass all guards
      if (elapsed > QUESTION_TIME + 10) {
        console.log('[Heartbeat] ⚠️ Game stuck! Elapsed:', elapsed, 'seconds. Force-resetting guards and advancing.');
        // Reset ALL blocking refs before forcing advance
        hasAdvancedRef.current = false;
        checkInProgressRef.current = false;
        checkInProgressSinceRef.current = 0;
        advanceToReveal('heartbeat stuck recovery (force)');
      } else if (elapsed > QUESTION_TIME + 5) {
        console.log('[Heartbeat] ⚠️ Game overdue! Elapsed:', elapsed, 'seconds. Attempting advance.');
        // Reset hasAdvancedRef since this is a recovery path
        hasAdvancedRef.current = false;
        advanceToReveal('heartbeat stuck recovery');
      }
    };
    
    const interval = setInterval(heartbeatCheck, 5000);
    
    return () => clearInterval(interval);
  }, [isHost, state.phase, state.sessionId, advanceToReveal]);

  // NOTE: Presence-based auto-advance has been DISABLED.
  // Auto-advance logic is now handled by database-based answer counting via:
  // - setupAnswersSubscription() - subscribes to player_answers INSERT events
  // - checkAllAnsweredFromDB() - queries actual answer count from database
  // 
  // This prevents race conditions where presence sync is incomplete
  // and the host's answer causes immediate advancement.

  // Auto-advance from reveal after a fixed duration (host only)
  // Use longer duration if no one answered (shows correct answer for 10 seconds)
  useEffect(() => {
    if (!isHost) return;
    if (!state.sessionId) return;
    if (state.phase !== 'reveal') return;

    // Check if any player answered - if not, use longer reveal duration
    const anyPlayerAnswered = state.players.some(p => p.hasAnswered);
    const revealDuration = anyPlayerAnswered ? REVEAL_DURATION_MS : REVEAL_DURATION_LONG_MS;
    
    console.log('[Reveal] ⏱️ Using reveal duration:', revealDuration, 'ms, anyAnswered:', anyPlayerAnswered);

    const t = setTimeout(async () => {
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        // If this was the last round, end the game and show final leaderboard.
        const currentRound = stateRef.current.roundNumber;
        const totalRoundsNow = stateRef.current.totalRounds;
        if (totalRoundsNow > 0 && currentRound >= totalRoundsNow) {
          await supabase
            .from('tv_sessions')
            .update({ status: 'completed', reveal_start_time: null })
            .eq('id', state.sessionId);
          // CRITICAL FIX: Update local state immediately for host
          setState(prev => ({ ...prev, phase: 'results' }));
          console.log('[Game End] 📱 Host local state updated to results (final round)');
          return;
        }

        const startedNext = await startNextRoundFromQueueIfAny();
        if (!startedNext) {
          await supabase
            .from('tv_sessions')
            .update({ status: 'completed', reveal_start_time: null })
            .eq('id', state.sessionId);
          // CRITICAL FIX: Update local state immediately for host
          setState(prev => ({ ...prev, phase: 'results' }));
          console.log('[Game End] 📱 Host local state updated to results (no more queue)');
        }
      } else {
        // Reset answers via local state + presence track; presence sync will update everyone.
        setMyAnswer(null);
        if (presenceChannelRef.current) {
          await presenceChannelRef.current.track({
            nickname: state.players.find(p => p.id === myPlayerId)?.nickname || 'Host',
            avatar_url: state.players.find(p => p.id === myPlayerId)?.avatar_url,
            score: myScore,
            hasAnswered: false,
            lastAnswerCorrect: null,
            lastAnswer: null,
            answeredQuestionIndex: undefined, // Clear stale question reference for new question
            isHost: true,
            isActive: true,
          });
        }

        // UNIFIED: Use prepareForPlaying for consistent initialization
        // This clears ALL answers (not just current question) and verifies player count
        console.log('[Next Question] 🎯 Using UNIFIED prepareForPlaying...');
        const { expectedCount } = await prepareForPlaying(state.sessionId, nextIndex);
        console.log('[Next Question] ✅ UNIFIED preparation complete, expectedCount:', expectedCount);
        
        // Transition to playing with verified count
        await supabase
          .from('tv_sessions')
          .update({
            status: 'playing',
            current_question_index: nextIndex,
            question_start_time: new Date().toISOString(),
            reveal_start_time: null,
            active_player_count: expectedCount,
          })
          .eq('id', state.sessionId);
        
        // FIX P0: Set timing ref AFTER DB transition (not in prepareForPlaying)
        // This ensures the 2500ms safety window starts after all devices sync
        questionStartedAtRef.current = Date.now();
        console.log('[Next Question] ⏱️ Timing ref set AFTER DB transition:', questionStartedAtRef.current);
        
        // CRITICAL FIX: Update local state IMMEDIATELY for host to prevent "stuck" UI
        // The realtime subscription may have delays, so we update locally first
        setState(prev => ({ 
          ...prev, 
          phase: 'question', // Map to 'question' phase (matches mapDbStatusToPhase)
          currentQuestionIndex: nextIndex,
          timeRemaining: QUESTION_TIME,
        }));
        console.log('[Next Question] 📱 Host local state updated to question', nextIndex);
        
        // CRITICAL FIX: Mark timer as initialized for this question index
        // This prevents the realtime subscription from overwriting our 15s timer
        // when it receives the DB update (which may have significant elapsed time due to latency)
        timerInitializedForQuestionRef.current = nextIndex;
        hasAdvancedRef.current = false;
        
        // CRITICAL: For reveal→playing transitions, set wasInCountdown to true
        // All players who made it to reveal are present, not late joiners
        // This ensures they get full 15s even if network latency causes elapsed time
        wasInPreQuestionPhaseRef.current = true;
        console.log('[Next Question] ✅ Timer marked as initialized for question', nextIndex, ', wasInPreQuestionPhase set for non-host clients');
      }
    }, revealDuration);

    return () => clearTimeout(t);
  }, [isHost, state.sessionId, state.phase, state.currentQuestionIndex, state.questions.length, state.players, myPlayerId, myScore, startNextRoundFromQueueIfAny, prepareForPlaying]);

  // Create TV session (called by TV display)
  const createSession = useCallback(async (): Promise<string | null> => {
    try {
      const fourDigitCode = generate4DigitCode();
      
      const { data, error } = await supabase
        .from('tv_sessions')
        .insert({
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
        code: fourDigitCode,
        sessionId: data.id,
        phase: 'pairing',
      }));

      // Subscribe to session changes
      setupSessionSubscription(data.id);
      setupPresenceChannel(data.id, 'TV_DISPLAY', null, false, true, 'TV_DISPLAY'); // Pass explicit ID
      setupAnswersSubscription(data.id); // Subscribe to player answers for auto-advance

      return fourDigitCode;
    } catch (error) {
      console.error('Error creating TV session:', error);
      return null;
    }
  }, []);

  // Mirror an existing TV session (called by secondary TV displays)
  // This connects to an existing session as a read-only display
  const mirrorSession = useCallback(async (code: string): Promise<boolean> => {
    try {
      const upperCode = code.trim().toUpperCase();
      
      // Look up session by 4-digit code
      const { data: session, error } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('tv_pairing_code', upperCode)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !session) {
        console.error('Mirror session not found:', error);
        return false;
      }

      tvLog('Mirroring session', { sessionId: session.id, code: upperCode });

      // Parse questions from session
      const rawQuestions = (session.questions as Json) || [];
      const questions: TVQuestion[] = (Array.isArray(rawQuestions) ? rawQuestions : []).map((q: any) => ({
        id: q.id || crypto.randomUUID(),
        question_text: q.question_text || '',
        correct_answer: q.correct_answer || '',
        options: q.options || [],
        icon_slug: q.icon_slug || null,
      }));

      // Set state to mirror the session
      setState(prev => ({
        ...prev,
        code: session.tv_pairing_code,
        sessionId: session.id,
        roomId: session.room_id || null,
        phase: mapDbStatusToPhase(session.status),
        questions,
        currentQuestionIndex: session.current_question_index || 0,
        roundNumber: session.round_number || 1,
        totalRounds: session.total_rounds || 1,
        categoryName: session.category_name || null,
        categoryIcon: session.category_icon || null,
        roomName: session.room_name || null,
        totalRoundsPlayed: session.total_rounds_played || 0,
        accumulatedScores: (session.accumulated_scores as Record<string, number>) || {},
        isPaired: session.is_paired || false,
        currentRoundSuggesterId: session.current_round_suggester_id || null,
        currentRoundSuggesterNickname: session.current_round_suggester_nickname || null,
        currentRoundSuggesterAvatarUrl: session.current_round_suggester_avatar_url || null,
      }));

      setIsMirror(true);
      setIsHost(false);

      // Subscribe to session changes (same as primary display)
      setupSessionSubscription(session.id);
      setupPresenceChannel(session.id, 'TV_MIRROR', null, false, true, 'TV_MIRROR');
      setupAnswersSubscription(session.id);

      tvLog('Mirror session connected successfully');
      return true;
    } catch (error) {
      console.error('Error mirroring session:', error);
      return false;
    }
  }, []);

  // Join session (called by controller or TV display)
  const joinSession = useCallback(async (code: string, nickname: string, avatarUrl?: string | null): Promise<boolean> => {
    try {
      // Clear any expired session bindings on join attempt
      clearExpiredBindings();
      
      const raw = (code || '').trim();
      const upperCode = raw.toUpperCase();
      
      tvLog('joinSession called', { code: raw, isUuid: isUuid(raw) });
      
      // Get current auth user if any
      const { data: { user } } = await supabase.auth.getUser();
      const authUserId = user?.id || null;
      
      tvLog('Auth user check', { authUserId: authUserId?.slice(0, 8), hasUser: !!user });

      const isSessionIdJoin = isUuid(raw);
      
      let session: any = null;
      let error: any = null;

      // Include all active session statuses for rejoining (lobby, poll phases, round-intro, category-select, etc.)
      const activeStatuses = [
        'waiting', 'paired', 'lobby', 'countdown', 'playing', 'reveal', 'completed',
        'round-intro', 'poll-suggest', 'poll-voting', 'poll-results', 'category-select'
      ];

      if (isSessionIdJoin) {
        const { data, error: byIdError } = await supabase
          .from('tv_sessions')
          .select('*')
          .eq('id', raw)
          .in('status', activeStatuses)
          .maybeSingle();
        session = data;
        error = byIdError;
      } else {
        // Hard switch: manual entry is the 4-digit TV code
        const { data, error: byCodeError } = await supabase
          .from('tv_sessions')
          .select('*')
          .eq('tv_pairing_code', upperCode)
          .in('status', activeStatuses)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        session = data;
        error = byCodeError;
        
        tvLog('Session lookup by 4-digit code', { 
          code: upperCode, 
          found: !!data, 
          error: byCodeError?.message,
          sessionId: data?.id?.slice(0, 8),
          status: data?.status
        });
      }

      if (error || !session) {
        console.error('Session not found:', { code: raw, upperCode, error });
        tvLog('Session NOT found - rejoin failed', { code: raw, error: error?.message });
        return false;
      }
      
      tvLog('Session found successfully', { 
        sessionId: session.id.slice(0, 8), 
        status: session.status,
        hostId: session.host_user_id?.slice(0, 8)
      });

      // Check for existing session binding (join idempotency)
      // This prevents duplicate player entries when double-clicking join
      let playerId = getSessionBinding(session.id);
      
      if (playerId) {
        tvLog('Reusing existing player ID from session binding', { playerId: playerId.slice(0, 8) });
      } else {
        // Generate new player ID
        playerId = getOrCreatePlayerId(authUserId || undefined);
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

      // CRITICAL: Register/update player in tv_players table for smooth rejoin after refresh
      // This ensures:
      // 1. RLS policies work for guests (poll suggestions, answers)
      // 2. Player count is accurate for auto-advance
      // 3. Rejoining players restore their is_active status
      if (!isTVDisplay) {
        const authUid = authUserId || null;
        
        // Check if player already exists in this session
        const { data: existingPlayer } = await supabase
          .from('tv_players')
          .select('id, is_active, user_id')
          .eq('tv_session_id', session.id)
          .eq('player_id', playerId)
          .maybeSingle();

        // CRITICAL FIX: Determine if we're joining mid-game
        // If so, new players should NOT be marked active until the next question starts
        // This prevents breaking the active_player_count that was locked at question start
        const isActiveGameplay = ['playing', 'reveal', 'question'].includes(session.status);
        const isReturningPlayer = !!existingPlayer;
        
        // Only mark active if:
        // - Not in active gameplay, OR
        // - They're a returning player who was already part of this round
        const shouldBeActive = !isActiveGameplay || isReturningPlayer;
        
        if (existingPlayer) {
          // Player exists - update their is_active status to true (they're back!)
          // CRITICAL FIX: Also preserve/set user_id for authenticated players
          await supabase
            .from('tv_players')
            .update({ 
              is_active: true, // Returning players are always active
              nickname,
              avatar_url: avatarUrl || null,
              user_id: authUid || (existingPlayer as any).user_id, // Preserve or set user_id
            })
            .eq('id', existingPlayer.id);
          tvLog('Updated existing tv_player as active', { playerId: playerId.slice(0, 8), userId: authUid?.slice(0, 8) });
        } else {
          // New player - insert them
          // CRITICAL: If game is in progress, mark as INACTIVE until next question
          // This prevents breaking the active_player_count for the current question
          const { error: insertError } = await supabase
            .from('tv_players')
            .insert({
              tv_session_id: session.id,
              user_id: authUid,
              player_id: playerId,
              nickname,
              avatar_url: avatarUrl || null,
              is_host: isHostPlayer,
              is_active: shouldBeActive, // Inactive if joining mid-game!
            });

          if (insertError) {
            // Log but don't fail - presence will still work
            console.warn('[joinSession] Failed to insert tv_player:', insertError);
          } else {
            tvLog('Registered new tv_player', { 
              playerId: playerId.slice(0, 8), 
              isHost: isHostPlayer,
              isActive: shouldBeActive,
              joinedMidGame: isActiveGameplay && !isReturningPlayer
            });
            
            if (!shouldBeActive) {
              console.log('[joinSession] ⚠️ Player joined mid-game - marked INACTIVE until next question');
            }
          }
        }

        // The TV lobby shows reserved "invited" seats from room_participants.
        // Claim ours on join so the grayed-out ghost seat disappears instead
        // of showing the same player twice (once joined, once "invited").
        if (authUid && session.room_id) {
          const { error: claimError } = await supabase
            .from('room_participants')
            .update({ status: 'joined' })
            .eq('room_id', session.room_id)
            .eq('user_id', authUid)
            .eq('status', 'invited');
          if (claimError) {
            console.warn('[joinSession] Failed to claim invited seat:', claimError);
          }
        }
      }

      // Parse existing questions if any
      let questions: TVQuestion[] = [];
      if (session.questions) {
        const rawQuestions = session.questions as unknown as Array<{
          id: string;
          question_text: string;
          correct_answer: string;
          options: string[];
          icon_slug?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          audio_url?: string | null;
        }>;
        questions = rawQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          options: q.options,
          icon_slug: q.icon_slug,
          image_url: q.image_url,
          video_url: q.video_url,
          audio_url: q.audio_url,
        }));
      }

      tvLog('Setting initial state from session', { 
        status: session.status, 
        phase: mapDbStatusToPhase(session.status),
        questionCount: questions.length 
      });
      
      // Note: active_player_count is read from DB when needed, no local ref required
      const dbPlayerCount = (session as any).active_player_count as number | undefined;
      if (dbPlayerCount && dbPlayerCount > 0) {
        console.log('[joinSession] Read active_player_count from DB:', dbPlayerCount);
      }
      
      setState(prev => ({
        ...prev,
        code: session.tv_pairing_code || prev.code,
        sessionId: session.id,
        roomId: session.room_id || null, // Store the actual room_id for FK constraints
        phase: mapDbStatusToPhase(session.status),  // Use proper mapping!
        questions,
        currentQuestionIndex: session.current_question_index || 0,
        categoryName: session.category_name,
        categoryIcon: session.category_icon,
      }));

      setMyPlayerId(playerId);
      // CRITICAL: TV_DISPLAY is NEVER the host - only phone controllers can be hosts
      // This prevents the TV from triggering startPlaying when it shouldn't
      setIsHost(isTVDisplay ? false : isHostPlayer);

      // Setup subscriptions
      setupSessionSubscription(session.id);
      // CRITICAL: Pass the pre-computed playerId to prevent ID regeneration on refresh/reconnect
      setupPresenceChannel(session.id, nickname, avatarUrl || null, isHostPlayer, isTVDisplay, playerId);
      setupAnswersSubscription(session.id);

      // CRITICAL FIX: Restore myAnswer from database on rejoin
      // This prevents the host from seeing clickable answer buttons when they've already answered
      const currentQIdx = session.current_question_index || 0;
      if (session.status === 'playing' || session.status === 'reveal') {
        const { data: existingAnswer } = await supabase
          .from('player_answers')
          .select('answer')
          .eq('tv_session_id', session.id)
          .eq('user_id', playerId)
          .eq('question_index', currentQIdx)
          .maybeSingle();
        
        if (existingAnswer) {
          tvLog('Restored myAnswer from database on rejoin', { 
            answer: existingAnswer.answer.substring(0, 20), 
            questionIndex: currentQIdx 
          });
          setMyAnswer(existingAnswer.answer);
        }
      }

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
            reveal_start_time?: string | null;
            category_name: string | null;
            category_icon: string | null;
            is_paired: boolean;
            room_name: string | null;
            round_number?: number | null;
            total_rounds?: number | null;
            room_id?: string | null;
            current_round_suggester_id?: string | null;
            current_round_suggester_nickname?: string | null;
            current_round_suggester_avatar_url?: string | null;
            active_player_count?: number | null;
          };

          // New question detection must happen BEFORE setState, and must also reset presence.
          // Otherwise, the host sees stale `hasAnswered: true` from the previous question and
          // immediately auto-advances through all remaining questions.
          const prevIndex = stateRef.current.currentQuestionIndex;
          const isNewQuestion = typeof newData.current_question_index === 'number' && newData.current_question_index !== prevIndex;
          if (isNewQuestion) {
            tvLog('New question (subscription)', { from: prevIndex, to: newData.current_question_index });
            setMyAnswer(null);
            hasAdvancedRef.current = false;  // Reset for new question
            
            // TIMER FIX: Reset timer initialization tracker for new question
            timerInitializedForQuestionRef.current = null;
            // Note: Don't reset wasInPreQuestionPhaseRef here - it gets set during countdown/reveal phase
            
            // CRITICAL FIX: Only set questionStartedAtRef when status is 'playing'
            // During 'countdown', keep it at 0 to disable auto-advance checks
            // This prevents premature auto-advance when host answers first after a poll
            if (newData.status === 'playing') {
              questionStartedAtRef.current = Date.now();
              console.log('[New Question] Timing ref set (status=playing)');
            } else {
              // Reset to 0 during countdown to ensure auto-advance is disabled
              questionStartedAtRef.current = 0;
              console.log('[New Question] Timing ref disabled (status=' + newData.status + ')');
            }
            
            // Log the player count from DB for debugging
            const dbPlayerCount = (newData as any).active_player_count as number | undefined;
            const isPaired = newData.is_paired ?? stateRef.current.isPaired;
            console.log('[New Question] Started at', new Date().toISOString(), 
              'DB player count:', dbPlayerCount, 'isPaired:', isPaired);

            // Reset my presence for the new question so host does not treat me as already answered.
            if (presenceChannelRef.current && myPlayerId) {
              const me = stateRef.current.players.find((p) => p.id === myPlayerId);
              // Fire-and-forget: presence track is async, but we must not block the realtime callback.
              void presenceChannelRef.current.track({
                nickname: me?.nickname || 'Player',
                avatar_url: me?.avatar_url ?? null,
                score: typeof me?.score === 'number' ? me.score : myScore,
                hasAnswered: false,
                lastAnswerCorrect: null,
                lastAnswer: null,
                answeredQuestionIndex: undefined, // Clear stale question reference
                isHost: isHostRef.current,
                isActive: true,
              });
            }
          }
          
          // Parse questions if present
          let questions: TVQuestion[] = [];
          if (newData.questions) {
            const rawQuestions = newData.questions as unknown as Array<{
              id: string;
              question_text: string;
              correct_answer: string;
              options: string[];
              icon_slug?: string | null;
              image_url?: string | null;
              video_url?: string | null;
              audio_url?: string | null;
            }>;
            questions = rawQuestions.map(q => ({
              id: q.id,
              question_text: q.question_text,
              correct_answer: q.correct_answer,
              options: q.options,
              icon_slug: q.icon_slug,
              image_url: q.image_url,
              video_url: q.video_url,
              audio_url: q.audio_url,
            }));
          }

          setState(prev => {
            // Calculate time remaining ONLY on initial transition to 'playing' for this question
            // Once the local timer is running, don't override it with server calculations
            // This prevents premature question advances due to network latency
            let timeRemaining = prev.timeRemaining;
            const currentQuestionIdx = newData.current_question_index ?? prev.currentQuestionIndex;
            
            if (newData.status === 'playing' && newData.question_start_time) {
              // Only recalculate if this is a NEW question we haven't initialized timer for
              if (timerInitializedForQuestionRef.current !== currentQuestionIdx) {
                const startTime = new Date(newData.question_start_time).getTime();
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                
                // CRITICAL FIX v2: Use ELAPSED TIME as the primary indicator
                // If elapsed < 5 seconds, this player definitely isn't late - they're just experiencing
                // normal network latency from the host's startPlaying() to receiving the subscription.
                // Only sync to server time if elapsed >= 5 seconds (true late joiner scenario)
                const FRESH_START_THRESHOLD = 5; // If < 5s elapsed, give full time
                const EXTREME_LAG_THRESHOLD = 12; // If > 12s elapsed, definitely sync to server
                
                if (elapsed < FRESH_START_THRESHOLD) {
                  // Fresh question start - network latency is within normal range
                  timeRemaining = QUESTION_TIME;
                  console.log('[Timer] ✅ Fresh start (elapsed < 5s) - giving FULL time for question', currentQuestionIdx, 
                    'elapsed:', elapsed, 'giving full:', QUESTION_TIME);
                } else if (elapsed >= EXTREME_LAG_THRESHOLD) {
                  // Definitely late or extreme lag - sync to server time
                  timeRemaining = Math.max(0, QUESTION_TIME - elapsed);
                  console.log('[Timer] ⚠️ Extreme lag/late join (elapsed >= 12s) - syncing for question', currentQuestionIdx, 
                    'elapsed:', elapsed, 'remaining:', timeRemaining);
                } else {
                  // Middle ground (5-12s): Use wasInPreQuestionPhase flag as tiebreaker
                  const wasPresent = wasInPreQuestionPhaseRef.current;
                  if (wasPresent) {
                    // Player was in countdown/reveal - give full time despite moderate lag
                    timeRemaining = QUESTION_TIME;
                    console.log('[Timer] ✅ Was in pre-question phase (5-12s elapsed) - giving FULL time for question', currentQuestionIdx, 
                      'elapsed:', elapsed);
                  } else {
                    // Player wasn't tracked in pre-question phase - sync to server
                    timeRemaining = Math.max(0, QUESTION_TIME - elapsed);
                    console.log('[Timer] ⚠️ Not in pre-question phase (5-12s elapsed) - syncing for question', currentQuestionIdx, 
                      'elapsed:', elapsed, 'remaining:', timeRemaining);
                  }
                }
                
                timerInitializedForQuestionRef.current = currentQuestionIdx;
                // Reset the pre-question phase flag now that we've used it for this question
                wasInPreQuestionPhaseRef.current = false;
              } else {
                // CRITICAL FIX: Timer already initialized for this question by startPlaying()
                // We must FORCE timeRemaining = QUESTION_TIME here to avoid race conditions:
                // - startPlaying() sets timerInitializedForQuestionRef BEFORE its setState propagates
                // - This subscription handler may run with stale prev.timeRemaining (from previous game)
                // - By forcing QUESTION_TIME, we ensure consistency regardless of React batching
                timeRemaining = QUESTION_TIME;
                console.log('[Timer] ⏭️ Timer already initialized for question', currentQuestionIdx, 
                  '- forcing timeRemaining to QUESTION_TIME to avoid race condition');
              }
            } else if (newData.status === 'countdown') {
              // Reset timer tracker for new countdown phase
              timerInitializedForQuestionRef.current = null;
              timeRemaining = QUESTION_TIME;
              // CRITICAL: Mark that this client was present during countdown
              // This prevents false "late joiner" detection due to network latency
              wasInPreQuestionPhaseRef.current = true;
              console.log('[Timer] 📍 Marked wasInPreQuestionPhase=true for upcoming question');
            } else if (newData.status === 'reveal') {
              // CRITICAL: Also mark pre-question phase during reveal
              // Players in reveal are NOT late joiners for the next question
              wasInPreQuestionPhaseRef.current = true;
            }

            // Log phase changes
            const newPhase = mapDbStatusToPhase(newData.status);
            if (prev.phase !== newPhase) {
              tvLogPhase(prev.phase, newPhase, 'session subscription');
              
              // CRITICAL DEBUG: Log questions during phase transitions (especially poll -> countdown)
              console.log('[Subscription] 🔄 Phase transition:', {
                from: prev.phase,
                to: newPhase,
                dbStatus: newData.status,
                questionsInUpdate: questions.length,
                prevQuestionsCount: prev.questions.length,
                suggesterId: newData.current_round_suggester_id || 'none',
              });
              
              // CRITICAL FIX: Auto-refetch if transitioning from poll to game phases with no questions
              // This handles cases where realtime update was missed (network issues, background tabs, etc.)
              if (prev.phase.includes('poll') && ['countdown', 'playing'].includes(newPhase)) {
                if (questions.length === 0 && prev.questions.length === 0) {
                  console.log('[Subscription] ⚠️ Poll->game transition with NO questions - scheduling refetch');
                  // Use setTimeout to avoid blocking the realtime callback
                  setTimeout(() => {
                    refetchSessionData(sessionId);
                  }, 300);
                }
              }
              
              // CRITICAL: When transitioning to 'playing', enable auto-advance timing
              // This catches cases where subscription didn't see question change during countdown
              if (newData.status === 'playing' && questionStartedAtRef.current === 0) {
                questionStartedAtRef.current = Date.now();
                console.log('[Subscription] Enabled auto-advance timing on status->playing transition');
              }
              
              // When transitioning to 'countdown', disable auto-advance timing
              if (newData.status === 'countdown') {
                questionStartedAtRef.current = 0;
                console.log('[Subscription] Disabled auto-advance timing on countdown');
              }
              
              // CRITICAL FIX: When transitioning to category-select or results phases, 
              // disable auto-advance to prevent stale game state from triggering advances
              const safePhases = ['category-select', 'results', 'completed', 'poll-suggest', 'poll-voting', 'poll-results', 'round-intro', 'lobby'];
              if (safePhases.includes(newData.status)) {
                questionStartedAtRef.current = 0;
                hasAdvancedRef.current = false;
                console.log('[Subscription] Disabled auto-advance timing on safe phase:', newData.status);
              }
              
              // ✅ CRITICAL FIX: Force refetch when round number changes with no questions
              // Supabase Realtime often omits JSONB fields in UPDATE payloads
              const prevRoundNumber = prev.roundNumber;
              const newRoundNumber = newData.round_number ?? prev.roundNumber;
              const isNewRound = newRoundNumber !== prevRoundNumber && newRoundNumber > 0;

              if (isNewRound) {
                console.log('[Subscription] 🔄 New round detected:', { from: prevRoundNumber, to: newRoundNumber });
                
                // If questions in update are empty but this is a new round, we MUST refetch
                if (questions.length === 0) {
                  console.log('[Subscription] ⚠️ New round but NO questions in update - forcing refetch');
                  setTimeout(() => {
                    refetchSessionData(sessionId);
                  }, 200);
                }
              }
            }

            // Reset all players to waiting state when new question starts
            // This ensures immediate visual feedback without waiting for individual presence updates
            let updatedPlayers = prev.players;
            if (isNewQuestion) {
              updatedPlayers = prev.players.map(p => ({
                ...p,
                hasAnswered: false,
                lastAnswerCorrect: null,
                lastAnswer: null,
              }));
              console.log('[New Question] Reset all players to waiting state');
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
              roundNumber: newData.round_number ?? prev.roundNumber,
              totalRounds: newData.total_rounds ?? prev.totalRounds,
              roomId: newData.room_id || prev.roomId, // Sync roomId for FK constraints
              players: updatedPlayers,
              // Sync suggester info for the current round
              // CRITICAL FIX: Use explicit null check - null means "cleared", not "keep previous"
              // This prevents stale suggester IDs from blocking players in subsequent rounds
              currentRoundSuggesterId: 'current_round_suggester_id' in (newData as any) 
                ? (newData as any).current_round_suggester_id 
                : prev.currentRoundSuggesterId,
              currentRoundSuggesterNickname: 'current_round_suggester_nickname' in (newData as any)
                ? (newData as any).current_round_suggester_nickname
                : prev.currentRoundSuggesterNickname,
              currentRoundSuggesterAvatarUrl: 'current_round_suggester_avatar_url' in (newData as any)
                ? (newData as any).current_round_suggester_avatar_url
                : prev.currentRoundSuggesterAvatarUrl,
            };
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // Setup presence channel for players
  // IMPORTANT: playerIdOverride ensures the presence key matches the player ID computed in joinSession,
  // preventing duplicate avatars when refreshing or reconnecting
  const setupPresenceChannel = (sessionId: string, nickname: string, avatarUrl: string | null, isHostPlayer: boolean, isTVDisplay: boolean = false, playerIdOverride?: string) => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    // Use override if provided, otherwise fall back to existing logic
    // This is critical for preventing duplicate player IDs on refresh/reconnect
    const playerId = playerIdOverride || (isTVDisplay ? 'TV_DISPLAY' : getOrCreatePlayerId(myPlayerId || undefined));
    if (!myPlayerId && !isTVDisplay) setMyPlayerId(playerId);

    tvLog('Setting up presence', { playerId: playerId.slice(0, 8), nickname, isHost: isHostPlayer, isTVDisplay });

    const channel = supabase.channel(`tv-presence-${sessionId}`, {
      config: { presence: { key: playerId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const players: TVPlayer[] = [];

        const currentQIndex = stateRef.current.currentQuestionIndex;

        Object.entries(presenceState).forEach(([key, presences]) => {
          const rawPresence = presences[0] as Record<string, unknown> | undefined;
          
          // Filter out TV_DISPLAY and TV_MIRROR - they are not players
          // Check key, nickname, AND explicit flags for comprehensive filtering
          const systemDeviceKeys = ['TV_DISPLAY', 'TV_MIRROR'];
          const isSystemDeviceByKey = systemDeviceKeys.includes(key);
          const nickname = rawPresence?.nickname as string | undefined;
          const isSystemDeviceByNickname = nickname && systemDeviceKeys.includes(nickname);
          const isSystemDeviceByFlag = rawPresence?.isTVDisplay === true || rawPresence?.isSystemDevice === true;
          
          if (rawPresence && !isSystemDeviceByKey && !isSystemDeviceByNickname && !isSystemDeviceByFlag && 'nickname' in rawPresence) {
            // Check if the answer is for the CURRENT question to prevent stale state display
            const answeredQuestionIndex = rawPresence.answeredQuestionIndex as number | undefined;
            const isCurrentQuestionAnswer = answeredQuestionIndex === currentQIndex;
            
            players.push({
              id: key,
              nickname: (rawPresence.nickname as string) || 'Player',
              avatar_url: rawPresence.avatar_url as string | null,
              score: (rawPresence.score as number) || 0,
              // Only show answered state if it's for the CURRENT question
              hasAnswered: isCurrentQuestionAnswer ? (rawPresence.hasAnswered as boolean) || false : false,
              lastAnswerCorrect: isCurrentQuestionAnswer ? rawPresence.lastAnswerCorrect as boolean | null : null,
              lastAnswer: isCurrentQuestionAnswer ? rawPresence.lastAnswer as string | null : null,
              isHost: (rawPresence.isHost as boolean) || false,
              // Treat players as active ONLY when explicitly tracked as active.
              // This prevents invited/offline players from blocking auto-advance.
              isActive: rawPresence.isActive === true,
              isReadyForNextRound: (rawPresence.isReadyForNextRound as boolean) || false,
              // Track time remaining when answer was given (for observer bonus calculation)
              answeredTimeRemaining: isCurrentQuestionAnswer ? (rawPresence.answeredTimeRemaining as number | undefined) : undefined,
            });
          }
        });

        // DEDUPLICATION: Prevent duplicate avatars from stale presence entries
        // Keep the player with highest score (most likely the "real" active one)
        const seenNicknames = new Map<string, TVPlayer>();
        players.forEach(player => {
          const existing = seenNicknames.get(player.nickname);
          if (!existing || player.score > existing.score || (player.score === existing.score && player.isActive)) {
            seenNicknames.set(player.nickname, player);
          }
        });
        const deduplicatedPlayers = Array.from(seenNicknames.values());

        // Host should always appear first, then sort by score
        deduplicatedPlayers.sort((a, b) => {
          if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
          return b.score - a.score;
        });

        setState(prev => ({ ...prev, players: deduplicatedPlayers }));

        // A presence update may be the LAST player's hasAnswered flag landing.
        // Give state a tick to settle, then run the advance check (host only).
        // The hasAnswered flags are per-question (answeredQuestionIndex guard
        // above), so this cannot advance on stale previous-question flags.
        if (isHostRef.current && stateRef.current.phase === 'question') {
          setTimeout(() => checkAndAdvanceIfAllAnswered(), 100);
        }

        tvLogPresence('sync', players.length, players.map(p => p.nickname));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        tvLogPlayer('join', key, newPresences);
      })
      .on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
        tvLogPlayer('leave', key);

        // Log player disconnect for debugging
        if (leftPresences && leftPresences.length > 0) {
          const leftPlayer = leftPresences[0] as { nickname?: string };
          tvLog('Player disconnected', { nickname: leftPlayer.nickname || key });
        }
        
        // FIX: Only mark player as inactive when NOT in active gameplay phases
        // During active gameplay, presence flickers should NOT affect player count
        // The player count is locked at round start and auto-advance uses that locked count
        const activePhases = ['countdown', 'question', 'playing', 'reveal', 'poll-suggest', 'poll-voting', 'poll-results'];
        const currentPhase = stateRef.current.phase;
        
        // Check if this is a system device by key or by presence data
        const leftPresenceData = leftPresences?.[0] as Record<string, unknown> | undefined;
        const isSystemDeviceByKey = key === 'TV_DISPLAY' || key === 'TV_MIRROR';
        const isSystemDeviceByFlag = leftPresenceData?.isTVDisplay === true || leftPresenceData?.isSystemDevice === true;
        const isSystemDevice = isSystemDeviceByKey || isSystemDeviceByFlag;
        
        if (!isSystemDevice && !activePhases.includes(currentPhase)) {
          const currentSessionId = stateRef.current.sessionId;
          if (currentSessionId) {
            await supabase
              .from('tv_players')
              .update({ is_active: false })
              .eq('tv_session_id', currentSessionId)
              .eq('player_id', key);
            tvLog('Marked player as inactive', { playerId: key.slice(0, 8), phase: currentPhase });
          }
        } else if (isSystemDevice) {
          tvLog('Ignored system device presence leave', { key });
        } else if (activePhases.includes(currentPhase)) {
          tvLog('Ignored presence leave during active gameplay', { playerId: key.slice(0, 8), phase: currentPhase });
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
          // Track presence - but system devices (TV_DISPLAY, TV_MIRROR) are marked as NOT active players
          // This prevents them from being counted in player lists or affecting gameplay
          await channel.track({
            nickname,
            avatar_url: avatarUrl,
            score: 0,
            hasAnswered: false,
            lastAnswerCorrect: null,
            isHost: isTVDisplay ? false : isHostPlayer, // System devices are never hosts
            isTVDisplay,
            isActive: !isTVDisplay, // System devices are NOT active players
            isSystemDevice: isTVDisplay, // Explicit flag for filtering
          });
          tvLog('Presence tracked', { nickname, isTV: isTVDisplay, isActive: !isTVDisplay });
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

  // Start the game (host only) - supports both categories and user trivias
  const startGame = useCallback(async (categoryId?: string, userTriviaId?: string) => {
    if (!state.sessionId || !isHost) return;

    // Validate that either categoryId or userTriviaId is provided
    if (!categoryId && !userTriviaId) {
      tvLogError('startGame', 'No category ID or user trivia ID provided');
      toast.error('Please select a category before starting');
      return;
    }
    
    // CRITICAL: Reset timing refs to 0 immediately when starting a new game
    // This prevents stale values from a previous game from causing issues
    // The proper values will be set in startPlaying AFTER the transition to 'playing'
    questionStartedAtRef.current = 0;
    hasAdvancedRef.current = false;
    timerInitializedForQuestionRef.current = null;
    wasInPreQuestionPhaseRef.current = false;
    console.log('[startGame] ⏱️ Reset ALL timing refs for new game');

    try {
      // Fetch queue items to calculate total rounds.
      // NOTE: tv_session_queue is frequently seeded with the *initial* room category at position 0.
      // If we start the game with that same category, we must remove it from the queue to avoid:
      //  - totalRounds being off-by-one (e.g., showing 4 when user selected 3)
      //  - the first round repeating after round 2 (because the "next" item is actually the current one)
      // CRITICAL: Also fetch suggester_* fields to properly block host on first round
      const { data: queueItems } = await supabase
        .from('tv_session_queue')
        .select('id, category_id, user_trivia_id, position, suggester_user_id, suggester_nickname, suggester_avatar_url')
        .eq('session_id', state.sessionId);

      let queueCount = queueItems?.length || 0;

      // Extract suggester info from first queue item BEFORE consuming it
      // This ensures host is blocked on first round for trivias they know the answers to
      let firstRoundSuggesterId: string | null = null;
      let firstRoundSuggesterNickname: string | null = null;
      let firstRoundSuggesterAvatarUrl: string | null = null;

      // If the current round is already the first item in the queue, consume it now.
      // (This keeps queue = "future rounds" after game starts.)
      if (queueItems && queueItems.length > 0) {
        const first = [...queueItems]
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
          .at(0) as any;

        const firstMatchesCurrent = Boolean(
          (categoryId && first?.category_id === categoryId) ||
          (userTriviaId && first?.user_trivia_id === userTriviaId)
        );

        if (firstMatchesCurrent && first?.id) {
          // CRITICAL: Only honor suggester for user trivias, not library categories
          // Library categories are always playable by everyone including host
          const isLibraryCategory = first.category_id && !first.user_trivia_id;
          if (!isLibraryCategory) {
            firstRoundSuggesterId = first.suggester_user_id || null;
            firstRoundSuggesterNickname = first.suggester_nickname || null;
            firstRoundSuggesterAvatarUrl = first.suggester_avatar_url || null;
            tvLog('First round suggester extracted from queue', {
              suggesterId: firstRoundSuggesterId?.slice(0, 8) || 'none',
              nickname: firstRoundSuggesterNickname,
            });
          }

          tvLog('Consuming initial queue item (it matches current round)', {
            queueItemId: String(first.id).slice(0, 8),
            categoryId,
            userTriviaId,
          });

          await supabase
            .from('tv_session_queue')
            .delete()
            .eq('id', first.id);

          // Adjust count locally
          queueCount = Math.max(0, queueCount - 1);

          // Best-effort reorder so next pick is deterministic
          const { data: remaining } = await supabase
            .from('tv_session_queue')
            .select('id')
            .eq('session_id', state.sessionId)
            .order('position', { ascending: true });
          if (remaining?.length) {
            await Promise.all(
              remaining.map((item, index) =>
                supabase.from('tv_session_queue').update({ position: index }).eq('id', item.id)
              )
            );
          }
        }
      }

      // Current round + (remaining) queued rounds
      const totalRoundsCount = 1 + queueCount;

      let formattedQuestions: { id: string; question_text: string; correct_answer: string; options: string[]; icon_slug?: string | null; image_url?: string | null; video_url?: string | null; audio_url?: string | null }[] = [];
      let categoryName: string | null = null;
      let categoryIcon: string | null = null;

      if (userTriviaId) {
        // Fetch questions from user-created trivia (stored as JSONB in user_quiz_posts.questions)
        tvLog('Starting game with user trivia', { userTriviaId });

        const { data: triviaData, error: triviaError } = await supabase
          .from('user_quiz_posts')
          .select('title, questions, icon_slug')
          .eq('id', userTriviaId)
          .maybeSingle();

        if (triviaError || !triviaData?.questions) {
          tvLogError('startGame', 'No questions found for user trivia');
          return;
        }

        const triviaQuestions = triviaData.questions as Array<{
          question_text: string;
          correct_answer: string;
          incorrect_answers: string[];
          icon_slug?: string;
        }>;

        if (triviaQuestions.length === 0) {
          tvLogError('startGame', 'User trivia has no questions');
          return;
        }

        categoryName = triviaData.title || 'User Trivia';
        // No-emoji policy: never fall back to emoji for category icons.
        categoryIcon = triviaData.icon_slug || null;

        // Format user trivia questions
        formattedQuestions = triviaQuestions.map((q, idx) => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers
            : [];
          const allAnswers = shuffleArray([q.correct_answer, ...incorrectAnswers]);
          
          return {
            id: `ut-${userTriviaId}-${idx}`,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            options: allAnswers,
            icon_slug: q.icon_slug || null,
          };
        });

        tvLog('User trivia questions loaded', { count: formattedQuestions.length });

      } else if (categoryId) {
        // Use unified questionService for category questions
        const { getQuestions, resolveCategoryUuid } = await import('@/services/questionService');
        const { markQuestionsAsAsked } = await import('@/services/questionTracker');

        // Handle __mixed__ category - random questions from all categories
        const isMixedCategory = categoryId === "__mixed__";
        
        if (isMixedCategory) {
          tvLog('Using mixed category mode for TV', { categoryId });
          
          // Fetch random questions without category filter
          const result = await getQuestions({
            mode: 'tv',
            count: 10,
            // No categoryUuid = fetch from all categories
          });

          if (result.questions.length === 0) {
            tvLogError('startGame', 'No questions available');
            return;
          }

          // Log exhaustion info
          if (result.exhaustionInfo) {
            tvLog('Mixed category exhaustion info', {
              totalAvailable: result.exhaustionInfo.totalAvailable,
              totalSeen: result.exhaustionInfo.totalSeen,
              wasReset: result.exhaustionInfo.wasReset,
              usedFallback: result.exhaustionInfo.usedFallback,
            });
          }

          formattedQuestions = result.questions.map(q => ({
            id: q.id,
            question_text: q.question,
            correct_answer: q.correctAnswer,
            options: q.allAnswers,
            icon_slug: q.iconSlug,
            image_url: q.imageUrl,
            video_url: q.videoUrl,
            audio_url: q.audioUrl,
          }));

          // Track using standardized key for mixed mode
          const trackerKey = `tv_mixed`;
          markQuestionsAsAsked(trackerKey, formattedQuestions.map(q => q.id));

          categoryName = t('extra.tvMixedCategory');
          categoryIcon = 'mystery-box';
        } else {
          // Standard category - resolve UUID
          const categoryUUID = await resolveCategoryUuid(categoryId);
          if (!categoryUUID) {
            tvLogError('startGame', 'Failed to resolve category UUID');
            return;
          }

          tvLog('Using questionService for TV mode', { categoryId, categoryUUID });

          // Fetch questions using unified service
          const result = await getQuestions({
            mode: 'tv',
            categoryUuid: categoryUUID,
            count: 10,
          });

          if (result.questions.length === 0) {
            tvLogError('startGame', 'No questions available');
            return;
          }

          // Log exhaustion info
          if (result.exhaustionInfo) {
            tvLog('Question exhaustion info', {
              totalAvailable: result.exhaustionInfo.totalAvailable,
              totalSeen: result.exhaustionInfo.totalSeen,
              wasReset: result.exhaustionInfo.wasReset,
              usedFallback: result.exhaustionInfo.usedFallback,
            });
          }

          // Format questions for TV format
          formattedQuestions = result.questions.map(q => ({
            id: q.id,
            question_text: q.question,
            correct_answer: q.correctAnswer,
            options: q.allAnswers, // Already shuffled by questionService
            icon_slug: q.iconSlug,
            image_url: q.imageUrl,
            video_url: q.videoUrl,
            audio_url: q.audioUrl,
          }));

          // Track using standardized key
          const trackerKey = `tv_${categoryUUID}`;
          markQuestionsAsAsked(trackerKey, formattedQuestions.map(q => q.id));

          // Get category info for session
          const { data: category } = await supabase
            .from('categories')
            .select('name, icon')
            .eq('id', categoryUUID)
            .single();

          categoryName = category?.name || null;
          categoryIcon = category?.icon || null;
        }
      }

      if (formattedQuestions.length === 0) {
        tvLogError('startGame', 'No questions available');
        return;
      }

      // Clean up stale answers from previous sessions for this room
      // This prevents duplicate key conflicts and ensures accurate answer counts
      if (state.roomId) {
        const { error: cleanupError } = await supabase
          .from('player_answers')
          .delete()
          .eq('room_id', state.roomId)
          .neq('tv_session_id', state.sessionId);
        
        if (cleanupError) {
          tvLog('Warning: Could not clean stale answers', cleanupError);
        } else {
          tvLog('Cleared stale answers from previous sessions for room', state.roomId);
        }
      }

      // ALSO clear any answers from current session (handles game restart scenario)
      // This ensures a clean slate when restarting a game mid-session
      if (state.sessionId) {
        console.log('[AutoAdvance] 🧹 Cleaning current session answers for fresh start...');
        const { error: currentSessionCleanup } = await supabase
          .from('player_answers')
          .delete()
          .eq('tv_session_id', state.sessionId);

        if (currentSessionCleanup) {
          console.warn('[AutoAdvance] ⚠️ Could not clean current session answers:', currentSessionCleanup);
          tvLog('Warning: Could not clean current session answers', currentSessionCleanup);
        } else {
          console.log('[AutoAdvance] 🧹 Cleared all answers for fresh game start');
          tvLog('Cleared all answers for fresh game start');
        }
        
        // Wait 100ms for DB to process deletions (sufficient for Supabase propagation)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // CRITICAL FIX: Reset timing protection refs for the new game
      // hasAdvancedRef prevents double-advance per question
      // questionStartedAtRef = 0 DISABLES auto-advance during countdown (only timer can advance)
      hasAdvancedRef.current = false;
      questionStartedAtRef.current = 0; // Set to 0 to DISABLE auto-advance during countdown
      console.log('[startGame] ⏱️ Reset timing refs (questionStartedAtRef=0 disables auto-advance during countdown)');

      // CRITICAL: Use centralized confirmActivePlayers utility for robust count locking
      console.log('[startGame] 🔄 Using confirmActivePlayers for robust verification...');
      let playerCount = await confirmActivePlayers(state.sessionId);
      
      // CRITICAL: Adjust for suggester skip rule (they don't answer, so reduce expected count)
      if (firstRoundSuggesterId) {
        playerCount = Math.max(1, playerCount - 1);
        console.log('[startGame] 📉 Adjusted player count for suggester skip:', playerCount, 'suggester:', firstRoundSuggesterId.slice(0, 8));
      }
      
      console.log('[startGame] ✅ Verified and locked player count:', playerCount);
      
      tvLog('Starting game', { 
        questionCount: formattedQuestions.length, 
        categoryName,
        isUserTrivia: !!userTriviaId,
        lockedPlayerCount: playerCount,
      });

      // Start countdown with questions, category info, persist totalRounds, AND lock player count
      // CRITICAL: Clear suggester fields to prevent stale IDs from blocking host on library categories
      await supabase
        .from('tv_sessions')
        .update({
          status: 'countdown',
          questions: formattedQuestions as unknown as Json,
          current_question_index: 0,
          category_name: categoryName,
          category_icon: categoryIcon,
        round_number: 1,
        total_rounds: totalRoundsCount,
        active_player_count: playerCount, // Already locked and adjusted for suggester
        // CRITICAL FIX: Apply extracted suggester info from queue to block host on first round
        current_round_suggester_id: firstRoundSuggesterId,
        current_round_suggester_nickname: firstRoundSuggesterNickname,
        current_round_suggester_avatar_url: firstRoundSuggesterAvatarUrl,
      })
        .eq('id', state.sessionId);

      // Update local state with round tracking
      // CRITICAL: Sync suggester state locally to prevent stale isSuggester checks
      setState(prev => ({
        ...prev,
        roundNumber: 1,
        totalRounds: totalRoundsCount,
        currentRoundSuggesterId: firstRoundSuggesterId,
        currentRoundSuggesterNickname: firstRoundSuggesterNickname,
        currentRoundSuggesterAvatarUrl: firstRoundSuggesterAvatarUrl,
      }));

      tvLogPhase('lobby', 'countdown', 'startGame');
      tvLog('Round tracking initialized', { roundNumber: 1, totalRounds: totalRoundsCount, lockedPlayerCount: playerCount });

    } catch (error) {
      tvLogError('startGame', error);
      console.error('Error starting game:', error);
    }
  }, [state.sessionId, isHost, state.players.length, state.isPaired]);

  // Mutex to prevent multiple concurrent startPlaying calls
  const startPlayingMutexRef = useRef(false);

  // Start playing phase (called after countdown ends)
  // CRITICAL: Reads active_player_count from DB (locked in startGame/markReady)
  const startPlaying = useCallback(async () => {
    if (!state.sessionId) return;
    
    // Prevent concurrent calls
    if (startPlayingMutexRef.current) {
      tvLog('startPlaying blocked: already in progress');
      return;
    }
    startPlayingMutexRef.current = true;

    try {
      // CRITICAL FIX: Fetch ACTUAL current_question_index from DB
      // React state (state.currentQuestionIndex) can be STALE during second round transitions
      // because the state update from startNextRoundFromQueueIfAny hasn't propagated yet.
      // For round 2, state might still show index=9 (last Q of round 1) when DB shows index=0
      const { data: session } = await supabase
        .from('tv_sessions')
        .select('status, current_question_index')
        .eq('id', state.sessionId)
        .single();
      
      if (session?.status === 'playing') {
        tvLog('startPlaying skipped: already playing (another device beat us)');
        // Still ensure timing refs are correct - someone else did the transition
        hasAdvancedRef.current = false;
        questionStartedAtRef.current = Date.now();
        // CRITICAL: Use DB question index, not stale state
        timerInitializedForQuestionRef.current = session.current_question_index ?? 0;
        startPlayingMutexRef.current = false;
        return;
      }
      
      // Use DB question index as source of truth (not stale React state)
      const actualQuestionIndex = session?.current_question_index ?? stateRef.current.currentQuestionIndex;
      console.log('[startPlaying] 📊 Question index: DB=', session?.current_question_index, 'state=', state.currentQuestionIndex, 'using=', actualQuestionIndex);

      // UNIFIED: Use prepareForPlaying for consistent initialization
      console.log('[startPlaying] 🎯 Using UNIFIED prepareForPlaying...');
      const { expectedCount } = await prepareForPlaying(state.sessionId, actualQuestionIndex);

      console.log('[startPlaying] ✅ UNIFIED preparation complete, expectedCount:', expectedCount);
      tvLog('startPlaying: Locked player count', { expectedCount });
      
      // Transition to playing
      await supabase
        .from('tv_sessions')
        .update({
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', state.sessionId);

      tvLogPhase('countdown', 'playing', 'startPlaying');
      
      // CRITICAL: Reset local timeRemaining to ensure host timer starts fresh
      // This must happen BEFORE the phase changes to 'question' which triggers the timer useEffect
      setState(prev => ({
        ...prev,
        timeRemaining: QUESTION_TIME,
      }));
      
      // CRITICAL FIX: Mark timer as initialized for the ACTUAL question index from DB
      // This prevents the realtime subscription from overwriting our fresh timer
      // when it receives the DB update (which may have significant elapsed time due to latency)
      timerInitializedForQuestionRef.current = actualQuestionIndex;
      console.log('[startPlaying] Timer marked as initialized for question', actualQuestionIndex, '(DB source of truth)');
      
      // Brief delay to ensure React state and DB fully propagate
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // CRITICAL: Reset timing refs for the new question AFTER the DB transition
      // questionStartedAtRef = Date.now() ENABLES auto-advance checks (was 0 during countdown)
      hasAdvancedRef.current = false;
      questionStartedAtRef.current = Date.now();
      console.log('[startPlaying] ⏱️ Question timing ENABLED (questionStartedAtRef set), expected players:', expectedCount);
      tvLogTimer('start', QUESTION_TIME);
    } catch (error) {
      tvLogError('startPlaying', error);
    } finally {
      startPlayingMutexRef.current = false;
    }
  }, [state.sessionId, prepareForPlaying]);

  // Submit answer (player)
  const submitAnswer = useCallback(async (answer: string): Promise<{ correct: boolean; points: number }> => {
    // CRITICAL: Block suggester from answering (defense in depth)
    if (state.currentRoundSuggesterId && myPlayerId === state.currentRoundSuggesterId) {
      tvLog('Submit answer blocked: player is suggester for this round', { 
        myPlayerId: myPlayerId?.slice(0, 8), 
        suggesterId: state.currentRoundSuggesterId?.slice(0, 8) 
      });
      return { correct: false, points: 0 };
    }

    // CRITICAL FIX: Only allow answer submission during playing/question phase
    // This prevents "force clicks" during reveal phase or transitions
    if (state.phase !== 'question' && state.phase !== 'playing') {
      console.log('[submitAnswer] ❌ Blocked: not in playing phase, current:', state.phase);
      tvLog('Submit answer blocked - wrong phase', { phase: state.phase });
      return { correct: false, points: 0 };
    }

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
          answeredQuestionIndex: state.currentQuestionIndex, // Track which question this answer is for
          answeredTimeRemaining: state.timeRemaining, // Track time for observer bonus calculation
          isHost,
          isActive: true,
        });
      }

      // Record answer in database - use actual roomId for FK constraint
      // If roomId is not available, fetch it from the session
      let roomIdToUse = state.roomId;
      if (!roomIdToUse && state.sessionId) {
        console.log('[submitAnswer] roomId not in state, fetching from DB...');
        const { data: sessionData } = await supabase
          .from('tv_sessions')
          .select('room_id')
          .eq('id', state.sessionId)
          .maybeSingle();
        roomIdToUse = sessionData?.room_id || null;
        console.log('[submitAnswer] Fetched roomId:', roomIdToUse);
      }

      if (!roomIdToUse) {
        console.error('[submitAnswer] No roomId available - cannot insert answer');
        tvLogError('submitAnswer', 'No roomId available');
        return { correct: isCorrect, points };
      }

      // Upsert on the (tv_session_id, user_id, question_index) unique key:
      // question indices repeat across rounds in the same session, so a plain
      // insert hits 23505 from round 2 onward whenever stale rows survive the
      // between-round cleanup - the lost row then stalled auto-advance until
      // the timer ran out
      const { error } = await supabase.from('player_answers').upsert({
        tv_session_id: state.sessionId,
        room_id: roomIdToUse,
        user_id: myPlayerId,
        question_index: state.currentQuestionIndex,
        answer,
        is_correct: isCorrect,
        points_earned: points,
        time_remaining: state.timeRemaining,
      }, { onConflict: 'tv_session_id,user_id,question_index' });

      if (error) {
        tvLogError('submitAnswer DB insert', error);
        // IMPORTANT: Even on duplicate key error (23505), the answer exists in DB
        // Still trigger the auto-advance check - this prevents stalls in True/False games
        if (error.code === '23505') {
          console.log('[AutoAdvance] ⚠️ Duplicate key error (23505) - answer already exists');
          
          // CRITICAL FIX: Set myAnswer anyway so UI shows "Answer Submitted" state
          // This prevents users from seeing clickable buttons after a duplicate error
          setMyAnswer(answer);
          
          if (isHostRef.current) {
            console.log('[AutoAdvance] 🔄 Triggering check anyway to prevent stall...');
            tvLog('Duplicate answer detected, triggering auto-advance check');
            setTimeout(() => {
              checkAndAdvanceIfAllAnswered();
            }, 150);
          }
        }
      } else {
        console.log('[AutoAdvance] ✅ Answer inserted successfully', {
          questionIndex: state.currentQuestionIndex,
          isCorrect,
          points,
        });
        // Belt-and-suspenders: trigger DB-based check after successful insert
        // The realtime subscription will also trigger this, but this is faster
        if (isHostRef.current) {
          console.log('[AutoAdvance] 🔄 Host triggering immediate check after own answer...');
          setTimeout(() => {
            checkAndAdvanceIfAllAnswered();
          }, 100);
        }
      }

      return { correct: isCorrect, points };
    } catch (error) {
      tvLogError('submitAnswer', error);
      // Still return result even if DB fails - presence update is more important
      return { correct: isCorrect, points };
    }
  }, [state.sessionId, state.roomId, state.questions, state.currentQuestionIndex, state.timeRemaining, state.players, myPlayerId, myAnswer, myScore, isHost]);

  // Mark ready for next round (host-only trigger)
  const markReady = useCallback(async () => {
    if (!presenceChannelRef.current || !myPlayerId) return;

    // Host-only: the host decides when to start the next round.
    // No more waiting for every player to press a ready button.
    if (isHost && state.sessionId && state.phase === 'round-intro') {
      const myPlayer = state.players.find(p => p.id === myPlayerId);
      // Reset my presence flags (defensive) and move session to countdown.
      await presenceChannelRef.current.track({
        nickname: myPlayer?.nickname || 'Host',
        avatar_url: myPlayer?.avatar_url,
        score: myScore,
        hasAnswered: false,
        lastAnswerCorrect: null,
        lastAnswer: null,
        isHost,
        isActive: true,
        isReadyForNextRound: false,
      });

      setMyAnswer(null);
      hasAdvancedRef.current = false;
      
      // CRITICAL: Set questionStartedAtRef = 0 to DISABLE auto-advance during countdown
      // Only startPlaying will set it to Date.now() AFTER transitioning to 'playing'
      questionStartedAtRef.current = 0;

      // Check for suggester to potentially subtract from count
      const { data: sessionData } = await supabase
        .from('tv_sessions')
        .select('current_round_suggester_id')
        .eq('id', state.sessionId)
        .single();

      const suggesterId = (sessionData as any)?.current_round_suggester_id as string | null;

      // CRITICAL: Use centralized confirmActivePlayers for robust player count verification
      console.log('[markReady] 🔒 Using confirmActivePlayers for round 2+...');
      let expectedPlayerCount = await confirmActivePlayers(state.sessionId);
      
      // Adjust for suggester skip rule
      if (suggesterId) {
        expectedPlayerCount = Math.max(1, expectedPlayerCount - 1);
        console.log('[markReady] 👤 Adjusted for suggester:', {
          suggesterId: suggesterId.substring(0, 8) + '...',
          adjustedCount: expectedPlayerCount,
        });
        
        // Update session with adjusted count
        await supabase
          .from('tv_sessions')
          .update({ active_player_count: expectedPlayerCount })
          .eq('id', state.sessionId);
      }
      
      console.log('[markReady] ✅ Verified player count for round 2+:', expectedPlayerCount);

      await supabase
        .from('tv_sessions')
        .update({ 
          status: 'countdown',
          active_player_count: expectedPlayerCount, // Already set by confirmActivePlayers or adjusted above
        })
        .eq('id', state.sessionId);

      tvLogPhase('round-intro', 'countdown', 'host ready');
      return;
    }
    
    const myPlayer = state.players.find(p => p.id === myPlayerId);
    await presenceChannelRef.current.track({
      nickname: myPlayer?.nickname || 'Player',
      avatar_url: myPlayer?.avatar_url,
      score: myScore,
      hasAnswered: false,
      lastAnswerCorrect: null,
      lastAnswer: null,
      isHost,
      isActive: true,
      // Keep this field for backward compatibility, but it's no longer used to gate progression.
      isReadyForNextRound: true,
    });
    tvLog('Player marked ready for next round', { playerId: myPlayerId.slice(0, 8) });
  }, [state.players, state.sessionId, state.phase, myPlayerId, myScore, isHost, state.isPaired, confirmActivePlayers]);

  // NOTE: Previously we auto-advanced from round-intro when ALL players pressed ready.
  // That stalled because regular controllers don't have a ready button.
  // Now only the host triggers countdown via `markReady()`.

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

    // If in results phase (shown as "completed" in UI), start the next round from queue
    if (state.phase === 'results') {
      if (nextRoundInFlightRef.current) {
        tvLog('startNextRound ignored: next round already in flight');
        return;
      }

      nextRoundInFlightRef.current = true;
      tvLog('startNextRound: phase is results, calling startNextRoundFromQueueIfAny');
      try {
        const started = await startNextRoundFromQueueIfAny();
        if (!started) {
          tvLog('startNextRound: no more rounds in queue');
          const { toast } = await import('sonner');
          toast(t('extra.tvRoundsCompleted'));
        }
      } finally {
        nextRoundInFlightRef.current = false;
      }
      return;
    }

    // For other phases, try to force reveal if eligible
    tvLog('startNextRound: attempting to force advance from phase', { phase: state.phase });
    await advanceToReveal('manual next');
  }, [state.sessionId, state.phase, isHost, startNextRoundFromQueueIfAny, advanceToReveal]);

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

      // Reset timer initialization tracker
      timerInitializedForQuestionRef.current = null;
      wasInPreQuestionPhaseRef.current = false;
      
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

  // Start direct category selection phase (no poll, host picks directly)
  const startDirectSelection = useCallback(async () => {
    if (!state.sessionId) return;

    tvLog('Starting direct category selection', { sessionId: state.sessionId });

    try {
      // CRITICAL: Clear ALL stale answers from previous games in this session
      // This prevents auto-advance from matching old answers with question_index 0
      console.log('[startDirectSelection] 🧹 Cleaning stale answers...');
      const { error: answerCleanupError } = await supabase
        .from('player_answers')
        .delete()
        .eq('tv_session_id', state.sessionId);
      
      if (answerCleanupError) {
        console.warn('[startDirectSelection] ⚠️ Could not clean stale answers:', answerCleanupError);
      } else {
        console.log('[startDirectSelection] ✅ Cleared stale answers for fresh game');
      }
      
      // Clear old queue
      await supabase
        .from('tv_session_queue')
        .delete()
        .eq('session_id', state.sessionId);

      // Broadcast reset to all players
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'RESET_SCORES',
          payload: {},
        });
        tvLog('Broadcasted RESET_SCORES for new game');
      }

      // Reset local score
      setMyScore(0);
      setMyAnswer(null);

      // Update session to category-select phase
      await supabase
        .from('tv_sessions')
        .update({
          status: 'category-select',
          current_question_index: 0,
          questions: null,
          question_start_time: null,
          round_number: 1,
          total_rounds: 1,
          // CRITICAL FIX: Clear suggester fields to prevent stale data
          current_round_suggester_id: null,
          current_round_suggester_nickname: null,
          current_round_suggester_avatar_url: null,
        })
        .eq('id', state.sessionId);

      // Reset timer initialization tracker
      timerInitializedForQuestionRef.current = null;
      wasInPreQuestionPhaseRef.current = false;
      
      // CRITICAL FIX: Reset ALL timing refs to prevent stale values from previous game
      // Without this, checkAndAdvanceIfAllAnswered can fire on old answers
      questionStartedAtRef.current = 0;
      hasAdvancedRef.current = false;
      console.log('[startDirectSelection] ⏱️ Reset timing refs (auto-advance disabled until next startPlaying)');
      
      // Update local state
      setState(prev => ({
        ...prev,
        phase: 'idle', // Will map to category-select in controller
        questions: [],
        currentQuestionIndex: 0,
        roundNumber: 1,
        totalRounds: 1,
        timeRemaining: QUESTION_TIME,
      }));

      tvLog('Direct selection phase started');
    } catch (error) {
      tvLogError('startDirectSelection', error);
    }
  }, [state.sessionId]);

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
    if (answersChannelRef.current) {
      supabase.removeChannel(answersChannelRef.current);
      answersChannelRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset timer initialization tracker
    timerInitializedForQuestionRef.current = null;
    wasInPreQuestionPhaseRef.current = false;
    
    setState({
      code: null,
      sessionId: null,
      roomId: null,
      phase: 'pairing',
      players: [],
      questions: [],
      currentQuestionIndex: 0,
      timeRemaining: QUESTION_TIME,
      roundNumber: 1,
      totalRounds: 1,
      categoryName: null,
      categoryIcon: null,
      roomName: null,
      totalRoundsPlayed: 0,
      accumulatedScores: {},
      isPaired: false,
      currentRoundSuggesterId: null,
      currentRoundSuggesterNickname: null,
      currentRoundSuggesterAvatarUrl: null,
    });
    setIsHost(false);
    setMyPlayerId(null);
    setMyScore(0);
    setMyAnswer(null);
  }, []);

  // Wrapper to call refetchSessionData with current sessionId
  const refetchSession = useCallback(async () => {
    if (state.sessionId) {
      await refetchSessionData(state.sessionId);
    }
  }, [state.sessionId, refetchSessionData]);

  return (
    <TVGameContext.Provider
      value={{
        ...state,
        createSession,
        mirrorSession,
        joinSession,
        startGame,
        startPlaying,
        startNextRound,
        startDirectSelection,
        updateRoomName,
        updateCategory,
        saveRoundHistory,
        resetGame,
        submitAnswer,
        markReady,
        leaveSession,
        refetchSessionData: refetchSession,
        isHost,
        isMirror,
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
