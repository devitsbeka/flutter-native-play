import { motion } from "framer-motion";
import { Users, Play } from "lucide-react";
import { GradientBackground, ROOM_GRADIENT_PRESETS } from "@/components/ui/noisy-gradient-backgrounds";
import { cn } from "@/lib/utils";
import { SamplePost } from "@/data/samplePosts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TriviaPortfolioCardProps {
  trivia: SamplePost;
  onPlay?: (trivia: SamplePost) => void;
  className?: string;
}

// Get a consistent gradient preset based on trivia id
function getGradientPreset(id: string) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ROOM_GRADIENT_PRESETS[hash % ROOM_GRADIENT_PRESETS.length];
}

// Get emoji based on subject/category
function getTriviaEmoji(subject?: string): string {
  const emojiMap: Record<string, string> = {
    'music': '🎵',
    'მუსიკა': '🎵',
    'movies': '🎬',
    'ფილმები': '🎬',
    'science': '🔬',
    'მეცნიერება': '🔬',
    'geography': '🌍',
    'გეოგრაფია': '🌍',
    'history': '📜',
    'ისტორია': '📜',
    'sports': '⚽',
    'სპორტი': '⚽',
    'technology': '💻',
    'ტექნოლოგია': '💻',
    'art': '🎨',
    'ხელოვნება': '🎨',
    'literature': '📚',
    'ლიტერატურა': '📚',
    'nature': '🌿',
    'ბუნება': '🌿',
  };
  
  if (!subject) return '🧠';
  const lowerSubject = subject.toLowerCase();
  return emojiMap[lowerSubject] || '🧠';
}

export function TriviaPortfolioCard({ trivia, onPlay, className }: TriviaPortfolioCardProps) {
  const gradientPreset = getGradientPreset(trivia.id);
  const emoji = getTriviaEmoji(trivia.subject);
  
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
      {/* Gradient Background - Always use gradient like game rooms */}
      <GradientBackground
        colors={gradientPreset.colors}
        gradientType="radial-gradient"
        gradientSize="125% 125%"
        gradientOrigin="bottom-middle"
        enableNoise={true}
        noisePatternAlpha={25}
        noiseIntensity={0.8}
        className="absolute inset-0"
      />
      
      {/* Radial mask overlay for depth - matching RoomCard */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 100%, transparent 0%, rgba(0,0,0,0.3) 100%)'
        }}
      />
      
      {/* Status Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/20 backdrop-blur-md rounded-full">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-white">მოლოდინი</span>
        </div>
      </div>
      
      {/* Question Count Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="px-2 py-1 bg-black/20 backdrop-blur-md rounded-full">
          <span className="text-xs font-medium text-white">{trivia.questionCount} კითხვა</span>
        </div>
      </div>
      
      {/* Center Emoji Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className="text-5xl sm:text-6xl drop-shadow-lg">{emoji}</span>
      </div>
      
      {/* Bottom Section with Title and Players */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-lg mb-2 line-clamp-1">
          {trivia.title}
        </h3>
        
        {/* Frosted Glass Bar */}
        <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-xl px-3 py-2">
          {/* Player Count */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-full">
            <Users className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white">{trivia.playsCount}</span>
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
                <span className="text-xs font-medium text-white">+{extraPlayers > 999 ? '999+' : extraPlayers}</span>
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
