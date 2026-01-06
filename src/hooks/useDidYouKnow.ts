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

interface VoteResult {
  totalVotes: number;
  knewPercentage: number;
  didntKnowPercentage: number;
  userVote: "knew" | "didnt_know";
}

// Generate fake vote counts (4,000 - 15,000 range) with consistent results per fact
const generateFakeVotes = (factId: string) => {
  const seed = factId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const total = 4000 + (seed * 137) % 11000;
  const knewPercentage = 35 + (seed * 17) % 30; // 35% - 65% range
  return {
    total: Math.floor(total),
    knewPercentage,
    didntKnowPercentage: 100 - knewPercentage,
  };
};

export function useDidYouKnow() {
  const { user } = useAuth();
  const [fact, setFact] = useState<TriviaPact | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRandomFact = useCallback(async () => {
    setLoading(true);
    // Clear any existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
    
    try {
      // First get all active facts
      const { data: facts, error: factsError } = await supabase
        .from("trivia_facts")
        .select("*")
        .eq("is_active", true);

      if (factsError) throw factsError;

      if (!facts || facts.length === 0) {
        setFact(null);
        setLoading(false);
        return;
      }

      // If user is logged in, check which facts they've already voted on
      let availableFacts = facts;
      if (user) {
        const { data: votes } = await supabase
          .from("user_fact_votes")
          .select("fact_id, vote_type")
          .eq("user_id", user.id);

        const votedFactIds = new Set(votes?.map((v) => v.fact_id) || []);
        
        // Filter to unvoted facts
        availableFacts = facts.filter((f) => !votedFactIds.has(f.id));
        
        // If all facts have been voted on, pick a random one and show results
        if (availableFacts.length === 0) {
          const randomFact = facts[Math.floor(Math.random() * facts.length)];
          const userVote = votes?.find((v) => v.fact_id === randomFact.id);
          setFact(randomFact);
          
          const fakeVotes = generateFakeVotes(randomFact.id);
          setVoteResult({
            totalVotes: fakeVotes.total,
            knewPercentage: fakeVotes.knewPercentage,
            didntKnowPercentage: fakeVotes.didntKnowPercentage,
            userVote: (userVote?.vote_type as "knew" | "didnt_know") || "knew",
          });
          setHasVoted(true);
          setLoading(false);
          
          // Start auto-advance countdown
          startAutoAdvance();
          return;
        }
      }

      // Pick a random fact from available ones
      const randomFact = availableFacts[Math.floor(Math.random() * availableFacts.length)];
      setFact(randomFact);
      setHasVoted(false);
      setVoteResult(null);
    } catch (error) {
      console.error("Error fetching fact:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const startAutoAdvance = useCallback(() => {
    // Start countdown from 5
    setCountdown(5);
    
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-advance after 5 seconds
    timerRef.current = setTimeout(() => {
      setHasVoted(false);
      setVoteResult(null);
      fetchRandomFact();
    }, 5000);
  }, []);

  useEffect(() => {
    fetchRandomFact();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchRandomFact]);

  const vote = async (voteType: "knew" | "didnt_know") => {
    if (!fact || !user || voting || hasVoted) return;

    setVoting(true);
    try {
      // Record the vote
      const { error: voteError } = await supabase
        .from("user_fact_votes")
        .insert({
          user_id: user.id,
          fact_id: fact.id,
          vote_type: voteType,
        });

      // Handle duplicate vote error gracefully
      if (voteError) {
        if (voteError.code === '23505') {
          // Already voted - refresh to show results
          await fetchRandomFact();
          return;
        }
        throw voteError;
      }

      // Update the vote count
      const updateField = voteType === "knew" ? "votes_knew" : "votes_didnt_know";
      const { error: updateError } = await supabase
        .from("trivia_facts")
        .update({ [updateField]: fact[updateField] + 1 })
        .eq("id", fact.id);

      if (updateError) {
        console.error("Error updating vote count:", updateError);
      }

      // Generate fake vote results
      const fakeVotes = generateFakeVotes(fact.id);

      setVoteResult({
        totalVotes: fakeVotes.total,
        knewPercentage: fakeVotes.knewPercentage,
        didntKnowPercentage: fakeVotes.didntKnowPercentage,
        userVote: voteType,
      });
      setHasVoted(true);
      
      // Start auto-advance countdown
      startAutoAdvance();
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVoting(false);
    }
  };

  return {
    fact,
    loading,
    voting,
    voteResult,
    hasVoted,
    countdown,
    vote,
    refresh: fetchRandomFact,
  };
}
