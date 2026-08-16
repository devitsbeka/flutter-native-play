import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { useLanguage } from "@/contexts/LanguageContext";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";

/**
 * Static placeholder component (no shimmer).
 *
 * 15% darker than it was — rgb(236,204,242) taken to rgb(201,173,206), the
 * alpha left alone. The old fill was within a few points of the lavender it
 * sits on, so at 23% effective opacity the circles were all but invisible,
 * and raising the alpha barely moved them: measured against the strip's
 * background, +15 points of alpha changed the blend by about one value per
 * channel. The colour was the thing that was too light, so that is what
 * changed.
 */
// Slate, not the mauve this used to be — on a near-white strip a pale purple
// tint reads as a rendering artefact, and grey reads as an empty slot.
const PLACEHOLDER_GREY = '100, 116, 139';

/**
 * How solid each empty slot is, first to last.
 *
 * Written out rather than computed. The ramp used to be a wrapper opacity of
 * `0.48 - index * 0.12` over a fill that was itself 48% — two faint numbers
 * multiplied, so the first slot landed at 23% and the last at 11%, and the
 * strip looked empty rather than like room to grow.
 */
const SLOT_ALPHAS = [0.55, 0.34, 0.18];

function StaticPlaceholder({ className, alpha }: { className?: string; alpha: number }) {
  return (
    <div
      className={`${className}`}
      style={{ backgroundColor: `rgba(${PLACEHOLDER_GREY}, ${alpha})` }}
    />
  );
}

/**
 * A slot for a friend who isn't there yet.
 *
 * They fade to the right — the first is the strongest, each one after it
 * lighter — so the strip reads as room to grow. The empty strip used to put a
 * grey box saying "no friends yet" beside the add button, which announced the
 * absence instead of inviting anyone to fix it.
 */
function FriendSlotPlaceholder({ index }: { index: number }) {
  // The name bar under each circle is a shade lighter than its circle, so a
  // slot reads as one thing rather than two.
  const alpha = SLOT_ALPHAS[index] ?? SLOT_ALPHAS[SLOT_ALPHAS.length - 1];
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <StaticPlaceholder className="w-16 h-16 rounded-full" alpha={alpha} />
      <StaticPlaceholder className="w-12 h-3 rounded" alpha={alpha * 0.75} />
    </div>
  );
}

/** Add button plus three of these: four circles across an empty strip. */
const EMPTY_FRIEND_SLOTS = 3;

interface FriendsStoriesBarProps {
  onAddFriendClick: () => void;
  onFriendClick?: (friend: Friend) => void;
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
            {/* The loading strip is uniform: it stands for friends that are
                about to arrive, not for room to add more. */}
            <StaticPlaceholder className="w-16 h-16 rounded-full" alpha={0.3} />
            <StaticPlaceholder className="w-12 h-3 rounded" alpha={0.22} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
      <div className="flex gap-4 pt-2 pb-3 pr-4">
        {/* Add Friend Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAddFriendClick();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAddFriendClick();
          }}
          className="flex flex-col items-center gap-2 flex-shrink-0 active:scale-95 transition-transform"
          style={{ touchAction: 'manipulation' }}
        >
          <div className="relative w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-dashed border-purple-400 flex items-center justify-center">
            <Plus className="w-6 h-6 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-slate-600 truncate max-w-[64px]">
            {t('team.add')}
          </span>
        </button>

        {/* Friends */}
        <AnimatePresence>
          {sortedFriends.length === 0 ? (
            Array.from({ length: EMPTY_FRIEND_SLOTS }).map((_, index) => (
              <FriendSlotPlaceholder key={`empty-${index}`} index={index} />
            ))
          ) : (
            sortedFriends.map((friend, index) => (
              <FriendStoryAvatar
                key={friend.id}
                friend={friend}
                index={index}
                onClick={() =>
                  onFriendClick ? onFriendClick(friend) : openProfile(friend.friendId)
                }
                onProfileClick={openProfile}
              />
            ))
          )}
        </AnimatePresence>

        {/* Static placeholder slots with fade-out */}
        {sortedFriends.length > 0 &&
          Array.from({ length: skeletonCount }).map((_, index) => (
            <FriendSlotPlaceholder key={`skeleton-${index}`} index={index} />
          ))}
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
          className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
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
