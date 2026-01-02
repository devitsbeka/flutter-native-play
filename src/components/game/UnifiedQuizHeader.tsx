import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Crown } from "lucide-react";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { cn } from "@/lib/utils";

interface UnifiedQuizHeaderProps {
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  score: number;
  questionNumber: number;
  totalQuestions: number;
  onBack?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export function UnifiedQuizHeader({
  avatarUrl,
  animatedAvatarUrl,
  score,
  questionNumber,
  totalQuestions,
  onBack,
  onMenuClick,
  className,
}: UnifiedQuizHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-3", className)}>
      {/* Left: Back button + Avatar with score */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        
        <div className="relative">
          <SmartAvatar
            avatarUrl={avatarUrl}
            animatedAvatarUrl={animatedAvatarUrl}
            fallback="👤"
            size="md"
            className="border-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]"
            showSparkle={false}
            autoPlay={true}
          />
          
          {/* Score badge */}
          <motion.div
            key={score}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-amber-500 px-1.5 py-0.5 rounded-full shadow-md"
          >
            <Crown className="w-3 h-3 text-amber-800 fill-amber-300" />
            <span className="text-xs font-bold text-amber-900">{score}</span>
          </motion.div>
        </div>
      </div>

      {/* Center: Question counter */}
      <div className="flex items-center gap-1 bg-white/10 px-4 py-2 rounded-full">
        <span className="text-white font-bold text-lg">{questionNumber}</span>
        <span className="text-white/60 font-medium">/</span>
        <span className="text-white/60 font-bold text-lg">{totalQuestions}</span>
      </div>

      {/* Right: Menu/dropdown button */}
      {onMenuClick ? (
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      ) : (
        <div className="w-10" /> // Spacer for alignment
      )}
    </div>
  );
}
