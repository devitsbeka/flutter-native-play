import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Friend, useFriends } from "@/hooks/useFriends";
import { useLanguage } from "@/contexts/LanguageContext";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useAuth } from "@/contexts/AuthContext";

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
// The app's own --primary (263 60% 59%) rather than slate. The strip sat on a
// near-white card when this was grey, where a purple tint read as a rendering
// artefact; it sits on the lavender scene now, and grey reads as dirt on it.
const PLACEHOLDER_PURPLE = '136, 88, 213';

/**
 * How solid each empty slot is, first to last.
 *
 * Written out rather than computed. The ramp used to be a wrapper opacity of
 * `0.48 - index * 0.12` over a fill that was itself 48% — two faint numbers
 * multiplied, so the first slot landed at 23% and the last at 11%, and the
 * strip looked empty rather than like room to grow.
 */
// Purple carries further than slate at the same alpha, so the first two come
// down 10 and 5 points; the last one was already faint enough to leave. The
// ramp still falls left to right, which is what makes the strip read as room
// to grow rather than three of something.
const SLOT_ALPHAS = [0.45, 0.29, 0.18];

function StaticPlaceholder({ className, alpha }: { className?: string; alpha: number }) {
  return (
    <div
      className={`${className}`}
      style={{ backgroundColor: `rgba(${PLACEHOLDER_PURPLE}, ${alpha})` }}
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

/**
 * The ring around a story avatar, and the dot on it.
 *
 * Shared by the friends and by the tile for yourself at the head of the reel,
 * so the two cannot drift apart — your own circle is the reader's landmark for
 * what an online player looks like, and it only works if it is the same
 * circle.
 */
const ONLINE_RING = "linear-gradient(135deg, #9333EA 0%, #EC4899 50%, #F97316 100%)";
const OFFLINE_RING = "linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)";

function StoryAvatarCircle({
  avatarUrl,
  animatedAvatarUrl,
  fallback,
  isOnline,
  onClick,
}: {
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  fallback: string;
  isOnline: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="relative w-16 h-16 cursor-pointer hover:scale-105 transition-transform active:scale-95"
      onClick={onClick}
    >
      {/* Gradient ring background */}
      <div
        className="absolute inset-0 rounded-full p-[3px]"
        style={{ background: isOnline ? ONLINE_RING : OFFLINE_RING }}
      >
        {/* White inner ring */}
        <div className="w-full h-full rounded-full bg-white p-[2px]">
          {/* Avatar container - ensures perfect circle crop */}
          <div className="w-full h-full rounded-full overflow-hidden">
            <SmartAvatar
              avatarUrl={avatarUrl}
              animatedAvatarUrl={animatedAvatarUrl}
              fallback={fallback}
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
          isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-400"
        }`}
      />
    </div>
  );
}

/**
 * You, at the head of the reel.
 *
 * Always drawn online: you are looking at the app. It opens the same
 * `PlayerProfileModal` every other avatar in the strip opens — which already
 * knows it is you, and leaves out the Challenge button and the
 * played-together record, neither of which means anything against yourself.
 */
function SelfStoryAvatar({
  nickname,
  avatarUrl,
  animatedAvatarUrl,
  label,
  onOpen,
}: {
  nickname: string;
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  label: string;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <StoryAvatarCircle
        avatarUrl={avatarUrl}
        animatedAvatarUrl={animatedAvatarUrl}
        fallback={nickname}
        isOnline
        onClick={onOpen}
      />
      <button
        onClick={onOpen}
        className="text-xs font-semibold text-slate-700 truncate max-w-[64px] hover:text-primary transition-colors"
      >
        {label}
      </button>
    </div>
  );
}

interface FriendsStoriesBarProps {
  onAddFriendClick: () => void;
  onFriendClick?: (friend: Friend) => void;
  onShowAllFriends?: () => void;
}

/** One screenful less a peek, so an arrow press keeps a landmark in view. */
const PAGE_FRACTION = 0.8;

/**
 * Which way this strip can still be scrolled.
 *
 * The strip has always been `overflow-x-auto`, and on a phone that is the
 * whole story — you swipe it. On a desktop it left the row unreachable: a
 * mouse wheel scrolls a page vertically, never an overflowing row sideways,
 * and `scrollbar-hide` means there is no bar to drag either. So a long friends
 * list simply stopped at the edge of the window with no way to reach the rest.
 *
 * The arrows this drives appear only on the side that has something left to
 * show, so a short list gets none.
 */
function useScrollEdges(ref: React.RefObject<HTMLDivElement>) {
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // A pixel of slack: fractional widths (zoom, devicePixelRatio) leave
    // scrollLeft a hair short of the end and an arrow stuck on forever.
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdges({
      left: el.scrollLeft > 1,
      right: el.scrollLeft < maxScroll - 1,
    });
  }, [ref]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    // Friends arrive after the first paint and the window resizes, both of
    // which change what is reachable without a scroll event.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [ref, measure]);

  return edges;
}

function ScrollArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  // md+ only: a touch screen swipes the strip and wants no chrome over it.
  // Centred on the avatar circles (8px of top padding + half of 64) rather
  // than on the row, so the name labels do not drag the arrows off-centre.
  // aria-hidden and out of the tab order on purpose — the avatars themselves
  // are focusable, and focusing one already scrolls it into view.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-hidden
      tabIndex={-1}
      className={`hidden md:flex absolute ${side === "left" ? "left-1" : "right-1"} top-[40px] -translate-y-1/2 z-10
        h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground
        shadow-md backdrop-blur transition hover:bg-background active:scale-95`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function FriendsStoriesBar({ onAddFriendClick, onFriendClick, onShowAllFriends }: FriendsStoriesBarProps) {
  const { friends, loading, refreshFriendsIfStale } = useFriends();
  const { t } = useLanguage();
  const { user, profile } = useAuth();

  /**
   * Re-read the list when you arrive on the page this reel is on.
   *
   * Someone who opens your invite link becomes your friend on THEIR device;
   * yours finds out through the realtime channel, and nothing else. Play a
   * game with them in the same session and the whole thing happens without
   * the app ever re-reading its friends: lobby, game, results, home — and
   * they are not in the reel, which is what "I played with them and they are
   * not in my friends" is from the outside.
   *
   * Staleness-guarded, so navigating between tabs does not turn every mount
   * into a query.
   */
  useEffect(() => {
    refreshFriendsIfStale();
  }, [refreshFriendsIfStale]);
  const { openProfile } = usePlayerProfile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(scrollRef);

  const page = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * PAGE_FRACTION, behavior: "smooth" });
  }, []);

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
    <div className="relative">
      {edges.left && <ScrollArrow side="left" onClick={() => page(-1)} />}
      {edges.right && <ScrollArrow side="right" onClick={() => page(1)} />}
      <div ref={scrollRef} className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
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

        {/* You, ahead of the friends but behind the add button: adding
            someone is the thing this strip is for, and it stays where the
            thumb already expects it. */}
        {user && (
          <SelfStoryAvatar
            nickname={profile?.nickname || t("game.you")}
            avatarUrl={profile?.avatar_url}
            animatedAvatarUrl={profile?.animated_avatar_url}
            label={t("game.you")}
            onOpen={() => openProfile(user.id)}
          />
        )}

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
      <StoryAvatarCircle
        avatarUrl={friend.avatarUrl}
        animatedAvatarUrl={friend.animatedAvatarUrl}
        fallback={friend.nickname}
        isOnline={!!friend.isOnline}
        onClick={() => onProfileClick(friend.friendId)}
      />


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
