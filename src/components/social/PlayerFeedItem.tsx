import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, Clock, Play, Layers, Hourglass } from "lucide-react";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Button } from "@/components/ui/button";
import { PlayerInfo, CollectionItem } from "@/hooks/usePlayerFeedItems";
import { SamplePost } from "@/data/samplePosts";
import { useFriends } from "@/hooks/useFriends";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import purpleHeartIcon from "@/assets/icons/purple-heart.webp";
import bookmark3dIcon from "@/assets/icons/bookmark-3d.png";
import { formatDistanceToNow } from "date-fns";
import { ka, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlayerFeedItemProps {
  player: PlayerInfo;
  item: SamplePost | CollectionItem;
  itemType: 'trivia' | 'collection';
  onPlayTrivia?: (trivia: SamplePost) => void;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  isPlayed?: boolean;
}

// Get country flag emoji from country code
function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Helper to get gradient style
function getGradientProps(gradient: string) {
  if (gradient?.includes('gradient') || gradient?.includes('#') || gradient?.includes('rgb')) {
    return { style: { background: gradient }, className: '' };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient}` };
}

export function PlayerFeedItem({ 
  player, 
  item, 
  itemType, 
  onPlayTrivia, 
  onLike, 
  onSave, 
  isLiked = false, 
  isSaved = false,
  isPlayed = false 
}: PlayerFeedItemProps) {
  const navigate = useNavigate();
  const { sendFriendRequest, acceptFriendRequest } = useFriends();
  const { openProfile } = usePlayerProfile();
  const { language } = useLanguage();
  const [friendshipStatus, setFriendshipStatus] = useState(player.friendship_status);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayLimitModal, setShowPlayLimitModal] = useState(false);
  const { regenPlayAvailable, timeUntilNextPlay, useRegenPlay } = usePlayLimit();

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const success = await sendFriendRequest(player.user_id);
      if (success) {
        setFriendshipStatus('pending_sent');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading || !player.friendship_id) return;
    setIsLoading(true);
    
    try {
      const success = await acceptFriendRequest(player.friendship_id);
      if (success) {
        setFriendshipStatus('friends');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(item.id);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.(item.id);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayed) {
      // Already played - navigate directly
      if (itemType === 'trivia') {
        navigate(`/trivia/${item.id}`);
      } else {
        navigate(`/collection/${item.id}`);
      }
    } else {
      // Not played - show play limit / PRO modal
      setShowPlayLimitModal(true);
    }
  };

  const handleCardClick = () => {
    if (itemType === 'trivia') {
      navigate(`/trivia/${item.id}`);
    } else {
      navigate(`/collection/${item.id}`);
    }
  };

  const renderFriendButton = () => {
    switch (friendshipStatus) {
      case 'friends':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-green-600 border-green-200 bg-green-50 h-8 px-2"
            disabled
          >
            <UserCheck className="w-4 h-4" />
          </Button>
        );
      case 'pending_sent':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-muted-foreground h-8 px-2"
            disabled
          >
            <Clock className="w-4 h-4" />
          </Button>
        );
      case 'pending_received':
        return (
          <Button 
            variant="default" 
            size="sm" 
            className="gap-1.5 h-8 px-2"
            onClick={handleAcceptFriend}
            disabled={isLoading}
          >
            <UserCheck className="w-4 h-4" />
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-8 px-2"
            onClick={handleAddFriend}
            disabled={isLoading}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        );
    }
  };

  // Get item-specific data
  const isTrivia = itemType === 'trivia';
  const triviaItem = isTrivia ? (item as SamplePost) : null;
  const collectionItem = !isTrivia ? (item as CollectionItem) : null;

  const title = isTrivia ? triviaItem!.title : collectionItem!.title;
  const coverGradient = isTrivia ? triviaItem!.coverGradient : collectionItem!.cover_gradient;
  const coverImage = isTrivia ? triviaItem!.coverImage : collectionItem!.cover_image;
  const likesCount = isTrivia ? triviaItem!.likesCount : collectionItem!.likes_count;
  const savesCount = isTrivia ? triviaItem!.savesCount : collectionItem!.saves_count;
  const questionCount = isTrivia ? triviaItem!.questionCount : 0;

  const rawCreatedAt = isTrivia
    ? (triviaItem as any)?.createdAt
    : (collectionItem as any)?.created_at;

  const dateLocale = language === "ka" ? ka : enUS;
  const timeAgo = rawCreatedAt
    ? formatDistanceToNow(new Date(rawCreatedAt), { addSuffix: false, locale: dateLocale })
    : "";

  const gradientProps = getGradientProps(coverGradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)");

  return (
    <motion.div
      className="overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Player Header */}
      <div className="p-3 flex items-center justify-between bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-t-2xl border border-border/30">
        <div className="flex items-center gap-3">
          {/* Avatar - Clickable to open profile */}
          <div 
            onClick={() => openProfile(player.user_id)}
            className="cursor-pointer hover:scale-105 transition-transform active:scale-95"
          >
            <SafeAvatar 
              avatarUrl={player.avatar_url}
              fallback={player.nickname}
              className="w-10 h-10 border-2 border-border"
              fallbackClassName="bg-muted text-sm"
            />
          </div>
          
          {/* Name and Stats */}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground text-sm">{player.nickname}</h3>
              <span className="text-base">{getCountryFlag(player.country_code)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {isTrivia ? (
                  <Play className="w-3 h-3" />
                ) : (
                  <Layers className="w-3 h-3" />
                )}
                <span>{isTrivia ? "ტრივია" : "კოლექცია"}</span>
              </span>
              {timeAgo ? (
                <>
                  <span>•</span>
                  <span>{timeAgo}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        
        {/* Friend Button */}
        {renderFriendButton()}
      </div>
      
      {/* Content Card */}
      <div 
        className="rounded-xl overflow-hidden cursor-pointer"
        style={{ touchAction: 'manipulation' }}
        onClick={handleCardClick}
      >
        {/* Cover Section */}
        <div className="h-32 relative overflow-hidden">
          {coverImage ? (
            <>
              <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30" />
            </>
          ) : (
            <>
              <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
              <div className="absolute inset-0 bg-black/20" />
            </>
          )}
          
          {/* Centered Title */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg line-clamp-2">
              {title}
            </h4>
          </div>
          
           {/* Type badge removed: type is shown under avatar/name in header */}
          
          {/* Question Count Badge - top right (for trivia only) */}
          {isTrivia && questionCount > 0 && (
            <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white">
              {questionCount} კითხვა
            </div>
          )}
        </div>
        
        {/* Bottom Section with Stats and Actions */}
        <div className="p-3 bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-b-xl border border-t-0 border-border/30">
          <div className="flex items-center justify-between">
            {/* Stats - Like and Save */}
            <div className="flex items-center gap-6">
              {/* Like Button */}
              <button 
                onClick={handleLikeClick}
                className="flex items-center gap-1.5 transition-all"
              >
                <img 
                  src={purpleHeartIcon} 
                  alt="Like" 
                  className={`w-[26px] h-[26px] object-contain transition-all ${isLiked ? 'opacity-100' : 'opacity-60 grayscale'}`}
                />
                <span className={cn("text-[17px] font-medium", isLiked ? "text-foreground" : "text-muted-foreground")}>{likesCount || 0}</span>
              </button>
              
              {/* Save/Bookmark Button */}
              <button 
                onClick={handleSaveClick}
                className="flex items-center gap-1.5 transition-all"
              >
                <img 
                  src={bookmark3dIcon} 
                  alt="Save" 
                  className={`w-[26px] h-[26px] object-contain transition-all ${isSaved ? 'opacity-100' : 'opacity-60 grayscale'}`}
                />
                <span className={cn("text-[17px] font-medium", isSaved ? "text-foreground" : "text-muted-foreground")}>{savesCount || 0}</span>
              </button>
            </div>
            
            {/* Play Button - text pill when not played, icon circle when played */}
            {isPlayed ? (
              <button 
                onClick={handlePlayClick}
                className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center transition-colors hover:bg-purple-600"
              >
                <Play className="w-4 h-4 text-white fill-white" />
              </button>
            ) : (
              <button 
                onClick={handlePlayClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-background border-2 border-purple-500 rounded-full transition-colors hover:bg-purple-50 dark:hover:bg-purple-500/10"
              >
                <Hourglass className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-purple-500">ითამაშე</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <PlayLimitModal
        isOpen={showPlayLimitModal}
        onClose={() => setShowPlayLimitModal(false)}
        isGuest={false}
        regenPlayAvailable={regenPlayAvailable}
        timeUntilNextPlay={timeUntilNextPlay}
        onPlayWithRegen={async () => {
          const success = await useRegenPlay();
          if (success) {
            setShowPlayLimitModal(false);
            if (itemType === 'trivia') {
              navigate(`/trivia/${item.id}`);
            } else {
              navigate(`/collection/${item.id}`);
            }
          }
        }}
      />
    </motion.div>
  );
}
