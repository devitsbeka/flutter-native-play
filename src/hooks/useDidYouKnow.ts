import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TriviaPact {
  id: string;
  fact_text: string;
  source: string;
  image_type: string;
  votes_knew: number;
  votes_didnt_know: number;
}

/**
 * Only what the player did. The widget used to show "62% knew · 8,341
 * votes" after a vote — numbers made from the fact's id, not from anyone's
 * vote, the player's own included. Fabricated statistics are the kind of
 * thing App Review calls misleading (2.3.1); real ones would need a
 * server-side aggregate nobody has asked for yet.
 */
interface VoteResult {
  userVote: "knew" | "didnt_know";
}

// Shuffle array using Fisher-Yates
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export function useDidYouKnow() {
  const { user } = useAuth();
  const [allFacts, setAllFacts] = useState<TriviaPact[]>([]);
  const [votedFactIds, setVotedFactIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);

  // Get current fact
  const fact = allFacts.length > 0 ? allFacts[currentIndex] : null;

  // Load all facts once on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadAllFacts = async () => {
      try {
        const { data: facts, error } = await supabase
          .from("trivia_facts")
          .select("*")
          .eq("is_active", true)
          .limit(50);

        if (error) throw error;

        if (facts && facts.length > 0) {
          // Shuffle facts for variety
          setAllFacts(shuffleArray(facts));
        }

        // Load user votes if logged in
        if (user) {
          const { data: votes } = await supabase
            .from("user_fact_votes")
            .select("fact_id, vote_type")
            .eq("user_id", user.id);

          if (votes) {
            setVotedFactIds(new Set(votes.map(v => v.fact_id)));
          }
        }
      } catch (error) {
        console.error("Error loading facts:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadAllFacts();
  }, [user]);

  // Check if current fact was already voted on
  useEffect(() => {
    if (!fact) return;
    
    if (votedFactIds.has(fact.id)) {
      // Already voted: acknowledged, and on to the next one. Which way they
      // voted is not kept, so the neutral line is shown.
      setVoteResult({ userVote: "knew" });
      setHasVoted(true);
      startAutoAdvance();
    } else {
      setHasVoted(false);
      setVoteResult(null);
    }
  }, [currentIndex, fact?.id, votedFactIds]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const goToNextFact = useCallback(() => {
    clearTimers();
    setCountdown(0);
    setHasVoted(false);
    setVoteResult(null);
    setCurrentIndex(prev => (prev + 1) % allFacts.length);
  }, [allFacts.length, clearTimers]);

  const startAutoAdvance = useCallback(() => {
    clearTimers();
    setCountdown(5);
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      goToNextFact();
    }, 5000);
  }, [clearTimers, goToNextFact]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const vote = async (voteType: "knew" | "didnt_know") => {
    if (!fact || !user || voting || hasVoted) return;

    setVoting(true);
    try {
      // Record the vote (fire and forget for snappy UX)
      supabase
        .from("user_fact_votes")
        .insert({
          user_id: user.id,
          fact_id: fact.id,
          vote_type: voteType,
        })
        .then(({ error }) => {
          if (error && error.code !== '23505') {
            console.error("Error recording vote:", error);
          }
        });

      // Update local voted set
      setVotedFactIds(prev => new Set([...prev, fact.id]));

      setVoteResult({ userVote: voteType });
      setHasVoted(true);
      
      startAutoAdvance();
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVoting(false);
    }
  };

  return {
    fact,
    loading: initialLoading,
    voting,
    voteResult,
    hasVoted,
    countdown,
    vote,
    refresh: goToNextFact,
  };
}
