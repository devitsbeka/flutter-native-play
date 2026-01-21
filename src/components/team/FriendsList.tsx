import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Check, X, Users, MessageCircle, MoreVertical, UserMinus } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { useSound } from "@/contexts/SoundContext";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 tracking-wide">მეგობრები</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-40 h-48 animate-pulse rounded-2xl bg-slate-200" />
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
          <div className="flex items-center gap-2 text-amber-600 mb-2">
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
        <span className="text-sm font-bold text-slate-800 tracking-wide">მეგობრები</span>
        <motion.button
          onClick={onAddFriendClick}
          className="text-sm font-semibold text-orange-600 px-3 py-1 rounded-full bg-orange-100 hover:bg-orange-200 transition-colors"
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
          className="text-center py-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200"
        >
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-3">ჯერ მეგობრები არ გყავს</p>
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
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
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
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800 font-display">
              მეგობრის წაშლა
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              დარწმუნებული ხარ, რომ გინდა <span className="text-slate-800 font-medium">{friendToRemove?.nickname}</span>-ის წაშლა მეგობრებიდან?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200">
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
      onClick={onChat}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onChat();
      }}
      className="flex-shrink-0 w-56 p-4 rounded-2xl bg-gradient-to-br from-white via-white to-purple-50 shadow-xl shadow-purple-500/20 border-2 border-purple-200/60 relative overflow-hidden cursor-pointer"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-xl" />
      
      {/* Row with avatar left, content right */}
      <div className="flex gap-3 relative z-10">
        {/* Avatar with purple ring and online dot */}
        <div className="relative flex-shrink-0">
          <SmartAvatar
            avatarUrl={friend.avatarUrl}
            animatedAvatarUrl={friend.animatedAvatarUrl}
            fallback={friend.nickname}
            size="lg"
            className="ring-[3px] ring-purple-400 shadow-lg shadow-purple-400/30"
            showSparkle={true}
            playOnHover={true}
            onlineStatus={friend.isOnline}
          />
        </div>
        
        {/* Name, flag, country */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-800 text-sm uppercase truncate">
              {friend.nickname}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-purple-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-purple-900/95 border-purple-500/30 backdrop-blur-lg">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="text-red-400 focus:text-red-300 focus:bg-red-500/20 cursor-pointer"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  წაშლა
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {friend.countryCode && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
              <span>{getCountryFlag(friend.countryCode)}</span>
              <span className="font-medium">{friend.countryCode.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Buttons row at bottom */}
      <div className="flex gap-2 mt-4 relative z-10">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onQuickPlay();
          }}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/40"
          whileHover={{ scale: 1.02, boxShadow: "0 10px 20px -5px rgba(249, 115, 22, 0.5)" }}
          whileTap={{ scale: 0.98 }}
        >
          + თამაში
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onChat();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 text-sm font-semibold border-2 border-gray-200 shadow-sm"
          whileHover={{ scale: 1.02, backgroundColor: "#f3f4f6" }}
          whileTap={{ scale: 0.98 }}
        >
          <MessageCircle className="w-4 h-4" />
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
      className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 backdrop-blur-sm border border-amber-200"
    >
      <Avatar className="w-12 h-12 border-2 border-amber-300">
        <AvatarImage src={request.avatarUrl || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold">
          {request.nickname.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{request.nickname}</p>
        <p className="text-xs text-amber-600">გთხოვს მეგობრობას</p>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          onClick={onAccept}
          className="p-2 rounded-xl bg-green-100 text-green-600 hover:bg-green-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Check className="w-5 h-5" />
        </motion.button>
        <motion.button
          onClick={onDecline}
          className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200"
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
