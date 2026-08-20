import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import { motion } from "framer-motion";
import { Trophy, Clock, Users } from "lucide-react";
import { useRecentRooms, RecentRoom } from "@/hooks/useRecentRooms";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";

interface AllRecentRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllRecentRoomsModal({ isOpen, onClose }: AllRecentRoomsModalProps) {
  const { rooms, loading } = useRecentRooms(50);
  const { t } = useLanguage();

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return t("extra.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("extra.hoursAgo", { count: diffHours });
    return t("extra.daysAgoLong", { count: diffDays });
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("extra.allGames")}
      iconSrc={triviaBuzzer}
      showSparkles={false}
      className="max-w-md"
    >
      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto pr-1 -mr-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="animate-pulse rounded-2xl h-20"
                style={{
                  background: "#F3F4F6",
                }}
              />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{
                background: "#F3F4F6",
                boxShadow: "0 3px 0 #E5E7EB",
              }}
            >
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">{t("extra.notPlayedYet")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room, index) => (
              <RoomListItem key={room.id} room={room} index={index} formatTimeAgo={formatTimeAgo} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <GameModalFooter
          primaryLabel={t("common.close")}
          onPrimary={onClose}
          primaryVariant="secondary"
        />
      </div>
    </GameModal>
  );
}

function RoomListItem({ room, index, formatTimeAgo }: { room: RecentRoom; index: number; formatTimeAgo: (date: string | null) => string }) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const squadName = `SQUAD ${room.room_code?.slice(-4).toUpperCase() || index + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="p-3 rounded-2xl"
      style={{
        background: room.won
          ? "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)"
          : "#F9FAFB",
        boxShadow: room.won
          ? "0 3px 0 #F59E0B, inset 0 1px 2px rgba(255,255,255,0.8)"
          : "0 2px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
        border: room.won ? "2px solid #F59E0B" : "none",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Participants */}
        <div className="flex -space-x-2">
          {room.participants.slice(0, 3).map((p, i) => (
            <SafeAvatar 
              key={p.user_id} 
              avatarUrl={p.avatar_url}
              fallback={p.nickname || "?"}
              className="w-10 h-10 border-2 border-white shadow-sm" 
              fallbackClassName="text-white text-sm font-bold"
            />
          ))}
          {room.participants.length > 3 && (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 border-white"
              style={{
                background: "#E5E7EB",
                color: "#6B7280",
              }}
            >
              +{room.participants.length - 3}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800 text-sm">{squadName}</p>
            {room.won && (
              <div 
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                }}
              >
                <Trophy className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <p className="text-gray-500 text-xs truncate">{localizeCategory(room.category_name) || t("extra.generalCategory")}</p>
        </div>

        {/* Score & Time */}
        <div className="text-right">
          <p className="text-gray-800 font-bold text-sm">{t("extra.scorePoints", { score: room.my_score })}</p>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(room.played_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
