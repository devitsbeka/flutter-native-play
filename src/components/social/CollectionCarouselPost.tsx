import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, CheckCircle, Flag, Link2, EyeOff, Globe, Lock, Share2, ChevronLeft, ChevronRight, Layers, Play } from "lucide-react";
import purpleHeartIcon from "@/assets/icons/purple-heart.webp";
import bookmarkIcon from "@/assets/icons/bookmark-3d.png";
import { formatDistanceToNow } from "date-fns";
import { ka, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { SamplePost } from "@/data/samplePosts";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";
import { CollectionPreviewModal } from "./CollectionPreviewModal";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

interface CollectionCarouselPostProps {
  posts: SamplePost[];
  collectionTitle?: string;
  index: number;
  onPlay?: (post: SamplePost, collectionPosts?: SamplePost[]) => void;
  userLikes?: string[];
  userSaves?: string[];
  onToggleLike?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  isLiking?: boolean;
  isSaving?: boolean;
}

export function CollectionCarouselPost({ posts, collectionTitle, index, onPlay, userLikes, userSaves, onToggleLike, onToggleSave, onHashtagClick, isLiking, isSaving }: CollectionCarouselPostProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  const currentPost = posts[currentIndex];
  const dateLocale = language === 'ka' ? ka : enUS;
  const timeAgo = formatDistanceToNow(new Date(currentPost.createdAt), { addSuffix: false, locale: dateLocale });
  
  // Check if any post in collection is liked/saved
  const liked = posts.some(p => userLikes?.includes(p.id));
  const saved = posts.some(p => userSaves?.includes(p.id));
  
  // Calculate total likes/saves across all posts in collection (from props, not local state)
  const totalLikes = posts.reduce((sum, p) => sum + p.likesCount, 0);
  const totalSaves = posts.reduce((sum, p) => sum + (p.savesCount || 0), 0);

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(posts.length - 1, prev + 1));
  };

  const handleLike = () => {
    if (isLiking) return; // Prevent double-click
    // Like/unlike the first post of the collection
    onToggleLike?.(posts[0].id);
  };

  const handleSave = () => {
    if (isSaving) return; // Prevent double-click
    // Save/unsave the first post of the collection
    onToggleSave?.(posts[0].id);
  };

  const handleShare = async () => {
    const shareData = {
      title: collectionTitle || currentPost.title,
      text: `Check out this trivia collection!`,
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard! 📋");
    }
  };

  const handleReport = () => {
    toast.success("Report submitted. Thank you!");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied! 📋");
  };

  const handleNotInterested = () => {
    toast("We'll show you less content like this");
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Touch handling for swipe
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    
    if (diff > threshold && currentIndex < posts.length - 1) {
      handleNext();
    } else if (diff < -threshold && currentIndex > 0) {
      handlePrev();
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card border-b border-border isolate ${currentPost.isUserPost ? 'ring-2 ring-primary/30' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {currentPost.isUserPost && currentPost.avatarUrl ? (
            <AvatarWithFrame
              imageUrl={currentPost.avatarUrl}
              size="sm"
              showVipBadge={false}
            />
          ) : (
            <div className="relative">
              <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600">
                <div className="w-full h-full rounded-full overflow-hidden bg-background p-[2px]">
                  {currentPost.avatarUrl ? (
                    <img 
                      src={currentPost.avatarUrl} 
                      alt={currentPost.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                      {currentPost.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground text-sm">{currentPost.username}</span>
              {currentPost.verified && (
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
              )}
              {/* Collection badge - icon only */}
              <span 
                className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/90 text-white"
                title="კოლექცია"
              >
                <Layers className="w-3 h-3" />
              </span>
              {/* Public/Private badge - icon only */}
              <span 
                className={`flex items-center justify-center w-5 h-5 rounded-full ${
                  currentPost.isPublic !== false 
                    ? 'bg-green-500/90 text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}
                title={currentPost.isPublic !== false ? 'საჯარო' : 'პირადი'}
              >
                {currentPost.isPublic !== false ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem onClick={handleReport} className="gap-2">
              <Flag className="w-4 h-4" />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
              <Link2 className="w-4 h-4" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNotInterested} className="gap-2">
              <EyeOff className="w-4 h-4" />
              Not Interested
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Carousel - Horizontal scroll showing 1 full + half card */}
      <div className="relative">
        <div 
          ref={containerRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-3 scroll-pl-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {posts.map((post, i) => (
            <div
              key={post.id}
              onClick={() => setShowPreviewModal(true)}
              className="flex-shrink-0 snap-start rounded-2xl overflow-hidden first:ml-4 last:mr-4 cursor-pointer"
              style={{ width: 'calc(85% - 6px)' }}
            >
              <div className="relative aspect-[4/3]">
                {/* Background - gradient or image */}
                {post.coverImage ? (
                  <div className="absolute inset-0">
                    <img 
                      src={post.coverImage} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                ) : (
                  <div 
                    className="absolute inset-0"
                    style={{ 
                      background: post.coverGradient || 'linear-gradient(135deg, hsl(270, 70%, 60%), hsl(320, 70%, 50%))' 
                    }}
                  />
                )}

                {/* Content overlay */}
                <div className="absolute inset-0 flex flex-col items-center p-4 text-center z-10">
                  {/* Quiz Stats */}
                  <div className="flex items-center gap-3 text-white/90 text-xs pt-2">
                    <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      {post.questionCount} კითხვა
                    </span>
                    <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      {post.answerFormat === '4_answers' ? '4 პასუხი' : 'მართალი/მცდარი'}
                    </span>
                  </div>

                  {/* Quiz Title */}
                  <h3 className="text-white text-xl font-bold drop-shadow-lg absolute top-1/2 left-0 right-0 -translate-y-1/2 px-4">
                    {post.title}
                  </h3>

                  {/* Card index indicator */}
                  <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium">
                    {i + 1}/{posts.length}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 pt-2 pb-1">
          {posts.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex 
                  ? 'bg-primary w-4' 
                  : 'bg-muted-foreground/30 w-1.5'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side: Heart + Bookmark icons with counts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <motion.button 
              onClick={handleLike}
              whileTap={{ scale: 0.9 }}
              animate={liked ? { scale: [1, 1.3, 0.9, 1.1, 1] } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
              disabled={isLiking}
              className={isLiking ? 'opacity-50' : ''}
            >
              <img 
                src={purpleHeartIcon} 
                alt="Like" 
                className={`w-8 h-8 object-contain transition-all ${liked ? 'opacity-100' : 'opacity-60 grayscale'}`}
              />
            </motion.button>
            <span className="text-sm text-muted-foreground">{formatNumber(totalLikes)}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <motion.button 
              onClick={handleSave}
              whileTap={{ scale: 0.9 }}
              animate={saved ? { y: [0, -6, 0] } : {}}
              transition={{ duration: 0.3, ease: "easeOut" }}
              disabled={isSaving}
              className={isSaving ? 'opacity-50' : ''}
            >
              <img 
                src={bookmarkIcon} 
                alt="Save" 
                className={`w-8 h-8 object-contain transition-all ${saved ? 'opacity-100' : 'opacity-60 grayscale'}`}
              />
            </motion.button>
            <span className="text-sm text-muted-foreground">{formatNumber(totalSaves)}</span>
          </div>
        </div>
        
        {/* Right side: Play button */}
        <button 
          onClick={() => onPlay?.(posts[0], posts)}
          className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-base font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Play className="w-4 h-4 fill-current" />
          ითამაშე
        </button>
      </div>

      {/* Hashtags */}
      <div className="px-4 pb-4 flex flex-wrap gap-1.5">
        {currentPost.hashtags.map(tag => (
          <button
            key={tag}
            onClick={() => onHashtagClick?.(tag)}
            className="text-primary text-sm hover:underline hover:opacity-80 transition-opacity cursor-pointer"
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Collection Preview Modal - rendered via portal to escape stacking context */}
      {createPortal(
        <CollectionPreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          posts={posts}
          collectionTitle={collectionTitle || posts[0]?.title}
          onPlay={onPlay}
          userLikes={userLikes}
          userSaves={userSaves}
          onToggleLike={onToggleLike}
          onToggleSave={onToggleSave}
        />,
        document.body
      )}
    </motion.article>
  );
}