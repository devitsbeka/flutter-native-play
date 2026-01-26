import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tvLog, tvLogError } from "@/utils/tvDebug";

export interface PollSuggestion {
  id: string;
  session_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  source_type: 'category' | 'trivia' | 'collection';
  category_id: string | null;
  user_trivia_id: string | null;
  category_name: string;
  icon_slug: string | null;
  cover_image: string | null;
  vote_count: number;
  created_at: string;
}

export interface PollVote {
  id: string;
  session_id: string;
  suggestion_id: string;
  user_id: string;
  created_at: string;
}

interface UseTVPollOptions {
  sessionId: string | null;
  userId: string | null;
  nickname: string;
  avatarUrl?: string | null;
  isHost?: boolean;
}

export function useTVPoll({ sessionId, userId, nickname, avatarUrl, isHost = false }: UseTVPollOptions) {
  const [suggestions, setSuggestions] = useState<PollSuggestion[]>([]);
  const [myVotes, setMyVotes] = useState<string[]>([]); // suggestion IDs I voted for
  const [loading, setLoading] = useState(true);
  const [pollPhase, setPollPhase] = useState<'suggest' | 'voting' | 'results' | null>(null);
  const [pollStartTime, setPollStartTime] = useState<Date | null>(null);
  const [pollDuration, setPollDuration] = useState(30);

  // Fetch initial data
  const fetchPollData = useCallback(async () => {
    if (!sessionId) {
      setSuggestions([]);
      setMyVotes([]);
      setLoading(false);
      return;
    }

    tvLog('[useTVPoll] Fetching poll data', { sessionId });

    // Fetch suggestions
    const { data: suggestionsData, error: suggestionsError } = await supabase
      .from('tv_poll_suggestions')
      .select('*')
      .eq('session_id', sessionId)
      .order('vote_count', { ascending: false });

    if (suggestionsError) {
      tvLogError('[useTVPoll] Error fetching suggestions', suggestionsError);
    } else {
      setSuggestions((suggestionsData || []) as PollSuggestion[]);
    }

    // Fetch my votes if I have a user ID
    if (userId) {
      const { data: votesData, error: votesError } = await supabase
        .from('tv_poll_votes')
        .select('suggestion_id')
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (votesError) {
        tvLogError('[useTVPoll] Error fetching votes', votesError);
      } else {
        setMyVotes((votesData || []).map(v => v.suggestion_id));
      }
    }

    // Fetch session poll state
    const { data: session } = await supabase
      .from('tv_sessions')
      .select('status, poll_start_time, poll_duration')
      .eq('id', sessionId)
      .single();

    if (session) {
      if (session.status === 'poll-suggest') {
        setPollPhase('suggest');
      } else if (session.status === 'poll-voting') {
        setPollPhase('voting');
        if (session.poll_start_time) {
          setPollStartTime(new Date(session.poll_start_time));
        }
        if (session.poll_duration) {
          setPollDuration(session.poll_duration);
        }
      } else if (session.status === 'poll-results') {
        setPollPhase('results');
      } else {
        setPollPhase(null);
      }
    }

    setLoading(false);
  }, [sessionId, userId]);

  useEffect(() => {
    fetchPollData();
  }, [fetchPollData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;

    tvLog('[useTVPoll] Setting up realtime subscriptions', { sessionId });

    const channel = supabase
      .channel(`tv-poll-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_poll_suggestions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          tvLog('[useTVPoll] Suggestion change', payload);
          
          if (payload.eventType === 'INSERT') {
            setSuggestions(prev => {
              const newSuggestion = payload.new as PollSuggestion;
              // Avoid duplicates
              if (prev.some(s => s.id === newSuggestion.id)) return prev;
              return [...prev, newSuggestion].sort((a, b) => b.vote_count - a.vote_count);
            });
          } else if (payload.eventType === 'UPDATE') {
            setSuggestions(prev =>
              prev.map(s => s.id === payload.new.id ? payload.new as PollSuggestion : s)
                .sort((a, b) => b.vote_count - a.vote_count)
            );
          } else if (payload.eventType === 'DELETE') {
            // Use payload.old.id - with REPLICA IDENTITY FULL this should work
            const deletedId = payload.old?.id;
            tvLog('[useTVPoll] DELETE event received', { deletedId, payload_old: payload.old });
            if (deletedId) {
              setSuggestions(prev => prev.filter(s => s.id !== deletedId));
            } else {
              // Fallback: refetch all data if we can't get the deleted ID
              tvLog('[useTVPoll] DELETE without old.id, refetching all');
              fetchPollData();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_poll_votes',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          tvLog('[useTVPoll] Vote change', payload);
          // Vote count is updated via trigger, so we just need to track our own votes
          if (payload.eventType === 'INSERT' && payload.new.user_id === userId) {
            setMyVotes(prev => {
              if (prev.includes(payload.new.suggestion_id)) return prev;
              return [...prev, payload.new.suggestion_id];
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.user_id === userId) {
            setMyVotes(prev => prev.filter(id => id !== payload.old.suggestion_id));
          }
          
          // Also refetch suggestions to get updated vote counts
          fetchPollData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tv_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const session = payload.new as { status: string; poll_start_time: string | null; poll_duration: number };
          
          console.log('[useTVPoll] Realtime session update received:', { 
            status: session.status, 
            poll_start_time: session.poll_start_time,
            isHost 
          });
          
          if (session.status === 'poll-suggest') {
            setPollPhase('suggest');
          } else if (session.status === 'poll-voting') {
            console.log('[useTVPoll] Setting pollPhase to voting');
            setPollPhase('voting');
            if (session.poll_start_time) {
              setPollStartTime(new Date(session.poll_start_time));
            }
            if (session.poll_duration) {
              setPollDuration(session.poll_duration);
            }
          } else if (session.status === 'poll-results') {
            console.log('[useTVPoll] Setting pollPhase to results');
            setPollPhase('results');
          } else {
            setPollPhase(null);
          }
        }
      )
      .subscribe((status) => {
        tvLog('[useTVPoll] Realtime subscription status', { status, sessionId });
        // Refetch data when subscription is established to ensure we have latest state
        if (status === 'SUBSCRIBED') {
          fetchPollData();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId, fetchPollData]);

  // My suggestions (hosts can have up to 2, others only 1)
  const mySuggestions = useMemo(() => {
    if (!userId) return [];
    return suggestions.filter(s => s.user_id === userId);
  }, [suggestions, userId]);

  // For backwards compatibility - get first suggestion
  const mySuggestion = useMemo(() => {
    return mySuggestions.length > 0 ? mySuggestions[0] : null;
  }, [mySuggestions]);

  // Max suggestions allowed (hosts get 8, guests get 0 - only host can suggest)
  const maxSuggestions = isHost ? 8 : 0;
  const canAddMoreSuggestions = isHost && mySuggestions.length < maxSuggestions;

  // Submit a suggestion
  const submitSuggestion = useCallback(async (params: {
    sourceType: 'category' | 'trivia' | 'collection';
    categoryId?: string;
    userTriviaId?: string;
    categoryName: string;
    iconSlug?: string | null;
    coverImage?: string | null;
  }) => {
    if (!sessionId || !userId) {
      tvLogError('[useTVPoll] Cannot submit', 'no session or user');
      return false;
    }

    tvLog('[useTVPoll] Submitting suggestion', params);

    const insertData = {
      session_id: sessionId,
      user_id: userId,
      nickname,
      avatar_url: avatarUrl || null,
      source_type: params.sourceType,
      category_id: params.categoryId || null,
      user_trivia_id: params.userTriviaId || null,
      category_name: params.categoryName,
      icon_slug: params.iconSlug || null,
      cover_image: params.coverImage || null,
    };

    const { error } = await supabase
      .from('tv_poll_suggestions')
      .insert(insertData as any);

    if (error) {
      tvLogError('[useTVPoll] Error submitting suggestion', error);
      return false;
    }

    return true;
  }, [sessionId, userId, nickname, avatarUrl]);

  // Remove a specific suggestion by ID
  // For hosts (isHost=true), we allow removing any suggestion
  // For non-hosts, we only allow removing your own suggestions
  const removeSuggestion = useCallback(async (suggestionId: string) => {
    if (!suggestionId) return false;

    tvLog('[useTVPoll] Removing suggestion', { suggestionId, userId, isHost });

    // Optimistically remove from local state IMMEDIATELY for instant UI feedback
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

    let query = supabase
      .from('tv_poll_suggestions')
      .delete()
      .eq('id', suggestionId);

    // Only filter by user_id for non-hosts
    // Hosts can remove any suggestion they see in their list
    if (!isHost && userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      tvLogError('[useTVPoll] Error removing suggestion', error);
      // Restore on error - refetch data
      fetchPollData();
      return false;
    }

    return true;
  }, [userId, isHost, fetchPollData]);

  // Remove my suggestion (backwards compatible - removes first)
  const removeMySuggestion = useCallback(async () => {
    if (!mySuggestion) return false;
    return removeSuggestion(mySuggestion.id);
  }, [mySuggestion, removeSuggestion]);

  // Vote for a suggestion (toggle)
  const toggleVote = useCallback(async (suggestionId: string) => {
    if (!sessionId || !userId) return false;

    const hasVoted = myVotes.includes(suggestionId);

    if (hasVoted) {
      // Remove vote
      const { error } = await supabase
        .from('tv_poll_votes')
        .delete()
        .eq('suggestion_id', suggestionId)
        .eq('user_id', userId);

      if (error) {
        tvLogError('[useTVPoll] Error removing vote', error);
        return false;
      }
      // Optimistically update local state
      setMyVotes(prev => prev.filter(id => id !== suggestionId));
    } else {
      // Add vote
      const { error } = await supabase
        .from('tv_poll_votes')
        .insert({
          session_id: sessionId,
          suggestion_id: suggestionId,
          user_id: userId,
        });

      if (error) {
        // Handle 409 conflict (duplicate) - vote already exists, try to remove instead
        if (error.code === '23505') {
          tvLog('[useTVPoll] Vote exists, attempting to remove instead');
          const { error: deleteError } = await supabase
            .from('tv_poll_votes')
            .delete()
            .eq('suggestion_id', suggestionId)
            .eq('user_id', userId);
          
          if (!deleteError) {
            setMyVotes(prev => prev.filter(id => id !== suggestionId));
            return true;
          }
        }
        tvLogError('[useTVPoll] Error adding vote', error);
        return false;
      }
      // Optimistically update local state
      setMyVotes(prev => [...prev, suggestionId]);
    }

    return true;
  }, [sessionId, userId, myVotes]);

  // Start the voting phase (host only)
  const startVoting = useCallback(async () => {
    if (!sessionId) {
      console.error('[useTVPoll] startVoting: No sessionId');
      return false;
    }

    console.log('[useTVPoll] startVoting called for session:', sessionId);
    
    const startTime = new Date().toISOString();

    const { data, error } = await supabase
      .from('tv_sessions')
      .update({
        status: 'poll-voting',
        poll_start_time: startTime,
        poll_duration: 30,
      })
      .eq('id', sessionId)
      .select();

    console.log('[useTVPoll] startVoting result:', { data, error, rowsAffected: data?.length });

    if (error) {
      console.error('[useTVPoll] Error starting voting:', error);
      tvLogError('[useTVPoll] Error starting voting', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('[useTVPoll] startVoting: No rows updated - check RLS');
      return false;
    }

    // Immediately update local state for instant UI response
    console.log('[useTVPoll] Successfully started voting, updating local state');
    setPollPhase('voting');
    setPollStartTime(new Date(startTime));
    setPollDuration(30);

    return true;
  }, [sessionId]);

  // End voting and transition to results phase (host only)
  const endVoting = useCallback(async (): Promise<boolean> => {
    if (!sessionId) {
      console.error('[useTVPoll] endVoting: No sessionId');
      return false;
    }

    // Check auth state
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[useTVPoll] endVoting starting:', { 
      sessionId, 
      authUserId: user?.id || 'NOT_AUTHENTICATED',
      hookUserId: userId 
    });

    if (!user?.id) {
      console.error('[useTVPoll] endVoting: User not authenticated');
      return false;
    }

    // First verify we're the host
    const { data: sessionCheck } = await supabase
      .from('tv_sessions')
      .select('host_user_id, status')
      .eq('id', sessionId)
      .single();

    console.log('[useTVPoll] Session check:', {
      hostUserId: sessionCheck?.host_user_id,
      currentStatus: sessionCheck?.status,
      isHostMatch: sessionCheck?.host_user_id === user.id
    });

    if (sessionCheck?.host_user_id !== user.id) {
      console.error('[useTVPoll] endVoting: Not the host');
      return false;
    }

    // Perform the update with explicit host check
    const { data, error, count } = await supabase
      .from('tv_sessions')
      .update({ status: 'poll-results' })
      .eq('id', sessionId)
      .eq('host_user_id', user.id) // Explicit RLS-friendly filter
      .select();

    console.log('[useTVPoll] endVoting result:', { 
      data, 
      error, 
      count,
      rowsAffected: data?.length || 0,
      newStatus: data?.[0]?.status
    });

    if (error) {
      console.error('[useTVPoll] Error ending voting:', error);
      tvLogError('[useTVPoll] Error ending voting', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.error('[useTVPoll] endVoting: No rows updated - check RLS or session state');
      return false;
    }

    // Force immediate local state update
    console.log('[useTVPoll] Successfully updated to poll-results, updating local state');
    setPollPhase('results');
    return true;
  }, [sessionId, userId]);

  // Initiate poll phase (host only) - called when "New Game" is clicked
  const initiatePoll = useCallback(async () => {
    if (!sessionId) return false;

    tvLog('[useTVPoll] Initiating poll phase', { sessionId });

    // Clear old suggestions and votes
    await supabase
      .from('tv_poll_votes')
      .delete()
      .eq('session_id', sessionId);

    await supabase
      .from('tv_poll_suggestions')
      .delete()
      .eq('session_id', sessionId);

    // Update session to poll-suggest phase
    // CRITICAL: Clear stale suggester from previous round to prevent blocking issues
    const { error } = await supabase
      .from('tv_sessions')
      .update({
        status: 'poll-suggest',
        poll_start_time: null,
        current_round_suggester_id: null,
        current_round_suggester_nickname: null,
        current_round_suggester_avatar_url: null,
      })
      .eq('id', sessionId);

    if (error) {
      tvLogError('[useTVPoll] Error initiating poll', error);
      return false;
    }

    return true;
  }, [sessionId]);

  // Finalize poll and start game with top N categories (host only)
  const finalizePollAndStartGame = useCallback(async (topN: number) => {
    if (!sessionId) return false;

    tvLog('[useTVPoll] Finalizing poll with top', topN);

    // Get top N suggestions
    const topSuggestions = suggestions.slice(0, topN);

    if (topSuggestions.length === 0) {
      tvLogError('[useTVPoll] Finalize poll failed', 'No suggestions to start game with');
      return false;
    }

    // CRITICAL FIX: Reset ALL players to is_active = true BEFORE starting new game
    // This ensures everyone is counted after poll phase where presence may have flickered
    console.log('[finalizePollAndStartGame] 🔄 Resetting ALL players to is_active=true...');
    const { error: resetError } = await supabase
      .from('tv_players')
      .update({ is_active: true })
      .eq('tv_session_id', sessionId);

    if (resetError) {
      console.warn('[finalizePollAndStartGame] ⚠️ Failed to reset player activity:', resetError);
    }

    // CRITICAL FIX: MORE AGGRESSIVE SYNC - Update ALL players to ensure user_id matches player_id
    // This handles edge cases where player_id is an auth UUID but user_id wasn't set during registration
    const { data: allPlayers } = await supabase
      .from('tv_players')
      .select('id, player_id, user_id')
      .eq('tv_session_id', sessionId);

    if (allPlayers && allPlayers.length > 0) {
      console.log('[finalizePollAndStartGame] 🔄 Checking user_id sync for', allPlayers.length, 'players...');
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      for (const player of allPlayers) {
        // If player_id looks like a UUID (auth user) and user_id doesn't match, sync them
        const isValidUUID = UUID_REGEX.test(player.player_id);
        if (isValidUUID && player.user_id !== player.player_id) {
          console.log('[finalizePollAndStartGame] 🔄 Syncing user_id for player:', player.id, {
            player_id: player.player_id,
            old_user_id: player.user_id
          });
          
          const { error: userIdError } = await supabase
            .from('tv_players')
            .update({ user_id: player.player_id, is_active: true })
            .eq('id', player.id);
          
          if (userIdError) {
            console.warn('[finalizePollAndStartGame] ⚠️ Failed to sync user_id for player:', player.id, userIdError);
          }
        }
      }
      console.log('[finalizePollAndStartGame] ✅ Completed user_id sync check for all players');
    }

    // CRITICAL: Extended delay for DB consistency (300ms, critical after poll/transitions)
    await new Promise(resolve => setTimeout(resolve, 300));

    // ROBUST VERIFICATION LOOP: 7 attempts, 200ms apart (same as confirmActivePlayers utility)
    // This ensures we get a stable, accurate player count before locking
    let livePlayerCount = 0;
    for (let attempt = 0; attempt < 7; attempt++) {
      const { count } = await supabase
        .from('tv_players')
        .select('*', { count: 'exact', head: true })
        .eq('tv_session_id', sessionId)
        .eq('is_active', true);
      
      livePlayerCount = count ?? 0;
      console.log(`[finalizePollAndStartGame] 📊 Player count check ${attempt + 1}/7:`, livePlayerCount);
      
      // If we have at least 2 players, we're good
      if (livePlayerCount >= 2) break;
      
      // Wait a bit and try again (except on last attempt)
      if (attempt < 6) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Calculate initial expected count - minimum 2 for paired mode
    let expectedCount = Math.max(livePlayerCount, 2);
    console.log('[finalizePollAndStartGame] ✅ Final VERIFIED player count:', expectedCount);
    
    // CRITICAL: Get first suggestion's suggester - they will skip answering
    const firstSuggestionForAdjust = topSuggestions[0];
    
    // CRITICAL FIX: Adjust expected count for suggester skip rule
    // The suggester won't answer, so reduce expected count by 1
    if (firstSuggestionForAdjust?.user_id) {
      expectedCount = Math.max(1, expectedCount - 1);
      console.log('[finalizePollAndStartGame] 👤 Adjusted for suggester:', { 
        original: livePlayerCount, 
        adjusted: expectedCount,
        suggesterId: firstSuggestionForAdjust.user_id 
      });
    }

    tvLog('[useTVPoll] Resetting players and locking count for new game', { 
      livePlayerCount, 
      expectedCount 
    });

    // Clear existing queue
    await supabase
      .from('tv_session_queue')
      .delete()
      .eq('session_id', sessionId);

    // Insert winning categories as queue items with suggester info
    for (let i = 0; i < topSuggestions.length; i++) {
      const suggestion = topSuggestions[i];
      const queueItem = {
        session_id: sessionId,
        position: i,
        source_type: suggestion.source_type,
        category_id: suggestion.category_id,
        category_name: suggestion.category_name,
        icon_slug: suggestion.icon_slug,
        user_trivia_id: suggestion.user_trivia_id,
        // Store suggester info - they will skip this round
        suggester_user_id: suggestion.user_id,
        suggester_nickname: suggestion.nickname,
        suggester_avatar_url: suggestion.avatar_url,
      };
      await supabase.from('tv_session_queue').insert(queueItem as any);
    }

    // CRITICAL FIX: Fetch questions for first category and start countdown directly
    // This bypasses the lobby phase so game starts with a single click
    const firstSuggestion = topSuggestions[0];
    let questions: Array<{
      id: string;
      question_text: string;
      correct_answer: string;
      incorrect_answers: any;
      difficulty: string;
      icon_slug: string | null;
    }> | null = null;

    // Fetch questions based on source type
    if (firstSuggestion.source_type === 'category' && firstSuggestion.category_id) {
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug')
        .eq('category_id', firstSuggestion.category_id)
        .eq('is_active', true)
        .limit(10);

      if (questionsData && questionsData.length > 0) {
        questions = questionsData.sort(() => Math.random() - 0.5).slice(0, 10);
      }
    } else if (firstSuggestion.source_type === 'trivia' && firstSuggestion.user_trivia_id) {
      // Fetch from user_quiz_posts table (questions stored as JSON)
      const { data: postData } = await supabase
        .from('user_quiz_posts')
        .select('questions')
        .eq('id', firstSuggestion.user_trivia_id)
        .single();

      if (postData?.questions && Array.isArray(postData.questions)) {
        questions = (postData.questions as any[]).map((q: any, idx: number) => ({
          id: `user-q-${idx}`,
          question_text: q.question_text || q.question || '',
          correct_answer: q.correct_answer || '',
          incorrect_answers: q.incorrect_answers || [],
          difficulty: 'medium',
          icon_slug: q.icon_slug || null,
        }));
      }
    }

    // If no questions found, fall back to lobby mode
    if (!questions || questions.length === 0) {
      tvLog('[useTVPoll] No questions found for first category, falling back to lobby');
      const { error } = await supabase
        .from('tv_sessions')
        .update({
          status: 'paired',
          current_question_index: 0,
          questions: null,
          round_number: 1,
          total_rounds: topN,
          poll_start_time: null,
          active_player_count: expectedCount,
        })
        .eq('id', sessionId);

      if (error) {
        tvLogError('[useTVPoll] Error finalizing poll (fallback)', error);
        return false;
      }
      return true;
    }

    // Clear any old player answers for this session
    console.log('[finalizePollAndStartGame] 🗑️ Deleting old player answers...');
    const { error: deleteAnswersError, count: deletedCount } = await supabase
      .from('player_answers')
      .delete()
      .eq('tv_session_id', sessionId);

    if (deleteAnswersError) {
      console.warn('[finalizePollAndStartGame] ⚠️ Failed to delete old answers:', deleteAnswersError);
    } else {
      console.log('[finalizePollAndStartGame] ✅ Deleted old answers, count:', deletedCount);
    }

    // CRITICAL: Wait for delete to propagate before continuing
    // This prevents race conditions where old answers cause incorrect counts
    await new Promise(resolve => setTimeout(resolve, 300));

    // Update session: set to countdown with questions loaded
    // CRITICAL: This bypasses lobby and starts game directly
    // CRITICAL FIX: Include suggester fields to prevent stale data blocking players
    const { error } = await supabase
      .from('tv_sessions')
      .update({
        status: 'countdown', // Go directly to countdown!
        current_question_index: 0,
        questions: questions,
        round_number: 1,
        total_rounds: topN,
        poll_start_time: null,
        active_player_count: expectedCount,
        category_id: firstSuggestion.category_id,
        category_name: firstSuggestion.category_name,
        user_trivia_id: firstSuggestion.user_trivia_id,
        // CRITICAL FIX: Set suggester fields so only they see Observer UI
        current_round_suggester_id: firstSuggestion.user_id || null,
        current_round_suggester_nickname: firstSuggestion.nickname || null,
        current_round_suggester_avatar_url: firstSuggestion.avatar_url || null,
      })
      .eq('id', sessionId);

    if (error) {
      tvLogError('[useTVPoll] Error finalizing poll', error);
      console.error('[finalizePollAndStartGame] ❌ DB update failed:', error);
      return false;
    }

    console.log('[finalizePollAndStartGame] ✅ Successfully set status to countdown with', {
      categoryName: firstSuggestion.category_name,
      questionCount: questions.length,
      totalRounds: topN,
      activePlayerCount: expectedCount,
    });
    tvLog('[useTVPoll] ✅ Poll finalized and game started directly in countdown');
    return true;
  }, [sessionId, suggestions]);

  // Sorted suggestions by vote count
  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => b.vote_count - a.vote_count);
  }, [suggestions]);

  return {
    suggestions: sortedSuggestions,
    mySuggestion,
    mySuggestions,
    canAddMoreSuggestions,
    maxSuggestions,
    myVotes,
    loading,
    pollPhase,
    pollStartTime,
    pollDuration,
    submitSuggestion,
    removeMySuggestion,
    removeSuggestion,
    toggleVote,
    startVoting,
    endVoting,
    initiatePoll,
    finalizePollAndStartGame,
    refetch: fetchPollData,
  };
}
