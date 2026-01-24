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
}

export function useTVPoll({ sessionId, userId, nickname, avatarUrl }: UseTVPollOptions) {
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

  // My suggestion (if any)
  const mySuggestion = useMemo(() => {
    if (!userId) return null;
    return suggestions.find(s => s.user_id === userId) || null;
  }, [suggestions, userId]);

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

  // Remove my suggestion
  const removeMySuggestion = useCallback(async () => {
    if (!mySuggestion) return false;

    const { error } = await supabase
      .from('tv_poll_suggestions')
      .delete()
      .eq('id', mySuggestion.id);

    if (error) {
      tvLogError('[useTVPoll] Error removing suggestion', error);
      return false;
    }

    return true;
  }, [mySuggestion]);

  // Vote for a suggestion (toggle)
  const toggleVote = useCallback(async (suggestionId: string) => {
    if (!sessionId || !userId) return false;

    // Can't vote for own suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion?.user_id === userId) {
      tvLog('[useTVPoll] Cannot vote for own suggestion');
      return false;
    }

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

    // Insert winning categories as queue items
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
    myVotes,
    loading,
    pollPhase,
    pollStartTime,
    pollDuration,
    submitSuggestion,
    removeMySuggestion,
    toggleVote,
    startVoting,
    initiatePoll,
    finalizePollAndStartGame,
    refetch: fetchPollData,
  };
}
