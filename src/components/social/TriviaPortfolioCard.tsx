import { motion } from "framer-motion";
import { Heart, Bookmark, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { SamplePost } from "@/data/samplePosts";

interface TriviaPortfolioCardProps {
  trivia: SamplePost;
  onPlay?: (trivia: SamplePost) => void;
  onLike?: (trivia: SamplePost) => void;
  onSave?: (trivia: SamplePost) => void;
  isLiked?: boolean;
  isSaved?: boolean;
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
  className 
}: TriviaPortfolioCardProps) {
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
    onPlay?.(trivia);
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
      onClick={() => onPlay?.(trivia)}
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
        
        {/* Centered Title - white with drop shadow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg line-clamp-2">
            {trivia.title}
          </h4>
        </div>
        
        {/* Question Count Badge - bottom right */}
        <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
          {trivia.questionCount} კითხვა
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
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span className="text-sm font-medium">{trivia.likesCount || 0}</span>
            </button>
            
            {/* Save/Bookmark Button */}
            <button 
              onClick={handleSaveClick}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              <span className="text-sm font-medium">{trivia.savesCount || 0}</span>
            </button>
          </div>
          
          {/* Play Button - Always visible */}
          <button 
            onClick={handlePlayClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ითამაშე</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
