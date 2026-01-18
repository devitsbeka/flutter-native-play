import { motion } from "framer-motion";
import { Users, Play } from "lucide-react";
import { GradientBackground } from "@/components/ui/noisy-gradient-backgrounds";
import { cn } from "@/lib/utils";
import { SamplePost } from "@/data/samplePosts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TriviaPortfolioCardProps {
  trivia: SamplePost;
  onPlay?: (trivia: SamplePost) => void;
  className?: string;
}

// Parse gradient string to extract colors
function parseGradientColors(gradient: string): { color: string; stop: string }[] {
  const colorRegex = /(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\))\s*(\d+)?%?/g;
  const colors: { color: string; stop: string }[] = [];
  let match;
  let index = 0;
  
  while ((match = colorRegex.exec(gradient)) !== null) {
    colors.push({
      color: match[1],
      stop: match[2] ? `${match[2]}%` : index === 0 ? "0%" : "100%"
    });
    index++;
  }
  
  if (colors.length === 0) {
    return [
      { color: "#667eea", stop: "0%" },
      { color: "#764ba2", stop: "100%" }
    ];
  }
  
  return colors;
}

// Get subject emoji
function getSubjectEmoji(subject: string): string {
  const emojiMap: Record<string, string> = {
    "geography": "🌍",
    "history": "📜",
    "science": "🔬",
    "sports": "⚽",
    "music": "🎵",
    "movies": "🎬",
    "tv shows": "📺",
    "gaming": "🎮",
    "food": "🍕",
    "animals": "🦁",
    "art": "🎨",
    "literature": "📚",
    "technology": "💻",
    "nature": "🌲",
    "space": "🚀",
    "celebrities": "⭐",
    "fashion": "👗",
    "travel": "✈️",
  };
  
  const lowerSubject = subject.toLowerCase();
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerSubject.includes(key)) return emoji;
  }
  
  return "🧠";
}

export function TriviaPortfolioCard({ trivia, onPlay, className }: TriviaPortfolioCardProps) {
  const gradientColors = parseGradientColors(trivia.coverGradient);
  const emoji = getSubjectEmoji(trivia.subject);
  
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
        "relative w-[240px] sm:w-[260px] md:w-[280px] h-[180px] sm:h-[190px] md:h-[200px] rounded-2xl overflow-hidden cursor-pointer flex-shrink-0",
        "shadow-lg hover:shadow-xl transition-shadow duration-300",
        className
      )}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPlay?.(trivia)}
    >
      {/* Gradient Background with Noise */}
      <GradientBackground
        colors={gradientColors}
        gradientType="radial-gradient"
        gradientSize="150%"
        gradientOrigin="center"
        enableNoise={true}
        noisePatternAlpha={40}
        className="absolute inset-0"
      />
      
      {/* Status Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background/20 backdrop-blur-md rounded-full">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-white/90">მზადაა</span>
        </div>
      </div>
      
      {/* Question Count Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="px-2 py-1 bg-background/20 backdrop-blur-md rounded-full">
          <span className="text-xs font-medium text-white/90">{trivia.questionCount} კითხვა</span>
        </div>
      </div>
      
      {/* Center Emoji/Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-5xl sm:text-6xl drop-shadow-lg">
          {emoji}
        </div>
      </div>
      
      {/* Bottom Section with Title and Players */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-lg mb-2 line-clamp-2">
          {trivia.title}
        </h3>
        
        {/* Frosted Glass Bar */}
        <div className="flex items-center justify-between bg-white/15 backdrop-blur-md rounded-xl px-3 py-2">
          {/* Player Count */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-full">
            <Users className="w-3.5 h-3.5 text-white/90" />
            <span className="text-xs font-medium text-white/90">{trivia.playsCount}</span>
          </div>
          
          {/* Avatar Stack */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {playerAvatars.slice(0, 3).map((avatar, i) => (
                <Avatar key={i} className="w-7 h-7 border-2 border-white/50">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="bg-muted text-xs">?</AvatarFallback>
                </Avatar>
              ))}
            </div>
            {extraPlayers > 0 && (
              <div className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full">
                <span className="text-xs font-medium text-white/90">+{extraPlayers > 999 ? '999+' : extraPlayers}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Play Overlay on Hover */}
      <motion.div
        className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        initial={false}
      >
        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <Play className="w-7 h-7 text-primary fill-primary ml-1" />
        </div>
      </motion.div>
    </motion.div>
  );
}
