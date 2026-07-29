import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
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
    rankedSuggestions,
    pollPhase,
    pollStartTime,
    pollDuration,
  } = useTVPoll({
    sessionId,
    userId: null, // TV display doesn't have a user
    nickname: 'TV',
  });
  const { t } = useLanguage();

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
  // The leading suggestion, from the vote-ordered list. Deliberately no crown
  // while everything is on zero, and none on a tie for first - a crown that
  // hops between tied cards is the jumpiness this change removes.
  const leaderId = (() => {
    const top = rankedSuggestions?.[0];
    if (!top || top.vote_count <= 0) return null;
    const tied = rankedSuggestions.filter(s => s.vote_count === top.vote_count).length > 1;
    return tied ? null : top.id;
  })();

  const getGridCols = () => {
    return 'grid-cols-4'; // Always 4 columns for TV
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 pb-3 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-3"
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

        {/* QR Code - Top Right */}
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={joinUrl} size={56} level="H" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-purple-300 text-xs">{t("extra.tvCode")}</span>
            <span className="text-lg font-mono font-bold text-white">{code}</span>
          </div>
        </div>
      </motion.div>

      {/* Title section - below header */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <img src={retroTvIcon} alt="TV" className="w-7 h-7 object-contain" />
          <h1 className="text-2xl font-bold text-white">
            {pollPhase === 'suggest' ? t("extra.tvWhatShallWePlay") : t("extra.tvVote")}
          </h1>
        </div>
        <p className="text-purple-300 text-sm ml-8">
          {pollPhase === 'voting' 
            ? t("extra.tvChooseCategories")
            : t("extra.tvChooseMax3")}
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
                {t("extra.tvWaitingSuggestions")}
              </h2>
              <p className="text-purple-300 text-lg">
                {t("extra.tvChooseMax3Suggested")}
              </p>
            </motion.div>
          ) : (
            <div className={`grid ${getGridCols()} gap-3 auto-rows-fr`}>
            <AnimatePresence mode="sync">
                {suggestions.filter(s => s.category_name && s.category_name.trim()).map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    // Position is the FROZEN suggestion order, so the badge is a
                    // stable label rather than a live placing. The crown still
                    // follows the actual leader, which now has to be looked up
                    // rather than assumed to be first.
                    rank={index + 1}
                    isLeader={pollPhase === 'voting' && leaderId === suggestion.id}
                    showVotes={pollPhase === 'voting'}
                    hasVotes={suggestion.vote_count > 0}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Active Players List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-56 flex flex-col"
        >
          <div className="w-full bg-white/10 rounded-xl p-3 border border-white/20 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-300" />
              <span className="text-white font-bold text-sm">{t("extra.tvPlayersCount", { n: activePlayers.length })}</span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
              {activePlayers.map((player) => (
                <div 
                  key={player.id || player.nickname}
                  className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1.5"
                >
                  <SafeAvatarImage
                    avatarUrl={player.avatar_url}
                    fallback={player.nickname}
                    className="w-7 h-7 rounded-full object-cover"
                    containerClassName="w-7 h-7 rounded-full text-xs"
                  />
                  <span className="text-white text-sm font-medium truncate">{player.nickname}</span>
                </div>
              ))}
              {activePlayers.length === 0 && (
                <p className="text-purple-300 text-xs text-center py-2">{t("extra.tvWaitingPlayersEllipsis")}</p>
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
        className="text-center mt-3"
      >
        <p className="text-purple-400 text-sm">
          {pollPhase === 'suggest' 
            ? `⏳ ${t("extra.tvWaitingHostVoting")}`
            : timeRemaining === 0 
              ? `✅ ${t("extra.tvVotingComplete")}`
              : `🗳️ ${t("extra.tvVotingInProgress")}`}
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
  hasVotes?: boolean;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  rank,
  isLeader,
  showVotes,
  hasVotes,
}) => {
  const { t } = useLanguage();
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
      layoutId={`tv-suggestion-${suggestion.id}`}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: isAnimating ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { type: 'spring', stiffness: 350, damping: 40, mass: 1.2 },
        scale: { duration: 0.2 },
        opacity: { duration: 0.2 },
      }}
      className={`relative overflow-visible bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 transition-colors duration-300 ${
        hasVotes && showVotes
          ? 'border-green-500 shadow-lg shadow-green-500/20'
          : isLeader 
            ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
            : 'border-white/20'
      }`}
    >
      {/* Leader crown. -right-4 pushed it 16px past the card into a 12px grid
          gap, landing it under the NEXT card's rank badge (z-10) - the leader's
          crown sat half-covered by a "2". Keep it inside the card's own width,
          and above every sibling. */}
      {isLeader && (
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-4 right-0 z-30"
        >
          <Crown className="w-10 h-10 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
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
      <div className="flex justify-center mb-2">
        {suggestion.cover_image ? (
          <img 
            src={suggestion.cover_image} 
            alt={suggestion.category_name}
            className="w-14 h-14 rounded-lg object-cover"
          />
        ) : suggestion.icon_slug ? (
          <QuizCategoryIcon iconSlug={suggestion.icon_slug} size={56} className="w-14 h-14" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-purple-300" />
          </div>
        )}
      </div>

      {/* Category name */}
      <h3 className="text-base font-bold text-white text-center mb-2 line-clamp-1">
        {suggestion.category_name}
      </h3>

      {/* Vote count */}
      {showVotes && (
        <motion.div
          animate={{ scale: isAnimating ? 1.2 : 1 }}
          className="flex items-center justify-center gap-1.5 bg-purple-500/30 rounded-lg py-1.5"
        >
          <Vote className="w-4 h-4 text-purple-300" />
          <span className="text-lg font-bold text-white">
            {suggestion.vote_count}
          </span>
          <span className="text-purple-300 text-xs">{t("extra.tvVoteLabel")}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TVPollScreen;
