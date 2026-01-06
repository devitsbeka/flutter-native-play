import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMyRooms } from "@/hooks/useMyRooms";
import { ChevronRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function LiveGamesWidget() {
  const navigate = useNavigate();
  const { rooms, loading } = useMyRooms();

  // Filter to show only active rooms (waiting or playing)
  const activeRooms = rooms.filter(
    (room) => room.status === "waiting" || room.status === "playing"
  ).slice(0, 3);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-lg border border-border/50">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 shadow-lg border border-border/50"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">შენი</h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/20 text-destructive">
          LIVE
        </span>
        <h3 className="text-sm font-semibold text-foreground">თამაშები</h3>
      </div>

      {activeRooms.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            აქტიური თამაშები არ გაქვს
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            შექმენი ოთახი ან შეუერთდი არსებულს
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/room/${room.room_code}`)}
              className="bg-muted/50 rounded-xl p-3 cursor-pointer hover:bg-muted transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {room.room_name || room.category_name || "თამაშის ოთახი"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.participants.length} მოთამაშე
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>

              {/* Participant avatars */}
              <div className="flex items-center mt-2 -space-x-2">
                {room.participants.slice(0, 6).map((participant, i) => (
                  <Avatar
                    key={participant.user_id}
                    className="w-7 h-7 border-2 border-card"
                  >
                    <AvatarImage src={participant.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {participant.nickname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {room.participants.length > 6 && (
                  <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">
                      +{room.participants.length - 6}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer link */}
      {rooms.length > 0 && (
        <button
          onClick={() => navigate("/rooms")}
          className="w-full mt-4 text-center text-xs text-primary hover:underline"
        >
          ყველა ოთახი ({rooms.length})
        </button>
      )}
    </motion.div>
  );
}
