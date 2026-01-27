import React, { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
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
}

interface ControllerDirectSelectionProps {
  sessionId: string;
  userId: string;
  roomId?: string | null;
  onStartGame: () => void;
  onBack?: () => void;
}

export const ControllerDirectSelection: React.FC<ControllerDirectSelectionProps> = ({
  sessionId,
  userId,
  roomId,
  onStartGame,
  onBack,
}) => {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTriviaPicker, setShowTriviaPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userTrivias, setUserTrivias] = useState<UserTrivia[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [pendingTriviaId, setPendingTriviaId] = useState<string | null>(null);

  // Use the TV session queue hook
  const { queue, addCategoryToQueue, removeFromQueue, hasQueue } = useTVSessionQueue(sessionId, roomId);

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
        .select('id, title, cover_image, icon_slug, is_blind')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setUserTrivias(data);
        });
    }
  }, [showTriviaPicker, userTrivias.length, userId]);

  const handleSelectCategory = async (category: Category) => {
    // Immediately mark as pending to prevent double-clicks
    setPendingCategoryId(category.category_id);
    
    // Check if this category is already in the queue
    const alreadyInQueue = queue.some(
      (item) => item.source_type === 'category' && item.category_id === category.category_id
    );
    
    if (alreadyInQueue) {
      toast.error(`${category.name} უკვე არჩეულია!`);
      setPendingCategoryId(null);
      setShowCategoryPicker(false);
      return;
    }
    
    setLoading(true);
    try {
      // Add to queue using hook
      await addCategoryToQueue({
        id: category.category_id,
        name: category.name,
        icon_slug: category.icon_slug,
      });
      toast.success(`${category.name} დაემატა!`);
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('დამატება ვერ მოხერხდა');
    }
    setLoading(false);
    setPendingCategoryId(null);
    setShowCategoryPicker(false);
  };

  const handleSelectTrivia = async (trivia: UserTrivia) => {
    // Immediately mark as pending to prevent double-clicks
    setPendingTriviaId(trivia.id);
    
    // Check if this trivia is already in the queue
    const alreadyInQueue = queue.some(
      (item) => item.source_type === 'user_trivia' && item.user_trivia_id === trivia.id
    );
    
    if (alreadyInQueue) {
      toast.error(`${trivia.title} უკვე არჩეულია!`);
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

      // Insert directly into tv_session_queue for user trivia
      const { error } = await supabase.from('tv_session_queue').insert({
        session_id: sessionId,
        position: nextPosition,
        source_type: 'user_trivia',
        user_trivia_id: trivia.id,
        category_name: trivia.title,
        icon_slug: trivia.icon_slug,
      });

      if (error) throw error;
      toast.success(`${trivia.title} დაემატა!`);
    } catch (error) {
      console.error('Error adding trivia:', error);
      toast.error('დამატება ვერ მოხერხდა');
    }
    setLoading(false);
    setPendingTriviaId(null);
    setShowTriviaPicker(false);
  };

  const handleRemoveFromQueue = async (itemId: string) => {
    try {
      await removeFromQueue(itemId);
      toast.success('წაიშალა რიგიდან');
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast.error('წაშლა ვერ მოხერხდა');
    }
  };

  const handleStartGame = () => {
    if (!hasQueue || queue.length === 0) {
      toast.error('აირჩიე მინიმუმ 1 კატეგორია');
      return;
    }
    onStartGame();
  };

  // Category picker modal
  if (showCategoryPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
        <div className="max-w-xl mx-auto">
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
            {categories.map((category) => {
              const isSelected = queue.some(
                (item) => item.source_type === 'category' && item.category_id === category.category_id
              );
              const isPending = pendingCategoryId === category.category_id;
              const isDisabled = loading || isSelected || isPending;
              
              return (
                <button
                  key={category.id}
                  onClick={() => !isDisabled && handleSelectCategory(category)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isSelected || isPending
                      ? 'bg-white/5 border-green-400/50 opacity-60 cursor-not-allowed' 
                      : 'bg-white/10 border-white/20 hover:border-purple-400'
                  }`}
                >
                  {category.icon_slug ? (
                    <QuizCategoryIcon iconSlug={category.icon_slug} size={40} className="w-10 h-10" />
                  ) : (
                    <span className="text-2xl">{category.icon}</span>
                  )}
                  <span className="flex-1 text-left font-medium text-white">{category.name}</span>
                  {isSelected ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-300" />
                  )}
                </button>
              );
            })}
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
                      {trivia.is_blind ? (
                        <span className="text-xs text-green-400">ითამაშე</span>
                      ) : (
                        <span className="text-xs text-yellow-400">⚠️ გამოტოვებ</span>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 text-purple-200" />
            </button>
          )}
          <Crown className="w-7 h-7 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">აირჩიე კატეგორიები</h1>
        </div>

        {/* Queue */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20 flex-1">
          <p className="text-purple-300 text-sm mb-3">
            არჩეული რაუნდები: <span className="font-bold text-white">{queue.length}/8</span>
          </p>
          
          {/* Show queue items */}
          {queue.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
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
                      {item.source_type === 'category' ? 'კატეგორია' : 'შენი ტრივია'}
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
              <p className="text-purple-300">აირჩიე კატეგორიები თამაშისთვის</p>
            </div>
          )}

          {/* Add buttons */}
          {queue.length < 8 && (
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

        {/* Start game button */}
        <div className="mt-auto">
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={handleStartGame}
            disabled={queue.length === 0}
          >
            <Play className="w-5 h-5 mr-2" />
            {queue.length === 0 
              ? 'აირჩიე მინ. 1 კატეგორია' 
              : `თამაშის დაწყება (${queue.length} რაუნდი)`}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
};

export default ControllerDirectSelection;
