import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMyRooms } from "@/hooks/useMyRooms";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
        className="bg-card rounded-2xl p-5 border-2 border-border"
        style={{
          boxShadow: "inset 0 2px 0 0 rgba(255,255,255,0.1), 0 4px 0 0 hsl(var(--border)), 0 6px 15px -3px rgba(0,0,0,0.15)",
        }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="h-16 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 border-2 border-border"
      style={{
        boxShadow: "inset 0 2px 0 0 rgba(255,255,255,0.1), 0 4px 0 0 hsl(var(--border)), 0 6px 15px -3px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-bold text-foreground">შენი</h3>
        <span 
          className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive text-destructive-foreground"
          style={{
            boxShadow: "0 0 10px hsl(var(--destructive) / 0.5)",
          }}
        >
          LIVE
        </span>
        <h3 className="text-base font-bold text-foreground">თამაშები</h3>
      </div>

      {activeRooms.length === 0 ? (
        <div className="text-center py-5">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
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
              className="bg-muted/50 rounded-xl p-3 cursor-pointer hover:bg-muted transition-colors group border border-border/50"
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 2px 0 0 hsl(var(--border) / 0.5)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {room.room_name || room.category_name || "თამაშის ოთახი"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {room.participants.length} მოთამაშე
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
          className="w-full mt-3 text-center text-sm font-medium text-primary hover:underline"
        >
          ყველა ოთახი ({rooms.length})
        </button>
      )}
    </motion.div>
  );
}
