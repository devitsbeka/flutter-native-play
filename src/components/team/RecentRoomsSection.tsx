import { motion } from "framer-motion";
import { MoreVertical, MessageCircle } from "lucide-react";
import { useRecentRooms, RecentRoom } from "@/hooks/useRecentRooms";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RecentRoomsSectionProps {
  onViewAll?: () => void;
}

export function RecentRoomsSection({ onViewAll }: RecentRoomsSectionProps) {
  const { rooms, loading } = useRecentRooms(10);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/80">ბოლო თამაშები</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="flex-shrink-0 w-44 h-40 animate-pulse rounded-2xl bg-white/10"
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
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">ბოლო თამაშები</span>
        <button onClick={onViewAll} className="text-sm font-medium text-orange-400">ყველა</button>
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
  // Generate a squad-style name from room code
  const squadName = `SQUAD ${room.room_code?.slice(-4).toUpperCase() || index + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 w-44 p-4 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/10"
    >
      {/* Header with squad name and more button */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-bold text-sm uppercase tracking-wide">
          {squadName}
        </span>
        <button className="p-1 text-white/60 hover:text-white">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Participants avatars row */}
      <div className="flex items-center mb-4">
        <div className="flex -space-x-2">
          {room.participants.slice(0, 4).map((p, i) => (
            <Avatar 
              key={p.user_id} 
              className="w-8 h-8 border-2 border-[#1a1a2e]"
              style={{ zIndex: 4 - i }}
            >
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                {p.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {room.participants.length > 4 && (
            <div 
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-medium border-2 border-[#1a1a2e]"
              style={{ zIndex: 0 }}
            >
              +{room.participants.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <motion.button
          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          + თამაში
        </motion.button>

        <motion.button
          className="flex items-center justify-center px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ჩატი
        </motion.button>
      </div>
    </motion.div>
  );
}
