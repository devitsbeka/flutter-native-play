import { motion } from "framer-motion";
import { Trophy, X, Clock, ChevronRight } from "lucide-react";
import { useRecentRooms, RecentRoom } from "@/hooks/useRecentRooms";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { useMemo } from "react";
import { useIconLibrary } from "@/hooks/useIconLibrary";

interface GameHistoryTableProps {
  onViewAll?: () => void;
}

// Shimmer skeleton component
function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: '#ECCCF2' }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

export function GameHistoryTable({ onViewAll }: GameHistoryTableProps) {
  const { rooms, loading } = useRecentRooms(10);
  const { getIconBySlug } = useIconLibrary();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 tracking-wide">ბოლო თამაშები</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 tracking-wide">ბოლო თამაშები</span>
        {onViewAll && rooms.length > 0 && (
          <motion.button
            onClick={onViewAll}
            className="text-sm font-semibold text-slate-500 px-3 py-1 rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ყველა
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Streak Bar */}
      <StreakBar rooms={rooms} />

      {/* Games List */}
      {rooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200"
        >
          <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">ჯერ თამაშები არ გაქვს</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room, index) => (
            <GameHistoryRow key={room.id} room={room} index={index} getIconBySlug={getIconBySlug} />
          ))}
        </div>
      )}
    </div>
  );
}

// Streak bar component with shimmer skeletons
function StreakBar({ rooms }: { rooms: RecentRoom[] }) {
  // Take last 10 games for streak display
  const streakGames = rooms.slice(0, 10);
  const showSkeletons = streakGames.length < 10;
  const skeletonCount = Math.min(5, 10 - streakGames.length);
  
  // Count current streak
  const currentStreak = useMemo(() => {
    if (streakGames.length === 0) return { count: 0, isWinStreak: false };
    let streak = 0;
    const firstResult = streakGames[0]?.won;
    for (const room of streakGames) {
      if (room.won === firstResult) streak++;
      else break;
    }
    return { count: streak, isWinStreak: firstResult };
  }, [streakGames]);

  return (
    <div className="flex items-center gap-2 py-2">
      {/* Streak squares */}
      <div className="flex gap-1.5 relative">
        {streakGames.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm ${
              room.won 
                ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-200" 
                : "bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-rose-200"
            }`}
          >
            {room.won ? "W" : "L"}
          </motion.div>
        ))}
        
        {/* Shimmer skeleton placeholders with fade-out */}
        {showSkeletons && (
          <>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                style={{ opacity: 1 - (index * 0.2) }}
              >
                <ShimmerSkeleton className="w-8 h-8 rounded-lg" />
              </div>
            ))}
          </>
        )}
      </div>
      
      {/* Current streak indicator */}
      {currentStreak.count >= 2 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold ${
            currentStreak.isWinStreak 
              ? "bg-emerald-100 text-emerald-700" 
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {currentStreak.count}x {currentStreak.isWinStreak ? "🔥" : ""}
        </motion.div>
      )}
    </div>
  );
}

interface GameHistoryRowProps {
  room: RecentRoom;
  index: number;
  getIconBySlug: (slug: string) => string | null;
}

function GameHistoryRow({ room, index, getIconBySlug }: GameHistoryRowProps) {
  const timeAgo = room.completed_at
    ? formatDistanceToNow(new Date(room.completed_at), { addSuffix: true, locale: ka })
    : "";

  // Get first opponent (the main person you played against)
  const me = room.participants.find(p => p.user_id === room.participants[0]?.user_id);
  const opponents = room.participants.filter(p => p.user_id !== me?.user_id);
  const mainOpponent = opponents[0];
  
  // Get category icon using the icon_slug from category
  const categoryIconUrl = room.category_icon_slug 
    ? getIconBySlug(room.category_icon_slug) || `${ICON_STORAGE_URL}/${room.category_icon_slug}.png`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-100 hover:border-slate-200 transition-colors"
    >
      {/* Category icon with opponent avatar overlay */}
      <div className="relative flex-shrink-0">
        {/* Category icon background */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${
            room.won
              ? "bg-gradient-to-br from-emerald-50 to-emerald-100"
              : "bg-gradient-to-br from-slate-100 to-slate-200"
          }`}
        >
          {categoryIconUrl ? (
            <img 
              src={categoryIconUrl} 
              alt={room.category_name || ""} 
              className="w-8 h-8 object-contain"
            />
          ) : (
            <Trophy className="w-6 h-6 text-slate-400" />
          )}
        </div>
        
        {/* Opponent avatar overlay - bigger */}
        {mainOpponent && (
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full overflow-hidden border-2 border-white bg-slate-200 shadow-sm">
            {mainOpponent.avatar_url ? (
              <img 
                src={mainOpponent.avatar_url} 
                alt={mainOpponent.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                {mainOpponent.nickname?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category name, room code, and time */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="font-bold text-slate-800 text-base truncate">
          {room.category_name || "თამაში"}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
            {room.room_code}
          </span>
          <span className="truncate">{timeAgo}</span>
        </div>
      </div>

      {/* Points earned only */}
      <div className="text-right flex-shrink-0">
        <div className={`font-bold text-sm ${room.won ? "text-emerald-600" : "text-slate-600"}`}>
          +{room.my_score} pts
        </div>
      </div>

      {/* Outcome badge */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          room.won
            ? "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-200"
            : "bg-gradient-to-br from-rose-400 to-rose-500 shadow-sm shadow-rose-200"
        }`}
      >
        {room.won ? (
          <Trophy className="w-4 h-4 text-white" />
        ) : (
          <X className="w-4 h-4 text-white" />
        )}
      </div>
    </motion.div>
  );
}
