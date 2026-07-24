import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Plus, Users, Tv, Airplay, Cast, UserPlus, Trash2, MoreHorizontal, MonitorPlay } from "lucide-react";
import { useMyRooms, MyRoom, RoomFilter, isActiveTVSession, isLiveTVSession, isNewlyCreated } from "@/hooks/useMyRooms";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { supabase } from "@/integrations/supabase/client";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { Capacitor } from "@capacitor/core";
import roomCoverPlaceholder from "@/assets/room-cover-placeholder.png";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { LiveBadge } from "@/components/social/LiveBadge";
import danceFloorIcon from "@/assets/dance-floor.png";
import { GradientBackground, ROOM_GRADIENT_PRESETS } from "@/components/ui/noisy-gradient-backgrounds";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { FeatureOnboardingCarousel, hasSeenFeatureOnboarding } from "@/components/team/FeatureOnboardingCarousel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MyRoomsSectionProps {
  hideTV?: boolean;
  onCreateRoom?: () => void;
  onShowAllRooms?: () => void;
  vertical?: boolean;
  filter?: RoomFilter;
  searchQuery?: string;
  onNavigateToTab?: (tab: string) => void;
}

export function MyRoomsSection({ 
  hideTV = false, 
  onCreateRoom, 
  onShowAllRooms, 
  vertical = false,
  filter = "all",
  searchQuery = "",
  onNavigateToTab
}: MyRoomsSectionProps) {
  const isMobile = useIsMobile();
  const roomLimit = isMobile ? 10 : 15;
  const { rooms, loading, filter: activeFilter, refreshRooms } = useMyRooms({ filter, searchQuery, limit: roomLimit });
  const { enterRoom } = useMultiplayerV2();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showTVModal, setShowTVModal] = useState(false);
  
  const platform = Capacitor.getPlatform();
  const TVIcon = platform === 'ios' ? Airplay : platform === 'android' ? Cast : Tv;

  // Delete room handler
  const handleDeleteRoom = async (roomId: string) => {
    try {
      // Related tables cascade via ON DELETE CASCADE - no manual pre-deletes needed.
      // RLS only lets the host delete a room; a non-host delete silently matches
      // 0 rows with no error, so verify via the returned rows instead
      const { data: deleted, error } = await supabase
        .from("game_rooms")
        .delete()
        .eq("id", roomId)
        .select("id");

      if (error) throw error;
      if (!deleted || deleted.length === 0) {
        toast.error(t("extra.roomDeleteFailed"));
        return;
      }

      toast.success(t("extra.roomDeleted"));
      refreshRooms();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(t("extra.roomDeleteFailed"));
    }
  };

  // Clear unread activity when joining a room
  const handleJoin = async (room: MyRoom) => {
    // Clear the unread flag
    if (room.has_unread_activity) {
      await supabase
        .from("game_rooms")
        .update({ has_unread_activity: false })
        .eq("id", room.id);
    }
    
    // Check if TV session exists but is expired (3+ hours old)
    if (room.tv_session_id) {
      const { data: tvSession } = await supabase
        .from("tv_sessions")
        .select("id, status, created_at")
        .eq("id", room.tv_session_id)
        .maybeSingle();
      
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      const sessionCreatedAt = tvSession?.created_at ? new Date(tvSession.created_at).getTime() : 0;
      const isExpired = !tvSession || sessionCreatedAt < threeHoursAgo;
      const inactiveStatuses = ['completed', 'cancelled', 'results'];
      const isInactive = !tvSession || inactiveStatuses.includes(tvSession.status || '');
      
      // Clear expired/inactive TV session from room
      if (isExpired || isInactive) {
        console.log('[MyRoomsSection] Clearing expired/inactive TV session from room');
        await supabase
          .from("game_rooms")
          .update({ tv_session_id: null })
          .eq("id", room.id);
        
        // Reset room to waiting state
        await supabase
          .from("game_rooms")
          .update({ 
            status: "waiting",
            started_at: null,
            completed_at: null 
          })
          .eq("id", room.id);
        
        // Continue to lobby instead of erroring out
        enterRoom(room.room_code);
        return;
      }
      
      // Active TV session with players - navigate directly
      if (isActiveTVSession(room.tv_status) && room.tv_active_players > 0) {
        if (room.is_host) {
          navigate(`/tv/host/${room.tv_session_id}`);
        } else {
          navigate(`/join/session/${room.tv_session_id}`);
        }
        return;
      }
    }
    
    // If room is completed (non-TV), reset it to waiting for rematch
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
    
    // Standard room join - goes to lobby
    enterRoom(room.room_code);
  };

  // Check if user has seen feature onboarding
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => hasSeenFeatureOnboarding());

  if (loading) {
    // Reserve space to prevent layout jump
    return <div className="min-h-[200px]" />;
  }

  // Show feature onboarding carousel for new users with no rooms
  const showOnboardingCarousel = rooms.length === 0 && activeFilter === "all" && !hasSeenOnboarding;

  return (
    <div>
      {/* TV Mirror Modal */}
      <TVMirrorModal open={showTVModal} onOpenChange={setShowTVModal} />

      {/* Rooms List */}
      {rooms.length === 0 ? (
        showOnboardingCarousel ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-4"
          >
            <FeatureOnboardingCarousel 
              onNavigateToTab={onNavigateToTab}
              onComplete={() => setHasSeenOnboarding(true)}
              onCreateRoom={onCreateRoom}
              contextTab="rooms"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-4 flex flex-col items-center py-12 px-6 rounded-2xl bg-card border border-border"
          >
            <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4">
              <img src={danceFloorIcon} alt="" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              {activeFilter === "all" ? t("extra.noRoomsYet") : 
               activeFilter === "my_rooms" ? t("extra.noRoomsCreated") :
               activeFilter === "friends_rooms" ? t("extra.friendsNoRooms") :
               activeFilter === "active" ? t("extra.noActiveRoomsMsg") :
               t("extra.noCompletedRooms")}
            </h3>
            {activeFilter === "all" && (
              <p className="text-muted-foreground text-xs text-center mb-5">
                {t("extra.createRoomInvite")}
              </p>
            )}
            {onCreateRoom && activeFilter === "all" && (
              <ChunkyButton onClick={onCreateRoom} size="sm">{t("extra.addRoom")}</ChunkyButton>
            )}
          </motion.div>
        )
      ) : vertical ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-4 w-full max-w-full">
          {rooms.map((room, index) => (
            <RoomCardGrid
              key={room.id}
              room={room}
              index={index}
              onJoin={() => handleJoin(room)}
              onDelete={handleDeleteRoom}
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
                onDelete={handleDeleteRoom}
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
                <span className="text-sm font-medium text-muted-foreground">{t("extra.viewAllRooms")}</span>
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
  onDelete: (roomId: string) => void;
  fullWidth?: boolean;
}

function RoomCard({ room, index, onJoin, onDelete, fullWidth = false }: RoomCardProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Swipe state for mobile
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);
  const cardOpacity = useTransform(x, [-150, -100], [0.5, 1]);
  
  // Touch tracking for swipe vs tap detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  
  // Display name: only room_name, no fallback to code
  const displayName = room.room_name || "თამაშის ოთახი";
  const isCompleted = room.status === "completed";
  
  // NEW LOGIC: has_players_in_room = someone is actually INSIDE this room
  const hasPlayersInRoom = room.has_players_in_room;
  
  // TV session is active (TV connected)
  const hasTVSession = isActiveTVSession(room.tv_status);
  
  // Badge logic:
  // TV badge: Players in room + TV connected
  // LIVE badge: Players in room, no TV
  const showTVBadge = hasPlayersInRoom && hasTVSession;
  const showLiveBadge = hasPlayersInRoom && !hasTVSession;
  
  // For display: use TV active players if there's an active TV session with players
  const displayPlayerCount = hasTVSession && room.tv_active_players > 0 
    ? room.tv_active_players 
    : room.participants.length;
  
  // Use TV players for avatars when session is active, otherwise use room participants
  const displayPlayers = hasTVSession && room.tv_players.length > 0
    ? room.tv_players.map(p => ({ 
        user_id: p.user_id || '', 
        nickname: p.nickname, 
        avatar_url: p.avatar_url,
        is_host: false 
      }))
    : room.participants;
  
  // Always use the placeholder image
  const coverImage = roomCoverPlaceholder;
  
  // Get gradient preset based on index
  const gradientPreset = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];

  const handleDragEnd = (_: any, info: PanInfo) => {
    // If swiped left past threshold, show delete confirmation
    if (info.offset.x < -100) {
      setShowDeleteConfirm(true);
    }
    // Let framer-motion spring handle snap-back (no manual x.set)
    isSwiping.current = false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isSwiping.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const deltaX = Math.abs(e.clientX - touchStartX.current);
    const deltaY = Math.abs(e.clientY - touchStartY.current);
    // 8px threshold to distinguish swipe from tap
    if (deltaX > 8 || deltaY > 8) {
      isSwiping.current = true;
    }
  };

  const handleClick = () => {
    // Only trigger join if not swiping
    if (!isSwiping.current) {
      onJoin();
    }
  };

  const confirmDelete = () => {
    onDelete(room.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="relative">
        {/* Delete indicator background (mobile only) */}
        {isMobile && (
          <motion.div 
            className="absolute inset-0 bg-destructive rounded-2xl flex items-center justify-end pr-6"
            style={{ opacity: deleteOpacity }}
          >
            <motion.div style={{ scale: deleteScale }}>
              <Trash2 className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
          drag={isMobile ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={isMobile ? handleDragEnd : undefined}
          onPointerDown={isMobile ? handlePointerDown : undefined}
          onPointerMove={isMobile ? handlePointerMove : undefined}
          onClick={handleClick}
          style={{
            boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
            ...(isMobile ? { x } : {}),
          }}
          className={`${fullWidth ? "w-full" : "flex-shrink-0 w-[70vw] max-w-[280px] snap-start"} rounded-2xl overflow-hidden cursor-pointer ${!isMobile ? "transition-transform duration-200 hover:scale-[1.02]" : ""} active:scale-[0.98] ${
            room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
          }`}
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
            
            {/* Top row - Avatars left, Status badge + menu right */}
            <div className="relative z-10 px-2 pb-4">
              <div className="flex items-start justify-between mb-8">
                {/* Top left - Avatars (use TV players when active) */}
                <div className="flex -space-x-2">
                  {displayPlayers.slice(0, 3).map((p, idx) => {
                    // Check if this participant is online
                    const isOnline = room.online_participants.some(op => op.user_id === p.user_id);
                    
                    return (
                      <div 
                        key={p.user_id || idx} 
                        className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-white/20 shadow-md ${
                          isOnline 
                            ? "ring-2 ring-green-500 ring-offset-1 ring-offset-transparent" 
                            : "border-2 border-white/40"
                        }`}
                      >
                        <SafeAvatarImage
                          avatarUrl={p.avatar_url}
                          fallback={p.nickname || "?"}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </div>
                    );
                  })}
                  {displayPlayers.length > 3 && (
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-md">
                      <span className="text-xs font-bold text-white">
                        +{displayPlayers.length - 3}
                      </span>
                    </div>
                  )}
                </div>

                {/* Top right - Status badge + menu (desktop/tablet) */}
                <div className="flex items-center gap-2">
                  {/* Badge priority: TV > LIVE > New > Completed > Waiting */}
                  {showTVBadge ? (
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <QuizCategoryIcon iconSlug="retro-tv" size={24} className="w-6 h-6" />
                    </div>
                  ) : showLiveBadge ? (
                    <LiveBadge />
                  ) : room.is_host && room.status === "waiting" && isNewlyCreated(room.created_at) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/80 text-white font-bold text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {t("extra.roomStatusNew")}
                    </span>
                  ) : isCompleted ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
                      {t("extra.roomStatusCompleted")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {t("extra.roomStatusWaiting")}
                    </span>
                  )}
                  
                  {/* 3-dot menu (tablet/desktop only) */}
                  {!isMobile && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(true);
                          }}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("extra.rlDelete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
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
                  <h3 className="font-display text-white text-lg leading-tight truncate drop-shadow-md">
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
                  <span className="text-sm font-bold text-white">{displayPlayerCount}</span>
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle>{t("extra.rlDeleteRoom")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("extra.rlDeleteRoomConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0">{t("extra.rlCancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              {t("extra.rlDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Grid-style room card for grid layout
interface RoomCardGridProps {
  room: MyRoom;
  index: number;
  onJoin: () => void;
  onDelete: (roomId: string) => void;
}

function RoomCardGrid({ room, index, onJoin, onDelete }: RoomCardGridProps) {
  const { openProfile } = usePlayerProfile();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Swipe state for mobile
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);
  const cardOpacity = useTransform(x, [-150, -100], [0.5, 1]);
  
  // Touch tracking for swipe vs tap detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  
  const displayName = room.room_name || "თამაშის ოთახი";
  const isCompleted = room.status === "completed";
  
  // NEW LOGIC: has_players_in_room = someone is actually INSIDE this room
  const hasPlayersInRoom = room.has_players_in_room;
  const hasTVSession = isActiveTVSession(room.tv_status);
  
  // Badge logic: TV badge if players in room + TV connected, LIVE if players in room without TV
  const showTVBadge = hasPlayersInRoom && hasTVSession;
  const showLiveBadge = hasPlayersInRoom && !hasTVSession;
  
  // For display: use TV active players if there's an active TV session
  const displayPlayerCount = hasTVSession && room.tv_active_players > 0 
    ? room.tv_active_players 
    : room.participants.length;
  
  // Use TV players for avatars when session is active
  const displayPlayers = hasTVSession && room.tv_players.length > 0
    ? room.tv_players.map(p => ({ 
        user_id: p.user_id || '', 
        nickname: p.nickname, 
        avatar_url: p.avatar_url,
        is_host: false 
      }))
    : room.participants;
  
  const coverImage = roomCoverPlaceholder;
  const gradientPreset = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -100) {
      setShowDeleteConfirm(true);
    }
    // Let framer-motion spring handle snap-back (no manual x.set)
    isSwiping.current = false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isSwiping.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const deltaX = Math.abs(e.clientX - touchStartX.current);
    const deltaY = Math.abs(e.clientY - touchStartY.current);
    if (deltaX > 8 || deltaY > 8) {
      isSwiping.current = true;
    }
  };

  const handleClick = () => {
    if (!isSwiping.current) {
      onJoin();
    }
  };

  const confirmDelete = () => {
    onDelete(room.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="relative">
        {/* Delete indicator background (mobile only) */}
        {isMobile && (
          <motion.div 
            className="absolute inset-0 bg-destructive rounded-2xl flex items-center justify-end pr-6"
            style={{ opacity: deleteOpacity }}
          >
            <motion.div style={{ scale: deleteScale }}>
              <Trash2 className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 30 }}
          drag={isMobile ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={isMobile ? handleDragEnd : undefined}
          onPointerDown={isMobile ? handlePointerDown : undefined}
          onPointerMove={isMobile ? handlePointerMove : undefined}
          onClick={handleClick}
          style={{
            boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
            ...(isMobile ? { x, opacity: cardOpacity } : {}),
          }}
          className={`aspect-[1.45/1] md:aspect-[1.15/1] rounded-2xl overflow-hidden cursor-pointer ${!isMobile ? "transition-transform duration-200 hover:scale-[1.02]" : ""} active:scale-[0.98] ${
            room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
          }`}
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
            
            {/* Top Row: Status Badge + Menu */}
            <div className="relative z-10 flex items-start justify-between">
              {/* Badge priority: TV > LIVE > New > Completed > Waiting */}
              {showTVBadge ? (
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <QuizCategoryIcon iconSlug="retro-tv" size={24} className="w-6 h-6" />
                </div>
              ) : showLiveBadge ? (
                <LiveBadge />
              ) : room.is_host && room.status === "waiting" && isNewlyCreated(room.created_at) ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/80 text-white font-bold text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {t("extra.roomStatusNew")}
                </span>
              ) : isCompleted ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
                  {t("extra.roomStatusCompleted")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {t("extra.roomStatusWaiting")}
                </span>
              )}
              
              {/* 3-dot menu (tablet/desktop only) */}
              {!isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("extra.rlDelete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <h3 className="font-display text-white text-lg leading-tight line-clamp-2 drop-shadow-md">
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
                {/* Left: Player count (use TV active players if available) */}
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-2.5 py-1.5">
                  <Users className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">
                    {displayPlayerCount}
                  </span>
                </div>
                
                {/* Right: Avatars (use TV players if session is active) */}
                <div className="flex -space-x-2">
                  {displayPlayers.slice(0, 4).map((p, idx) => {
                    // Check if this participant is online
                    const isOnline = room.online_participants.some(op => op.user_id === p.user_id);
                    
                    return (
                      <div 
                        key={p.user_id || idx} 
                        className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/20 cursor-pointer hover:scale-110 transition-transform active:scale-95 shadow-md ${
                          isOnline 
                            ? "ring-2 ring-green-500 ring-offset-1 ring-offset-transparent" 
                            : "border-2 border-white/40"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.user_id) openProfile(p.user_id);
                        }}
                      >
                        <SafeAvatarImage
                          avatarUrl={p.avatar_url}
                          fallback={p.nickname || "?"}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </div>
                    );
                  })}
                  {displayPlayers.length > 4 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white/40 bg-white/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-white text-[10px] font-bold">
                        +{displayPlayers.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GradientBackground>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle>{t("extra.rlDeleteRoom")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("extra.rlDeleteRoomConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0">{t("extra.rlCancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              {t("extra.rlDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
