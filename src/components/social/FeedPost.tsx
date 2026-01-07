import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, CheckCircle, Flag, Link2, EyeOff, Sparkles } from "lucide-react";
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

interface FeedPostProps {
  post: SamplePost;
  index: number;
  onPlay?: (post: SamplePost) => void;
}

export function FeedPost({ post, index, onPlay }: FeedPostProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const { language } = useLanguage();
  
  const dateLocale = language === 'ka' ? ka : enUS;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: false, locale: dateLocale });

  const handleLike = () => {
    if (liked) {
      setLikesCount(prev => prev - 1);
      toast("Removed from likes");
    } else {
      setLikesCount(prev => prev + 1);
      toast.success("Added to likes ❤️");
    }
    setLiked(!liked);
  };

  const handleSave = () => {
    setSaved(!saved);
    if (!saved) {
      toast.success("Saved to collection 📌");
    } else {
      toast("Removed from saved");
    }
  };

  const handleComment = () => {
    toast.info("Comments coming soon! 💬");
  };

  const handleShare = async () => {
    const shareData = {
      title: post.title,
      text: `Check out this trivia: ${post.title}`,
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card border-b border-border ${post.isUserPost ? 'ring-2 ring-primary/30' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar with gradient ring or AvatarWithFrame for user posts */}
          {post.isUserPost && post.avatarUrl ? (
            <AvatarWithFrame
              imageUrl={post.avatarUrl}
              size="sm"
              showVipBadge={false}
            />
          ) : (
            <div className="relative">
              <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600">
                <div className="w-full h-full rounded-full overflow-hidden bg-background p-[2px]">
                  {post.avatarUrl ? (
                    <img 
                      src={post.avatarUrl} 
                      alt={post.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground text-sm">{post.username}</span>
              {post.verified && (
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
              )}
              {post.isUserPost && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-medium">
                  <Sparkles className="w-2.5 h-2.5" />
                  ჩემი
                </span>
              )}
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleReport} className="gap-2">
              <Flag className="w-4 h-4" />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare} className="gap-2">
              <Send className="w-4 h-4" />
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

      {/* Quiz Card/Banner */}
      <div 
        className="relative aspect-[4/3] mx-4 rounded-xl overflow-hidden"
        style={{ background: post.coverGradient }}
      >
        {/* Background image with overlay */}
        {post.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={post.coverImage} 
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for text contrast */}
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}
        
        {/* Gradient overlay for visual consistency */}
        <div 
          className="absolute inset-0 opacity-60 mix-blend-overlay"
          style={{ background: post.coverGradient }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
          {/* Quiz Title */}
          <h3 className="text-white text-2xl font-bold mb-3 drop-shadow-lg">
            {post.title}
          </h3>
          
          {/* Quiz Stats */}
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              {post.questionCount} Questions
            </span>
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              {post.answerFormat === '4_answers' ? '4 Answers' : 'True/False'}
            </span>
          </div>
        </div>
        
        {/* Play Button Overlay */}
        <button 
          onClick={() => onPlay?.(post)}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity z-20"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="w-8 h-8 text-slate-800 ml-1" />
          </div>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Like */}
          <button 
            onClick={handleLike}
            className="hover:opacity-70 transition-opacity active:scale-90"
          >
            <Heart 
              className={`w-6 h-6 transition-colors ${
                liked ? 'text-red-500 fill-red-500' : 'text-foreground'
              }`} 
            />
          </button>
          
          {/* Comment */}
          <button 
            onClick={handleComment}
            className="hover:opacity-70 transition-opacity"
          >
            <MessageCircle className="w-6 h-6 text-foreground" />
          </button>
          
          {/* Share */}
          <button 
            onClick={handleShare}
            className="hover:opacity-70 transition-opacity"
          >
            <Send className="w-6 h-6 text-foreground" />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Play Button */}
          <button 
            onClick={() => onPlay?.(post)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Play className="w-4 h-4" />
            Play
          </button>
          
          {/* Save */}
          <button 
            onClick={handleSave}
            className="hover:opacity-70 transition-opacity"
          >
            <Bookmark 
              className={`w-6 h-6 transition-colors ${
                saved ? 'text-foreground fill-foreground' : 'text-foreground'
              }`} 
            />
          </button>
        </div>
      </div>

      {/* Likes Count */}
      <div className="px-4 pb-1">
        <span className="font-semibold text-foreground text-sm">
          {formatNumber(likesCount)} likes
        </span>
      </div>

      {/* Description */}
      <div className="px-4 pb-2">
        <p className="text-foreground text-sm">
          <span className="font-semibold">{post.username}</span>{' '}
          {post.description}
        </p>
      </div>

      {/* Hashtags */}
      <div className="px-4 pb-3">
        <p className="text-primary text-sm">
          {post.hashtags.map(tag => `#${tag}`).join(' ')}
        </p>
      </div>

      {/* Play Count */}
      <div className="px-4 pb-4">
        <span className="text-muted-foreground text-xs">
          {formatNumber(post.playsCount)} plays • {formatNumber(post.commentsCount)} comments
        </span>
      </div>
    </motion.article>
  );
}