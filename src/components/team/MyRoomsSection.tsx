import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Gamepad2, Tv, Airplay, Cast } from "lucide-react";
import { useMyRooms, MyRoom } from "@/hooks/useMyRooms";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { supabase } from "@/integrations/supabase/client";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { Capacitor } from "@capacitor/core";

interface MyRoomsSectionProps {
  hideTV?: boolean;
  onCreateRoom?: () => void;
  onShowAllRooms?: () => void;
}

export function MyRoomsSection({ hideTV = false, onCreateRoom, onShowAllRooms }: MyRoomsSectionProps) {
  const { rooms, loading } = useMyRooms();
  const { enterRoom } = useMultiplayerV2();
  const { t } = useLanguage();
  const [showTVModal, setShowTVModal] = useState(false);
  
  const platform = Capacitor.getPlatform();
  const TVIcon = platform === 'ios' ? Airplay : platform === 'android' ? Cast : Tv;

  // Clear unread activity when joining a room
  const handleJoin = async (room: MyRoom) => {
    // Clear the unread flag
    if (room.has_unread_activity) {
      await supabase
        .from("game_rooms")
        .update({ has_unread_activity: false })
        .eq("id", room.id);
    }
    
    // If room is completed, reset it to waiting for rematch
    if (room.status === "completed") {
      await supabase
        .from("game_rooms")
        .update({ 
          status: "waiting",
          started_at: null,
          completed_at: null 
        })
        .eq("id", room.id);
      
      // Clear room questions for new game
      await supabase
        .from("room_questions")
        .delete()
        .eq("room_id", room.id);
      
      // Clear player answers
      await supabase
        .from("player_answers")
        .delete()
        .eq("room_id", room.id);
      
      // Reset all participants to joined status
      await supabase
        .from("room_participants")
        .update({ 
          status: "joined",
          score: 0,
          current_question: 0
        })
        .eq("room_id", room.id);
    }
    
    enterRoom(room.room_code);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 tracking-wide">{t('team.yourRooms')}</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-44 h-36 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* TV Mirror Modal */}
      <TVMirrorModal open={showTVModal} onOpenChange={setShowTVModal} />

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200"
        >
          <Gamepad2 className="w-12 h-12 text-slate-400 mb-3" />
          <p className="text-slate-500 text-sm">{t('team.noActiveRooms')}</p>
        </motion.div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 pb-4 scrollbar-hide">
          <div className="flex gap-3 pr-4">
            {rooms.map((room, index) => (
              <RoomCard
                key={room.id}
                room={room}
                index={index}
                onJoin={() => handleJoin(room)}
              />
            ))}
            {/* View All Card */}
            {onShowAllRooms && (
              <motion.button
                onClick={onShowAllRooms}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rooms.length * 0.05 }}
                className="flex-shrink-0 w-44 h-36 p-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">ყველას ნახვა</span>
              </motion.button>
            )}
          </div>
        </div>
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
  const { t } = useLanguage();
  
  // Display name: room_name or fallback to generated name
  const displayName = room.room_name || `ოთახი #${room.room_code.slice(-4)}`;
  const isPlaying = room.status === "playing";
  const isCompleted = room.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onJoin}
      className={`flex-shrink-0 w-40 rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
      }}
    >
      {/* Top colored section */}
      <div className="relative bg-gradient-to-br from-primary/90 to-primary px-3 pt-3 pb-8">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-2">
          {isPlaying ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/20 text-primary-foreground/80 text-[10px] font-bold">
              დასრულდა
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 text-primary-foreground text-[10px] font-bold">
              მოლოდინი
            </span>
          )}
          
          {/* Room code */}
          <span className="text-[10px] font-mono text-primary-foreground/70">
            #{room.room_code.slice(-4)}
          </span>
        </div>
        
        {/* Room name */}
        <h3 className="font-bold text-primary-foreground text-base leading-tight truncate">
          {displayName}
        </h3>
      </div>
      
      {/* Bottom white section */}
      <div className="bg-card px-3 py-3 -mt-4 rounded-t-xl relative">
        {/* Category */}
        {room.category_name && (
          <p className="text-xs text-muted-foreground truncate mb-2">
            {room.category_name}
          </p>
        )}
        
        {/* Bottom row: players and avatars */}
        <div className="flex items-center justify-between">
          {/* Players count */}
          <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">{room.participants.length}</span>
          </div>
          
          {/* Avatars */}
          <div className="flex -space-x-2">
            {room.participants.slice(0, 3).map((p) => (
              <div 
                key={p.user_id} 
                className="w-7 h-7 rounded-full overflow-hidden border-2 border-card flex-shrink-0 bg-muted"
              >
                {p.avatar_url ? (
                  <img 
                    src={p.avatar_url} 
                    alt={p.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {p.nickname?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
            ))}
            {room.participants.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">
                  +{room.participants.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
