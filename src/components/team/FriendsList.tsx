import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Gamepad2, Check, X, Users } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { useSound } from "@/contexts/SoundContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface FriendsListProps {
  onAddFriendClick: () => void;
  onInviteFriend: (friendId: string) => void;
  roomCode?: string;
}

export function FriendsList({ onAddFriendClick, onInviteFriend, roomCode }: FriendsListProps) {
  const { friends, pendingRequests, loading, acceptFriendRequest, declineFriendRequest } = useFriends();
  const { playSound, vibrate } = useSound();

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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white/10 h-20" />
        ))}
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

      {/* Friends List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white/80">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">მეგობრები ({friends.length})</span>
            {friends.some(f => f.isOnline) && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs">
                {friends.filter(f => f.isOnline).length} ონლაინ
              </span>
            )}
          </div>
          
          <motion.button
            onClick={onAddFriendClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <UserPlus className="w-3 h-3" />
            დამატება
          </motion.button>
        </div>

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
          <AnimatePresence>
            {/* Sort online friends first */}
            {[...friends].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onInvite={() => onInviteFriend(friend.friendId)}
                showInvite={!!roomCode}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

interface FriendCardProps {
  friend: Friend;
  onInvite: () => void;
  showInvite: boolean;
}

function FriendCard({ friend, onInvite, showInvite }: FriendCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`flex items-center gap-3 p-3 rounded-2xl backdrop-blur-sm transition-colors ${
        friend.isOnline 
          ? "bg-white/15 border border-green-500/20" 
          : "bg-white/10"
      }`}
    >
      <div className="relative">
        <Avatar className={`w-12 h-12 border-2 ${friend.isOnline ? "border-green-400/50" : "border-white/30"}`}>
          <AvatarImage src={friend.avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
            {friend.nickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator dot with pulse animation */}
        <motion.div 
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white/30 ${
            friend.isOnline ? "bg-green-400" : "bg-gray-400"
          }`}
          animate={friend.isOnline ? { 
            scale: [1, 1.2, 1],
            boxShadow: ["0 0 0 0 rgba(74, 222, 128, 0.4)", "0 0 0 4px rgba(74, 222, 128, 0)", "0 0 0 0 rgba(74, 222, 128, 0.4)"]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-white truncate">{friend.nickname}</p>
          {friend.countryCode && (
            <span className="text-sm">{getCountryFlag(friend.countryCode)}</span>
          )}
        </div>
        <p className={`text-xs ${friend.isOnline ? "text-green-300" : "text-white/50"}`}>
          {friend.isOnline ? "ონლაინ" : "ოფლაინ"}
        </p>
      </div>

      {showInvite && friend.isOnline && (
        <motion.button
          onClick={onInvite}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Gamepad2 className="w-4 h-4" />
          მოწვევა
        </motion.button>
      )}
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
