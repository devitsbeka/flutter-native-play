import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Crown,
  Loader2
} from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { useTVGame } from '@/contexts/TVGameContext';
import { useTVPoll, PollSuggestion } from '@/hooks/useTVPoll';

import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

const MAX_VOTES = 3;

export const ControllerPollScreen: React.FC<ControllerPollScreenProps> = ({
  sessionId,
  userId,
  nickname,
  avatarUrl,
  isHost,
  onVotingEnded,
}) => {
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
  const [voters, setVoters] = useState<{ id: string; nickname: string; avatar_url: string | null }[]>([]);
  const [players, setPlayers] = useState<{ player_id: string; nickname: string; avatar_url: string | null }[]>([]);
  
  // Track if voting has ended (for auto-transition)
  const hasEndedRef = useRef(false);

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
        .select('id, category_id, name, icon, color, icon_slug')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          if (data) setCategories(data);
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

  const handleSelectCategory = async (category: Category) => {
    setLoading(true);
    const success = await submitSuggestion({
      sourceType: 'category',
      categoryId: category.category_id,
      categoryName: category.name,
      iconSlug: category.icon_slug,
    });
    setLoading(false);
    setShowCategoryPicker(false);
    
    if (success) {
      toast.success(`${category.name} შემოთავაზებულია!`);
    } else {
      toast.error('შემოთავაზება ვერ მოხერხდა');
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
      toast.success(`${trivia.title} შემოთავაზებულია!`);
    } else {
      toast.error('შემოთავაზება ვერ მოხერხდა');
    }
  };

  const handleRemoveSuggestion = async (suggestionId: string) => {
    const success = await removeSuggestion(suggestionId);
    if (success) {
      toast.success('შემოთავაზება წაიშალა');
    } else {
      toast.error('წაშლა ვერ მოხერხდა');
    }
  };

  const handleStartVoting = async () => {
    if (suggestions.length < 2) {
      toast.error('საჭიროა მინიმუმ 2 შემოთავაზება');
      return;
    }
    
    const success = await startVoting();
    if (success) {
      toast.success('ხმის მიცემა დაიწყო!');
    }
  };

  const handleVote = async (suggestionId: string) => {
    // Check if already voted for this one (toggle off is always allowed)
    const isAlreadyVoted = myVotes.includes(suggestionId);
    
    // If not already voted and at max, show warning
    if (!isAlreadyVoted && myVotes.length >= MAX_VOTES) {
      toast.error(`მაქსიმუმ ${MAX_VOTES} ხმის მიცემა შეგიძლია`);
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
  // This handles the case where pollPhase updates before contextPhase
  if (pollPhase === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-300 animate-spin mb-4" />
        <p className="text-white font-medium">იტვირთება შედეგები...</p>
      </div>
    );
  }

  // Suggestion phase
  if (pollPhase === 'suggest') {
    // Category picker modal
    if (showCategoryPicker) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">აირჩიე კატეგორია</h2>
            <button 
              onClick={() => setShowCategoryPicker(false)}
              className="p-2 rounded-full bg-white/10"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleSelectCategory(category)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 hover:border-purple-400 transition-all"
              >
                {category.icon_slug ? (
                  <QuizCategoryIcon iconSlug={category.icon_slug} className="w-10 h-10" />
                ) : (
                  <span className="text-2xl">{category.icon}</span>
                )}
                <span className="flex-1 text-left font-medium text-white">{category.name}</span>
                <ChevronRight className="w-5 h-5 text-purple-300" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Trivia picker modal
    if (showTriviaPicker) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">აირჩიე ტრივია</h2>
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
              <p className="text-purple-300">შენ ჯერ არ გაქვს ტრივიები</p>
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
                    <QuizCategoryIcon iconSlug={trivia.icon_slug} className="w-10 h-10" />
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
      );
    }

    // Main suggestion phase UI
    // HOST VIEW: Can add up to 8 suggestions
    if (isHost) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Crown className="w-7 h-7 text-yellow-400" />
            <h1 className="text-xl font-bold text-white">დაამატე კატეგორიები</h1>
          </div>

          {/* Host's suggestions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
            <p className="text-purple-300 text-sm mb-3">
              შენი არჩევანი: <span className="font-bold text-white">{mySuggestions.length}/8</span>
            </p>
            
            {/* Show existing suggestions */}
            {mySuggestions.length > 0 && (
              <div className="space-y-2 mb-3 max-h-[35vh] overflow-y-auto">
                {mySuggestions.map((suggestion, index) => (
                  <div key={suggestion.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                    <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-200">
                      {index + 1}
                    </div>
                    {suggestion.cover_image ? (
                      <img src={suggestion.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : suggestion.icon_slug ? (
                      <QuizCategoryIcon iconSlug={suggestion.icon_slug} className="w-10 h-10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{suggestion.category_name}</p>
                      <p className="text-xs text-purple-300">
                        {suggestion.source_type === 'category' ? 'კატეგორია' : (
                          <span className="text-yellow-400">⚠️ შენი ტრივია - გამოტოვებ</span>
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
              <div className="space-y-2">
                <ChunkyButton
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowCategoryPicker(true)}
                >
                  <Library className="w-5 h-5 mr-2" />
                  ბიბლიოთეკიდან
                </ChunkyButton>
                <ChunkyButton
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowTriviaPicker(true)}
                >
                  <User className="w-5 h-5 mr-2" />
                  ჩემი ტრივიებიდან
                </ChunkyButton>
              </div>
            )}

            {/* At limit message */}
            {!canAddMoreSuggestions && mySuggestions.length >= 8 && (
              <p className="text-xs text-purple-400 text-center mt-2">
                მაქსიმალური რაოდენობა მიღწეულია
              </p>
            )}
          </div>

          {/* Start voting button */}
          <div className="mt-auto">
            <ChunkyButton
              variant="primary"
              className="w-full"
              onClick={handleStartVoting}
              disabled={suggestions.length < 2}
            >
              <Vote className="w-5 h-5 mr-2" />
              {suggestions.length < 2 
                ? 'საჭიროა მინ. 2 კატეგორია' 
                : `ხმის მიცემის დაწყება (${suggestions.length} ვარიანტი)`}
            </ChunkyButton>
          </div>
        </div>
      );
    }

    // GUEST VIEW: Read-only, waiting for host to add options
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <Vote className="w-7 h-7 text-purple-300" />
          <h1 className="text-xl font-bold text-white">კატეგორიების არჩევა</h1>
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
              <p className="text-purple-300 font-medium">ჰოსტი ამატებს კატეგორიებს...</p>
              <p className="text-purple-400 text-sm mt-2">მალე დაიწყება ხმის მიცემა</p>
            </div>
          ) : (
            <>
              <p className="text-purple-300 text-sm mb-3">
                ჰოსტის არჩევანი ({suggestions.length}):
              </p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
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
                      <QuizCategoryIcon iconSlug={suggestion.icon_slug} className="w-10 h-10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{suggestion.category_name}</p>
                      <p className="text-xs text-purple-300">
                        {suggestion.source_type === 'category' ? 'კატეგორია' : 'ჰოსტის ტრივია'}
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
          <p className="text-purple-300">⏳ ველოდებით ხმის მიცემის დაწყებას...</p>
        </div>
      </div>
    );
  }

  // Voting phase
  if (pollPhase === 'voting') {
    const votingEnded = timeRemaining === 0;

    // If voting ended, show brief transition state while waiting for database update
    if (votingEnded) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-purple-500/30 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">ხმის მიცემა დასრულდა!</h2>
            <p className="text-purple-300">
              {isHost ? 'იტვირთება შედეგები...' : 'ველოდებით ჰოსტს თამაშის დასაწყებად...'}
            </p>
          </motion.div>
        </div>
      );
    }

    // ALL PLAYERS: Interactive voting (host and guests can all vote)
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
        {/* Header with timer */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Vote className="w-7 h-7 text-purple-300" />
            <h1 className="text-xl font-bold text-white">ხმის მიცემა</h1>
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
            აირჩიე მაქსიმუმ {MAX_VOTES} კატეგორია
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
            <p className="text-xs text-purple-300 mb-2">ხმა მისცა:</p>
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
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-purple-500/50 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
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
        <div className="flex-1 space-y-3 overflow-y-auto">
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
                      ? 'bg-purple-500/30 border-purple-400'
                      : 'bg-white/10 border-white/20 hover:border-purple-400'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-purple-500/30 text-purple-200'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Icon */}
                  {suggestion.cover_image ? (
                    <img src={suggestion.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : suggestion.icon_slug ? (
                    <QuizCategoryIcon iconSlug={suggestion.icon_slug} className="w-10 h-10" />
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
                        <span className="text-yellow-400">ჰოსტის ტრივია</span>
                      ) : 'კატეგორია'}
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
              შენი ხმები
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
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <p className="text-purple-300">იტვირთება...</p>
    </div>
  );
};

export default ControllerPollScreen;
