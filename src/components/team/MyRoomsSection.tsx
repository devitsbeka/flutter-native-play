import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Plus, Users, Tv, Airplay, Cast, UserPlus, Trash2, LogOut, MonitorPlay, Play } from "lucide-react";
import { useMyRooms, MyRoom, RoomFilter, isActiveTVSession } from "@/hooks/useMyRooms";
import iconKingLounge from "@/assets/play-chooser/icon-king.webp";
import iconBattleLounge from "@/assets/play-chooser/icon-crate.png";
import iconWordsLounge from "@/assets/play-chooser/icon-words.webp";
import iconPartyLounge from "@/assets/group-of-people.png";
import { roomKind, routeForRoom } from "@/utils/roomRoutes";
import { roomCardAction } from "@/utils/roomCardAction";
import { RoomCardPlayButton } from "@/components/team/RoomCardPlayButton";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { supabase } from "@/integrations/supabase/client";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { Capacitor } from "@capacitor/core";
import { formatDistanceToNow } from "date-fns";
import { dateLocaleFor } from "@/utils/dateLocale";
import danceFloorIcon from "@/assets/dance-floor.png";
import crownIcon from "@/assets/crown-icon.png";
import retroTv3d from "@/assets/retro-tv-3d.png";
import { GradientBackground, ROOM_GRADIENT_PRESETS } from "@/components/ui/noisy-gradient-backgrounds";
import { useRoomAge } from "@/hooks/useRoomAge";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/lib/toast";
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
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { StartHereCard } from "@/components/home/StartHereCard";

interface MyRoomsSectionProps {
  hideTV?: boolean;
  onCreateRoom?: () => void;
  onShowAllRooms?: () => void;
  vertical?: boolean;
  /**
   * The home's Rooms rail: no leave/delete button (that lives on the rooms
   * page), one age badge rather than two, avatars on the right.
   */
  homeRail?: boolean;
  /**
   * Tells the parent whether this rail has anything in it.
   *
   * The heading above it lives in MobileHomeFeed and has to swap "see all"
   * for a + when there is nothing to see. Reported up rather than having the
   * feed run the same rooms query a second time.
   */
  onEmptyChange?: (empty: boolean) => void;
  filter?: RoomFilter;
  searchQuery?: string;
  onNavigateToTab?: (tab: string) => void;
  /** "private" drops published rooms — they belong to the Public tab. */
  visibility?: "all" | "private";
}

// How long a card takes to fade out. The reload is held until after it, so
// the list never reflows underneath a card that is still on screen.
const EXIT_MS = 320;

/**
 * How many faces a room card shows before it starts counting instead.
 *
 * One number for both card layouts, because the two disagreeing is what made
 * a room look like it had lost players: the same room showed three faces in
 * one place and two in another, under a count pill that said something else
 * again. Past five it is a "+N" bubble, and the pill in the corner is still
 * the total either way.
 */
const ROOM_CARD_FACES = 5;
const HOME_RAIL_FIRST_GRADIENT = [
  { color: "rgba(238,174,202,1)", stop: "40%" },
  { color: "rgba(202,179,214,1)", stop: "65%" },
  { color: "rgba(148,201,233,1)", stop: "100%" },
];

export function MyRoomsSection({ 
  hideTV = false, 
  onCreateRoom, 
  onShowAllRooms, 
  vertical = false,
  homeRail = false,
  onEmptyChange,
  filter = "all",
  searchQuery = "",
  onNavigateToTab,
  visibility = "all",
}: MyRoomsSectionProps) {
  const isMobile = useIsMobile();
  const roomLimit = isMobile ? 10 : 15;
  const { rooms, loading, filter: activeFilter, refreshRooms } = useMyRooms({ filter, searchQuery, limit: roomLimit, visibility });
  const { enterRoom } = useMultiplayerV2();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showTVModal, setShowTVModal] = useState(false);
  
  const platform = Capacitor.getPlatform();
  const TVIcon = platform === 'ios' ? Airplay : platform === 'android' ? Cast : Tv;

  // The card on its way out — hidden from the tap, so the fade starts
  // immediately rather than after the round trip.
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  // Rooms this view has deleted for good. The list is refetched from a
  // server that has already dropped them, but a response that was in flight
  // when the delete landed still carries the old row — and that response
  // arriving late is what made a deleted card blink back for a moment
  // before disappearing again. Nothing gets to put these back.
  const [removedRoomIds, setRemovedRoomIds] = useState<Set<string>>(() => new Set());

  const handleDeleteRoom = async (roomId: string) => {
    setDeletingRoomId(roomId);
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
        // RLS matched no row: this player is not the room's host. Say that,
        // not a generic failure.
        toast.error(t("extra.roomDeleteHostOnly"));
        setDeletingRoomId(null);
        return;
      }

      toast.success(t("extra.roomDeleted"));
      setRemovedRoomIds((prev) => new Set(prev).add(roomId));
      // Reload once the card has finished fading. deletingRoomId can be let
      // go afterwards — removedRoomIds is what keeps it gone from here on.
      setTimeout(() => {
        void Promise.resolve(refreshRooms()).finally(() => setDeletingRoomId(null));
      }, EXIT_MS + 60);
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(t("extra.roomDeleteFailed"));
      setDeletingRoomId(null);
    }
  };

  // A guest's way out. Only the host may DELETE a room, so on somebody
  // else's room the menu offers LEAVING instead: dropping the own
  // room_participants row (the "Users can leave rooms" policy), which is
  // what makes the card disappear from this list. The old menu offered
  // delete to everyone and silently did nothing for guests.
  const { user } = useAuth();
  const handleLeaveRoom = async (roomId: string) => {
    if (!user) return;
    setDeletingRoomId(roomId);
    try {
      const { data: left, error } = await supabase
        .from("room_participants")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;
      if (!left || left.length === 0) {
        toast.error(t("extra.roomDeleteFailed"));
        setDeletingRoomId(null);
        return;
      }

      toast.success(t("extra.roomLeft"));
      setRemovedRoomIds((prev) => new Set(prev).add(roomId));
      setTimeout(() => {
        void Promise.resolve(refreshRooms()).finally(() => setDeletingRoomId(null));
      }, EXIT_MS + 60);
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error(t("extra.roomDeleteFailed"));
      setDeletingRoomId(null);
    }
  };

  // Which room the player is currently opening. Tapping a card fires a chain
  // of writes before the screen changes, so without this the card looks dead
  // and every extra tap starts the chain again.
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  const handleJoin = async (room: MyRoom) => {
    if (joiningRoomId) return;
    setJoiningRoomId(room.id);
    try {
      await openRoom(room);
    } catch (error) {
      // A failed housekeeping write used to escape this handler unhandled, so
      // enterRoom was never reached and the tap did nothing at all — no error,
      // no room. Try the room anyway: none of that cleanup is what makes the
      // lobby openable.
      console.error("[MyRoomsSection] Join preparation failed, entering anyway:", error);
      await enterRoom(room.room_code);
    } finally {
      setJoiningRoomId(null);
    }
  };

  const openRoom = async (room: MyRoom) => {
    // Lounge rooms live on their own routes — the classic lobby cannot
    // drive their match state.
    if (roomKind(room) !== "classic") {
      navigate(routeForRoom(room));
      return;
    }
    // Cosmetic, and nothing below depends on it — don't make the player wait
    // on a write that only clears a dot.
    if (room.has_unread_activity) {
      void supabase
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
        // One write, not two — same row, same purpose
        await supabase
          .from("game_rooms")
          .update({
            tv_session_id: null,
            status: "waiting",
            started_at: null,
            completed_at: null,
          })
          .eq("id", room.id);

        // Continue to lobby instead of erroring out
        await enterRoom(room.room_code);
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
    
    // A finished room is reset for a rematch. Participants reset through
    // the SECURITY DEFINER RPC — a direct room-wide UPDATE only ever
    // touched the tapper's own row (RLS is own-row-only) and silently left
    // everyone else at "finished" with last round's score, which is what
    // corrupted rematches. The question/answer cleanup is host-only by
    // policy; when a non-host opens the rematch it no-ops here and the
    // host's round-start cleanup handles it instead.
    if (room.status === "completed") {
      const [roomRes, , , resetRes] = await Promise.all([
        supabase
          .from("game_rooms")
          .update({ status: "waiting", started_at: null, completed_at: null })
          .eq("id", room.id),
        supabase.from("room_questions").delete().eq("room_id", room.id),
        supabase.from("player_answers").delete().eq("room_id", room.id),
        supabase.rpc("reset_room_participants", {
          p_room_id: room.id,
          p_status: "joined",
        }),
      ]);
      if (roomRes.error) console.error("[MyRooms] rematch room reset failed:", roomRes.error);
      if (resetRes.error) console.error("[MyRooms] rematch participant reset failed:", resetRes.error);
    }
    
    // Standard room join - goes to lobby
    await enterRoom(room.room_code);
  };

  // Check if user has seen feature onboarding
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => hasSeenFeatureOnboarding());

  // Above the early return below, so it runs on every render — a hook after
  // a conditional return is called in a different order on the loading pass
  // than on the loaded one, which is the rule React cannot recover from.
  //
  // Reported only once the query has answered: while loading, `rooms` is
  // empty too, and announcing that would flash a + over a rail about to
  // fill. A search with no hits is its own state, not an empty rail.
  const isEmpty = !loading && rooms.length === 0 && searchQuery.trim().length === 0;
  useEffect(() => {
    onEmptyChange?.(isEmpty);
  }, [isEmpty, onEmptyChange]);

  if (loading) {
    // Reserve space to prevent layout jump
    return <div className="min-h-[200px]" />;
  }

  // An active search with no hits is its own state — "no room found" — not
  // "you have no rooms" and certainly not the feature onboarding.
  const searching = searchQuery.trim().length > 0;

  // Show feature onboarding carousel for new users with no rooms
  const showOnboardingCarousel = rooms.length === 0 && activeFilter === "all" && !hasSeenOnboarding && !searching;

  return (
    <div>
      {/* TV Mirror Modal */}
      <TVMirrorModal open={showTVModal} onOpenChange={setShowTVModal} />

      {/* Rooms List */}
      {rooms.length === 0 && homeRail && !searching ? (
        // On the home rail an empty state has to stay a CARD. The panel
        // below is full width and centred, which in a row of horizontal
        // cards reads as something having gone wrong rather than as an
        // invitation — and the rail loses its shape entirely.
        <div className="px-4 pb-4">
          <StartHereCard
            variant="room"
            title={t("extra.railFirstRoom")}
            desc={t("extra.railFirstRoomDesc")}
            onPress={() => onCreateRoom?.()}
          />
        </div>
      ) : rooms.length === 0 ? (
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
              {searching ? t("extra.searchRoomNotFound") :
               activeFilter === "all" ? t("extra.noRoomsYet") :
               activeFilter === "my_rooms" ? t("extra.noRoomsCreated") :
               activeFilter === "friends_rooms" ? t("extra.friendsNoRooms") :
               t("extra.noTypeRoomsMsg")}
            </h3>
            {searching ? (
              <p className="text-muted-foreground text-xs text-center">
                {t("extra.searchTryDifferent")}
              </p>
            ) : (
              <>
                {activeFilter === "all" && (
                  <p className="text-muted-foreground text-xs text-center mb-5">
                    {t("extra.createRoomInvite")}
                  </p>
                )}
                {onCreateRoom && activeFilter === "all" && (
                  <ChunkyButton onClick={onCreateRoom} size="sm">{t("extra.addRoom")}</ChunkyButton>
                )}
              </>
            )}
          </motion.div>
        )
      ) : vertical ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-4 w-full max-w-full">
          {/* The motion.div is what AnimatePresence sees, and it carries
              leaving and reflowing.

              Not popLayout: that lifts the card out of flow the instant it
              starts leaving, so the row closes while the card is still
              visible — which reads as the card vanishing and the grid
              snapping shut. Left in flow, it fades on the spot and the
              neighbours only move once it is gone. One thing at a time.

              The layout transition is its own, with no per-index delay. The
              cards' entry transition carries one, and a shared transition
              applies to layout animations too — which is what turned one
              delete into a staggered reshuffle of the whole grid. */}
          <AnimatePresence initial={false}>
            {rooms
              .filter((room) => room.id !== deletingRoomId && !removedRoomIds.has(room.id))
              .map((room, index) => (
                <motion.div
                  key={room.id}
                  layout
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{
                    layout: { type: "spring", stiffness: 300, damping: 34, mass: 0.9 },
                    opacity: { duration: EXIT_MS / 1000, ease: "easeInOut" },
                    scale: { duration: EXIT_MS / 1000, ease: "easeInOut" },
                  }}
                >
                  <RoomCardGrid
                    room={room}
                    index={index}
                    onJoin={() => handleJoin(room)}
                    onDelete={handleDeleteRoom}
                    onLeave={handleLeaveRoom}
                    isJoining={joiningRoomId === room.id}
                  />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
          <div className="flex gap-3 px-4">
            <AnimatePresence initial={false}>
              {rooms
                .filter((room) => room.id !== deletingRoomId && !removedRoomIds.has(room.id))
                .map((room, index) => (
                  <motion.div
                    key={room.id}
                    layout
                    className="shrink-0"
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 34, mass: 0.9 },
                      opacity: { duration: EXIT_MS / 1000, ease: "easeInOut" },
                      scale: { duration: EXIT_MS / 1000, ease: "easeInOut" },
                    }}
                  >
                    <RoomCard
                      room={room}
                      index={index}
                      onJoin={() => handleJoin(room)}
                      onDelete={handleDeleteRoom}
                      onLeave={handleLeaveRoom}
                      isJoining={joiningRoomId === room.id}
                      homeRail={homeRail}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
            {/* View All Card */}
            {onShowAllRooms && (
              <motion.button
                onClick={onShowAllRooms}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rooms.length * 0.05 }}
                className={`flex-shrink-0 snap-start border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors ${homeRail ? "w-[280px] rounded-[20px]" : "w-[70vw] max-w-[280px] rounded-2xl"}`}
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
  onLeave: (roomId: string) => void;
  fullWidth?: boolean;
  /** Opening this room: the card says so and stops taking taps. */
  isJoining?: boolean;
  /** See MyRoomsSectionProps.homeRail. */
  homeRail?: boolean;
}

export function RoomCard({ room, index, onJoin, onDelete, onLeave, fullWidth = false, isJoining = false, homeRail = false }: RoomCardProps) {
  const { t, language } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
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
  // Lounge rooms carry their game's fixed identity: the King mascot or the
  // battle crate as the icon, and the game's title standing in until the
  // host names the team.
  const kind = roomKind(room);
  const lounge =
    kind === "king"
      ? { icon: iconKingLounge, label: t("lobby.vkTitle") }
      : kind === "team_battle"
        ? { icon: iconBattleLounge, label: t("teamBattle.title") }
        : kind === "words"
          ? { icon: iconWordsLounge, label: t("words.title") }
          // The classic party room is a game too: it wears My Trivia Party's
          // face when the host never picked an icon of their own.
          : { icon: iconPartyLounge, label: t("extra.myTriviaPartyLabel") };
  const displayName = room.room_name || lounge?.label || t("extra.gameRoomLabel");
  // How long ago the room was made — the thing that tells two similar rooms
  // apart in a list of them.
  const createdAgo = useRoomAge(room.created_at);

  // NEW LOGIC: has_players_in_room = someone is actually INSIDE this room
  const hasPlayersInRoom = room.has_players_in_room;

  // TV session is active (TV connected)
  const hasTVSession = isActiveTVSession(room.tv_status);

  // The TV artwork still marks a room being played on a screen; the words
  // that used to sit beside it are gone, so the badge is only ever the age.
  const showTVBadge = hasPlayersInRoom && hasTVSession;
  const someoneInRoom = hasPlayersInRoom;

  // Rooms that were ever played on TV keep their session id; live ones have
  // an active status — either way the footer gets a TV marker.
  const playedOnTV = !!room.tv_session_id || hasTVSession;

  // Every player in the room is online right now — the waiting badge
  // becomes a green "online" badge
  const allPlayersOnline =
    room.participants.length > 0 &&
    room.participants.every(p => room.online_participants.some(op => op.user_id === p.user_id));
  
  // For display: use TV active players if there's an active TV session with players
  const displayPlayerCount = hasTVSession && room.tv_active_players > 0 
    ? room.tv_active_players 
    : room.participants.length;
  
  // Use TV players for avatars when session is active, otherwise use room
  // participants — host first, so the person who made the room is the face
  // you see rather than whoever happened to join last.
  const displayPlayers = hasTVSession && room.tv_players.length > 0
    ? room.tv_players.map(p => ({
        user_id: p.user_id || '',
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        is_host: false
      }))
    : [...room.participants].sort((a, b) => Number(b.is_host) - Number(a.is_host));

  // The players' faces — one cluster, shared by the top row (rooms page)
  // and the home rail's bottom bar, so the two cannot drift apart.
  const avatarCluster = (
                <div className="flex -space-x-2">
                  {displayPlayers.slice(0, ROOM_CARD_FACES).map((p, idx) => {
                    // Check if this participant is online
                    const isOnline = room.online_participants.some(op => op.user_id === p.user_id);
                    
                    return (
                      // Descending z-index so the first avatar sits on top of
                      // the ones behind it — the negative margin alone would
                      // put the last one in front.
                      <div
                        key={p.user_id || idx}
                        className="relative flex-shrink-0"
                        style={{ zIndex: displayPlayers.length - idx }}
                      >
                        <div
                          className={`w-9 h-9 rounded-full overflow-hidden bg-white/20 shadow-md ${
                            isOnline
                              ? "ring-2 ring-green-500 ring-offset-1 ring-offset-transparent"
                              : "ring-2 ring-slate-400/70 ring-offset-1 ring-offset-transparent"
                          }`}
                        >
                          <SafeAvatarImage
                            avatarUrl={p.avatar_url}
                            fallback={p.nickname || "?"}
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
                          />
                        </div>
                        {p.is_host && (
                          <img
                            src={crownIcon}
                            alt=""
                            className="pointer-events-none absolute -top-2 -left-1 w-4 h-4 object-contain drop-shadow"
                          />
                        )}
                      </div>
                    );
                  })}
                  {displayPlayers.length > ROOM_CARD_FACES && (
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-md">
                      <span className="text-xs font-bold text-white">
                        +{displayPlayers.length - ROOM_CARD_FACES}
                      </span>
                    </div>
                  )}
                </div>
  );
  
  // Always use the placeholder image
  
  // Get gradient preset based on index
  const gradientPreset = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];
  // On the home rail the frame draws the first card without the preset's
  // orange foot — only its pink-to-blue tail (Figma 1076:2133).
  const railColors =
    homeRail && index % ROOM_GRADIENT_PRESETS.length === 0 ? HOME_RAIL_FIRST_GRADIENT : gradientPreset.colors;

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Commit on distance OR a quick flick — half the old travel, and the
    // card now visibly rides along the whole way.
    if (info.offset.x < -60 || (info.offset.x < -30 && info.velocity.x < -500)) {
      setShowDeleteConfirm(true);
    }
    // dragSnapToOrigin springs the card home on release
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
    // Only trigger join if not swiping, and not while it is already opening
    if (!isSwiping.current && !isJoining) {
      onJoin();
    }
  };

  const confirmDelete = () => {
    // The host deletes the room for everyone; a guest leaves it, which is
    // all a guest CAN do — and all they mean by "delete" on this list.
    if (room.is_host) onDelete(room.id);
    else onLeave(room.id);
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
          // Entry only. Leaving and reflowing belong to the wrapper this sits
          // in — a `transition` with a per-index delay applies to LAYOUT
          // animations too, so having them here made the whole grid reshuffle
          // in a staggered ripple every time one card left.
          transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
          drag={isMobile ? "x" : false}
          // The card follows the finger for real (constraints used to be
          // 0..0, so a 100px swipe moved it ~20px of pure elastic while the
          // commit threshold still wanted 100px — "needed several swipes").
          dragConstraints={{ left: -140, right: 0 }}
          dragElastic={0.15}
          dragSnapToOrigin
          dragDirectionLock
          onDragEnd={isMobile ? handleDragEnd : undefined}
          onPointerDown={isMobile ? handlePointerDown : undefined}
          onPointerMove={isMobile ? handlePointerMove : undefined}
          onClick={handleClick}
          style={{
            // The frame's lip: a hard 4px light-grey edge under the card and
            // a soft drop beneath that (Figma 1076:2132).
            boxShadow: homeRail
              ? "0 4px 0 0 #e5e7eb, 0 6px 20px -4px rgba(0,0,0,0.1)"
              : "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)",
            ...(isMobile ? { x } : {}),
          }}
          className={`${
            fullWidth
              ? "w-full rounded-2xl"
              : homeRail
                ? "flex-shrink-0 w-[280px] snap-start rounded-[20px]"
                : "flex-shrink-0 w-[70vw] max-w-[280px] snap-start rounded-2xl"
          } overflow-hidden cursor-pointer ${!isMobile ? "transition-transform duration-200 hover:scale-[1.02]" : ""} active:scale-[0.98] ${
            room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
          }`}
        >
          {homeRail ? (
            // Figma 1076:2132 — the home rail card. 280×212 with everything
            // at the frame's own offsets: the age badge top-left, the game's
            // icon and name centred, a hairline across at 156, then the seat
            // count on the left and the players' faces on the right.
            <GradientBackground
              colors={railColors}
              gradientSize="125% 125%"
              gradientOrigin="bottom-middle"
              enableNoise={false}
              className="relative h-[212px] rounded-[20px]"
            >
              {isJoining && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[20px] bg-black/35 backdrop-blur-[1px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
                </div>
              )}
              <div className="absolute left-[18px] right-[18px] top-[16px] z-10 flex items-start justify-between">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/25 px-2.5 py-1 font-[Nunito] text-xs font-bold leading-4 tracking-[-0.16px] text-white backdrop-blur-[4px]">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${
                      someoneInRoom || allPlayersOnline ? "bg-green-400" : "bg-amber-400"
                    }`}
                  />
                  {createdAgo || t("extra.roomStatusWaiting")}
                </span>
                {showTVBadge && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <QuizCategoryIcon iconSlug="retro-tv" size={24} className="h-6 w-6" />
                  </div>
                )}
              </div>
              {(room.room_icon || lounge) && (
                <img
                  src={room.room_icon ?? lounge?.icon}
                  alt=""
                  className="absolute left-1/2 top-[58px] h-10 w-10 -translate-x-1/2 object-contain drop-shadow-lg"
                />
              )}
              <h3 className="absolute inset-x-[18px] top-[113px] truncate text-center font-display text-[18px] leading-[22.5px] tracking-[-0.16px] text-white">
                {displayName}
              </h3>
              <span aria-hidden className="absolute left-[18px] right-[17px] top-[156px] h-px bg-white/30" />
              <p className="absolute left-[20px] top-[176px] font-[Nunito] text-xs font-bold leading-4 tracking-[-0.16px] text-white">
                {room.max_players
                  ? t("extra.roomPlayersOf", { count: displayPlayerCount, max: room.max_players })
                  : t("extra.roomPlayersCount", { count: displayPlayerCount })}
              </p>
              {/* 31px faces with a 2px peach ring, each overlapping the last
                  by 7px; the later one sits on top, as in the frame. */}
              <div className="absolute right-[17px] top-[169px] flex -space-x-[7px]">
                {displayPlayers.slice(0, ROOM_CARD_FACES).map((p, idx) => (
                  <div
                    key={p.user_id || idx}
                    className="h-[31px] w-[31px] shrink-0 overflow-hidden rounded-full border-2 border-[#f2ac91] bg-white/20"
                  >
                    <SafeAvatarImage
                      avatarUrl={p.avatar_url}
                      fallback={p.nickname || "?"}
                      className="h-full w-full object-cover"
                      containerClassName="h-full w-full"
                    />
                  </div>
                ))}
                {displayPlayers.length > ROOM_CARD_FACES && (
                  <div className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border-2 border-[#f2ac91] bg-white/20 backdrop-blur-sm">
                    <span className="text-[11px] font-bold text-white">+{displayPlayers.length - ROOM_CARD_FACES}</span>
                  </div>
                )}
              </div>
            </GradientBackground>
          ) : (
          <GradientBackground
            colors={gradientPreset.colors}
            gradientSize="125% 125%"
            gradientOrigin="bottom-middle"
            enableNoise={false}
            className="relative px-2.5 pb-2.5 pt-6 rounded-2xl"
          >
            {/* Opening a room means several writes before the screen changes.
                Say so on the card that was tapped, or it reads as ignored. */}
            {isJoining && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/35 backdrop-blur-[1px]">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
              </div>
            )}
            {/* Top row - Avatars left, Status badge + menu right. On the
                home rail the faces move down into the bottom bar (owner's
                ask) and only the age badge stays up here. */}
            <div className="relative z-10 px-2 pb-4">
              <div className="flex items-start justify-between mb-8">
                {/* Top left - Avatars (use TV players when active) */}
                {avatarCluster}

                {/* Top right - Status badge + menu (desktop/tablet) */}
                <div className="flex items-center gap-2">
                  {showTVBadge && (
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <QuizCategoryIcon iconSlug="retro-tv" size={24} className="w-6 h-6" />
                    </div>
                  )}
                  {/* The badge is always the age. "Waiting", "online" and
                      "new" read the same on every card; the dot carries that
                      state instead — green when someone is there, amber when
                      the room is empty. */}
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-white font-bold text-xs">
                    <span
                      className={`w-1.5 h-1.5 shrink-0 rounded-full animate-pulse ${
                        someoneInRoom || allPlayersOnline ? "bg-green-400" : "bg-amber-400"
                      }`}
                    />
                    {createdAgo || t("extra.roomStatusWaiting")}
                  </span>
                  
                  {/* The way out, in the open on every device — the same
                      trash (host) / log-out (guest) the public tab wears.
                      It used to hide in a desktop-only 3-dot menu. */}
                  <button
                      type="button"
                      aria-label={room.is_host ? t("extra.rlDeleteRoom") : t("extra.rlLeaveRoom")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center hover:bg-black/35 active:scale-95 transition"
                    >
                      {room.is_host ? (
                        <Trash2 className="w-4 h-4 text-white" />
                      ) : (
                        <LogOut className="w-4 h-4 text-white" />
                      )}
                    </button>
                </div>
              </div>
              
              {/* Bottom left - Room name with icon and category */}
              <div className="flex items-center gap-2.5 mb-1">
                {(room.room_icon || lounge) && (
                  <img
                    src={room.room_icon ?? lounge?.icon}
                    alt=""
                    className="w-10 h-10 object-contain drop-shadow-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-white text-lg leading-tight truncate drop-shadow-md">
                    {displayName}
                  </h3>
                  {(room.category_name || (lounge && room.room_name)) && (
                    <p className="text-sm text-white/70 truncate font-medium drop-shadow-sm">
                      {room.category_name ? localizeCategory(room.category_name) : lounge!.label}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Bottom section - players count only (avatars moved to top) */}
            <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-3 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {playedOnTV && (
                    <img src={retroTv3d} alt="TV" className="w-6 h-6 object-contain drop-shadow select-none" draggable={false} />
                  )}
                  <Users className="w-4 h-4 text-white/80" />
                  <span className="text-sm font-bold text-white">{displayPlayerCount}</span>
                </div>
                <p className="text-xs text-white/60">
                    {formatDistanceToNow(new Date(room.created_at), { 
                      addSuffix: true, 
                      // Was `ka` unconditionally: "3 დღის წინ" under a room card
                      // whose every other word was in the reader's language.
                      locale: dateLocaleFor(language) 
                    })}
                  </p>
              </div>
            </div>
          </GradientBackground>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle>{room.is_host ? t("extra.rlDeleteRoom") : t("extra.rlLeaveRoom")}</AlertDialogTitle>
            <AlertDialogDescription>
              {room.is_host ? t("extra.rlDeleteRoomConfirm") : t("extra.rlLeaveRoomConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0">{t("extra.rlCancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              {room.is_host ? t("extra.rlDelete") : t("extra.rlLeaveRoom")}
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
  onLeave: (roomId: string) => void;
  /** Opening this room: the card says so and stops taking taps. */
  isJoining?: boolean;
}

function RoomCardGrid({ room, index, onJoin, onDelete, onLeave, isJoining = false }: RoomCardGridProps) {
  const { openProfile } = usePlayerProfile();
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
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
  
  // Lounge rooms carry their game's fixed identity: the King mascot or the
  // battle crate as the icon, and the game's title standing in until the
  // host names the team.
  const kind = roomKind(room);
  const lounge =
    kind === "king"
      ? { icon: iconKingLounge, label: t("lobby.vkTitle") }
      : kind === "team_battle"
        ? { icon: iconBattleLounge, label: t("teamBattle.title") }
        : kind === "words"
          ? { icon: iconWordsLounge, label: t("words.title") }
          // The classic party room is a game too: it wears My Trivia Party's
          // face when the host never picked an icon of their own.
          : { icon: iconPartyLounge, label: t("extra.myTriviaPartyLabel") };
  const displayName = room.room_name || lounge?.label || t("extra.gameRoomLabel");
  // How long ago the room was made — the thing that tells two similar rooms
  // apart in a list of them.
  const createdAgo = useRoomAge(room.created_at);

  // NEW LOGIC: has_players_in_room = someone is actually INSIDE this room
  const hasPlayersInRoom = room.has_players_in_room;
  const hasTVSession = isActiveTVSession(room.tv_status);

  // The TV artwork still marks a room being played on a screen; the words
  // that used to sit beside it are gone, so the badge is only ever the age.
  const showTVBadge = hasPlayersInRoom && hasTVSession;
  const someoneInRoom = hasPlayersInRoom;

  // Rooms that were ever played on TV keep their session id; live ones have
  // an active status — either way the footer gets a TV marker.
  const playedOnTV = !!room.tv_session_id || hasTVSession;

  // Every player in the room is online right now — the waiting badge
  // becomes a green "online" badge
  const allPlayersOnline =
    room.participants.length > 0 &&
    room.participants.every(p => room.online_participants.some(op => op.user_id === p.user_id));
  
  // For display: use TV active players if there's an active TV session
  const displayPlayerCount = hasTVSession && room.tv_active_players > 0 
    ? room.tv_active_players 
    : room.participants.length;
  
  // Use TV players for avatars when session is active — otherwise room
  // participants with the host first, so the room's owner is the face you see.
  const displayPlayers = hasTVSession && room.tv_players.length > 0
    ? room.tv_players.map(p => ({
        user_id: p.user_id || '',
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        is_host: false
      }))
    : [...room.participants].sort((a, b) => Number(b.is_host) - Number(a.is_host));

  // What this room is offering right now, or null when it offers nothing.
  // See roomCardAction for why an empty room gets no button at all.
  const action = roomCardAction(room);

  // The faces used to be trimmed to two whenever the card carried a button,
  // with the "+N" bubble suppressed on the reasoning that the count pill above
  // already said how many there were. It read as a missing player rather than
  // as a crop. Same five as every other card now: the row is the one thing in
  // this group allowed to give way (overflow-hidden, above), so a card too
  // narrow for all of it clips a face rather than sliding under the button.
  const avatarLimit = ROOM_CARD_FACES;

  const gradientPreset = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Commit on distance OR a quick flick — half the old travel, and the
    // card now visibly rides along the whole way.
    if (info.offset.x < -60 || (info.offset.x < -30 && info.velocity.x < -500)) {
      setShowDeleteConfirm(true);
    }
    // dragSnapToOrigin springs the card home on release
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
    if (!isSwiping.current && !isJoining) {
      onJoin();
    }
  };

  const confirmDelete = () => {
    // The host deletes the room for everyone; a guest leaves it, which is
    // all a guest CAN do — and all they mean by "delete" on this list.
    if (room.is_host) onDelete(room.id);
    else onLeave(room.id);
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
          // Entry only. Leaving and reflowing belong to the wrapper this sits
          // in — a `transition` with a per-index delay applies to LAYOUT
          // animations too, so having them here made the whole grid reshuffle
          // in a staggered ripple every time one card left.
          transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 30 }}
          drag={isMobile ? "x" : false}
          // The card follows the finger for real (constraints used to be
          // 0..0, so a 100px swipe moved it ~20px of pure elastic while the
          // commit threshold still wanted 100px — "needed several swipes").
          dragConstraints={{ left: -140, right: 0 }}
          dragElastic={0.15}
          dragSnapToOrigin
          dragDirectionLock
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
            {/* Opening a room means several writes before the screen changes.
                Say so on the card that was tapped, or it reads as ignored. */}
            {isJoining && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/35 backdrop-blur-[1px]">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
              </div>
            )}
            {/* Cover image with radial fade */}
            {/* Top Row: Status Badge + Menu */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-2">
                {showTVBadge && (
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <QuizCategoryIcon iconSlug="retro-tv" size={24} className="w-6 h-6" />
                  </div>
                )}
                {/* The badge is always the age. "Waiting", "online" and "new"
                    read the same on every card; the dot carries that state
                    instead — green when someone is there, amber when empty. */}
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-white font-bold text-xs">
                  <span
                    className={`w-1.5 h-1.5 shrink-0 rounded-full animate-pulse ${
                      someoneInRoom || allPlayersOnline ? "bg-green-400" : "bg-amber-400"
                    }`}
                  />
                  {createdAgo || t("extra.roomStatusWaiting")}
                </span>
              </div>

              {/* Right: how many are in the room, then the menu.
                  Up here rather than down in the glass bar, where it used to
                  sit between the faces and the left edge and push both of
                  them along. The bottom row's job is who is in there and the
                  way in; the count is a fact about the room, and it reads as
                  one beside the room's age. */}
              <div className="flex items-center gap-2">
                <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-black/25 backdrop-blur-sm px-2.5 py-1">
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span className="text-white font-bold text-xs">{displayPlayerCount}</span>
                </div>

              {/* The way out, in the open on every device — the same
                  trash (host) / log-out (guest) the public tab wears.
                  It used to hide in a desktop-only 3-dot menu. */}
              <button
                type="button"
                aria-label={room.is_host ? t("extra.rlDeleteRoom") : t("extra.rlLeaveRoom")}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center hover:bg-black/35 active:scale-95 transition"
              >
                {room.is_host ? (
                  <Trash2 className="w-4 h-4 text-white" />
                ) : (
                  <LogOut className="w-4 h-4 text-white" />
                )}
              </button>
              </div>
            </div>
            
            {/* Middle: Icon + Title + Category + Time */}
            <div className="relative z-10 flex-1 flex flex-col justify-center py-3">
              <div className="flex items-center gap-3">
                {(room.room_icon || lounge) && (
                  <img
                    src={room.room_icon ?? lounge?.icon}
                    alt=""
                    className="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-lg flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-white text-lg leading-tight line-clamp-2 drop-shadow-md">
                    {displayName}
                  </h3>
                  {(room.category_name || (lounge && room.room_name)) && (
                    <p className="text-white/70 text-sm truncate mt-0.5">
                      {room.category_name ? localizeCategory(room.category_name) : lounge!.label}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Bottom: Glass container — who is in the room on the left, the
                way into it on the right. */}
            <div className="relative z-10">
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                {/* Left: TV marker (played or live on TV, no container) +
                    player count (TV active players if available) + the faces
                    of who is in there, which belong beside the number they
                    are the count of. */}
                <div className="flex items-center gap-2 min-w-0">
                  {playedOnTV && (
                    <img src={retroTv3d} alt="TV" className="w-7 h-7 object-contain drop-shadow select-none flex-shrink-0" draggable={false} />
                  )}

                  {/* Avatars (use TV players if session is active). These are
                      the only thing here allowed to give way: overflow-hidden
                      so a card too narrow for all of it clips a face at the
                      edge, rather than letting the row spill under the button
                      — the avatars are flex-shrink-0, so without this they
                      leave the group's box instead of shrinking it.

                      p-1 -m-1 is what keeps that from clipping the green
                      "online" ring, which paints 3px outside the avatar's box:
                      overflow clips to the padding box, so the padding buys
                      the ring room and the negative margin gives back the
                      space it would have cost. */}
                  <div className="flex -space-x-2 min-w-0 overflow-hidden p-1 -m-1">
                    {displayPlayers.slice(0, avatarLimit).map((p, idx) => {
                      // Check if this participant is online
                      const isOnline = room.online_participants.some(op => op.user_id === p.user_id);
                    
                      return (
                        // Descending z-index so the first avatar sits on top of
                        // the ones behind it — the negative margin alone would
                        // put the last one in front.
                        <div
                          key={p.user_id || idx}
                          className="relative flex-shrink-0"
                          style={{ zIndex: displayPlayers.length - idx }}
                        >
                          <div
                            className={`w-8 h-8 rounded-full overflow-hidden bg-white/20 cursor-pointer hover:scale-110 transition-transform active:scale-95 shadow-md ${
                              isOnline
                                ? "ring-2 ring-green-500 ring-offset-1 ring-offset-transparent"
                                : "ring-2 ring-slate-400/70 ring-offset-1 ring-offset-transparent"
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
                          {p.is_host && (
                            <img
                              src={crownIcon}
                              alt=""
                              className="pointer-events-none absolute -top-2 -left-1 w-3.5 h-3.5 object-contain drop-shadow"
                            />
                          )}
                        </div>
                      );
                    })}
                    {displayPlayers.length > avatarLimit && (
                      <div className="w-8 h-8 rounded-full border-2 border-white/40 bg-white/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-white text-[10px] font-bold">
                          +{displayPlayers.length - avatarLimit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: what this room is offering, when it is offering
                    anything. Three states, and each is a different sentence:

                      live    a round is running and every second before you
                              are on the question is scoring already lost, so
                              it pulses and carries the red dot — it has to
                              read as a thing happening now.
                      start   you host this room and there is somebody online
                              to play with. The lobby's own button says the
                              same words, so this is the first of two taps
                              rather than a promise it cannot keep.
                      enter   somebody is online in a room you are in. Go and
                              wait for them to start.

                    Nothing at all when no one else is online: most rooms in
                    this list are old and empty, and a button on every one of
                    them would say nothing about any of them.

                    RoundStartWatcher does not cover the live case. It
                    deliberately treats /team as "already there" and never
                    navigates, so a player parked on this very list is the one
                    person a starting round cannot reach. */}
                {action && (
                  /* The public list's button in white — same shape, same
                     word, same play triangle. Which list you are on is the
                     only difference between them.

                     The three states no longer wear three labels: "Play" is
                     what every one of them does, and a live round says so by
                     pulsing rather than by being called something else.
                     "ითამაშე", not the lobby's "თამაშის დაწყება" — the long
                     form is four syllables of Georgian in a pill that shares
                     its row with a count and up to two faces, and it pushed
                     the whole group off the card. */
                  <RoomCardPlayButton
                    tone="white"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isJoining) onJoin();
                    }}
                    disabled={isJoining}
                    animate={action === "live" ? { scale: [1, 1.05, 1] } : undefined}
                    transition={
                      action === "live"
                        ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                        : undefined
                    }
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {t("extra.roomPlay")}
                  </RoomCardPlayButton>
                )}
              </div>
            </div>
          </GradientBackground>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle>{room.is_host ? t("extra.rlDeleteRoom") : t("extra.rlLeaveRoom")}</AlertDialogTitle>
            <AlertDialogDescription>
              {room.is_host ? t("extra.rlDeleteRoomConfirm") : t("extra.rlLeaveRoomConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0">{t("extra.rlCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              {room.is_host ? t("extra.rlDelete") : t("extra.rlLeaveRoom")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
