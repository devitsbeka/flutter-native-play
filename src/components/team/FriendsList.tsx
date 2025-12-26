import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Gamepad2, Trash2, Check, X, Users } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface FriendsListProps {
  onAddFriendClick: () => void;
  onInviteFriend: (friendId: string) => void;
  roomCode?: string;
}

export function FriendsList({ onAddFriendClick, onInviteFriend, roomCode }: FriendsListProps) {
  const { friends, pendingRequests, loading, acceptFriendRequest, declineFriendRequest } = useFriends();

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
                onAccept={() => acceptFriendRequest(request.id)}
                onDecline={() => declineFriendRequest(request.id)}
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
            {friends.map((friend) => (
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
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-sm"
    >
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-white/30">
          <AvatarImage src={friend.avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
            {friend.nickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {friend.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white/30" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{friend.nickname}</p>
        {friend.countryCode && (
          <p className="text-sm text-white/60">
            {getCountryFlag(friend.countryCode)}
          </p>
        )}
      </div>

      {showInvite && (
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
