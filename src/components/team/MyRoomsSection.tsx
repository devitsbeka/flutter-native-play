import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Gamepad2, Tv, Airplay, Cast, UserPlus } from "lucide-react";
import { useMyRooms, MyRoom, RoomFilter, RoomSort } from "@/hooks/useMyRooms";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { supabase } from "@/integrations/supabase/client";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { Capacitor } from "@capacitor/core";
import roomCoverPlaceholder from "@/assets/room-cover-placeholder.png";
import { getGradientById } from "@/config/roomGradients";

interface MyRoomsSectionProps {
  hideTV?: boolean;
  onCreateRoom?: () => void;
  onShowAllRooms?: () => void;
  vertical?: boolean;
  filter?: RoomFilter;
  sort?: RoomSort;
  searchQuery?: string;
}

export function MyRoomsSection({ 
  hideTV = false, 
  onCreateRoom, 
  onShowAllRooms, 
  vertical = false,
  filter = "all",
  sort = "recent",
  searchQuery = ""
}: MyRoomsSectionProps) {
  const { rooms, loading, filter: activeFilter } = useMyRooms({ filter, sort, searchQuery });
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
    // Reserve space to prevent layout jump
    return <div className="min-h-[200px]" />;
  }

  return (
    <div>
      {/* TV Mirror Modal */}
      <TVMirrorModal open={showTVModal} onOpenChange={setShowTVModal} />

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-4 flex flex-col items-center py-8 rounded-2xl bg-card border border-border"
        >
          <Gamepad2 className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm text-center">
            {activeFilter === "my_rooms" && "შენ ჯერ ოთახი არ შეგიქმნია"}
            {activeFilter === "friends_rooms" && "მეგობრებს ოთახები არ აქვთ"}
            {activeFilter === "active" && "აქტიური ოთახები არ არის"}
            {activeFilter === "completed" && "დასრულებული ოთახები არ არის"}
            {activeFilter === "all" && t('team.noActiveRooms')}
          </p>
          {(activeFilter === "my_rooms" || activeFilter === "all") && onCreateRoom && (
            <ChunkyButton 
              variant="primary" 
              size="sm" 
              className="mt-4"
              onClick={onCreateRoom}
            >
              <Plus className="w-4 h-4 mr-1" />
              ოთახის შექმნა
            </ChunkyButton>
          )}
        </motion.div>
      ) : vertical ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {rooms.map((room, index) => (
            <RoomCard
              key={room.id}
              room={room}
              index={index}
              onJoin={() => handleJoin(room)}
              fullWidth
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
          <div className="flex gap-3 px-4">
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
                className="flex-shrink-0 w-[70vw] max-w-[280px] snap-start rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                style={{
                  boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
                }}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-6 h-6 text-muted-foreground" />
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
  fullWidth?: boolean;
}

function RoomCard({ room, index, onJoin, fullWidth = false }: RoomCardProps) {
  const { t } = useLanguage();
  
  // Display name: only room_name, no fallback to code
  const displayName = room.room_name || "თამაშის ოთახი";
  const isPlaying = room.status === "playing";
  const isCompleted = room.status === "completed";
  
  // Always use the placeholder image
  const coverImage = roomCoverPlaceholder;
  
  // Get gradient from room or fallback
  const gradient = getGradientById(room.background_gradient);

  return (
    <motion.div
      initial={{ opacity: 0, x: fullWidth ? 0 : 20, y: fullWidth ? 10 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onJoin}
      className={`${fullWidth ? "w-full" : "flex-shrink-0 w-[70vw] max-w-[280px] snap-start"} rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
      }}
    >
      {/* Full card with dynamic gradient background */}
      <div 
        className="relative px-2.5 pb-2.5 pt-6 rounded-2xl overflow-hidden"
        style={{ background: gradient?.gradient || 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.3))' }}
      >
        {/* Cover image with radial fade - flip based on index for variety */}
        <div 
          className="absolute inset-0 opacity-40 overflow-hidden"
          style={{
            maskImage: 'radial-gradient(ellipse 140% 120% at 50% 0%, black 0%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 140% 120% at 50% 0%, black 0%, transparent 75%)',
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scaleX(${index % 2 === 0 ? 1 : -1}) scaleY(${index % 4 < 2 ? 1 : -1})`,
            }}
          />
        </div>
        
        {/* Top section with status, room name, category */}
        <div className="relative z-10 px-2 pb-4">
          {/* Status badge row */}
          <div className="flex items-center justify-between mb-3">
            {isPlaying ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
                დასრულდა
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
                მოლოდინი
              </span>
            )}
          </div>
          
          {/* Room name - white text */}
          <h3 className="font-bold text-white text-lg leading-tight truncate mb-1 drop-shadow-md">
            {displayName}
          </h3>
          
          {/* Category - white text */}
          {room.category_name && (
            <p className="text-sm text-white/80 truncate font-medium drop-shadow-sm">
              {room.category_name}
            </p>
          )}
        </div>
        
        {/* Bottom section - frosted glass style */}
        <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-4 rounded-xl">
          {/* Bottom row: players and avatars */}
          <div className="flex items-center justify-between">
            {/* Players count */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <Users className="w-4 h-4 text-white/80" />
              <span className="text-sm font-bold text-white">{room.participants.length}</span>
            </div>
            
            {/* Avatars */}
            <div className="flex -space-x-3">
              {room.participants.slice(0, 3).map((p) => (
                <div 
                  key={p.user_id} 
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-white/20"
                >
                  {p.avatar_url ? (
                    <img 
                      src={p.avatar_url} 
                      alt={p.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/40 to-white/20 flex items-center justify-center text-white text-sm font-bold">
                      {p.nickname?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
              ))}
              {room.participants.length > 3 && (
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    +{room.participants.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
