import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { useLanguage } from "@/contexts/LanguageContext";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";

// Shimmer skeleton component
function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: '#ECCCF2' }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}

interface FriendsStoriesBarProps {
  onAddFriendClick: () => void;
  onFriendClick: (friend: Friend) => void;
  onShowAllFriends?: () => void;
}

export function FriendsStoriesBar({ onAddFriendClick, onFriendClick, onShowAllFriends }: FriendsStoriesBarProps) {
  const { friends, loading } = useFriends();
  const { t } = useLanguage();
  const { openProfile } = usePlayerProfile();

  // Sort online friends first
  const sortedFriends = [...friends].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

  // Calculate skeleton count - show fewer when there are more friends
  const skeletonCount = Math.min(4, Math.max(0, 5 - sortedFriends.length));

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
            <ShimmerSkeleton className="w-16 h-16 rounded-full" />
            <ShimmerSkeleton className="w-12 h-3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 tracking-wide">მეგობრები</span>
        {onShowAllFriends && (
          <button
            onClick={onShowAllFriends}
            className="text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            ყველა
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-4 pt-2 pb-3 pr-4">
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
            {t('team.add')}
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
              <span className="text-sm text-slate-500">{t('team.noFriendsYet')}</span>
            </motion.div>
          ) : (
            sortedFriends.map((friend, index) => (
              <FriendStoryAvatar
                key={friend.id}
                friend={friend}
                index={index}
                onClick={() => onFriendClick(friend)}
                onProfileClick={openProfile}
              />
            ))
          )}
        </AnimatePresence>

        {/* Shimmer skeleton placeholders with fade-out */}
        {sortedFriends.length > 0 && skeletonCount > 0 && (
          <>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex flex-col items-center gap-2 flex-shrink-0"
                style={{ opacity: 0.6 - (index * 0.15) }}
              >
                <ShimmerSkeleton className="w-16 h-16 rounded-full" />
                <ShimmerSkeleton className="w-12 h-3 rounded" />
              </div>
            ))}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

interface FriendStoryAvatarProps {
  friend: Friend;
  index: number;
  onClick: () => void;
  onProfileClick: (userId: string) => void;
}

function FriendStoryAvatar({ friend, index, onClick, onProfileClick }: FriendStoryAvatarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.03 }}
      className="flex flex-col items-center gap-2 flex-shrink-0"
    >
      {/* Avatar with gradient ring */}
      <div 
        className="relative w-16 h-16 cursor-pointer hover:scale-105 transition-transform active:scale-95"
        onClick={() => onProfileClick(friend.friendId)}
      >
        {/* Gradient ring background */}
        <div 
          className="absolute inset-0 rounded-full p-[3px]"
          style={{
            background: friend.isOnline 
              ? "linear-gradient(135deg, #9333EA 0%, #EC4899 50%, #F97316 100%)"
              : "linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)",
          }}
        >
          {/* White inner ring */}
          <div className="w-full h-full rounded-full bg-white p-[2px]">
            {/* Avatar container - ensures perfect circle crop */}
            <div className="w-full h-full rounded-full overflow-hidden">
              <SmartAvatar
                avatarUrl={friend.avatarUrl}
                animatedAvatarUrl={friend.animatedAvatarUrl}
                fallback={friend.nickname}
                size="lg"
                className="w-full h-full object-cover"
                playOnHover={true}
              />
            </div>
          </div>
        </div>
        
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
      <button
        onClick={onClick}
        className="text-xs font-medium text-slate-700 truncate max-w-[64px] hover:text-primary transition-colors"
      >
        {friend.nickname}
      </button>
    </motion.div>
  );
}
