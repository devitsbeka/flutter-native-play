import { motion } from "framer-motion";
import { History, Trophy, Users, Clock } from "lucide-react";
import { useRecentRooms, RecentRoom } from "@/hooks/useRecentRooms";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function RecentRoomsSection() {
  const { rooms, loading } = useRecentRooms(10);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-white/80">
          <History className="w-4 h-4" />
          <span className="text-sm font-medium">ბოლო თამაშები</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="flex-shrink-0 w-44 h-32 animate-pulse rounded-2xl bg-white/10"
            />
          ))}
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return null; // Don't show section if no recent rooms
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-white/80">
        <History className="w-4 h-4" />
        <span className="text-sm font-medium">ბოლო თამაშები ({rooms.length})</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {rooms.map((room, index) => (
          <RecentRoomCard key={room.id} room={room} index={index} />
        ))}
      </div>
    </div>
  );
}

interface RecentRoomCardProps {
  room: RecentRoom;
  index: number;
}

function RecentRoomCard({ room, index }: RecentRoomCardProps) {
  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} წთ წინ`;
    if (diffHours < 24) return `${diffHours} სთ წინ`;
    return `${diffDays} დღე წინ`;
  };

  const getCategoryEmoji = (categoryName: string | null) => {
    const emojiMap: Record<string, string> = {
      "გეოგრაფია": "🌍",
      "ისტორია": "📜",
      "სპორტი": "⚽",
      "მეცნიერება": "🔬",
      "ხელოვნება": "🎨",
      "მუსიკა": "🎵",
      "კინო": "🎬",
      "ლიტერატურა": "📚",
    };
    return emojiMap[categoryName || ""] || "🎯";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex-shrink-0 w-44 p-3 rounded-2xl backdrop-blur-sm border ${
        room.won
          ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/30"
          : "bg-white/10 border-white/10"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{getCategoryEmoji(room.category_name)}</span>
        {room.won && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/30">
            <Trophy className="w-3 h-3 text-amber-300" />
            <span className="text-[10px] text-amber-300 font-medium">გამარჯვება</span>
          </div>
        )}
      </div>

      {/* Category name */}
      <p className="text-white font-medium text-sm truncate mb-1">
        {room.category_name || "ზოგადი"}
      </p>

      {/* Score and placement */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/80 text-xs">
          {room.my_score} ქულა
        </span>
        <span className="text-white/40">•</span>
        <span className="text-white/60 text-xs">
          #{room.my_placement}/{room.total_players}
        </span>
      </div>

      {/* Participants avatars */}
      <div className="flex items-center gap-1 mb-2">
        <Users className="w-3 h-3 text-white/50" />
        <div className="flex -space-x-2">
          {room.participants.slice(0, 3).map((p, i) => (
            <Avatar 
              key={p.user_id} 
              className="w-5 h-5 border border-white/20"
              style={{ zIndex: 3 - i }}
            >
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[8px]">
                {p.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {room.participants.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] text-white border border-white/20">
              +{room.participants.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Time ago */}
      <div className="flex items-center gap-1 text-white/40">
        <Clock className="w-3 h-3" />
        <span className="text-[10px]">{formatTimeAgo(room.completed_at)}</span>
      </div>
    </motion.div>
  );
}
