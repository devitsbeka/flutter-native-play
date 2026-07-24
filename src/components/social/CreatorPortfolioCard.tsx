import { useState, memo } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, Clock, Eye, Play } from "lucide-react";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Button } from "@/components/ui/button";
import { TriviaPortfolioCard } from "./TriviaPortfolioCard";
import { Creator } from "@/hooks/useExploreCreators";
import { SamplePost } from "@/data/samplePosts";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { formatDistanceToNow } from "date-fns";
import { ka, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselPrevious,
  CarouselNext 
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface CreatorPortfolioCardProps {
  creator: Creator;
  onPlayTrivia: (trivia: SamplePost) => void;
  onViewProfile: (creator: Creator) => void;
  onLikeTrivia?: (trivia: SamplePost) => void;
  onSaveTrivia?: (trivia: SamplePost) => void;
  userLikes?: string[];
  userSaves?: string[];
  userPlays?: string[];
  // Hoisted from per-card useFriends() to the feed parent
  sendFriendRequest: (friendId: string) => Promise<boolean>;
  acceptFriendRequest: (friendshipId: string) => Promise<boolean>;
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

function CreatorPortfolioCardComponent({ creator, onPlayTrivia, onViewProfile, onLikeTrivia, onSaveTrivia, userLikes = [], userSaves = [], userPlays = [], sendFriendRequest, acceptFriendRequest }: CreatorPortfolioCardProps) {
  const { openProfile } = usePlayerProfile();
  const { language, t } = useLanguage();
  const [friendshipStatus, setFriendshipStatus] = useState(creator.friendship_status);
  const [isLoading, setIsLoading] = useState(false);

  const newestTriviaCreatedAt = creator.trivias?.[0]?.createdAt;
  const dateLocale = language === "ka" ? ka : enUS;
  const timeAgo = newestTriviaCreatedAt
    ? formatDistanceToNow(new Date(newestTriviaCreatedAt), { addSuffix: false, locale: dateLocale })
    : "";

  const handleAddFriend = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const success = await sendFriendRequest(creator.user_id);
      if (success) {
        setFriendshipStatus('pending_sent');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (isLoading || !creator.friendship_id) return;
    setIsLoading(true);
    
    try {
      const success = await acceptFriendRequest(creator.friendship_id);
      if (success) {
        setFriendshipStatus('friends');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderFriendButton = () => {
    switch (friendshipStatus) {
      case 'friends':
        return (
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
        );
      case 'pending_sent':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-muted-foreground"
            disabled
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">{t("extra.requestSentShort")}</span>
          </Button>
        );
      case 'pending_received':
        return (
          <Button 
            variant="default" 
            size="sm" 
            className="gap-1.5"
            onClick={handleAcceptFriend}
            disabled={isLoading}
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">{t("extra.acceptRequestBtn")}</span>
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={handleAddFriend}
            disabled={isLoading}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("extra.friendBtnLabel")}</span>
          </Button>
        );
    }
  };

  return (
    <motion.div
      className="overflow-visible"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '260px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Creator Header */}
      <div className="px-0 py-4 md:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar - Clickable to open profile */}
          <div 
            onClick={() => openProfile(creator.user_id)}
            className="cursor-pointer hover:scale-105 transition-transform active:scale-95"
          >
            <SafeAvatar 
              avatarUrl={creator.avatar_url}
              fallback={creator.nickname}
              className="w-12 h-12 border-2 border-border"
              fallbackClassName="bg-muted text-lg"
            />
          </div>
          
          {/* Name and Stats */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{creator.nickname}</h3>
              <span className="text-lg">{getCountryFlag(creator.country_code)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Play className="w-3.5 h-3.5" />
                <span>{t("extra.triviaLabel")}</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {renderFriendButton()}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 hidden md:flex"
            onClick={() => onViewProfile(creator)}
          >
            <Eye className="w-4 h-4" />
            <span>{t("extra.profileBtnLabel")}</span>
          </Button>
        </div>
      </div>
      
      {/* Trivia Display - List on mobile, Carousel on tablet+ */}
      <div className="px-0 pb-4 md:px-4">
        {/* Mobile: Vertical List */}
        <div className="flex flex-col gap-3 md:hidden">
          {creator.trivias.map((trivia) => (
            <TriviaPortfolioCard
              key={trivia.id}
              trivia={trivia}
              onPlay={onPlayTrivia}
              onLike={onLikeTrivia}
              onSave={onSaveTrivia}
              isLiked={userLikes.includes(trivia.id)}
              isSaved={userSaves.includes(trivia.id)}
              isPlayed={userPlays.includes(trivia.id)}
              className="w-full"
            />
          ))}
        </div>
        
        {/* Tablet & Desktop: Horizontal Carousel */}
        <div className="hidden md:block overflow-visible w-full max-w-full py-3">
          <Carousel
            opts={{
              align: "start",
              dragFree: true,
              containScroll: "trimSnaps",
            }}
            className="w-full overflow-visible"
          >
            <CarouselContent className="-ml-3 overflow-visible">
              {creator.trivias.map((trivia) => (
                <CarouselItem key={trivia.id} className="pl-3 basis-auto py-2">
                  <TriviaPortfolioCard
                    trivia={trivia}
                    onPlay={onPlayTrivia}
                    onLike={onLikeTrivia}
                    onSave={onSaveTrivia}
                    isLiked={userLikes.includes(trivia.id)}
                    isSaved={userSaves.includes(trivia.id)}
                    isPlayed={userPlays.includes(trivia.id)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </motion.div>
  );
}

export const CreatorPortfolioCard = memo(CreatorPortfolioCardComponent);
