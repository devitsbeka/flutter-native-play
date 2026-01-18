import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, Clock, Eye, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TriviaPortfolioCard } from "./TriviaPortfolioCard";
import { Creator } from "@/hooks/useExploreCreators";
import { SamplePost } from "@/data/samplePosts";
import { useFriends } from "@/hooks/useFriends";
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

export function CreatorPortfolioCard({ creator, onPlayTrivia, onViewProfile }: CreatorPortfolioCardProps) {
  const { sendFriendRequest, acceptFriendRequest } = useFriends();
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
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Creator Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="w-12 h-12 border-2 border-border">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-lg">
              {creator.nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
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
            className="gap-1.5"
            onClick={() => onViewProfile(creator)}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">პროფილი</span>
          </Button>
        </div>
      </div>
      
      {/* Trivia Carousel */}
      <div className="px-4 pb-4">
        <Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent allowOverflow className="-ml-3">
            {creator.trivias.map((trivia) => (
              <CarouselItem key={trivia.id} className="pl-3 basis-auto">
                <TriviaPortfolioCard
                  trivia={trivia}
                  onPlay={onPlayTrivia}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </motion.div>
  );
}
