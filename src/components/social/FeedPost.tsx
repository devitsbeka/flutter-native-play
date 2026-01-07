import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Play, CheckCircle, Flag, Link2, EyeOff, Sparkles, Share2 } from "lucide-react";
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

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

// Subject/keyword to cover image mapping for user-generated posts
const subjectCoverImages: Record<string, string> = {
  // Music related
  "მუსიკა": "https://images.pexels.com/photos/1389429/pexels-photo-1389429.jpeg?auto=compress&cs=tinysrgb&w=800",
  "მომღერლები": "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800",
  "music": "https://images.pexels.com/photos/1389429/pexels-photo-1389429.jpeg?auto=compress&cs=tinysrgb&w=800",
  "singers": "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Sports
  "სპორტი": "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=800",
  "ფეხბურთი": "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=800",
  "football": "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Movies/TV
  "ფილმები": "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800",
  "სერიალები": "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800",
  "movies": "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800",
  // History
  "ისტორია": "https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=800",
  "history": "https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Geography
  "გეოგრაფია": "https://images.pexels.com/photos/335393/pexels-photo-335393.jpeg?auto=compress&cs=tinysrgb&w=800",
  "geography": "https://images.pexels.com/photos/335393/pexels-photo-335393.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Science
  "მეცნიერება": "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=800",
  "science": "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Gaming
  "თამაშები": "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800",
  "gaming": "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Food
  "საჭმელი": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
  "food": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Animals
  "ცხოველები": "https://images.pexels.com/photos/247502/pexels-photo-247502.jpeg?auto=compress&cs=tinysrgb&w=800",
  "animals": "https://images.pexels.com/photos/247502/pexels-photo-247502.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Space
  "კოსმოსი": "https://images.pexels.com/photos/586030/pexels-photo-586030.jpeg?auto=compress&cs=tinysrgb&w=800",
  "space": "https://images.pexels.com/photos/586030/pexels-photo-586030.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Art
  "ხელოვნება": "https://images.pexels.com/photos/1839919/pexels-photo-1839919.jpeg?auto=compress&cs=tinysrgb&w=800",
  "art": "https://images.pexels.com/photos/1839919/pexels-photo-1839919.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Literature
  "ლიტერატურა": "https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=800",
  "books": "https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=800",
};

// Get cover image based on subject or hashtags
function getCoverImageForPost(subject: string, hashtags: string[]): string | undefined {
  // Check subject first
  const subjectLower = subject.toLowerCase();
  for (const [key, url] of Object.entries(subjectCoverImages)) {
    if (subjectLower.includes(key.toLowerCase())) {
      return url;
    }
  }
  
  // Check hashtags
  for (const tag of hashtags) {
    const tagLower = tag.toLowerCase();
    for (const [key, url] of Object.entries(subjectCoverImages)) {
      if (tagLower.includes(key.toLowerCase()) || key.toLowerCase().includes(tagLower)) {
        return url;
      }
    }
  }
  
  return undefined;
}

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
  
  // Get cover image - use existing or generate from subject/tags
  const coverImage = post.coverImage || getCoverImageForPost(post.subject, post.hashtags);

  // Extract up to 3 random unique icons from questions
  const questionIcons = useMemo(() => {
    const icons = post.questions
      .map(q => q.icon_slug)
      .filter((slug): slug is string => !!slug);
    
    // Get unique icons
    const uniqueIcons = [...new Set(icons)];
    
    // Shuffle using post id as seed for consistency
    const seed = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const shuffled = [...uniqueIcons].sort((a, b) => {
      const hashA = (seed * a.charCodeAt(0)) % 1000;
      const hashB = (seed * b.charCodeAt(0)) % 1000;
      return hashA - hashB;
    });
    
    return shuffled.slice(0, 3);
  }, [post.questions, post.id]);

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

      {/* Quiz Card/Banner */}
      <div 
        className="relative aspect-[4/3] mx-4 rounded-xl overflow-hidden"
      >
        {/* Background - gradient or image */}
        {coverImage ? (
          <div className="absolute inset-0">
            <img 
              src={coverImage} 
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for text contrast */}
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
        
        {/* Gradient overlay for visual consistency when using image */}
        {coverImage && post.coverGradient && (
          <div 
            className="absolute inset-0 opacity-40 mix-blend-overlay"
            style={{ background: post.coverGradient }}
          />
        )}

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
          {/* Quiz Title */}
          <h3 className="text-white text-2xl font-bold mb-3 drop-shadow-lg">
            {post.title}
          </h3>
          
          {/* Question Icons */}
          {questionIcons.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              {questionIcons.map((slug) => (
                <div 
                  key={slug} 
                  className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm p-1.5 shadow-lg"
                >
                  <img 
                    src={`${ICON_STORAGE_URL}/${slug}.png`}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Quiz Stats */}
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              {post.questionCount} კითხვა
            </span>
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              {post.answerFormat === '4_answers' ? '4 პასუხი' : 'მართალი/მცდარი'}
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
          {formatNumber(post.playsCount)} plays
        </span>
      </div>
    </motion.article>
  );
}