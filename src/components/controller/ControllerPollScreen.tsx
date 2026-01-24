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
import { Avatar } from '@/components/shared/Avatar';
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
    mySuggestion,
    myVotes,
    pollPhase,
    pollStartTime,
    pollDuration,
    submitSuggestion,
    removeMySuggestion,
    toggleVote,
    startVoting,
  } = useTVPoll({
    sessionId,
    userId,
    nickname,
    avatarUrl,
  });

  const [timeRemaining, setTimeRemaining] = useState(pollDuration);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTriviaPicker, setShowTriviaPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userTrivias, setUserTrivias] = useState<UserTrivia[]>([]);
  const [loading, setLoading] = useState(false);
  
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

  // Auto-trigger voting end callback when timer expires (host only)
  useEffect(() => {
    if (pollPhase === 'voting' && timeRemaining === 0 && isHost && !hasEndedRef.current) {
      hasEndedRef.current = true;
      onVotingEnded?.();
    }
  }, [pollPhase, timeRemaining, isHost, onVotingEnded]);

  // Reset ref when phase changes
  useEffect(() => {
    if (pollPhase !== 'voting') {
      hasEndedRef.current = false;
    }
  }, [pollPhase]);

  // Load categories when picker opens
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

  const handleRemoveSuggestion = async () => {
    const success = await removeMySuggestion();
    if (success) {
      toast.success('შემოთავაზება წაიშალა');
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
    await toggleVote(suggestionId);
  };

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <Vote className="w-7 h-7 text-purple-300" />
          <h1 className="text-xl font-bold text-white">შემოგთავაზე კატეგორია</h1>
        </div>

        {/* My suggestion */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
          <p className="text-purple-300 text-sm mb-3">შენი შემოთავაზება:</p>
          
          {mySuggestion ? (
            <div className="flex items-center gap-3">
              {mySuggestion.cover_image ? (
                <img src={mySuggestion.cover_image} alt="" className="w-12 h-12 rounded-xl object-cover" />
              ) : mySuggestion.icon_slug ? (
                <QuizCategoryIcon iconSlug={mySuggestion.icon_slug} className="w-12 h-12" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-300" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-white">{mySuggestion.category_name}</p>
                <p className="text-xs text-purple-300">
                  {mySuggestion.source_type === 'category' ? 'ბიბლიოთეკიდან' : 'შენი ტრივია'}
                </p>
              </div>
              <button 
                onClick={handleRemoveSuggestion}
                className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30"
              >
                <X className="w-5 h-5 text-red-400" />
              </button>
            </div>
          ) : (
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
        </div>

        {/* Current suggestions */}
        <div className="flex-1 mb-4">
          <p className="text-purple-300 text-sm mb-3">შემოთავაზებები ({suggestions.length}):</p>
          
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-pulse" />
              <p className="text-purple-300">ველოდებით შემოთავაზებებს...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    suggestion.user_id === userId 
                      ? 'bg-purple-500/20 border-purple-400' 
                      : 'bg-white/10 border-white/20'
                  }`}
                >
                  <Avatar 
                    imageUrl={suggestion.avatar_url || undefined} 
                    emoji={suggestion.nickname[0]} 
                    size="sm" 
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{suggestion.category_name}</p>
                    <p className="text-xs text-purple-300">{suggestion.nickname}</p>
                  </div>
                  {suggestion.user_id === userId && (
                    <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded">შენი</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Host controls */}
        {isHost && (
          <div className="mt-auto">
            <ChunkyButton
              variant="primary"
              className="w-full"
              onClick={handleStartVoting}
              disabled={suggestions.length < 2}
            >
              <Vote className="w-5 h-5 mr-2" />
              {suggestions.length < 2 
                ? 'საჭიროა მინ. 2 შემოთავაზება' 
                : 'ხმის მიცემის დაწყება'}
            </ChunkyButton>
          </div>
        )}

        {!isHost && (
          <div className="mt-auto text-center">
            <p className="text-purple-300">⏳ ველოდებით ჰოსტს...</p>
          </div>
        )}
      </div>
    );
  }

  // Voting phase
  if (pollPhase === 'voting') {
    const votingEnded = timeRemaining === 0;

    // If voting ended and NOT host, show waiting state
    if (votingEnded && !isHost) {
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
            <p className="text-purple-300">ველოდებით ჰოსტს თამაშის დასაწყებად...</p>
          </motion.div>
        </div>
      );
    }

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

        <p className="text-purple-300 text-sm mb-4">
          აირჩიე კატეგორიები რომლებშიც გინდა ითამაშო (შენი შემოთავაზება გამორიცხულია)
        </p>

        {/* Voting list */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          <AnimatePresence>
            {suggestions.map((suggestion, index) => {
              const isOwn = suggestion.user_id === userId;
              const hasVoted = myVotes.includes(suggestion.id);

              return (
                <motion.button
                  key={suggestion.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => !isOwn && handleVote(suggestion.id)}
                  disabled={isOwn}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isOwn 
                      ? 'bg-gray-500/20 border-gray-500/30 opacity-50 cursor-not-allowed' 
                      : hasVoted
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

                  {/* Name and suggester */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{suggestion.category_name}</p>
                    <p className="text-xs text-purple-300">
                      {isOwn ? '(შენი შემოთავაზება)' : `შემოთავაზა: ${suggestion.nickname}`}
                    </p>
                  </div>

                  {/* Vote count */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{suggestion.vote_count}</span>
                    {hasVoted && <Check className="w-5 h-5 text-green-400" />}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* My votes count */}
        <div className="mt-4 text-center">
          <p className="text-purple-300">
            შენი ხმები: <span className="font-bold text-white">{myVotes.length}</span>
          </p>
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
