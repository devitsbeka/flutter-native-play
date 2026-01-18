import { motion } from "framer-motion";
import { Users, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { SamplePost } from "@/data/samplePosts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TriviaPortfolioCardProps {
  trivia: SamplePost;
  onPlay?: (trivia: SamplePost) => void;
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

export function TriviaPortfolioCard({ trivia, onPlay, className }: TriviaPortfolioCardProps) {
  // Use the trivia's actual cover_gradient or cover_image, fallback to random gradient
  const coverGradient = trivia.coverGradient || getRandomGradient(trivia.id);
  const coverImage = trivia.coverImage;
  const gradientProps = getGradientProps(coverGradient);
  
  // Generate fake player avatars for display
  const playerAvatars = [
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${trivia.id}-1&backgroundColor=b6e3f4`,
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${trivia.id}-2&backgroundColor=c0aede`,
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${trivia.id}-3&backgroundColor=ffd5dc`,
  ];
  
  const extraPlayers = Math.max(0, trivia.playsCount - 3);
  
  return (
    <motion.div
      className={cn(
        "relative bg-card rounded-2xl border-2 border-primary/30 overflow-hidden shadow-lg cursor-pointer flex-shrink-0",
        "hover:shadow-xl transition-shadow duration-300",
        className
      )}
      style={{ width: 260, minWidth: 260 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPlay?.(trivia)}
    >
      {/* Cover Section - matches My Trivias exactly */}
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
      
      {/* Bottom Section with Stats */}
      <div className="p-3 bg-card">
        {/* Stats Row */}
        <div className="flex items-center justify-between">
          {/* Player Count */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">{trivia.playsCount}</span>
          </div>
          
          {/* Avatar Stack */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {playerAvatars.slice(0, 3).map((avatar, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-card">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">?</AvatarFallback>
                </Avatar>
              ))}
            </div>
            {extraPlayers > 0 && (
              <div className="ml-1 px-1.5 py-0.5 bg-primary/10 rounded-full">
                <span className="text-xs font-medium text-primary">+{extraPlayers > 999 ? '999+' : extraPlayers}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Play Overlay on Hover */}
      <motion.div
        className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20"
        initial={false}
      >
        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <Play className="w-7 h-7 text-primary fill-primary ml-1" />
        </div>
      </motion.div>
    </motion.div>
  );
}
