import { motion } from "framer-motion";
import { MoreVertical, MessageCircle, Plus } from "lucide-react";
import { useRecentRooms, RecentRoom } from "@/hooks/useRecentRooms";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";

interface RecentRoomsSectionProps {
  onViewAll?: () => void;
}

export function RecentRoomsSection({ onViewAll }: RecentRoomsSectionProps) {
  const { t } = useLanguage();
  const { rooms, loading } = useRecentRooms(10);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
           <span className="text-sm font-bold text-slate-800 tracking-wide">{t("extra.recentGames")}</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="flex-shrink-0 w-44 h-40 animate-pulse rounded-2xl bg-slate-200"
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 tracking-wide">{t("extra.recentGames")}</span>
        <ChunkyButton onClick={onViewAll} variant="secondary" size="sm">
          {t("extra.viewAll")}
        </ChunkyButton>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
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
  const { t } = useLanguage();
  // Generate a squad-style name from room code
  const squadName = `SQUAD ${room.room_code?.slice(-4).toUpperCase() || index + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 w-48 p-4 rounded-2xl bg-gradient-to-br from-white via-white to-purple-50 shadow-xl shadow-purple-500/20 border-2 border-purple-200/60 relative overflow-hidden"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-xl" />
      
      {/* Header with squad name and more button */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-gray-800 font-bold text-sm uppercase tracking-wide">
          {squadName}
        </span>
        <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-purple-100 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Participants avatars row */}
      <div className="flex items-center mb-4 relative z-10">
        <div className="flex -space-x-2">
          {room.participants.slice(0, 4).map((p, i) => (
            <Avatar 
              key={p.user_id} 
              className="w-9 h-9 border-[3px] border-white ring-2 ring-purple-300 shadow-md"
              style={{ zIndex: 4 - i }}
            >
              <ResolvedAvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                {p.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {room.participants.length > 4 && (
            <div 
              className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs text-gray-600 font-bold border-[3px] border-white shadow-md"
              style={{ zIndex: 0 }}
            >
              +{room.participants.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 relative z-10">
        <ChunkyButton
          variant="primary"
          size="sm"
          className="flex-1"
          icon={<Plus className="w-4 h-4" />}
        >
          {t("extra.gameBtn")}
        </ChunkyButton>

        <ChunkyButton
          variant="secondary"
          size="sm"
          className="flex-1"
          icon={<MessageCircle className="w-4 h-4" />}
        >
          {t("extra.chatBtn")}
        </ChunkyButton>
      </div>
    </motion.div>
  );
}
