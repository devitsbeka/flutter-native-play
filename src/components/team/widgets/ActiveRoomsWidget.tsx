import { motion } from "framer-motion";
import { Layers, ChevronRight, Tv } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyRooms, isActiveTVSession } from "@/hooks/useMyRooms";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { LiveBadge } from "@/components/social/LiveBadge";

interface ActiveRoomsWidgetProps {
  onViewAll: () => void;
  onJoinRoom: (roomCode: string) => void;
}

export function ActiveRoomsWidget({ onViewAll, onJoinRoom }: ActiveRoomsWidgetProps) {
  const navigate = useNavigate();
  const { rooms, loading } = useMyRooms();
  
  // Filter for active rooms or rooms with unread activity or others online, prioritize LIVE sessions first, limit to 3
  const activeRooms = rooms
    .filter(r => r.has_unread_activity || r.status === "waiting" || r.status === "playing" || isActiveTVSession(r.tv_status) || r.has_others_online)
    .sort((a, b) => {
      // Others online or LIVE sessions first
      const aLive = isActiveTVSession(a.tv_status) || a.has_others_online;
      const bLive = isActiveTVSession(b.tv_status) || b.has_others_online;
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
          აქტიური ოთახები
        </span>
        {activeRooms.some(r => r.has_unread_activity || isActiveTVSession(r.tv_status) || r.has_others_online) && (
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </div>

      <div className="rounded-2xl bg-muted/50 border border-border/50 overflow-hidden">
        <div className="divide-y divide-border/50">
          {activeRooms.map((room) => {
            const hasTVSession = isActiveTVSession(room.tv_status);
            const isPlaying = room.status === "playing";
            const hasOthersOnline = room.has_others_online;
            const showLiveBadge = isPlaying || hasTVSession || hasOthersOnline;
            
            const displayPlayerCount = hasTVSession && room.tv_active_players > 0 
              ? room.tv_active_players 
              : room.participants.length;
            const displayPlayers = hasTVSession && room.tv_players.length > 0
              ? room.tv_players
              : room.participants;
              
            return (
              <button
                key={room.id}
                onClick={() => onJoinRoom(room.room_code)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors text-left"
              >
                {/* Room Icon/Avatar */}
                <div className="relative flex-shrink-0">
                  {room.room_icon && room.room_icon.startsWith("http") ? (
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
                  {showLiveBadge && (
                    <div className="absolute -top-1 -right-1 flex items-center gap-0.5">
                      <div className="px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white flex items-center gap-0.5">
                        LIVE
                        {hasTVSession && <Tv className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                  )}
                  {room.has_unread_activity && !showLiveBadge && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                  )}
                </div>
                
                {/* Room Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-foreground text-sm truncate">
                    {room.room_name || room.category_name || "თამაშის ოთახი"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                    <span>{displayPlayerCount} მოთამაშე</span>
                    <span>•</span>
                    <span className="truncate">
                      {formatDistanceToNow(new Date(room.last_activity_at || room.created_at), { 
                        addSuffix: false, 
                        locale: ka 
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
        ყველა ოთახი
        <ChevronRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
