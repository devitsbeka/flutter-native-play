import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Vote, 
  Check, 
  X, 
  Timer, 
  Sparkles, 
  Library, 
  User,
  Play,
  ChevronRight,
  ChevronLeft,
  Crown,
  Loader2
} from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { useTVGame } from '@/contexts/TVGameContext';
import { useTVPoll, PollSuggestion } from '@/hooks/useTVPoll';
import { SafeAvatarImage } from '@/components/shared/SafeAvatar';

import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { supabase } from '@/integrations/supabase/client';
import { filterCategoriesForLanguage } from '@/utils/languageCategoryFilter';
import { toast } from "@/lib/toast";
import { useLanguage } from '@/contexts/LanguageContext';

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
  icon_slug?: string;
}

interface UserTrivia {
  id: string;
  title: string;
  cover_image?: string;
  icon_slug?: string;
}

interface ControllerPollScreenProps {
  sessionId: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  isHost: boolean;
  onVotingEnded?: () => void; // Callback when voting timer expires (host only)
  contextPhase?: string; // Phase from parent context - used as primary source of truth
  code?: string; // Game/TV pairing code to display
}

const MAX_VOTES = 3;

export const ControllerPollScreen: React.FC<ControllerPollScreenProps> = ({
  sessionId,
  userId,
  nickname,
  avatarUrl,
  isHost,
  onVotingEnded,
  contextPhase,
  code,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const handleBack = () => {
    // Always navigate to /team - the rooms page
    navigate('/team', { replace: true });
  };
  const {
    suggestions,
    mySuggestions,
    canAddMoreSuggestions,
    myVotes,
    pollPhase,
    pollStartTime,
    pollDuration,
    submitSuggestion,
    removeSuggestion,
    toggleVote,
    startVoting,
    endVoting,
  } = useTVPoll({
    sessionId,
    userId,
    nickname,
    avatarUrl,
    isHost,
  });

  const [timeRemaining, setTimeRemaining] = useState(pollDuration);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTriviaPicker, setShowTriviaPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userTrivias, setUserTrivias] = useState<UserTrivia[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [voters, setVoters] = useState<{ id: string; nickname: string; avatar_url: string | null }[]>([]);
  const [players, setPlayers] = useState<{ player_id: string; nickname: string; avatar_url: string | null }[]>([]);
  
  // Track if voting has ended (for auto-transition)
  const hasEndedRef = useRef(false);

  // Derive effective poll phase from hook state + context phase
  // Hook's 'results' state is immediate (set by endVoting), so trust it first.
  // Context phase is a good fallback for guests who don't call endVoting directly.
  const effectivePollPhase = useMemo(() => {
    if (pollPhase === 'results') return 'results';
    if (contextPhase === 'poll-voting') return 'voting';
    if (contextPhase === 'poll-suggest') return 'suggest';
    if (contextPhase === 'poll-results') return 'results';
    return pollPhase;
  }, [contextPhase, pollPhase]);

  console.log('[ControllerPollScreen] Phase debug:', { contextPhase, pollPhase, effectivePollPhase });

  // Calculate time remaining for voting phase
  useEffect(() => {
    if (pollPhase !== 'voting' || !pollStartTime) {
      setTimeRemaining(pollDuration);
      return;
    }

    const updateTime = () => {
      const elapsed = (Date.now() - pollStartTime.getTime()) / 1000;
      const remaining = Math.max(0, pollDuration - elapsed);
      setTimeRemaining(Math.ceil(remaining));
    };

    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [pollPhase, pollStartTime, pollDuration]);

  // Auto-trigger voting end when timer expires (host only)
  // This updates the database so all clients see the transition
  useEffect(() => {
    if (pollPhase === 'voting' && timeRemaining === 0 && isHost && !hasEndedRef.current) {
      hasEndedRef.current = true;
      console.log('[ControllerPollScreen] Timer expired, calling endVoting');
      // Update database status to poll-results - this triggers realtime for all clients
      endVoting().then((success) => {
        console.log('[ControllerPollScreen] endVoting returned:', success);
        if (success) {
          onVotingEnded?.();
        }
      });
    }
  }, [pollPhase, timeRemaining, isHost, onVotingEnded, endVoting]);

  // Reset ref when phase changes
  useEffect(() => {
    if (pollPhase !== 'voting') {
      hasEndedRef.current = false;
    }
  }, [pollPhase]);

  // Fetch players and voters during voting phase
  useEffect(() => {
    if (pollPhase !== 'voting' || !sessionId) return;

    // Fetch all players in session
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('tv_players')
        .select('player_id, nickname, avatar_url')
        .eq('tv_session_id', sessionId);
      if (data) setPlayers(data);
    };

    // Fetch unique voters (users who have voted)
    const fetchVoters = async () => {
      const { data } = await supabase
        .from('tv_poll_votes')
        .select('user_id')
        .eq('session_id', sessionId);
      
      if (data) {
        // Get unique user IDs who voted
        const uniqueVoterIds = [...new Set(data.map(v => v.user_id))];
        
        // Map to player info
        const voterPlayers = players.filter(p => uniqueVoterIds.includes(p.player_id));
        setVoters(voterPlayers.map(p => ({ id: p.player_id, nickname: p.nickname, avatar_url: p.avatar_url })));
      }
    };

    fetchPlayers();
    fetchVoters();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`poll-voters-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_poll_votes',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchVoters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollPhase, sessionId, players]);

  useEffect(() => {
    if (showCategoryPicker && categories.length === 0) {
      supabase
        .from('categories')
        .select('id, category_id, name, icon, color, icon_slug, is_language_specific, language')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          if (data) setCategories(filterCategoriesForLanguage(data));
        });
    }
  }, [showCategoryPicker, categories.length]);

  // Load user trivias when picker opens
  useEffect(() => {
    if (showTriviaPicker && userTrivias.length === 0) {
      supabase
        .from('user_quiz_posts')
        .select('id, title, cover_image, icon_slug')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setUserTrivias(data);
        });
    }
  }, [showTriviaPicker, userTrivias.length, userId]);

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const handleSubmitSelectedCategories = async () => {
    setLoading(true);
    let successCount = 0;
    for (const catId of selectedCategoryIds) {
      const category = categories.find(c => c.category_id === catId);
      if (!category) continue;
      const success = await submitSuggestion({
        sourceType: 'category',
        categoryId: category.category_id,
        categoryName: category.name,
        iconSlug: category.icon_slug,
      });
      if (success) successCount++;
    }
    setLoading(false);
    setSelectedCategoryIds(new Set());
    setShowCategoryPicker(false);
    
    if (successCount > 0) {
      toast.success(t("extra.tvCategorySuggested"));
    } else {
      toast.error(t("extra.tvSuggestionFailed"));
    }
  };

  const handleSelectTrivia = async (trivia: UserTrivia) => {
    setLoading(true);
    const success = await submitSuggestion({
      sourceType: 'trivia',
      userTriviaId: trivia.id,
      categoryName: trivia.title,
      iconSlug: trivia.icon_slug,
      coverImage: trivia.cover_image,
    });
    setLoading(false);
    setShowTriviaPicker(false);
    
    if (success) {
      toast.success(`${trivia.title} ${t("extra.tvSuggested")}`);
    } else {
      toast.error(t("extra.tvSuggestionFailed"));
    }
  };

  const handleRemoveSuggestion = async (suggestionId: string) => {
    const success = await removeSuggestion(suggestionId);
    if (success) {
      toast.success(t("extra.tvSuggestionRemoved"));
    } else {
      toast.error(t("extra.tvRemovalFailed"));
    }
  };

  const handleStartVoting = async () => {
    if (suggestions.length < 2) {
      toast.error(t("extra.tvNeed2Suggestions"));
      return;
    }
    
    const success = await startVoting();
    if (success) {
      toast.success(t("extra.tvVotingStarted"));
    }
  };

  const handleVote = async (suggestionId: string) => {
    // Check if already voted for this one (toggle off is always allowed)
    const isAlreadyVoted = myVotes.includes(suggestionId);
    
    // If not already voted and at max, show warning
    if (!isAlreadyVoted && myVotes.length >= MAX_VOTES) {
      toast.error(t("extra.tvMaxVotes", { n: MAX_VOTES }));
      return;
    }
    
    await toggleVote(suggestionId);
  };

  // Debug logging
  console.log('[ControllerPollScreen] Render state:', { 
    pollPhase, 
    isHost, 
    suggestionsCount: suggestions.length,
    myVotesCount: myVotes.length,
    timeRemaining 
  });

  // If poll phase is results, don't render this component - let parent handle redirect
  // This handles the case where effectivePollPhase updates before contextPhase
  if (effectivePollPhase === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
        <div className="max-w-xl mx-auto w-full text-center">
          <Loader2 className="w-8 h-8 text-purple-300 animate-spin mb-4 mx-auto" />
          <p className="text-white font-medium">{t("extra.loadingResultsEllipsis")}</p>
        </div>
      </div>
    );
  }

  // Suggestion phase
  if (effectivePollPhase === 'suggest') {
    // Category picker modal
    if (showCategoryPicker) {
      const alreadySuggestedIds = new Set(
        mySuggestions
          .filter(s => s.source_type === 'category')
          .map(s => s.category_id)
          .filter(Boolean)
      );

      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 pb-24 flex flex-col">
          <div className="max-w-xl mx-auto w-full flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">{t("extra.tvChooseCategories")}</h2>
                {selectedCategoryIds.size > 0 && (
                  <p className="text-sm text-green-300 mt-1">{t("extra.tvSelected")} {selectedCategoryIds.size}</p>
                )}
              </div>
              <button 
                onClick={() => { setShowCategoryPicker(false); setSelectedCategoryIds(new Set()); }}
                className="p-2 rounded-full bg-white/10"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pb-4">
              {categories.map((category) => {
                const isAlreadySuggested = alreadySuggestedIds.has(category.category_id);
                const isSelected = selectedCategoryIds.has(category.category_id);
                
                return (
                  <button
                    key={category.id}
                    onClick={() => !isAlreadySuggested && toggleCategorySelection(category.category_id)}
                    disabled={isAlreadySuggested}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isAlreadySuggested
                        ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-green-500/20 border-green-400'
                        : 'bg-white/10 border-white/20 hover:border-purple-400'
                    }`}
                  >
                    {category.icon_slug ? (
                      <QuizCategoryIcon iconSlug={category.icon_slug} size={40} className="w-10 h-10" />
                    ) : (
                      <span className="text-2xl">{category.icon}</span>
                    )}
                    <span className="flex-1 text-left font-medium text-white">{category.name}</span>
                    {isAlreadySuggested ? (
                      <span className="text-xs text-purple-400">{t("extra.tvAlreadyAdded")}</span>
                    ) : isSelected ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <div className="w-5 h-5 rounded border-2 border-white/30" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky bottom submit button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-purple-900 via-purple-900/95 to-transparent z-50">
            <div className="max-w-xl mx-auto">
              <ChunkyButton
                variant="primary"
                className="w-full"
                onClick={handleSubmitSelectedCategories}
                disabled={selectedCategoryIds.size === 0 || loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                {selectedCategoryIds.size === 0
                  ? t("extra.tvChooseCategories")
                  : `${t("extra.tvAddToQueue")} (${selectedCategoryIds.size})`}
              </ChunkyButton>
            </div>
          </div>
        </div>
      );
    }

    // Trivia picker modal
    if (showTriviaPicker) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{t("extra.tvChooseTrivia")}</h2>
              <button 
                onClick={() => setShowTriviaPicker(false)}
                className="p-2 rounded-full bg-white/10"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {userTrivias.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-purple-300">{t("extra.tvNoTrivias")}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {userTrivias.map((trivia) => (
                  <button
                    key={trivia.id}
                    onClick={() => handleSelectTrivia(trivia)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 hover:border-purple-400 transition-all"
                  >
                    {trivia.cover_image ? (
                      <img src={trivia.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : trivia.icon_slug ? (
                      <QuizCategoryIcon iconSlug={trivia.icon_slug} size={40} className="w-10 h-10" />
                    ) : (
                      <Sparkles className="w-10 h-10 text-purple-300" />
                    )}
                    <span className="flex-1 text-left font-medium text-white">{trivia.title}</span>
                    <ChevronRight className="w-5 h-5 text-purple-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Main suggestion phase UI
    // HOST VIEW: Can add up to 8 suggestions
    if (isHost) {
      return (
        <div className="h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
          <div className="max-w-xl mx-auto w-full flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <button 
                onClick={handleBack}
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              {code && (
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                  <span className="text-sm font-mono font-bold text-white tracking-wider">{code}</span>
                </div>
              )}
            </div>

            {/* Host's suggestions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20 flex-1 min-h-0 flex flex-col overflow-hidden">
              <p className="text-purple-300 text-sm mb-3 shrink-0">
                {t("extra.tvYourSuggestions")} <span className="font-bold text-white">{mySuggestions.length}/8</span>
              </p>
              
              {/* Show existing suggestions */}
              {mySuggestions.length > 0 && (
                <div className="space-y-2 mb-3 overflow-y-auto flex-1 min-h-0">
                  {mySuggestions.map((suggestion, index) => (
                    <div key={suggestion.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                      <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-200">
                        {index + 1}
                      </div>
                      {suggestion.cover_image ? (
                        <img src={suggestion.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : suggestion.icon_slug ? (
                        <QuizCategoryIcon iconSlug={suggestion.icon_slug} size={40} className="w-10 h-10" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-purple-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{suggestion.category_name}</p>
                        <p className="text-xs text-purple-300">
                          {suggestion.source_type === 'category' ? t("extra.tvCategoryType") : (
                            <span className="text-yellow-400">⚠️ {t("extra.tvYourTriviaSkip")}</span>
                          )}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleRemoveSuggestion(suggestion.id)}
                        className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 active:scale-95 transition-transform shrink-0"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add suggestion buttons */}
              {canAddMoreSuggestions && (
                <div className="space-y-2 shrink-0">
                  <ChunkyButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => setShowCategoryPicker(true)}
                  >
                    <Library className="w-5 h-5 mr-2" />
                    {t("extra.tvFromLibrary")}
                  </ChunkyButton>
                  <ChunkyButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => setShowTriviaPicker(true)}
                  >
                    <User className="w-5 h-5 mr-2" />
                    {t("extra.tvFromMyTrivias")}
                  </ChunkyButton>
                </div>
              )}

              {/* At limit message */}
              {!canAddMoreSuggestions && mySuggestions.length >= 8 && (
                <p className="text-xs text-purple-400 text-center mt-2 shrink-0">
                  {t("extra.tvMaxReached")}
                </p>
              )}
            </div>

            {/* Start voting button - always visible */}
            <div className="shrink-0 pb-safe">
              <ChunkyButton
                variant="primary"
                className="w-full"
                onClick={handleStartVoting}
                disabled={suggestions.length < 2}
              >
                <Vote className="w-5 h-5 mr-2" />
                {suggestions.length < 2 
                  ? t("extra.tvNeedMin2")
                  : t("extra.tvStartVoting")}
              </ChunkyButton>
            </div>
          </div>
        </div>
      );
    }

    // GUEST VIEW: Read-only, waiting for host to add options
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Vote className="w-7 h-7 text-purple-300" />
            <h1 className="text-xl font-bold text-white">{t("extra.tvChoosingCategories")}</h1>
          </div>

          {/* Current suggestions from host */}
          <div className="flex-1 mb-4">
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                </motion.div>
                <p className="text-purple-300 font-medium">{t("extra.tvHostAddingCategories")}</p>
                <p className="text-purple-400 text-sm mt-2">{t("extra.tvVotingSoon")}</p>
              </div>
            ) : (
              <>
                <p className="text-purple-300 text-sm mb-3">
                  {t("extra.tvHostChoice")} ({suggestions.length}):
                </p>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pb-4">
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20"
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-200">
                        {index + 1}
                      </div>
                      {suggestion.cover_image ? (
                        <img src={suggestion.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : suggestion.icon_slug ? (
                        <QuizCategoryIcon iconSlug={suggestion.icon_slug} size={40} className="w-10 h-10" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-purple-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-white text-sm">{suggestion.category_name}</p>
                        <p className="text-xs text-purple-300">
                          {suggestion.source_type === 'category' ? t("extra.categoryLabel") : t("extra.tvHostTrivia")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Waiting message */}
          <div className="mt-auto text-center py-4">
            <p className="text-purple-300">⏳ {t("extra.votingWaitStart")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Voting phase
  if (effectivePollPhase === 'voting') {
    const votingEnded = timeRemaining === 0;

    // If voting ended, show brief transition state while waiting for database update
    if (votingEnded) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
          <div className="max-w-xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t("extra.votingEnded")}</h2>
              <p className="text-purple-300">
                {isHost ? t("extra.loadingResultsEllipsis") : t("extra.waitingHostToStart")}
              </p>
            </motion.div>
          </div>
        </div>
      );
    }

    // ALL PLAYERS: Interactive voting (host and guests can all vote)
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
          {/* Header with timer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Vote className="w-7 h-7 text-purple-300" />
              <h1 className="text-xl font-bold text-white">{t("extra.tvVoting")}</h1>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              timeRemaining <= 10 ? 'bg-red-500/30' : 'bg-white/10'
            }`}>
              <Timer className={`w-5 h-5 ${timeRemaining <= 10 ? 'text-red-400' : 'text-purple-300'}`} />
              <span className={`font-bold text-xl ${timeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                {timeRemaining}
              </span>
            </div>
          </div>

          {/* Vote limit indicator */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-purple-300 text-sm">
              {t("extra.tvChooseMaxN", { n: MAX_VOTES })}
            </p>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              myVotes.length >= MAX_VOTES 
                ? 'bg-green-500/30 text-green-300' 
                : 'bg-white/10 text-white'
            }`}>
              {myVotes.length}/{MAX_VOTES}
            </div>
          </div>

          {/* Players who voted indicator */}
          {players.length > 0 && (
            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-purple-300 mb-2">{t("extra.tvVoted")}</p>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => {
                  const hasPlayerVoted = voters.some(v => v.id === player.player_id);
                  return (
                    <div 
                      key={player.player_id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${
                        hasPlayerVoted 
                          ? 'bg-green-500/20 ring-2 ring-green-400/50' 
                          : 'bg-white/10 opacity-40'
                      }`}
                    >
                      <SafeAvatarImage
                        avatarUrl={player.avatar_url}
                        fallback={player.nickname}
                        className="w-5 h-5 rounded-full object-cover"
                        containerClassName="w-5 h-5 rounded-full"
                      />
                      <span className={`text-xs ${hasPlayerVoted ? 'text-green-300' : 'text-white/60'}`}>
                        {player.nickname}
                      </span>
                      {hasPlayerVoted && <Check className="w-3 h-3 text-green-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voting list - interactive for guests */}
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            <AnimatePresence>
              {suggestions.map((suggestion, index) => {
                const hasVoted = myVotes.includes(suggestion.id);
                const isHostTrivia = suggestion.source_type === 'trivia';

                return (
                  <motion.button
                    key={suggestion.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onClick={() => handleVote(suggestion.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-98 ${
                      hasVoted
                        ? 'bg-green-500/30 border-green-400'
                        : 'bg-white/10 border-white/20 hover:border-purple-400'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index < 3 
                        ? 'bg-white text-purple-900'
                        : 'bg-purple-500/30 text-purple-200'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Icon */}
                    {suggestion.cover_image ? (
                      <img src={suggestion.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : suggestion.icon_slug ? (
                      <QuizCategoryIcon iconSlug={suggestion.icon_slug} size={40} className="w-10 h-10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-300" />
                      </div>
                    )}

                    {/* Name and type indicator */}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{suggestion.category_name}</p>
                      <p className="text-xs text-purple-300">
                        {isHostTrivia ? (
                          <span className="text-yellow-400">{t("extra.tvHostTrivia")}</span>
                        ) : t("extra.tvCategoryType")}
                      </p>
                    </div>

                    {/* Vote count + check */}
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">{suggestion.vote_count}</span>
                      {hasVoted && <Check className="w-5 h-5 text-green-400" />}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* My votes count - enhanced */}
          <div className="mt-4 py-3 px-4 bg-white/5 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-purple-300 text-sm">
                {t("extra.tvYourVotes")}
              </p>
              <div className="flex items-center gap-2">
                {[...Array(MAX_VOTES)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i < myVotes.length 
                        ? 'bg-green-400 scale-110' 
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <p className="text-purple-300">{t("common.loading")}</p>
    </div>
  );
};

export default ControllerPollScreen;
