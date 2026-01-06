import { useState, useEffect, useCallback } from "react";
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

export function useDidYouKnow() {
  const { user } = useAuth();
  const [fact, setFact] = useState<TriviaPact | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const fetchRandomFact = useCallback(async () => {
    setLoading(true);
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
        
        // Check if user already voted on a fact - show that one with results
        const votedFact = facts.find((f) => votedFactIds.has(f.id));
        if (votedFact && votes) {
          const userVote = votes.find((v) => v.fact_id === votedFact.id);
          if (userVote) {
            setFact(votedFact);
            const total = votedFact.votes_knew + votedFact.votes_didnt_know;
            setVoteResult({
              totalVotes: total,
              knewPercentage: total > 0 ? Math.round((votedFact.votes_knew / total) * 100) : 50,
              didntKnowPercentage: total > 0 ? Math.round((votedFact.votes_didnt_know / total) * 100) : 50,
              userVote: userVote.vote_type as "knew" | "didnt_know",
            });
            setHasVoted(true);
            setLoading(false);
            return;
          }
        }

        // Filter to unvoted facts
        availableFacts = facts.filter((f) => !votedFactIds.has(f.id));
        
        // If all facts have been voted on, pick a random one and show results
        if (availableFacts.length === 0) {
          const randomFact = facts[Math.floor(Math.random() * facts.length)];
          const userVote = votes?.find((v) => v.fact_id === randomFact.id);
          setFact(randomFact);
          const total = randomFact.votes_knew + randomFact.votes_didnt_know;
          setVoteResult({
            totalVotes: total,
            knewPercentage: total > 0 ? Math.round((randomFact.votes_knew / total) * 100) : 50,
            didntKnowPercentage: total > 0 ? Math.round((randomFact.votes_didnt_know / total) * 100) : 50,
            userVote: (userVote?.vote_type as "knew" | "didnt_know") || "knew",
          });
          setHasVoted(true);
          setLoading(false);
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

  useEffect(() => {
    fetchRandomFact();
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

      if (voteError) throw voteError;

      // Update the vote count
      const updateField = voteType === "knew" ? "votes_knew" : "votes_didnt_know";
      const { data: updatedFact, error: updateError } = await supabase
        .from("trivia_facts")
        .update({ [updateField]: fact[updateField] + 1 })
        .eq("id", fact.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Calculate and show results
      const newKnew = voteType === "knew" ? fact.votes_knew + 1 : fact.votes_knew;
      const newDidntKnow = voteType === "didnt_know" ? fact.votes_didnt_know + 1 : fact.votes_didnt_know;
      const total = newKnew + newDidntKnow;

      setVoteResult({
        totalVotes: total,
        knewPercentage: Math.round((newKnew / total) * 100),
        didntKnowPercentage: Math.round((newDidntKnow / total) * 100),
        userVote: voteType,
      });
      setHasVoted(true);
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
    vote,
    refresh: fetchRandomFact,
  };
}
