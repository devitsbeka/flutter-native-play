import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Tv, Airplay, Cast, UserPlus } from "lucide-react";
import { useMyRooms, MyRoom, RoomFilter, RoomSort } from "@/hooks/useMyRooms";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { supabase } from "@/integrations/supabase/client";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { Capacitor } from "@capacitor/core";
import roomCoverPlaceholder from "@/assets/room-cover-placeholder.png";
import { getGradientById } from "@/config/roomGradients";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { LiveBadge } from "@/components/social/LiveBadge";
import glitchIcon from "@/assets/glitch.png";

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
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3">
            <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
          </div>
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
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {rooms.map((room, index) => (
            <RoomCardGrid
              key={room.id}
              room={room}
              index={index}
              onJoin={() => handleJoin(room)}
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
              <LiveBadge />
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
          
          {/* Room name with icon */}
          <div className="flex items-center gap-2 mb-1">
            {room.room_icon && (
              <img 
                src={room.room_icon} 
                alt="" 
                className="w-6 h-6 object-contain drop-shadow-md"
              />
            )}
            <h3 className="font-bold text-white text-lg leading-tight truncate drop-shadow-md">
              {displayName}
            </h3>
          </div>
          
          {/* Category - white text */}
          {room.category_name && (
            <p className="text-sm text-white/80 truncate font-medium drop-shadow-sm">
              {room.category_name}
            </p>
          )}
          
          {/* Created date */}
          <p className="text-xs text-white/60 mt-1">
            {formatDistanceToNow(new Date(room.created_at), { 
              addSuffix: true, 
              locale: ka 
            })}
          </p>
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

// Grid-style room card for grid layout
interface RoomCardGridProps {
  room: MyRoom;
  index: number;
  onJoin: () => void;
}

function RoomCardGrid({ room, index, onJoin }: RoomCardGridProps) {
  const displayName = room.room_name || "თამაშის ოთახი";
  const isPlaying = room.status === "playing";
  const isCompleted = room.status === "completed";
  
  const coverImage = roomCoverPlaceholder;
  const gradient = getGradientById(room.background_gradient);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      onClick={onJoin}
      className={`aspect-square rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
      }}
    >
      <div 
        className="relative w-full h-full p-3 flex flex-col"
        style={{ background: gradient?.gradient || 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.3))' }}
      >
        {/* Cover image with radial fade */}
        <div 
          className="absolute inset-0 opacity-30 overflow-hidden"
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
              transform: `scaleX(${index % 2 === 0 ? 1 : -1})`,
            }}
          />
        </div>
        
        {/* Top: Status badge */}
        <div className="relative z-10">
          {isPlaying ? (
            <LiveBadge />
          ) : isCompleted ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-[10px]">
              დასრულდა
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-[10px]">
              მოლოდინი
            </span>
          )}
        </div>
        
        {/* Middle: Room icon */}
        {room.room_icon && (
          <div className="flex-1 flex items-center justify-center relative z-10">
            <img 
              src={room.room_icon} 
              alt="" 
              className="w-12 h-12 object-contain drop-shadow-lg"
            />
          </div>
        )}
        
        {/* Bottom: Name and participants */}
        <div className="relative z-10 mt-auto">
          <h3 className="font-bold text-white text-sm leading-tight truncate drop-shadow-md mb-1">
            {displayName}
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-lg">
              <Users className="w-3 h-3 text-white/80" />
              <span className="text-xs font-bold text-white">{room.participants.length}</span>
            </div>
            
            {/* Small avatars */}
            <div className="flex -space-x-2">
              {room.participants.slice(0, 2).map((p) => (
                <div 
                  key={p.user_id} 
                  className="w-6 h-6 rounded-full overflow-hidden border border-white/30 flex-shrink-0 bg-white/20"
                >
                  {p.avatar_url ? (
                    <img 
                      src={p.avatar_url} 
                      alt={p.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/40 to-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                      {p.nickname?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
