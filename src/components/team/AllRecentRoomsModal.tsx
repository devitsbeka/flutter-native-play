import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Clock, Users } from "lucide-react";
import { useRecentRooms, RecentRoom } from "@/hooks/useRecentRooms";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AllRecentRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllRecentRoomsModal({ isOpen, onClose }: AllRecentRoomsModalProps) {
  const { rooms, loading } = useRecentRooms(50);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh]"
          >
            <div className="bg-gradient-to-b from-[#7E7BDC] to-[#5855A8] rounded-t-3xl shadow-2xl border-t border-white/20">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4">
                <h2 className="text-xl font-bold text-white">ყველა თამაში</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 pb-8 overflow-y-auto max-h-[70vh]">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse rounded-2xl bg-white/10 h-20" />
                    ))}
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">ჯერ არ გითამაშია</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((room, index) => (
                      <RoomListItem key={room.id} room={room} index={index} formatTimeAgo={formatTimeAgo} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function RoomListItem({ room, index, formatTimeAgo }: { room: RecentRoom; index: number; formatTimeAgo: (date: string | null) => string }) {
  const squadName = `SQUAD ${room.room_code?.slice(-4).toUpperCase() || index + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`p-4 rounded-2xl ${
        room.won
          ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
          : "bg-white/10 border border-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Participants */}
        <div className="flex -space-x-2">
          {room.participants.slice(0, 3).map((p, i) => (
            <Avatar key={p.user_id} className="w-10 h-10 border-2 border-[#7E7BDC]" style={{ zIndex: 3 - i }}>
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-bold">
                {p.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {room.participants.length > 3 && (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm text-white font-medium border-2 border-[#7E7BDC]">
              +{room.participants.length - 3}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm">{squadName}</p>
            {room.won && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/30">
                <Trophy className="w-3 h-3 text-amber-300" />
              </div>
            )}
          </div>
          <p className="text-white/60 text-xs truncate">{room.category_name || "ზოგადი"}</p>
        </div>

        {/* Score & Time */}
        <div className="text-right">
          <p className="text-white font-medium text-sm">{room.my_score} ქულა</p>
          <div className="flex items-center gap-1 text-white/50 text-xs">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(room.completed_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
