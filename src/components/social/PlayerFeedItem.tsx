import { useState, useMemo, lazy, memo, Suspense } from "react";

import { UserPlus, UserCheck, Clock, Play, Layers, Hourglass, Pencil, MoreVertical } from "lucide-react";
import { ReportBlockSheet } from "@/components/social/ReportBlockSheet";
import { useAuth } from "@/hooks/useAuth";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Button } from "@/components/ui/button";
import { PlayerInfo, CollectionItem } from "@/hooks/usePlayerFeedItems";
import { SamplePost } from "@/data/samplePosts";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import purpleHeartIcon from "@/assets/icons/purple-heart.webp";
import bookmark3dIcon from "@/assets/icons/bookmark-3d.webp";
import { formatDistanceToNow } from "date-fns";
import { ka, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { CATEGORY_VIDEOS, CATEGORY_IMAGES, subjectToCategoryKey } from "@/config/videoConfig";

// Lazy load EditQuizModal for admin editing
const EditQuizModal = lazy(() =>
  import("@/components/social/EditQuizModal").then(m => ({ default: m.EditQuizModal }))
);

interface PlayerFeedItemProps {
  player: PlayerInfo;
  item: SamplePost | CollectionItem;
  itemType: 'trivia' | 'collection';
  onPlayTrivia?: (trivia: SamplePost) => void;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  isPlayed?: boolean;
  // Hoisted from per-card hooks to the feed parent (see ExplorePortfolioFeed)
  isAdmin: boolean;
  isVip: boolean;
  vipLoading: boolean;
  regenPlayAvailable: boolean;
  timeUntilNextPlay: string | null;
  useRegenPlay: () => Promise<boolean>;
  sendFriendRequest: (friendId: string) => Promise<boolean>;
  acceptFriendRequest: (friendshipId: string) => Promise<boolean>;
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

// Helper to get gradient style
function getGradientProps(gradient: string) {
  if (gradient?.includes('gradient') || gradient?.includes('#') || gradient?.includes('rgb')) {
    return { style: { background: gradient }, className: '' };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient}` };
}

function PlayerFeedItemComponent({
  player,
  item,
  itemType,
  onPlayTrivia,
  onLike,
  onSave,
  isLiked = false,
  isSaved = false,
  isPlayed = false,
  isAdmin,
  isVip,
  vipLoading,
  regenPlayAvailable,
  timeUntilNextPlay,
  useRegenPlay,
  sendFriendRequest,
  acceptFriendRequest,
}: PlayerFeedItemProps) {
  const navigate = useNavigate();
  const { openProfile } = usePlayerProfile();
  const { language, t } = useLanguage();
  const [friendshipStatus, setFriendshipStatus] = useState(player.friendship_status);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayLimitModal, setShowPlayLimitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const success = await sendFriendRequest(player.user_id);
      if (success) {
        setFriendshipStatus('pending_sent');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading || !player.friendship_id) return;
    setIsLoading(true);
    
    try {
      const success = await acceptFriendRequest(player.friendship_id);
      if (success) {
        setFriendshipStatus('friends');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(item.id);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.(item.id);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayed || isVip || vipLoading) {
      // Already played, PRO user, or VIP status loading - navigate directly
      if (itemType === 'trivia') {
        navigate(`/trivia/${item.id}`);
      } else {
        navigate(`/collection/${item.id}`);
      }
    } else {
      // Not played, free user - show play limit / PRO modal
      setShowPlayLimitModal(true);
    }
  };

  const handleCardClick = () => {
    if (itemType === 'trivia') {
      navigate(`/trivia/${item.id}`);
    } else {
      navigate(`/collection/${item.id}`);
    }
  };

  const renderFriendButton = () => {
    switch (friendshipStatus) {
      case 'friends':
        return (
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
        );
      case 'pending_sent':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-muted-foreground h-8 px-2"
            disabled
          >
            <Clock className="w-4 h-4" />
          </Button>
        );
      case 'pending_received':
        return (
          <Button 
            variant="default" 
            size="sm" 
            className="gap-1.5 h-8 px-2"
            onClick={handleAcceptFriend}
            disabled={isLoading}
          >
            <UserCheck className="w-4 h-4" />
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-8 px-2"
            onClick={handleAddFriend}
            disabled={isLoading}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        );
    }
  };

  // Get item-specific data
  const isTrivia = itemType === 'trivia';
  const triviaItem = isTrivia ? (item as SamplePost) : null;
  const collectionItem = !isTrivia ? (item as CollectionItem) : null;

  const title = isTrivia ? triviaItem!.title : collectionItem!.title;
  const coverGradient = isTrivia ? triviaItem!.coverGradient : collectionItem!.cover_gradient;
  const coverImage = isTrivia ? triviaItem!.coverImage : collectionItem!.cover_image;
  const likesCount = isTrivia ? triviaItem!.likesCount : collectionItem!.likes_count;
  const savesCount = isTrivia ? triviaItem!.savesCount : collectionItem!.saves_count;
  const questionCount = isTrivia ? triviaItem!.questionCount : 0;

  const rawCreatedAt = isTrivia
    ? (triviaItem as any)?.createdAt
    : (collectionItem as any)?.created_at;

  const dateLocale = language === "ka" ? ka : enUS;
  const timeAgo = rawCreatedAt
    ? formatDistanceToNow(new Date(rawCreatedAt), { addSuffix: false, locale: dateLocale })
    : "";

  const gradientProps = getGradientProps(coverGradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)");

  // Themed cover video for posts without an uploaded cover image
  const themedVideo = useMemo(() => {
    if (coverImage || !triviaItem) return null;
    const key = subjectToCategoryKey(triviaItem.subject, triviaItem.hashtags);
    if (!key || !CATEGORY_VIDEOS[key]) return null;
    return { src: CATEGORY_VIDEOS[key], poster: CATEGORY_IMAGES[key] };
  }, [coverImage, triviaItem]);

  return (
    <>
    <div
      className="overflow-hidden rounded-2xl border border-primary/15 shadow-sm"
      style={{
        touchAction: 'manipulation',
        contentVisibility: 'auto',
        containIntrinsicSize: '260px',
      }}
    >
      {/* Player Header */}
      <div className="p-3 flex items-center justify-between bg-white/60 dark:bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Avatar - Clickable to open profile */}
          <div 
            onClick={() => openProfile(player.user_id)}
            className="cursor-pointer hover:scale-105 transition-transform active:scale-95"
          >
            <SafeAvatar 
              avatarUrl={player.avatar_url}
              fallback={player.nickname}
              className="w-10 h-10 border-2 border-border"
              fallbackClassName="bg-muted text-sm"
            />
          </div>
          
          {/* Name and Stats */}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground text-sm">{player.nickname}</h3>
              <span className="text-base">{getCountryFlag(player.country_code)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {isTrivia ? (
                  <Play className="w-3 h-3" />
                ) : (
                  <Layers className="w-3 h-3" />
                )}
                <span>{isTrivia ? t("extra.triviaTypeLabel") : t("extra.collectionBadge")}</span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Friend Button */}
          {renderFriendButton()}

          {/* Report / block. Guideline 1.2 wants this reachable from the
              content itself, so it sits on the card rather than in settings.
              Hidden on your own posts, where it would be nonsense. */}
          {currentUserId && currentUserId !== player.user_id && (
            <button
              type="button"
              aria-label={t("moderation.report")}
              onClick={(e) => { e.stopPropagation(); setModerationOpen(true); }}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <ReportBlockSheet
        open={moderationOpen}
        onClose={() => setModerationOpen(false)}
        userId={player.user_id}
        displayName={player.nickname}
        avatarUrl={player.avatar_url}
      />
      
      {/* Content Card */}
      <div
        className="overflow-hidden cursor-pointer"
        style={{ touchAction: 'manipulation' }}
        onClick={handleCardClick}
      >
        {/* Cover Section */}
        <div className="h-32 relative overflow-hidden">
          {coverImage ? (
            <>
              <img
                src={coverImage}
                alt=""
                width={480}
                height={128}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </>
          ) : themedVideo ? (
            <>
              <PingPongVideo
                src={themedVideo.src}
                posterUrl={themedVideo.poster}
                rootMargin="50px"
              />
              <div className="absolute inset-0 bg-black/30" />
            </>
          ) : (
            <>
              <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
              <div className="absolute inset-0 bg-black/20" />
            </>
          )}
          
          {/* Centered Title */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg line-clamp-2">
              {title}
            </h4>
          </div>
          
           {/* Type badge removed: type is shown under avatar/name in header */}
          
          {/* Question Count Badge - top right (for trivia only) */}
          {isTrivia && questionCount > 0 && (
            <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white">
              {t("extra.questionsLabel", { count: String(questionCount) })}
            </div>
          )}
        </div>
        
        {/* Bottom Section with Stats and Actions */}
        <div className="p-3 bg-white/60 dark:bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {/* Stats - Like and Save */}
            <div className="flex items-center gap-6">
              {/* Like Button */}
              <button 
                onClick={handleLikeClick}
                className="flex items-center gap-1.5 transition-all"
              >
                <img
                  src={purpleHeartIcon}
                  alt="Like"
                  width={26}
                  height={26}
                  loading="lazy"
                  decoding="async"
                  className={`w-[26px] h-[26px] object-contain transition-all ${isLiked ? 'opacity-100' : 'opacity-60 grayscale'}`}
                />
                <span className={cn("text-[17px] font-medium", isLiked ? "text-foreground" : "text-muted-foreground")}>{likesCount || 0}</span>
              </button>
              
              {/* Save/Bookmark Button */}
              <button 
                onClick={handleSaveClick}
                className="flex items-center gap-1.5 transition-all"
              >
                <img
                  src={bookmark3dIcon}
                  alt="Save"
                  width={26}
                  height={26}
                  loading="lazy"
                  decoding="async"
                  className={`w-[26px] h-[26px] object-contain transition-all ${isSaved ? 'opacity-100' : 'opacity-60 grayscale'}`}
                />
                <span className={cn("text-[17px] font-medium", isSaved ? "text-foreground" : "text-muted-foreground")}>{savesCount || 0}</span>
              </button>
            </div>
            
            {/* Admin Edit Button or Play Button */}
            {isAdmin && isTrivia ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-background border-2 border-primary rounded-full transition-colors hover:bg-primary/10"
              >
                <Pencil className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{t("extra.editBtnLabel")}</span>
              </button>
            ) : (
              /* Icon-only play circle; hourglass hints at the play limit
                 for non-VIP players who haven't played this one */
              <button
                onClick={handlePlayClick}
                className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center transition-colors hover:bg-purple-600"
              >
                {isPlayed || isVip || vipLoading ? (
                  <Play className="w-4 h-4 text-white fill-white" />
                ) : (
                  <Hourglass className="w-4 h-4 text-white" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Modals sit OUTSIDE the card: its content-visibility makes the card a
          containing block for fixed positioning, which would clip them */}
      <PlayLimitModal
        isOpen={showPlayLimitModal}
        onClose={() => setShowPlayLimitModal(false)}
        isGuest={false}
        regenPlayAvailable={regenPlayAvailable}
        timeUntilNextPlay={timeUntilNextPlay}
        onPlayWithRegen={async () => {
          const success = await useRegenPlay();
          if (success) {
            setShowPlayLimitModal(false);
            if (itemType === 'trivia') {
              navigate(`/trivia/${item.id}`);
            } else {
              navigate(`/collection/${item.id}`);
            }
          }
        }}
      />

      {/* Admin Edit Modal for trivia */}
      {showEditModal && isTrivia && triviaItem && (
        <Suspense fallback={null}>
          <EditQuizModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            quiz={{
              id: triviaItem.id,
              title: triviaItem.title,
              description: (triviaItem as any).description || "",
              subject: (triviaItem as any).subject || "",
              hashtags: (triviaItem as any).hashtags || [],
              cover_image: triviaItem.coverImage || null,
              cover_gradient: triviaItem.coverGradient || "",
              questions: triviaItem.questions?.map((q: any) => ({
                question_text: q.question || q.question_text,
                correct_answer: q.correct_answer,
                incorrect_answers: q.incorrect_answers || [],
                icon_slug: q.icon_slug || q.iconSlug || null,
              })) || [],
              is_public: true,
            }}
          />
        </Suspense>
      )}
    </>
  );
}

export const PlayerFeedItem = memo(PlayerFeedItemComponent);
