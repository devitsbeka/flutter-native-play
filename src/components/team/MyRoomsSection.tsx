import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Tv, Airplay, Cast, UserPlus } from "lucide-react";
import { useMyRooms, MyRoom, RoomFilter, RoomSort } from "@/hooks/useMyRooms";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { supabase } from "@/integrations/supabase/client";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { Capacitor } from "@capacitor/core";
import roomCoverPlaceholder from "@/assets/room-cover-placeholder.png";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { LiveBadge } from "@/components/social/LiveBadge";
import glitchIcon from "@/assets/glitch.png";
import { GradientBackground, ROOM_GRADIENT_PRESETS } from "@/components/ui/noisy-gradient-backgrounds";

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
        </motion.div>
      ) : vertical ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-4 w-full max-w-full">
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
  
  // Get gradient preset based on index
  const gradientPreset = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];

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
      <GradientBackground
        colors={gradientPreset.colors}
        gradientSize="125% 125%"
        gradientOrigin="bottom-middle"
        enableNoise={false}
        className="relative px-2.5 pb-2.5 pt-6 rounded-2xl"
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
        
        {/* Top row - Avatars left, Status badge right */}
        <div className="relative z-10 px-2 pb-4">
          <div className="flex items-start justify-between mb-8">
            {/* Top left - Avatars */}
            <div className="flex -space-x-2">
              {room.participants.slice(0, 3).map((p) => (
                <div 
                  key={p.user_id} 
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40 flex-shrink-0 bg-white/20 shadow-md"
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
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-md">
                  <span className="text-xs font-bold text-white">
                    +{room.participants.length - 3}
                  </span>
                </div>
              )}
            </div>

            {/* Top right - Status badge */}
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
          
          {/* Bottom left - Room name with icon and category */}
          <div className="flex items-center gap-2.5 mb-1">
            {room.room_icon && (
              <img 
                src={room.room_icon} 
                alt="" 
                className="w-10 h-10 object-contain drop-shadow-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-lg leading-tight truncate drop-shadow-md">
                {displayName}
              </h3>
              {room.category_name && (
                <p className="text-sm text-white/70 truncate font-medium drop-shadow-sm">
                  {room.category_name}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom section - players count only (avatars moved to top) */}
        <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-3 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/80" />
              <span className="text-sm font-bold text-white">{room.participants.length} მოთამაშე</span>
            </div>
            <p className="text-xs text-white/60">
              {formatDistanceToNow(new Date(room.created_at), { 
                addSuffix: true, 
                locale: ka 
              })}
            </p>
          </div>
        </div>
      </GradientBackground>
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
  const { openProfile } = usePlayerProfile();
  const displayName = room.room_name || "თამაშის ოთახი";
  const isPlaying = room.status === "playing";
  const isCompleted = room.status === "completed";
  
  const coverImage = roomCoverPlaceholder;
  const gradientPreset = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      onClick={onJoin}
      className={`aspect-[1.45/1] md:aspect-[1.15/1] rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
      }}
    >
      <GradientBackground
        colors={gradientPreset.colors}
        gradientSize="125% 125%"
        gradientOrigin="bottom-middle"
        enableNoise={false}
        className="relative w-full h-full p-3 flex flex-col"
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
        
        {/* Top Left: Status Badge */}
        <div className="relative z-10">
          {isPlaying ? (
            <LiveBadge />
          ) : isCompleted ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
              დასრულდა
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              მოლოდინი
            </span>
          )}
        </div>
        
        {/* Middle: Icon + Title + Category + Time */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-3">
          <div className="flex items-center gap-3">
            {room.room_icon && (
              <img 
                src={room.room_icon} 
                alt="" 
                className="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-lg flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-white text-lg md:text-xl leading-tight line-clamp-2 drop-shadow-md">
                {displayName}
              </h3>
              {room.category_name && (
                <p className="text-white/70 text-sm truncate mt-0.5">{room.category_name}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom: Glass container with player count + avatars */}
        <div className="relative z-10">
          <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
            {/* Left: Player count */}
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-2.5 py-1.5">
              <Users className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">
                {room.participants.length}
              </span>
            </div>
            
            {/* Right: Avatars */}
            <div className="flex -space-x-2">
              {room.participants.slice(0, 4).map((p) => (
                <div 
                  key={p.user_id} 
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/40 flex-shrink-0 bg-white/20 cursor-pointer hover:scale-110 transition-transform active:scale-95 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProfile(p.user_id);
                  }}
                >
                  {p.avatar_url ? (
                    <img 
                      src={p.avatar_url} 
                      alt={p.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/40 to-white/20 flex items-center justify-center text-white text-xs font-bold">
                      {p.nickname?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
              ))}
              {room.participants.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-white/40 bg-white/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white text-[10px] font-bold">
                    +{room.participants.length - 4}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </GradientBackground>
    </motion.div>
  );
}
