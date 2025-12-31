import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Gamepad2, Check, X, Users, MessageCircle, MoreVertical, UserMinus } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { useSound } from "@/contexts/SoundContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChunkyButton } from "@/components/ui/chunky-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FriendsListProps {
  onAddFriendClick: () => void;
  onQuickPlay: (friend: Friend) => void;
  onStartChat?: (friend: Friend) => void;
}

export function FriendsList({ onAddFriendClick, onQuickPlay, onStartChat }: FriendsListProps) {
  const { friends, pendingRequests, loading, acceptFriendRequest, declineFriendRequest, removeFriend } = useFriends();
  const { playSound, vibrate } = useSound();
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

  const handleAccept = async (id: string) => {
    const result = await acceptFriendRequest(id);
    if (result) {
      playSound("friend-accepted");
      vibrate(100);
    }
  };

  const handleDecline = async (id: string) => {
    const result = await declineFriendRequest(id);
    if (result) {
      playSound("button-click");
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;
    const result = await removeFriend(friendToRemove.id);
    if (result) {
      playSound("button-click");
    }
    setFriendToRemove(null);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/80">მეგობრები</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-40 h-48 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-300 mb-2">
            <Mail className="w-4 h-4" />
            <span className="text-sm font-medium">მომლოდინე მოთხოვნები ({pendingRequests.length})</span>
          </div>
          
          <AnimatePresence>
            {pendingRequests.map((request) => (
              <PendingRequestCard
                key={request.id}
                request={request}
                onAccept={() => handleAccept(request.id)}
                onDecline={() => handleDecline(request.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Friends List Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">მეგობრები</span>
        <motion.button
          onClick={onAddFriendClick}
          className="text-sm font-medium text-orange-400"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          + დამატება
        </motion.button>
      </div>

      {/* Friends Horizontal Scroll */}
      {friends.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 rounded-2xl bg-white/5 border border-white/10"
        >
          <Users className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60 text-sm mb-3">ჯერ მეგობრები არ გყავს</p>
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={onAddFriendClick}
            icon={<UserPlus className="w-4 h-4" />}
          >
            მეგობრის დამატება
          </ChunkyButton>
        </motion.div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <AnimatePresence>
            {/* Sort online friends first */}
            {[...friends].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map((friend, index) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                index={index}
                onQuickPlay={() => onQuickPlay(friend)}
                onChat={() => onStartChat?.(friend)}
                onRemove={() => setFriendToRemove(friend)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Remove Friend Confirmation Dialog */}
      <AlertDialog open={!!friendToRemove} onOpenChange={() => setFriendToRemove(null)}>
        <AlertDialogContent className="bg-gradient-to-b from-purple-900 to-purple-950 border-purple-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">
              მეგობრის წაშლა
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              დარწმუნებული ხარ, რომ გინდა <span className="text-white font-medium">{friendToRemove?.nickname}</span>-ის წაშლა მეგობრებიდან?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              გაუქმება
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFriend}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FriendCardProps {
  friend: Friend;
  index: number;
  onQuickPlay: () => void;
  onChat: () => void;
  onRemove: () => void;
}

function FriendCard({ friend, index, onQuickPlay, onChat, onRemove }: FriendCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`flex-shrink-0 w-40 flex flex-col items-center p-4 rounded-2xl backdrop-blur-sm ${
        friend.isOnline 
          ? "bg-white/15 border-2 border-green-500/30" 
          : "bg-white/10 border border-white/10"
      }`}
    >
      {/* Three dots menu - top right */}
      <div className="w-full flex justify-end mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="p-1 rounded-lg text-white/60 hover:text-white"
              whileTap={{ scale: 0.95 }}
            >
              <MoreVertical className="w-4 h-4" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-purple-900/95 border-purple-500/30 backdrop-blur-lg">
            <DropdownMenuItem 
              onClick={onRemove}
              className="text-red-400 focus:text-red-300 focus:bg-red-500/20 cursor-pointer"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              წაშლა
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Large Avatar */}
      <div className="relative mb-3">
        <Avatar className={`w-16 h-16 border-2 ${friend.isOnline ? "border-green-400/50" : "border-white/30"}`}>
          <AvatarImage src={friend.avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl font-bold">
            {friend.nickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator dot */}
        <motion.div 
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-purple-900 ${
            friend.isOnline ? "bg-green-400" : "bg-gray-400"
          }`}
          animate={friend.isOnline ? { 
            scale: [1, 1.2, 1],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Name and Flag */}
      <div className="text-center mb-3 w-full">
        <div className="flex items-center justify-center gap-1.5">
          <p className="font-bold text-white text-sm uppercase tracking-wide truncate max-w-[90px]">
            {friend.nickname}
          </p>
          {friend.countryCode && (
            <span className="text-sm">{getCountryFlag(friend.countryCode)}</span>
          )}
        </div>
      </div>

      {/* Action Buttons - side by side */}
      <div className="flex items-center gap-2 w-full">
        <motion.button
          onClick={onQuickPlay}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-bold transition-colors bg-orange-500 text-white"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>+ თამაში</span>
        </motion.button>

        <motion.button
          onClick={onChat}
          className="flex items-center justify-center px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ჩატი
        </motion.button>
      </div>
    </motion.div>
  );
}

interface PendingRequestCardProps {
  request: Friend;
  onAccept: () => void;
  onDecline: () => void;
}

function PendingRequestCard({ request, onAccept, onDecline }: PendingRequestCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30"
    >
      <Avatar className="w-12 h-12 border-2 border-amber-400/50">
        <AvatarImage src={request.avatarUrl || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold">
          {request.nickname.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{request.nickname}</p>
        <p className="text-xs text-amber-300">გთხოვს მეგობრობას</p>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          onClick={onAccept}
          className="p-2 rounded-xl bg-green-500/30 text-green-300 hover:bg-green-500/40"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Check className="w-5 h-5" />
        </motion.button>
        <motion.button
          onClick={onDecline}
          className="p-2 rounded-xl bg-red-500/30 text-red-300 hover:bg-red-500/40"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
