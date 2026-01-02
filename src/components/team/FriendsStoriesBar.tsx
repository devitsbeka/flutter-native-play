import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface FriendsStoriesBarProps {
  onAddFriendClick: () => void;
  onFriendClick: (friend: Friend) => void;
}

export function FriendsStoriesBar({ onAddFriendClick, onFriendClick }: FriendsStoriesBarProps) {
  const { friends, loading } = useFriends();

  // Sort online friends first
  const sortedFriends = [...friends].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-16 h-16 rounded-full animate-pulse bg-slate-200" />
            <div className="w-12 h-3 rounded animate-pulse bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full -mx-4 px-4">
      <div className="flex gap-4 pb-3">
        {/* Add Friend Button */}
        <motion.button
          onClick={onAddFriendClick}
          className="flex flex-col items-center gap-2 flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-dashed border-purple-400 flex items-center justify-center">
            <Plus className="w-6 h-6 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-slate-600 truncate max-w-[64px]">
            დამატება
          </span>
        </motion.button>

        {/* Friends */}
        <AnimatePresence>
          {sortedFriends.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100"
            >
              <Users className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-500">ჯერ მეგობრები არ გყავს</span>
            </motion.div>
          ) : (
            sortedFriends.map((friend, index) => (
              <FriendStoryAvatar
                key={friend.id}
                friend={friend}
                index={index}
                onClick={() => onFriendClick(friend)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
}

interface FriendStoryAvatarProps {
  friend: Friend;
  index: number;
  onClick: () => void;
}

function FriendStoryAvatar({ friend, index, onClick }: FriendStoryAvatarProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 flex-shrink-0"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Avatar with gradient ring */}
      <div className="relative">
        {/* Gradient ring */}
        <div 
          className="absolute -inset-1 rounded-full"
          style={{
            background: friend.isOnline 
              ? "linear-gradient(135deg, #9333EA 0%, #EC4899 50%, #F97316 100%)"
              : "linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)",
            padding: 3,
          }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </div>
        
        {/* Avatar */}
        <SmartAvatar
          avatarUrl={friend.avatarUrl}
          animatedAvatarUrl={friend.animatedAvatarUrl}
          fallback={friend.nickname}
          size="lg"
          className="relative z-10 w-14 h-14"
          playOnHover={true}
        />
        
        {/* Online indicator dot */}
        <div 
          className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white z-20 ${
            friend.isOnline 
              ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" 
              : "bg-slate-400"
          }`}
        />
      </div>
      
      {/* Name */}
      <span className="text-xs font-medium text-slate-700 truncate max-w-[64px]">
        {friend.nickname}
      </span>
    </motion.button>
  );
}
