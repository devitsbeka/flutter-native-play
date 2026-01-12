import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMyRooms } from "@/hooks/useMyRooms";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

export function LiveGamesWidget() {
  const navigate = useNavigate();
  const { rooms, loading } = useMyRooms();

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
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">შენი</h3>
        <span 
          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-destructive text-destructive-foreground"
        >
          LIVE
        </span>
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">თამაშები</h3>
      </div>

      {activeRooms.length === 0 ? (
        <div className="text-center py-5">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-[13px] text-muted-foreground">
            აქტიური თამაშები არ გაქვს
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
              className="bg-muted/30 rounded-xl p-3 cursor-pointer hover:bg-muted/50 transition-colors group border border-border/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-semibold text-foreground truncate">
                    {room.room_name || room.category_name || "თამაშის ოთახი"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {room.participants.length} მოთამაშე • {formatDistanceToNow(new Date(room.created_at), { addSuffix: true, locale: ka })}
                  </p>
                </div>
                <div className="flex items-center -space-x-2">
                  {room.participants.slice(0, 4).map((participant) => (
                    <Avatar
                      key={participant.user_id}
                      className="w-7 h-7 border-2 border-card"
                    >
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                        {participant.nickname.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer link */}
      {rooms.length > 0 && (
        <button
          onClick={() => navigate("/rooms")}
          className="w-full mt-3 text-center text-[13px] font-medium text-primary hover:underline"
        >
          ყველა ოთახი ({rooms.length})
        </button>
      )}
    </motion.div>
  );
}
