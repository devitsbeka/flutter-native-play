import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Sparkles, Loader2 } from 'lucide-react';
import { useTVPoll, PollSuggestion } from '@/hooks/useTVPoll';
import { useTVGame } from '@/contexts/TVGameContext';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';

interface ControllerPollResultsGuestProps {
  sessionId: string;
}

export const ControllerPollResultsGuest: React.FC<ControllerPollResultsGuestProps> = ({
  sessionId,
}) => {
  const { myPlayerId, players } = useTVGame();
  const myPlayer = players.find(p => p.id === myPlayerId);
  
  const { suggestions, loading, pollPhase } = useTVPoll({
    sessionId,
    userId: myPlayerId || null,
    nickname: myPlayer?.nickname || 'Guest',
    avatarUrl: myPlayer?.avatar_url,
    isHost: false,
  });

  // Debug logging
  useEffect(() => {
    console.log('[ControllerPollResultsGuest] State:', { 
      loading, 
      pollPhase, 
      suggestionsCount: suggestions.length 
    });
  }, [loading, pollPhase, suggestions.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
      </div>
    );
  }

  // Sort suggestions by vote count for display
  const sortedSuggestions = [...suggestions].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-yellow-500" />
        <h1 className="text-xl font-bold text-white">ხმის მიცემის შედეგები</h1>
      </div>

      {/* Results list */}
      <div className="flex-1 space-y-3 mb-6 overflow-y-auto">
        {sortedSuggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              index < 3 
                ? 'bg-purple-500/30 border-purple-400' 
                : 'bg-white/5 border-white/10 opacity-50'
            }`}
          >
            {/* Rank badge */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              index === 0 ? 'bg-yellow-500 text-yellow-900' :
              index === 1 ? 'bg-gray-300 text-gray-700' :
              index === 2 ? 'bg-orange-400 text-orange-900' :
              'bg-purple-500/30 text-purple-200'
            }`}>
              {index === 0 && <Crown className="w-5 h-5" />}
              {index !== 0 && (index + 1)}
            </div>

            {/* Icon */}
            {suggestion.cover_image ? (
              <img src={suggestion.cover_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : suggestion.icon_slug ? (
              <QuizCategoryIcon iconSlug={suggestion.icon_slug} size={48} className="w-12 h-12" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-300" />
              </div>
            )}

            {/* Name */}
            <div className="flex-1">
              <p className="font-bold text-white">{suggestion.category_name}</p>
              <p className="text-xs text-purple-300">
                {suggestion.vote_count} ხმა • {suggestion.nickname}
              </p>
            </div>

            {/* Top indicator */}
            {index < 3 && (
              <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded">
                #{index + 1}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Waiting message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-4"
      >
        <div className="flex items-center justify-center gap-2 text-purple-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">ველოდებით ჰოსტს თამაშის დასაწყებად...</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ControllerPollResultsGuest;
