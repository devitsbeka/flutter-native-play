import { motion } from "framer-motion";
import { Layers, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyRooms, isActiveTVSession, isLiveTVSession } from "@/hooks/useMyRooms";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { LiveBadge } from "@/components/social/LiveBadge";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import iconKingLounge from "@/assets/play-chooser/icon-king.webp";
import iconBattleLounge from "@/assets/play-chooser/icon-crate.png";
import iconWordsLounge from "@/assets/play-chooser/icon-words.webp";
import { roomKind, routeForRoom } from "@/utils/roomRoutes";

interface ActiveRoomsWidgetProps {
  onViewAll: () => void;
  onJoinRoom: (roomCode: string) => void;
}

export function ActiveRoomsWidget({ onViewAll, onJoinRoom }: ActiveRoomsWidgetProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const { rooms, loading } = useMyRooms();
  
  // Filter for active rooms or rooms with unread activity or others online, prioritize TV sessions first, limit to 3
  const activeRooms = rooms
    .filter(r => r.has_unread_activity || r.status === "waiting" || r.status === "playing" || isActiveTVSession(r.tv_status) || r.has_others_online)
    .sort((a, b) => {
      // Priority 0: Active TV sessions always first
      const aHasTV = isActiveTVSession(a.tv_status);
      const bHasTV = isActiveTVSession(b.tv_status);
      if (aHasTV && !bHasTV) return -1;
      if (bHasTV && !aHasTV) return 1;
      
      // Priority 1: LIVE sessions (playing with players) or others online
      const aLive = a.status === "playing" || a.has_others_online;
      const bLive = b.status === "playing" || b.has_others_online;
      if (aLive && !bLive) return -1;
      if (bLive && !aLive) return 1;
      return 0;
    })
    .slice(0, 3);

  if (loading || activeRooms.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 text-foreground">
        <Layers className="w-4 h-4" />
        <span className="text-sm font-bold tracking-wide">
          {t("extra.activeRooms")}
        </span>
        {activeRooms.some(r => r.has_unread_activity || isActiveTVSession(r.tv_status) || r.has_others_online) && (
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </div>

      <div className="rounded-2xl bg-muted/50 border border-border/50 overflow-hidden">
        <div className="divide-y divide-border/50">
        {activeRooms.map((room) => {
            const hasTVSession = isActiveTVSession(room.tv_status);
            // NEW: Use has_players_in_room for accurate "someone is in room" detection
            const hasPlayersInRoom = room.has_players_in_room;
            
            // Badge logic: TV badge if players + TV, LIVE if players without TV
            const showTVBadge = hasPlayersInRoom && hasTVSession;
            const showLiveBadge = hasPlayersInRoom && !hasTVSession;
            
            const displayPlayerCount = hasTVSession && room.tv_active_players > 0 
              ? room.tv_active_players 
              : room.participants.length;
            const displayPlayers = hasTVSession && room.tv_players.length > 0
              ? room.tv_players
              : room.participants;
              
            // Lounge rooms carry their game's identity and live on their
            // own routes — never the classic join flow.
            const kind = roomKind(room);
            const lounge =
              kind === "king"
                ? { icon: iconKingLounge, label: t("lobby.vkTitle"), path: routeForRoom(room) }
                : kind === "team_battle"
                  ? { icon: iconBattleLounge, label: t("teamBattle.title"), path: routeForRoom(room) }
                  : kind === "words"
                    ? { icon: iconWordsLounge, label: t("words.title"), path: routeForRoom(room) }
                    : null;
            return (
              <button
                key={room.id}
                onClick={() => (lounge ? navigate(lounge.path) : onJoinRoom(room.room_code))}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors text-left"
              >
                {/* Room Icon/Avatar */}
                <div className="relative flex-shrink-0">
                  {lounge ? (
                    <img src={lounge.icon} alt="" className="w-10 h-10 rounded-xl object-contain" />
                  ) : room.room_icon && room.room_icon.startsWith("http") ? (
                    <img 
                      src={room.room_icon} 
                      alt="" 
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{
                        background: room.background_gradient || "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
                      }}
                    >
                      {room.room_icon || "🎮"}
                    </div>
                  )}
                  {/* TV mode: show TV icon from library */}
                  {showTVBadge ? (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded bg-white/90 flex items-center justify-center">
                      <QuizCategoryIcon iconSlug="retro-tv" size={16} className="w-4 h-4" />
                    </div>
                  ) : showLiveBadge ? (
                    <div className="absolute -top-1 -right-1">
                      <div className="px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white">
                        LIVE
                      </div>
                    </div>
                  ) : room.has_unread_activity ? (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                  ) : null}
                </div>
                
                {/* Room Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-foreground text-sm truncate">
                    {room.room_name || lounge?.label || localizeCategory(room.category_name) || t("extra.gameRoom")}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                    <span>{displayPlayerCount} {t("extra.players")}</span>
                    <span>•</span>
                    <span className="truncate">
                      {formatDistanceToNow(new Date(room.last_activity_at || room.created_at), { 
                        addSuffix: false, 
                      })}
                    </span>
                  </div>
                </div>
                
                {/* Participant Avatars (use TV players if session is active) */}
                <div className="flex -space-x-2">
                  {displayPlayers.slice(0, 3).map((p, i) => (
                    <SafeAvatar 
                      key={i} 
                      avatarUrl={p.avatar_url}
                      fallback={p.nickname || '?'}
                      className="w-6 h-6 border-2 border-background"
                      fallbackClassName="text-[10px] bg-muted"
                    />
                  ))}
                </div>
                
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
      
      <button 
        onClick={onViewAll}
        className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline py-1"
      >
        {t("extra.allRooms")}
        <ChevronRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
