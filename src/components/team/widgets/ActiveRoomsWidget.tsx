import { motion } from "framer-motion";
import { Layers, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyRooms } from "@/hooks/useMyRooms";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

interface ActiveRoomsWidgetProps {
  onViewAll: () => void;
  onJoinRoom: (roomCode: string) => void;
}

export function ActiveRoomsWidget({ onViewAll, onJoinRoom }: ActiveRoomsWidgetProps) {
  const navigate = useNavigate();
  const { rooms, loading } = useMyRooms();
  
  // Filter for active rooms or rooms with unread activity, limit to 3
  const activeRooms = rooms
    .filter(r => r.has_unread_activity || r.status === "waiting" || r.status === "playing")
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
        {activeRooms.some(r => r.has_unread_activity) && (
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </div>

      <div className="rounded-2xl bg-muted/50 border border-border/50 overflow-hidden">
        <div className="divide-y divide-border/50">
          {activeRooms.map((room) => (
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
                {room.status === "playing" && (
                  <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white">
                    LIVE
                  </div>
                )}
                {room.has_unread_activity && room.status !== "playing" && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                )}
              </div>
              
              {/* Room Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {room.room_name || room.category_name || "თამაშის ოთახი"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                  <span>{room.participants.length} მოთამაშე</span>
                  <span>•</span>
                  <span className="truncate">
                    {formatDistanceToNow(new Date(room.last_activity_at || room.created_at), { 
                      addSuffix: false, 
                      locale: ka 
                    })}
                  </span>
                </div>
              </div>
              
              {/* Participant Avatars */}
              <div className="flex -space-x-2">
                {room.participants.slice(0, 3).map((p, i) => (
                  <Avatar key={i} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {p.nickname?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
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
