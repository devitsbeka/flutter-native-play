import { motion } from "framer-motion";
import { Plus, Users, Gamepad2 } from "lucide-react";
import { useMyRooms, MyRoom } from "@/hooks/useMyRooms";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface MyRoomsSectionProps {
  onCreateRoom?: () => void;
}

export function MyRoomsSection({ onCreateRoom }: MyRoomsSectionProps) {
  const { rooms, loading } = useMyRooms();
  const { joinRoom } = useMultiplayer();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 tracking-wide">შენი ოთახები</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-48 h-36 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 tracking-wide">შენი ოთახები</span>
      </div>

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200"
        >
          <Gamepad2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-3">აქტიური ოთახი არ გაქვს</p>
          {onCreateRoom && (
            <ChunkyButton
              variant="purple"
              size="sm"
              onClick={onCreateRoom}
              icon={<Plus className="w-4 h-4" />}
            >
              ოთახის შექმნა
            </ChunkyButton>
          )}
        </motion.div>
      ) : (
        <ScrollArea className="w-full -mx-4 px-4">
          <div className="flex gap-3 pb-2">
            {rooms.map((room, index) => (
              <RoomCard
                key={room.id}
                room={room}
                index={index}
                onJoin={() => joinRoom(room.room_code)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      )}
    </div>
  );
}

interface RoomCardProps {
  room: MyRoom;
  index: number;
  onJoin: () => void;
}

function RoomCard({ room, index, onJoin }: RoomCardProps) {
  const statusConfig = {
    waiting: { label: "მოლოდინი", color: "bg-amber-100 text-amber-700" },
    ready: { label: "მზადაა", color: "bg-green-100 text-green-700" },
    playing: { label: "მიმდინარე", color: "bg-blue-100 text-blue-700" },
  };

  const status = statusConfig[room.status as keyof typeof statusConfig] || statusConfig.waiting;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 w-52 p-4 rounded-2xl bg-gradient-to-br from-white via-white to-purple-50 shadow-lg border border-purple-100 relative overflow-hidden"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-xl" />
      
      {/* Status badge */}
      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color} mb-2`}>
        {status.label}
      </div>

      {/* Room code / Category */}
      <div className="mb-3">
        <p className="font-bold text-slate-800 text-sm truncate">
          {room.category_name || `ოთახი ${room.room_code.slice(-4)}`}
        </p>
        <p className="text-xs text-slate-500">
          კოდი: {room.room_code}
        </p>
      </div>

      {/* Participants */}
      <div className="flex items-center gap-1 mb-4">
        <div className="flex -space-x-2">
          {room.participants.slice(0, 4).map((p) => (
            <div 
              key={p.user_id} 
              className="w-7 h-7 rounded-full overflow-hidden border-2 border-white flex-shrink-0 bg-slate-200"
            >
              {p.avatar_url ? (
                <img 
                  src={p.avatar_url} 
                  alt={p.nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {p.nickname?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
          ))}
        </div>
        {room.participants.length > 4 && (
          <span className="text-xs text-slate-500 ml-1">
            +{room.participants.length - 4}
          </span>
        )}
        <Users className="w-3 h-3 text-slate-400 ml-auto" />
        <span className="text-xs text-slate-500">{room.participants.length}</span>
      </div>

      {/* Join button */}
      <motion.button
        onClick={onJoin}
        className="w-full py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {room.status === "playing" ? "გაგრძელება" : "შეუერთდი"}
      </motion.button>
    </motion.div>
  );
}
