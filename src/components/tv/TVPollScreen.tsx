import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Vote, Timer, Sparkles, Crown } from 'lucide-react';
import { useTVGame } from '@/contexts/TVGameContext';
import { useTVPoll, PollSuggestion } from '@/hooks/useTVPoll';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { SafeAvatarImage } from '@/components/shared/SafeAvatar';
import retroTvIcon from '@/assets/retro-tv-colored.png';


export const TVPollScreen: React.FC = () => {
  const { players, code, sessionId } = useTVGame();
  const {
    suggestions,
    pollPhase,
    pollStartTime,
    pollDuration,
  } = useTVPoll({
    sessionId,
    userId: null, // TV display doesn't have a user
    nickname: 'TV',
  });

  // Get active players
  const activePlayers = useMemo(() => {
    return players.filter(p => p.isActive !== false);
  }, [players]);

  const [timeRemaining, setTimeRemaining] = useState(pollDuration);

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

  const joinUrl = `${window.location.origin}/join/session/${sessionId}`;

  // Determine grid columns based on suggestion count
  const getGridCols = (count: number) => {
    if (count <= 2) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-4';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8 pb-4 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        {/* Logo - Top Left */}
        <div className="flex items-center gap-2">
          <span 
            className="text-2xl font-slackey text-white"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            MyTrivia
          </span>
          <span className="px-2 py-1 rounded-md text-xs font-bold text-white bg-red-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Timer (voting phase only) */}
        {pollPhase === 'voting' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl ${
              timeRemaining <= 10 ? 'bg-red-500/30 border-red-500' : 'bg-white/10 border-white/20'
            } border-2`}
          >
            <Timer className={`w-8 h-8 ${timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-purple-300'}`} />
            <span className={`text-4xl font-bold ${timeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
              {timeRemaining}
            </span>
          </motion.div>
        )}

        {/* Player count + TV icon - Top Right */}
        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl">
          <Users className="w-6 h-6 text-purple-300" />
          <span className="text-xl font-bold text-white">{players.length}</span>
          <img src={retroTvIcon} alt="TV რეჟიმი" className="w-10 h-10 object-contain" />
        </div>
      </motion.div>

      {/* Title section - below header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Vote className="w-8 h-8 text-purple-300" />
          <h1 className="text-3xl font-bold text-white">
            {pollPhase === 'suggest' ? 'რა ვითამაშოთ?' : 'ხმა მიეცით!'}
          </h1>
        </div>
        <p className="text-purple-300 text-lg ml-11">
          {pollPhase === 'voting' 
            ? 'აირჩიეთ რომელი კატეგორიები გსურთ ითამაშოთ'
            : 'შემოთავაზებული ვარიანტებიდან აირჩიე მაქსიმუმ 3 ვარიანტი'}
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-8">
        {/* Suggestions grid */}
        <div className="flex-1">
          {suggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <Sparkles className="w-20 h-20 text-purple-400 mb-6 animate-pulse" />
              <h2 className="text-2xl font-bold text-white mb-2">
                ველოდებით შემოთავაზებებს...
              </h2>
              <p className="text-purple-300 text-lg">
                აირჩიეთ მაქსიმუმ 3 შემოთავაზებული ვარიანტებიდან
              </p>
            </motion.div>
          ) : (
            <div className={`grid ${getGridCols(suggestions.filter(s => s.category_name && s.category_name.trim()).length)} gap-4 pt-4 pb-8 overflow-y-auto max-h-[calc(100vh-220px)]`}>
              <AnimatePresence mode="popLayout">
                {suggestions.filter(s => s.category_name && s.category_name.trim()).map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    rank={index + 1}
                    isLeader={index === 0 && pollPhase === 'voting'}
                    showVotes={pollPhase === 'voting'}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* QR Code sidebar + Active Players */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 flex flex-col items-center"
        >
          <div className="bg-white p-4 rounded-2xl mb-4">
            <QRCodeSVG value={joinUrl} size={180} level="H" />
          </div>
          <p className="text-purple-300 text-center text-sm mb-2">
            დაასკანერეთ სათამაშოდ
          </p>
          <div className="bg-white/10 px-4 py-2 rounded-xl mb-6">
            <span className="text-2xl font-mono font-bold text-white tracking-wider">
              {code}
            </span>
          </div>

          {/* Active Players List */}
          <div className="w-full bg-white/10 rounded-2xl p-4 border border-white/20 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-300" />
              <span className="text-white font-bold">მოთამაშეები ({activePlayers.length})</span>
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {activePlayers.map((player) => (
                <div 
                  key={player.id || player.nickname}
                  className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
                >
                  <SafeAvatarImage
                    avatarUrl={player.avatar_url}
                    fallback={player.nickname}
                    className="w-10 h-10 rounded-full object-cover"
                    containerClassName="w-10 h-10 rounded-full text-sm"
                  />
                  <span className="text-white text-lg font-medium truncate">{player.nickname}</span>
                </div>
              ))}
              {activePlayers.length === 0 && (
                <p className="text-purple-300 text-sm text-center py-4">ველოდებით მოთამაშეებს...</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-6"
      >
        <p className="text-purple-400 text-lg">
          {pollPhase === 'suggest' 
            ? '⏳ ველოდებით ჰოსტს ხმის მიცემის დასაწყებად...'
            : timeRemaining === 0 
              ? '✅ ხმის მიცემა დასრულდა! ჰოსტი ირჩევს რაუნდებს...'
              : '🗳️ ხმის მიცემა მიმდინარეობს!'}
        </p>
      </motion.div>
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: PollSuggestion;
  rank: number;
  isLeader: boolean;
  showVotes: boolean;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  rank,
  isLeader,
  showVotes,
}) => {
  const [previousVotes, setPreviousVotes] = useState(suggestion.vote_count);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate on vote change
  useEffect(() => {
    if (suggestion.vote_count > previousVotes) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
    setPreviousVotes(suggestion.vote_count);
  }, [suggestion.vote_count, previousVotes]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: isAnimating ? 1.05 : 1,
        transition: { type: 'spring', stiffness: 500, damping: 30 }
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative overflow-visible bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 transition-all ${
        isLeader 
          ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
          : 'border-white/20'
      }`}
    >
      {/* Leader crown */}
      {isLeader && (
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-4 -right-4"
        >
          <Crown className="w-10 h-10 text-yellow-500 fill-yellow-500" />
        </motion.div>
      )}

      {/* Rank badge */}
      {showVotes && (
        <div className={`absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          rank <= 3 
            ? 'bg-white text-purple-900'
            : 'bg-purple-500/50 text-white'
        }`}>
          {rank}
        </div>
      )}

      {/* Category icon/image */}
      <div className="flex justify-center mb-4">
        {suggestion.cover_image ? (
          <img 
            src={suggestion.cover_image} 
            alt={suggestion.category_name}
            className="w-20 h-20 rounded-xl object-cover"
          />
        ) : suggestion.icon_slug ? (
          <QuizCategoryIcon iconSlug={suggestion.icon_slug} size={80} className="w-20 h-20" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-purple-300" />
          </div>
        )}
      </div>

      {/* Category name */}
      <h3 className="text-xl font-bold text-white text-center mb-3 line-clamp-2">
        {suggestion.category_name}
      </h3>

      {/* Vote count */}
      {showVotes && (
        <motion.div
          animate={{ scale: isAnimating ? 1.2 : 1 }}
          className="flex items-center justify-center gap-2 bg-purple-500/30 rounded-xl py-2"
        >
          <Vote className="w-5 h-5 text-purple-300" />
          <span className="text-2xl font-bold text-white">
            {suggestion.vote_count}
          </span>
          <span className="text-purple-300 text-sm">ხმა</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TVPollScreen;
