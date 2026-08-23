import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  Library, 
  User, 
  Play, 
  X, 
  ChevronRight,
  Sparkles,
  Crown,
  ArrowLeft,
  Check
} from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { supabase } from '@/integrations/supabase/client';
import { filterCategoriesForLanguage } from '@/utils/languageCategoryFilter';
import { toast } from "@/lib/toast";
import { useTVSessionQueue } from '@/hooks/useTVSessionQueue';

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
  is_blind?: boolean;
  plays_count?: number;
}

interface ControllerDirectSelectionProps {
  sessionId: string;
  userId: string;
  roomId?: string | null;
  onStartGame: (firstQueueItem: { categoryId?: string; userTriviaId?: string }) => void;
  onBack?: () => void;
}

export const ControllerDirectSelection: React.FC<ControllerDirectSelectionProps> = ({
  sessionId,
  userId,
  roomId,
  onStartGame,
  onBack,
}) => {
  const { t } = useLanguage();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTriviaPicker, setShowTriviaPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userTrivias, setUserTrivias] = useState<UserTrivia[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [pendingTriviaId, setPendingTriviaId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

  // Use the TV session queue hook
  const { queue, addCategoryToQueue, removeFromQueue, hasQueue } = useTVSessionQueue(sessionId, roomId);

  // Load categories when picker opens
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
        .select('id, title, cover_image, icon_slug, is_blind, plays_count')
        .eq('user_id', userId)
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
      // Check not already in queue
      const alreadyInQueue = queue.some(
        (item) => item.source_type === 'category' && item.category_id === category.category_id
      );
      if (alreadyInQueue) continue;
      try {
        await addCategoryToQueue({
          id: category.category_id,
          name: category.name,
          icon_slug: category.icon_slug,
        });
        successCount++;
      } catch (error) {
        console.error('Error adding category:', error);
      }
    }
    setLoading(false);
    setSelectedCategoryIds(new Set());
    setShowCategoryPicker(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} ${t("extra.tvCategorySuggested")}`);
    } else {
      toast.error(t("extra.tvSuggestionFailed"));
    }
  };

  const handleSelectTrivia = async (trivia: UserTrivia) => {
    // Immediately mark as pending to prevent double-clicks
    setPendingTriviaId(trivia.id);
    
    // Check if this trivia is already in the queue
    const alreadyInQueue = queue.some(
      (item) => item.source_type === 'user_trivia' && item.user_trivia_id === trivia.id
    );
    
    if (alreadyInQueue) {
      toast.error(`${trivia.title} ${t("extra.tvAlreadySelected")}`);
      setPendingTriviaId(null);
      setShowTriviaPicker(false);
      return;
    }
    
    setLoading(true);
    try {
      // Get current queue length for position
      const { data: currentQueue } = await supabase
        .from('tv_session_queue')
        .select('position')
        .eq('session_id', sessionId)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = currentQueue?.[0]?.position != null 
        ? currentQueue[0].position + 1 
        : 0;

      // STRICT HOST POLICY: Block host if non-blind OR if blind but already played
      const hostKnowsAnswers = !trivia.is_blind || (trivia.is_blind && (trivia.plays_count || 0) > 0);
      
      let suggesterInfo: { nickname: string | null; avatar_url: string | null } = { nickname: null, avatar_url: null };
      if (hostKnowsAnswers) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        suggesterInfo = profile || { nickname: null, avatar_url: null };
      }

      const { error } = await supabase.from('tv_session_queue').insert({
        session_id: sessionId,
        position: nextPosition,
        source_type: 'user_trivia',
        user_trivia_id: trivia.id,
        category_name: trivia.title,
        icon_slug: trivia.icon_slug,
        suggester_user_id: hostKnowsAnswers ? userId : null,
        suggester_nickname: hostKnowsAnswers ? suggesterInfo.nickname : null,
        suggester_avatar_url: hostKnowsAnswers ? suggesterInfo.avatar_url : null,
      });

      if (error) throw error;
      toast.success(`${trivia.title} ${t("extra.tvAdded")}`);
    } catch (error) {
      console.error('Error adding trivia:', error);
      toast.error(t("extra.tvSuggestionFailed"));
    }
    setLoading(false);
    setPendingTriviaId(null);
    setShowTriviaPicker(false);
  };

  const handleRemoveFromQueue = async (itemId: string) => {
    try {
      await removeFromQueue(itemId);
      toast.success(t("extra.tvRemovedFromQueue"));
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast.error(t("extra.tvRemovalFailed"));
    }
  };

  const handleStartGame = () => {
    if (queue.length === 0) {
      toast.error(t("extra.tvChooseMin1"));
      return;
    }
    
    const firstQueued = queue[0];
    onStartGame({
      categoryId: firstQueued.category_id || undefined,
      userTriviaId: firstQueued.user_trivia_id || undefined,
    });
  };

  // Category picker modal - multi-select
  if (showCategoryPicker) {
    const alreadyInQueueIds = new Set(
      queue.filter(item => item.source_type === 'category').map(item => item.category_id).filter(Boolean)
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
              const isAlreadyInQueue = alreadyInQueueIds.has(category.category_id);
              const isSelected = selectedCategoryIds.has(category.category_id);
              
              return (
                <button
                  key={category.id}
                  onClick={() => !isAlreadyInQueue && toggleCategorySelection(category.category_id)}
                  disabled={isAlreadyInQueue}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isAlreadyInQueue
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
                  {isAlreadyInQueue ? (
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
              <Play className="w-5 h-5 mr-2" />
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
              {userTrivias.map((trivia) => {
                const isSelected = queue.some(
                  (item) => item.source_type === 'user_trivia' && item.user_trivia_id === trivia.id
                );
                const isPending = pendingTriviaId === trivia.id;
                const isDisabled = loading || isSelected || isPending;
                
                return (
                  <button
                    key={trivia.id}
                    onClick={() => !isDisabled && handleSelectTrivia(trivia)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected || isPending
                        ? 'bg-white/5 border-green-400/50 opacity-60 cursor-not-allowed' 
                        : 'bg-white/10 border-white/20 hover:border-purple-400'
                    }`}
                  >
                    {trivia.cover_image ? (
                      <img src={trivia.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : trivia.icon_slug ? (
                      <QuizCategoryIcon iconSlug={trivia.icon_slug} size={40} className="w-10 h-10" />
                    ) : (
                      <Sparkles className="w-10 h-10 text-purple-300" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-left font-medium text-white block truncate">{trivia.title}</span>
                      {trivia.is_blind && (trivia.plays_count || 0) === 0 ? (
                        <span className="text-xs text-green-400">{t("extra.tvPlayLabel")}</span>
                      ) : (
                        <span className="text-xs text-yellow-400">
                          ⚠️ {!trivia.is_blind ? t('extra.youKnowAnswers') : t('extra.alreadyPlayed')}
                        </span>
                      )}
                    </div>
                    {isSelected ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-purple-300" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main selection UI
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 pb-28 flex flex-col overflow-y-auto">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col min-h-0">
        {/* Header - fixed height */}
        <div className="flex items-center gap-3 mb-6 shrink-0 relative z-20">
          {onBack && (
            <button 
              onClick={onBack} 
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-transform relative z-20"
            >
              <ArrowLeft className="w-5 h-5 text-purple-200" />
            </button>
          )}
          <Crown className="w-7 h-7 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">{t("extra.tvChooseCategories")}</h1>
        </div>

        {/* Queue - scrollable area */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20 flex-1 min-h-0 max-h-[calc(100dvh-250px)] overflow-hidden flex flex-col">
          <p className="text-purple-300 text-sm mb-3 shrink-0">
            {t("extra.tvSelectedRounds")} <span className="font-bold text-white">{queue.length}/8</span>
          </p>
          
          {/* Show queue items - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {queue.length > 0 ? (
              <div className="space-y-2">
                {queue.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2 rounded-xl bg-white/5"
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-200">
                      {index + 1}
                    </div>
                  {item.icon_slug ? (
                    <QuizCategoryIcon iconSlug={item.icon_slug} size={40} className="w-10 h-10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{item.category_name}</p>
                      <p className="text-xs text-purple-300">
                        {item.source_type === 'category' ? t("extra.tvCategoryType") : t("extra.tvYourTrivia")}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleRemoveFromQueue(item.id)}
                      className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 active:scale-95 transition-transform shrink-0"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <p className="text-purple-300">{t("extra.tvChooseCategoriesForGame")}</p>
              </div>
            )}
          </div>

          {/* Add buttons - fixed at bottom of card */}
          {queue.length < 8 && (
            <div className="space-y-2 shrink-0 pt-3">
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
        </div>
      </div>
      
      {/* Start game button - fixed footer with pointer-events pattern */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-purple-900 via-purple-900/95 to-transparent z-50 pointer-events-none">
        <div className="max-w-xl mx-auto">
          <ChunkyButton
            variant="primary"
            className="w-full pointer-events-auto"
            onClick={handleStartGame}
            disabled={queue.length === 0}
          >
            <Play className="w-5 h-5 mr-2" />
            {queue.length === 0 
              ? t("extra.tvChooseMin1Short")
              : t("extra.tvStartGameNRounds", { n: queue.length })}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
};

export default ControllerDirectSelection;
