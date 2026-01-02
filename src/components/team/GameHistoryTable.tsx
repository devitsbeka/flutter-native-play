import { motion } from "framer-motion";
import { Trophy, X, Clock, ChevronRight } from "lucide-react";
import { useRecentRooms, RecentRoom } from "@/hooks/useRecentRooms";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

interface GameHistoryTableProps {
  onViewAll?: () => void;
}

export function GameHistoryTable({ onViewAll }: GameHistoryTableProps) {
  const { rooms, loading } = useRecentRooms(10);

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
            <GameHistoryRow key={room.id} room={room} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

interface GameHistoryRowProps {
  room: RecentRoom;
  index: number;
}

function GameHistoryRow({ room, index }: GameHistoryRowProps) {
  const timeAgo = room.completed_at
    ? formatDistanceToNow(new Date(room.completed_at), { addSuffix: true, locale: ka })
    : "";

  // Get opponents (other participants)
  const opponents = room.participants.filter(p => p.user_id !== room.participants[0]?.user_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-100 hover:border-slate-200 transition-colors"
    >
      {/* Result indicator */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          room.won
            ? "bg-gradient-to-br from-amber-100 to-amber-200"
            : "bg-gradient-to-br from-slate-100 to-slate-200"
        }`}
      >
        {room.won ? (
          <Trophy className="w-5 h-5 text-amber-600" />
        ) : (
          <X className="w-5 h-5 text-slate-500" />
        )}
      </div>

      {/* Category and time */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">
          {room.category_name || "თამაში"}
        </p>
        <p className="text-xs text-slate-500">{timeAgo}</p>
      </div>

      {/* Score */}
      <div className="text-center px-2">
        <p
          className={`font-bold text-lg ${
            room.won ? "text-green-600" : "text-slate-600"
          }`}
        >
          {room.my_score}/{room.total_questions}
        </p>
      </div>

      {/* Opponents */}
      <div className="flex -space-x-2 flex-shrink-0 items-center">
        {opponents.slice(0, 3).map((opponent) => (
          <div 
            key={opponent.user_id} 
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-white flex-shrink-0 bg-slate-200"
          >
            {opponent.avatar_url ? (
              <img 
                src={opponent.avatar_url} 
                alt={opponent.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {opponent.nickname?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
        ))}
        {opponents.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-slate-600">
              +{opponents.length - 3}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
