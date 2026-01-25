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
            setSuggestions(prev => prev.filter(s => s.id !== payload.old.id));
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
          } else if (payload.eventType === 'DELETE' && payload.old.user_id === userId) {
            setMyVotes(prev => prev.filter(id => id !== payload.old.suggestion_id));
          }
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId]);

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
  const removeSuggestion = useCallback(async (suggestionId: string) => {
    if (!suggestionId || !userId) return false;

    tvLog('[useTVPoll] Removing suggestion', { suggestionId, userId });

    const { error } = await supabase
      .from('tv_poll_suggestions')
      .delete()
      .eq('id', suggestionId)
      .eq('user_id', userId);

    if (error) {
      tvLogError('[useTVPoll] Error removing suggestion', error);
      return false;
    }

    return true;
  }, [userId]);

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
        tvLogError('[useTVPoll] Error adding vote', error);
        return false;
      }
    }

    return true;
  }, [sessionId, userId, suggestions, myVotes]);

  // Start the voting phase (host only)
  const startVoting = useCallback(async () => {
    if (!sessionId) return false;

    const { error } = await supabase
      .from('tv_sessions')
      .update({
        status: 'poll-voting',
        poll_start_time: new Date().toISOString(),
        poll_duration: 30,
      })
      .eq('id', sessionId);

    if (error) {
      tvLogError('[useTVPoll] Error starting voting', error);
      return false;
    }

    return true;
  }, [sessionId]);

  // End voting and transition to results phase (host only)
  const endVoting = useCallback(async () => {
    if (!sessionId) return false;

    tvLog('[useTVPoll] Ending voting, transitioning to poll-results', { sessionId });

    const { error } = await supabase
      .from('tv_sessions')
      .update({
        status: 'poll-results',
      })
      .eq('id', sessionId);

    if (error) {
      tvLogError('[useTVPoll] Error ending voting', error);
      return false;
    }

    return true;
  }, [sessionId]);

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
    const { error } = await supabase
      .from('tv_sessions')
      .update({
        status: 'poll-suggest',
        poll_start_time: null,
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

    // Update session: reset state and set to lobby (game will start from there)
    const { error } = await supabase
      .from('tv_sessions')
      .update({
        status: 'paired',
        current_question_index: 0,
        questions: null,
        round_number: 1,
        total_rounds: topN,
        poll_start_time: null,
      })
      .eq('id', sessionId);

    if (error) {
      tvLogError('[useTVPoll] Error finalizing poll', error);
      return false;
    }

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
