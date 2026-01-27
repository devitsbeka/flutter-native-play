import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Play, Crown, Sparkles } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { useTVPoll } from '@/hooks/useTVPoll';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { toast } from 'sonner';

interface ControllerPollResultsProps {
  sessionId: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  onGameStart: () => void;
}

export const ControllerPollResults: React.FC<ControllerPollResultsProps> = ({
  sessionId,
  userId,
  nickname,
  avatarUrl,
  onGameStart,
}) => {
  const { suggestions, finalizePollAndStartGame } = useTVPoll({
    sessionId,
    userId,
    nickname,
    avatarUrl,
  });

  const [selectedRoundCount, setSelectedRoundCount] = useState(3);
  const [isStarting, setIsStarting] = useState(false);

  // Available round options based on suggestion count
  const roundOptions = useMemo(() => {
    const maxRounds = Math.min(suggestions.length, 5);
    const options = [];
    for (let i = 2; i <= maxRounds; i++) {
      options.push(i);
    }
    return options;
  }, [suggestions.length]);

  // Top N suggestions that will be played
  const winningCategories = useMemo(() => {
    return suggestions.slice(0, selectedRoundCount);
  }, [suggestions, selectedRoundCount]);

  const handleStartGame = async () => {
    if (winningCategories.length === 0) {
      toast.error('არ არის გამარჯვებული კატეგორიები');
      return;
    }

    setIsStarting(true);
    try {
      const success = await finalizePollAndStartGame(selectedRoundCount);
      
      if (success) {
        toast.success('თამაში იწყება!');
        onGameStart();
      } else {
        toast.error('თამაშის დაწყება ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('[ControllerPollResults] Error starting game:', error);
      toast.error('თამაშის დაწყება ვერ მოხერხდა');
    } finally {
      // Always reset isStarting to ensure button isn't stuck disabled
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-yellow-500" />
        <h1 className="text-xl font-bold text-white">ხმის მიცემის შედეგები</h1>
      </div>

      {/* Results list */}
      <div className="flex-1 space-y-3 mb-6 overflow-y-auto">
        {suggestions.map((suggestion, index) => {
          const isWinning = index < selectedRoundCount;
          
          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                isWinning 
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

              {/* Winning indicator */}
              {isWinning && (
                <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded">
                  რაუნდი {index + 1}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Round count selector */}
      <div className="mb-6">
        <p className="text-purple-300 text-sm mb-3 text-center">რაუნდების რაოდენობა:</p>
        <div className="flex justify-center gap-2">
          {roundOptions.map((count) => (
            <button
              key={count}
              onClick={() => setSelectedRoundCount(count)}
              className={`w-14 h-14 rounded-xl font-bold text-xl transition-all ${
                selectedRoundCount === count
                  ? 'bg-purple-500 text-white border-2 border-purple-300'
                  : 'bg-white/10 text-purple-300 border-2 border-transparent hover:border-purple-400'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Start game button */}
      <ChunkyButton
        variant="primary"
        className="w-full"
        onClick={handleStartGame}
        disabled={isStarting || winningCategories.length === 0}
      >
        <Play className="w-5 h-5 mr-2" />
        {isStarting 
          ? 'იწყება...' 
          : `დაწყება (${selectedRoundCount} რაუნდი)`}
      </ChunkyButton>
    </div>
  );
};

export default ControllerPollResults;
