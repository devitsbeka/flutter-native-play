import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMyRooms } from "@/hooks/useMyRooms";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import glitchIcon from "@/assets/glitch.png";
import { useLanguage } from "@/contexts/LanguageContext";

export function LiveGamesWidget() {
  const navigate = useNavigate();
  const { openProfile } = usePlayerProfile();
  const { rooms, loading } = useMyRooms();
  const { t } = useLanguage();

  // Filter to show only active rooms (waiting or playing) - max 2 to save space
  const activeRooms = rooms.filter(
    (room) => room.status === "waiting" || room.status === "playing"
  ).slice(0, 2);

  if (loading) {
    return (
      <div 
        className="bg-card rounded-2xl p-5 border border-border/60"
        style={{
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 bg-muted/60 rounded w-12 animate-pulse" />
          <div className="h-4 bg-destructive/20 rounded w-10 animate-pulse" />
          <div className="h-5 bg-muted/60 rounded w-16 animate-pulse" />
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-14 bg-muted/40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-card rounded-2xl p-5 border border-border/60"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{t("extra.yourLiveGames")}</h3>
        <span 
          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-destructive text-destructive-foreground"
        >
          LIVE
        </span>
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{t("extra.liveGamesLabel")}</h3>
      </div>

      {activeRooms.length === 0 ? (
        <div className="text-center py-5">
          <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-2">
            <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
          </div>
          <p className="text-[13px] text-muted-foreground">
            {t("extra.noActiveGames")}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/room/${room.room_code}`)}
              className="relative rounded-xl p-3.5 cursor-pointer transition-colors group border border-border/40 overflow-hidden min-h-[100px]"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)/0.15) 0%, hsl(var(--primary)/0.25) 100%)',
              }}
            >
              {/* Top left - User avatars */}
              <div className="absolute top-3 left-3 flex items-center -space-x-2">
                {room.participants.slice(0, 4).map((participant) => (
                  <SafeAvatar
                    key={participant.user_id}
                    avatarUrl={participant.avatar_url}
                    fallback={participant.nickname}
                    className="w-8 h-8 border-2 border-card/80 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                    fallbackClassName="text-[10px] bg-primary text-primary-foreground font-bold"
                  />
                ))}
                {room.participants.length > 4 && (
                  <span className="w-8 h-8 rounded-full bg-muted/80 border-2 border-card/80 flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                    +{room.participants.length - 4}
                  </span>
                )}
              </div>

              {/* Top right - LIVE badge */}
              <div className="absolute top-3 right-3">
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{
                    background: '#EF4444',
                    boxShadow: '0 2px 0 #B91C1C, 0 3px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <motion.span
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-1.5 h-1.5 rounded-full bg-white mr-1"
                  />
                  LIVE
                </span>
              </div>

              {/* Bottom left - Room name and description */}
              <div className="absolute bottom-3 left-3 right-3">
                <h4 className="text-[15px] font-display text-foreground truncate">
                  {room.room_name || t("extra.gameRoomDefault")}
                </h4>
                <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                  {room.category_name || t("extra.playerCount", { count: room.participants.length })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer link */}
      {rooms.length > 0 && (
        <button
          onClick={() => navigate("/team?tab=rooms")}
          className="w-full mt-3 text-center text-[13px] font-medium text-primary hover:underline"
        >
          {t("extra.allRooms", { count: rooms.length })}
        </button>
      )}
    </motion.div>
  );
}