import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMyRooms } from "@/hooks/useMyRooms";
import { ChevronRight, Users } from "lucide-react";
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
      <div className="bg-card rounded-xl p-4 shadow-lg border border-border/50">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-4 shadow-lg border border-border/50"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <h3 className="text-xs font-semibold text-foreground">შენი</h3>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/20 text-destructive">
          LIVE
        </span>
        <h3 className="text-xs font-semibold text-foreground">თამაშები</h3>
      </div>

      {activeRooms.length === 0 ? (
        <div className="text-center py-4">
          <Users className="w-8 h-8 mx-auto text-muted-foreground/50 mb-1" />
          <p className="text-xs text-muted-foreground">
            აქტიური თამაშები არ გაქვს
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/room/${room.room_code}`)}
              className="bg-muted/50 rounded-lg p-2.5 cursor-pointer hover:bg-muted transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-foreground truncate">
                    {room.room_name || room.category_name || "თამაშის ოთახი"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {room.participants.length} მოთამაშე
                  </p>
                </div>
                <div className="flex items-center -space-x-1.5">
                  {room.participants.slice(0, 4).map((participant) => (
                    <Avatar
                      key={participant.user_id}
                      className="w-5 h-5 border border-card"
                    >
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
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
          className="w-full mt-2 text-center text-[10px] text-primary hover:underline"
        >
          ყველა ოთახი ({rooms.length})
        </button>
      )}
    </motion.div>
  );
}
