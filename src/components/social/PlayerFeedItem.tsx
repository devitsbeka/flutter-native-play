import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, Clock, Users, Heart, Bookmark, Play, Layers } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlayerInfo, CollectionItem } from "@/hooks/usePlayerFeedItems";
import { SamplePost } from "@/data/samplePosts";
import { useFriends } from "@/hooks/useFriends";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PlayerFeedItemProps {
  player: PlayerInfo;
  item: SamplePost | CollectionItem;
  itemType: 'trivia' | 'collection';
  onPlayTrivia?: (trivia: SamplePost) => void;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
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

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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
  isSaved = false 
}: PlayerFeedItemProps) {
  const navigate = useNavigate();
  const { sendFriendRequest, acceptFriendRequest } = useFriends();
  const { openProfile } = usePlayerProfile();
  const [friendshipStatus, setFriendshipStatus] = useState(player.friendship_status);
  const [isLoading, setIsLoading] = useState(false);

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
    if (itemType === 'trivia') {
      navigate(`/trivia/${item.id}`);
    } else {
      navigate(`/collection/${item.id}`);
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
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={player.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-sm">
                {player.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Name and Stats */}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground text-sm">{player.nickname}</h3>
              <span className="text-base">{getCountryFlag(player.country_code)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {player.trivia_count} ტრივია
              </span>
              <span>•</span>
              <span>{formatNumber(player.total_plays)} თამაში</span>
            </div>
          </div>
        </div>
        
        {/* Friend Button */}
        {renderFriendButton()}
      </div>
      
      {/* Content Card */}
      <div 
        className="rounded-xl overflow-hidden cursor-pointer"
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
          
          {/* Type Badge - top left */}
          {!isTrivia && (
            <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white flex items-center gap-1">
              <Layers className="w-3 h-3" />
              კოლექცია
            </div>
          )}
          
          {/* Question Count Badge - bottom right (for trivia only) */}
          {isTrivia && questionCount > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
              {questionCount} კითხვა
            </div>
          )}
        </div>
        
        {/* Bottom Section with Stats and Actions */}
        <div className="p-3 bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-b-xl border border-t-0 border-border/30">
          <div className="flex items-center justify-between">
            {/* Stats - Like and Save */}
            <div className="flex items-center gap-3">
              {/* Like Button */}
              <button 
                onClick={handleLikeClick}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                )}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                <span className="text-sm font-medium">{likesCount || 0}</span>
              </button>
              
              {/* Save/Bookmark Button */}
              <button 
                onClick={handleSaveClick}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                <span className="text-sm font-medium">{savesCount || 0}</span>
              </button>
            </div>
            
            {/* Play Button */}
            <button 
              onClick={handlePlayClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>ითამაშე</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
