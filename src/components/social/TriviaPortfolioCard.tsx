import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Check, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { SamplePost } from "@/data/samplePosts";
import { useNavigate } from "react-router-dom";
import purpleHeartIcon from "@/assets/icons/purple-heart.webp";
import bookmark3dIcon from "@/assets/icons/bookmark-3d.png";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { useLanguage } from "@/contexts/LanguageContext";

interface TriviaPortfolioCardProps {
  trivia: SamplePost;
  onPlay?: (trivia: SamplePost) => void;
  onLike?: (trivia: SamplePost) => void;
  onSave?: (trivia: SamplePost) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  isPlayed?: boolean;
  className?: string;
}

// Helper to get gradient style (handles both CSS strings and Tailwind classes)
function getGradientProps(gradient: string) {
  if (gradient?.includes('gradient') || gradient?.includes('#') || gradient?.includes('rgb')) {
    return { style: { background: gradient }, className: '' };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient}` };
}

// Default gradients for random fallback
const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
];

function getRandomGradient(id: string) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

export function TriviaPortfolioCard({ 
  trivia, 
  onPlay, 
  onLike, 
  onSave, 
  isLiked = false, 
  isSaved = false, 
  isPlayed = false,
  className 
}: TriviaPortfolioCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showPlayLimitModal, setShowPlayLimitModal] = useState(false);
  const { isVip, loading: vipLoading, regenPlayAvailable, timeUntilNextPlay, useRegenPlay } = usePlayLimit();
  
  // Use the trivia's actual cover_gradient or cover_image, fallback to random gradient
  const coverGradient = trivia.coverGradient || getRandomGradient(trivia.id);
  const coverImage = trivia.coverImage;
  const gradientProps = getGradientProps(coverGradient);
  
  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(trivia);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.(trivia);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayed || isVip || vipLoading) {
      navigate(`/trivia/${trivia.id}`);
    } else {
      setShowPlayLimitModal(true);
    }
  };
  
  const handleCardClick = () => {
    navigate(`/trivia/${trivia.id}`);
  };
  
  return (
    <motion.div
      className={cn(
        "relative bg-card rounded-2xl border-2 border-primary/30 overflow-hidden shadow-lg",
        "hover:shadow-xl transition-shadow duration-300",
        !className?.includes('w-full') && "flex-shrink-0",
        className
      )}
      style={!className?.includes('w-full') ? { width: 260, minWidth: 260 } : undefined}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
    >
      {/* Cover Section */}
      <div className="h-32 relative overflow-hidden">
        {coverImage ? (
          <>
            <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <>
            <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
            <div className="absolute inset-0 bg-black/20" />
          </>
        )}
        
        {/* Played Badge - top left */}
        {isPlayed && (
          <div className="absolute top-2 left-2 bg-emerald-500 rounded-full px-2 py-0.5 text-xs text-white flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>{t("extra.playedLabel")}</span>
          </div>
        )}
        
        {/* Centered Title - white with drop shadow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg line-clamp-2">
            {trivia.title}
          </h4>
        </div>
        
        {/* Question Count Badge - top right */}
        <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white">
          {t("extra.questionsLabel", { count: String(trivia.questionCount) })}
        </div>
      </div>
      
      {/* Bottom Section with Stats and Actions */}
      <div className="p-3 bg-card relative z-10">
        <div className="flex items-center justify-between">
          {/* Stats - Like and Save */}
          <div className="flex items-center gap-3">
            {/* Like Button */}
            <button 
              onClick={handleLikeClick}
              className="flex items-center gap-1 transition-all"
            >
              <img 
                src={purpleHeartIcon} 
                alt="Like" 
                className={`w-5 h-5 object-contain transition-all ${isLiked ? 'opacity-100' : 'opacity-60 grayscale'}`}
              />
              <span className={cn("text-sm font-medium", isLiked ? "text-foreground" : "text-muted-foreground")}>{trivia.likesCount || 0}</span>
            </button>
            
            {/* Save/Bookmark Button */}
            <button 
              onClick={handleSaveClick}
              className="flex items-center gap-1 transition-all"
            >
              <img 
                src={bookmark3dIcon} 
                alt="Save" 
                className={`w-5 h-5 object-contain transition-all ${isSaved ? 'opacity-100' : 'opacity-60 grayscale'}`}
              />
              <span className={cn("text-sm font-medium", isSaved ? "text-foreground" : "text-muted-foreground")}>{trivia.savesCount || 0}</span>
            </button>
          </div>
          
          {/* Play Button - icon-only circle; the hourglass hints at the
              play limit for non-VIP players who haven't played this one */}
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
        </div>
      </div>

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
            navigate(`/trivia/${trivia.id}`);
          }
        }}
      />
    </motion.div>
  );
}
