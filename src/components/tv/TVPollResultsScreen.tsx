import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, Sparkles } from 'lucide-react';
import { useTVGame } from '@/contexts/TVGameContext';
import { supabase } from '@/integrations/supabase/client';
import { TVBrandingOverlay } from './TVBrandingOverlay';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { Avatar } from '@/components/shared/Avatar';

interface QueueItem {
  id: string;
  position: number;
  source_type: string;
  category_id: string | null;
  category_name: string | null;
  icon_slug: string | null;
  user_trivia_id: string | null;
  suggester_user_id?: string | null;
  suggester_nickname?: string | null;
  suggester_avatar_url?: string | null;
}

/**
 * TV display screen for poll results showing winning categories
 * Displayed after poll voting ends and before game starts
 */
export const TVPollResultsScreen: React.FC = () => {
  const { sessionId, players } = useTVGame();
  const [winningCategories, setWinningCategories] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch winning categories from queue with real-time updates
  useEffect(() => {
    let isMounted = true;

    const fetchWinners = async () => {
      if (!sessionId) return;

      // Small delay to ensure queue insert is committed
      await new Promise(resolve => setTimeout(resolve, 300));

      const { data: queueItems } = await supabase
        .from('tv_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .order('position', { ascending: true });

      if (queueItems && isMounted) {
        setWinningCategories(queueItems as QueueItem[]);
      }
      if (isMounted) setLoading(false);
    };

    fetchWinners();

    // Subscribe to queue changes for this session
    const channel = supabase
      .channel(`poll-results-queue-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_session_queue',
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchWinners()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Rank badge colors
  const getRankBadge = (position: number) => {
    switch (position) {
      case 0:
        return { bg: 'bg-yellow-400', icon: Crown, label: '1' };
      case 1:
        return { bg: 'bg-gray-300', icon: Star, label: '2' };
      case 2:
        return { bg: 'bg-amber-600', icon: Star, label: '3' };
      default:
        return { bg: 'bg-purple-500', icon: Star, label: String(position + 1) };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <Sparkles className="w-16 h-16 animate-pulse text-purple-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative overflow-hidden">
      <TVBrandingOverlay showLogo showCode />

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 h-screen flex flex-col px-8 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
            გამარჯვებული კატეგორიები
          </h1>
          <p className="text-purple-300 text-lg">
            მომდევნო {winningCategories.length} რაუნდი
          </p>
        </motion.div>

        {/* Winning categories grid */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl">
            {winningCategories.map((category, index) => {
              const rank = getRankBadge(index);
              const RankIcon = rank.icon;

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.15, type: 'spring' }}
                  className="relative"
                >
                  {/* Rank badge */}
                  <div 
                    className={`absolute -top-3 -left-3 z-10 w-10 h-10 rounded-full ${rank.bg} flex items-center justify-center shadow-lg border-2 border-white`}
                  >
                    <span className="text-lg font-bold text-gray-900">{rank.label}</span>
                  </div>

                  {/* Category card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-4">
                      {category.icon_slug ? (
                        <QuizCategoryIcon iconSlug={category.icon_slug} size={80} className="w-20 h-20" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-purple-500/30 flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-purple-300" />
                        </div>
                      )}
                    </div>

                    {/* Category name */}
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {category.category_name || 'კატეგორია'}
                    </h3>

                    {/* Suggester info */}
                    {category.suggester_nickname && (
                      <div className="flex items-center gap-2 text-purple-300 text-sm">
                        <Avatar
                          imageUrl={category.suggester_avatar_url || undefined}
                          emoji={category.suggester_nickname.charAt(0)}
                          size="xs"
                        />
                        <span>{category.suggester_nickname}</span>
                      </div>
                    )}

                    {/* Source type badge */}
                    <div className="mt-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        category.source_type === 'category' 
                          ? 'bg-blue-500/20 text-blue-300' 
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {category.source_type === 'category' ? 'კატეგორია' : 'ტრივია'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Player avatars at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-3 mt-8"
        >
          {players.slice(0, 8).map((player) => (
            <div key={player.id} className="flex flex-col items-center">
              <Avatar
                imageUrl={player.avatar_url || undefined}
                emoji={player.nickname.charAt(0)}
                size="md"
              />
              <span className="text-white text-xs mt-1 truncate max-w-16">
                {player.nickname}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-purple-300/60 mt-6"
        >
          მოემზადეთ... თამაში იწყება!
        </motion.p>
      </div>
    </div>
  );
};
