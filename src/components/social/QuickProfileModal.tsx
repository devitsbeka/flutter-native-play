import { UserPlus, UserCheck, Clock, Users, Gamepad2, X } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Creator } from "@/hooks/useExploreCreators";
import { useFriends } from "@/hooks/useFriends";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface QuickProfileModalProps {
  creator: Creator | null;
  isOpen: boolean;
  onClose: () => void;
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

export function QuickProfileModal({ creator, isOpen, onClose }: QuickProfileModalProps) {
  const navigate = useNavigate();
  const { sendFriendRequest, acceptFriendRequest } = useFriends();
  const [friendshipStatus, setFriendshipStatus] = useState(creator?.friendship_status || 'none');
  const [isLoading, setIsLoading] = useState(false);

  if (!creator) return null;

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

  const handleViewFullProfile = () => {
    onClose();
    navigate(`/player/${creator.user_id}`);
  };

  const renderFriendButton = () => {
    switch (friendshipStatus) {
      case 'friends':
        return (
          <Button 
            variant="outline" 
            className="flex-1 gap-2 text-green-600 border-green-200 bg-green-50"
            disabled
          >
            <UserCheck className="w-4 h-4" />
            მეგობარი
          </Button>
        );
      case 'pending_sent':
        return (
          <Button 
            variant="outline" 
            className="flex-1 gap-2 text-muted-foreground"
            disabled
          >
            <Clock className="w-4 h-4" />
            გაგზავნილია
          </Button>
        );
      case 'pending_received':
        return (
          <Button 
            variant="default" 
            className="flex-1 gap-2"
            onClick={handleAcceptFriend}
            disabled={isLoading}
          >
            <UserCheck className="w-4 h-4" />
            მოთხოვნის მიღება
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={handleAddFriend}
            disabled={isLoading}
          >
            <UserPlus className="w-4 h-4" />
            მეგობრად დამატება
          </Button>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>{creator.nickname} - პროფილი</DialogTitle>
        </DialogHeader>
        
        {/* Close Button */}
        <DialogClose className="absolute right-4 top-4 rounded-full p-1.5 bg-muted hover:bg-muted/80 transition-colors">
          <X className="h-4 w-4" />
          <span className="sr-only">დახურვა</span>
        </DialogClose>
        
        {/* Profile Header */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-2xl font-bold">
              {creator.nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{creator.nickname}</h2>
              <span className="text-xl">{getCountryFlag(creator.country_code)}</span>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">ტრივიები</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{creator.trivia_count}</p>
          </div>
          <div className="bg-muted rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Gamepad2 className="w-4 h-4" />
              <span className="text-sm">თამაშები</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(creator.total_plays)}</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          {renderFriendButton()}
          <Button 
            variant="default"
            className="flex-1"
            onClick={handleViewFullProfile}
          >
            სრული პროფილი
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
