import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, Clock, Eye, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TriviaPortfolioCard } from "./TriviaPortfolioCard";
import { Creator } from "@/hooks/useExploreCreators";
import { SamplePost } from "@/data/samplePosts";
import { useFriends } from "@/hooks/useFriends";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
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

export function CreatorPortfolioCard({ creator, onPlayTrivia, onViewProfile, onLikeTrivia, onSaveTrivia, userLikes = [], userSaves = [] }: CreatorPortfolioCardProps) {
  const { sendFriendRequest, acceptFriendRequest } = useFriends();
  const { openProfile } = usePlayerProfile();
  const [friendshipStatus, setFriendshipStatus] = useState(creator.friendship_status);
  const [isLoading, setIsLoading] = useState(false);

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
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-green-600 border-green-200 bg-green-50"
            disabled
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">მეგობარი</span>
          </Button>
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
            <span className="hidden sm:inline">გაგზავნილია</span>
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
            <span className="hidden sm:inline">მიღება</span>
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
            <span className="hidden sm:inline">მეგობარი</span>
          </Button>
        );
    }
  };

  return (
    <motion.div
      className="md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm overflow-hidden"
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
            <Avatar className="w-12 h-12 border-2 border-border">
              <AvatarImage src={creator.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-lg">
                {creator.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Name and Stats */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{creator.nickname}</h3>
              <span className="text-lg">{getCountryFlag(creator.country_code)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {creator.trivia_count} ტრივია
              </span>
              <span>•</span>
              <span>{formatNumber(creator.total_plays)} თამაში</span>
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
            <span>პროფილი</span>
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
              className="w-full"
            />
          ))}
        </div>
        
        {/* Tablet & Desktop: Horizontal Carousel */}
        <div className="hidden md:block">
          <Carousel
            opts={{
              align: "start",
              dragFree: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {creator.trivias.map((trivia) => (
                <CarouselItem key={trivia.id} className="pl-3 basis-auto">
                  <TriviaPortfolioCard
                    trivia={trivia}
                    onPlay={onPlayTrivia}
                    onLike={onLikeTrivia}
                    onSave={onSaveTrivia}
                    isLiked={userLikes.includes(trivia.id)}
                    isSaved={userSaves.includes(trivia.id)}
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
