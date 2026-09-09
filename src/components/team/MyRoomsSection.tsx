import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Plus, Users, Tv, Airplay, Cast, UserPlus, Trash2, LogOut, MonitorPlay, Play, Check, X } from "lucide-react";
import { declineRoomInvite } from "@/utils/pendingRoomInvites";
import { useMyRooms, MyRoom, RoomFilter, isActiveTVSession } from "@/hooks/useMyRooms";
import iconKingLounge from "@/assets/play-chooser/icon-king.webp";
import iconBattleLounge from "@/assets/play-chooser/icon-crate.png";
import iconWordsLounge from "@/assets/play-chooser/icon-words.webp";
import iconPartyLounge from "@/assets/house-party.png";
import { roomKind, routeForRoom } from "@/utils/roomRoutes";
import { dealtRoomIcon } from "@/utils/roomCrests";
import { useRoomIconPool } from "@/hooks/useRoomIconPool";
import { FRESH_RING_MS, isRoomStampFresh } from "@/hooks/usePublicRooms";
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
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { NotEnoughStakeModal } from "@/components/home/NotEnoughStakeModal";
import { PREVIEW_BUTTON_CLASS, RoomPreviewSheet, type PreviewActionFactory } from "@/components/team/RoomPreviewSheet";
import { useCurrency } from "@/hooks/useCurrency";
import { REWARDS } from "@/config/rewardConfig";
import { Capacitor } from "@capacitor/core";
import { formatDistanceToNow } from "date-fns";
import { dateLocaleFor } from "@/utils/dateLocale";
import danceFloorIcon from "@/assets/dance-floor.png";
import crownIcon from "@/assets/crown-icon.png";
import retroTv3d from "@/assets/retro-tv-3d.png";
import { GradientBackground, ROOM_GRADIENT_PRESETS } from "@/components/ui/noisy-gradient-backgrounds";
import { useWavyRect } from "@/components/home/wave";
import { useRoomIsNew } from "@/hooks/useRoomAge";
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

// Peak-to-trough of the home-rail card's waves (Figma 1076:3672 – 3676),
// centred on the edges they replace: the card keeps its 212px and the
// crests reach half of this beyond either end.
const RAIL_WAVE = 8;
const RAIL_WAVE_HALF = RAIL_WAVE / 2;
const RAIL_CARD_H = 212;
const RAIL_CARD_W = 280;
const RAIL_RADIUS = 20;

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

  // Opening a classic room from the home rail goes through the route, not the
  // context. enterRoom only moves the multiplayer context to "lobby" — and
  // the lobby is drawn by the /team page. On the rooms page that is the page
  // underneath, so the join shows at once; on the home screen nothing renders
  // it, and a tap joined the room without anything on screen changing (owner:
  // "can't open rooms from main page"). /team?join=CODE is where every other
  // entry — invites, notifications, the create flow — already converges, and
  // `entering` keeps TeamV2's loading gate up so the rooms page never flashes
  // beneath the join.
  const enterClassicRoom = async (roomCode: string) => {
    if (homeRail) {
      navigate(`/team?join=${roomCode}`, { state: { entering: true } });
      return;
    }
    await enterRoom(roomCode);
  };
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showTVModal, setShowTVModal] = useState(false);
  /** The host's own room, from the "+" on its card. Same sheet the lobby
      uses; roomId is what puts it in room-invite mode. */
  const [inviting, setInviting] = useState<MyRoom | null>(null);
  
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
  /** The X beside Confirm: give the reserved seat up and answer the invite. */
  const handleDeclineInvite = async (room: MyRoom) => {
    if (!user || !room.pending_invite_from) return;
    try {
      await declineRoomInvite(room.id, user.id, room.pending_invite_from.notificationId);
      toast.success(t("extra.notifDeclined"));
    } catch (e) {
      console.error("[MyRooms] decline invite failed", e);
      toast.error(t("extra.errorOccurred"));
    }
  };

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
  const [showNoStake, setShowNoStake] = useState(false);
  /** The room whose rounds and cost are being read, with its card's button when it has one. */
  const [previewing, setPreviewing] = useState<{ room: MyRoom; action?: PreviewActionFactory } | null>(null);
  const { coins } = useCurrency();

  const handleJoin = async (room: MyRoom) => {
    if (joiningRoomId) return;
    // Taking a seat at somebody else's table is agreeing to stake into its
    // pot, so the tap that takes it is where a balance that cannot is said
    // out loud (owner: "room matches also needs 500 coins to participate,
    // if not it should show the reason after click").
    //
    // The HOST is not stopped: their room is theirs to open, edit and
    // invite into, and Start is already gated on the same stake. Nor are
    // the lounges — the party, the arena and the King's couch carry their
    // own stakes and are not settled by settle_room_round.
    if (roomKind(room) === "classic" && !room.is_host && coins < REWARDS.GAME_STAKE) {
      setShowNoStake(true);
      return;
    }
    setJoiningRoomId(room.id);
    try {
      await openRoom(room);
    } catch (error) {
      // A failed housekeeping write used to escape this handler unhandled, so
      // enterRoom was never reached and the tap did nothing at all — no error,
      // no room. Try the room anyway: none of that cleanup is what makes the
      // lobby openable.
      console.error("[MyRoomsSection] Join preparation failed, entering anyway:", error);
      await enterClassicRoom(room.room_code);
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
        await enterClassicRoom(room.room_code);
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
    await enterClassicRoom(room.room_code);
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

      {/* The host's invite sheet, opened by the "+" on a room card — the
          same one the Public tab's cards already open. */}
      {/* Why the tap did nothing: a seat at that table costs the stake. */}
      <NotEnoughStakeModal isOpen={showNoStake} onClose={() => setShowNoStake(false)} />

      {/* What the card is, opened by tapping it. */}
      <RoomPreviewSheet
        open={previewing !== null}
        roomName={previewing?.room.room_name || t("extra.roomDefaultName")}
        rounds={previewing?.room.rounds ?? []}
        questionsPerRound={previewing?.room.total_questions ?? null}
        players={previewing?.room.participants.length ?? 0}
        action={previewing?.action?.({ className: PREVIEW_BUTTON_CLASS, then: () => setPreviewing(null) })}
        onClose={() => setPreviewing(null)}
      />

      <InviteFriendsModal
        isOpen={inviting !== null}
        onClose={() => setInviting(null)}
        roomId={inviting?.id}
        roomCode={inviting?.room_code}
      />

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
                    onPreview={(action) => setPreviewing({ room, action })}
                    onDelete={handleDeleteRoom}
                    onLeave={handleLeaveRoom}
                    onInvite={setInviting}
                    onDeclineInvite={(r) => void handleDeclineInvite(r)}
                    isJoining={joiningRoomId === room.id}
                  />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      ) : (
        // `scroll-px-4` matches the row's own inset: without it a snap
        // aligns the card with the SCROLLER's edge, so the first card slid
        // under the screen edge on the smallest nudge and the rail lost the
        // 16px it shares with the heading above it. The home rail also takes
        // the feed's vertical padding, so its cards sit on the same rhythm
        // as the rails below it.
        <div
          className={`overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-px-4 scroll-smooth ${
            homeRail ? "pb-3 pt-1" : "pb-4"
          }`}
        >
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
                      onPreview={() => setPreviewing({ room })}
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
  /** Tapping the card anywhere but a control: what does this room play? */
  onPreview: () => void;
  onDelete: (roomId: string) => void;
  onLeave: (roomId: string) => void;
  fullWidth?: boolean;
  /** Opening this room: the card says so and stops taking taps. */
  isJoining?: boolean;
  /** See MyRoomsSectionProps.homeRail. */
  homeRail?: boolean;
}

export function RoomCard({ room, index, onJoin, onPreview, onDelete, onLeave, fullWidth = false, isJoining = false, homeRail = false }: RoomCardProps) {
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
          // A classic room — party or not — has no fixed lounge face; it
          // wears a crest dealt from the shared pool, same as everywhere
          // else that pool is used (the lobby, the public tab).
          : undefined;
  // A room built on one of the player's own trivias — a MyTrivia Party among
  // them. The line under the room's own name used to show the trivia's raw
  // title here ("tt"), which is what the room's OWN name is for; this line
  // says what KIND of room it is, the way it does for every other room
  // (owner: "instead tt we show My Trivia Party... replace 'tt' to always
  // show My Trivia party").
  const isPartyRoom = !!room.user_trivia_id;
  // A party room's own name is a room name like any other's — dealt at
  // creation, renamed through the same sheet, no "Untitled" stand-in for it
  // (owner: "we don't need 'untitled', use random names for my trivia
  // party rooms as we do on other rooms").
  const displayName = room.room_name || lounge?.label || t("extra.gameRoomLabel");
  // The card's own face: the host's icon, else the game's lounge icon, else
  // — for an actual party room — My Trivia Party's icon, else a crest dealt
  // from the shared pool by room id. A "Mixed"-category room used to
  // inherit the party icon too, because the fallback was not gated on
  // isPartyRoom at all (owner: "on default rooms with classic trivia
  // rounds in it should have random icon on room card").
  const iconPool = useRoomIconPool();
  const roomFace =
    room.room_icon ?? lounge?.icon ?? (isPartyRoom ? iconPartyLounge : dealtRoomIcon(room.id, iconPool));
  // How long ago the room was made — the thing that tells two similar rooms
  // apart in a list of them.
  // "New" for the room's first hour, then no time label at all (owner's ask).
  const isNew = useRoomIsNew(room.created_at);

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
  // The rail card's edges roll: its gradient is masked to a wave of its
  // own, dealt fresh on every visit, so the colour simply continues into
  // the hills. Every card has the hook; only the rail card wears it.
  const railWave = useWavyRect({
    width: RAIL_CARD_W,
    height: RAIL_CARD_H + RAIL_WAVE,
    radius: RAIL_RADIUS,
    top: RAIL_WAVE,
    bottom: RAIL_WAVE,
  });

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
    // The card reads; the button acts. See RoomCardGrid's handleClick.
    if (!isSwiping.current && !isJoining) {
      if (roomKind(room) === "classic") onPreview();
      else onJoin();
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
        {/* Delete indicator background (mobile only, and never on the home
            rail — nothing there can swipe to reveal it) */}
        {isMobile && !homeRail && (
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
          // Not on the home rail. This drag exists for ONE thing — swipe left
          // to reveal "delete this room" — and the home rail deliberately
          // offers no delete. What it does offer there is a horizontal
          // gesture inside a horizontal scroller: framer takes the pointer,
          // the tap never becomes a click, and the card just sits there when
          // pressed. Tapping a room on the home screen did nothing.
          drag={isMobile && !homeRail ? "x" : false}
          // The card follows the finger for real (constraints used to be
          // 0..0, so a 100px swipe moved it ~20px of pure elastic while the
          // commit threshold still wanted 100px — "needed several swipes").
          dragConstraints={{ left: -140, right: 0 }}
          dragElastic={0.15}
          dragSnapToOrigin
          dragDirectionLock
          onDragEnd={isMobile && !homeRail ? handleDragEnd : undefined}
          onPointerDown={isMobile && !homeRail ? handlePointerDown : undefined}
          onPointerMove={isMobile && !homeRail ? handlePointerMove : undefined}
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
              ? "w-full rounded-2xl overflow-hidden"
              : homeRail
                // Not clipped, and sized itself: the gradient body inside is
                // absolute, reaching past these lines by the hills' height.
                ? "relative flex-shrink-0 w-[280px] h-[212px] snap-start rounded-[20px]"
                : "flex-shrink-0 w-[70vw] max-w-[280px] snap-start rounded-2xl overflow-hidden"
          } cursor-pointer ${!isMobile ? "transition-transform duration-200 hover:scale-[1.02]" : ""} active:scale-[0.98] ${
            room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
          }`}
        >
          {homeRail ? (
            // Figma 1076:2132 — the home rail card. 280×212 with everything
            // at the frame's own offsets from the card's top line: the age
            // badge top-left, the game's icon and name centred, a hairline
            // across at 156, then the seat count on the left and the
            // players' faces on the right. The gradient body reaches
            // half a wave above that line and half below it, and the mask
            // rolls both edges, so the offsets below carry RAIL_WAVE_HALF.
            <GradientBackground
              colors={railColors}
              gradientSize="125% 125%"
              gradientOrigin="bottom-middle"
              enableNoise={false}
              className="rounded-[20px]"
              style={{ position: "absolute", left: 0, right: 0, top: -RAIL_WAVE_HALF, bottom: -RAIL_WAVE_HALF, ...railWave.mask }}
            >
              {isJoining && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[20px] bg-black/35 backdrop-blur-[1px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
                </div>
              )}
              <div className="absolute left-[18px] right-[18px] top-[20px] z-10 flex items-start justify-between">
                {isNew ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/25 px-2.5 py-1 font-[Nunito] text-xs font-bold leading-4 tracking-[-0.16px] text-white backdrop-blur-[4px]">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${
                        someoneInRoom || allPlayersOnline ? "bg-green-400" : "bg-amber-400"
                      }`}
                    />
                    {t("extra.roomStatusNew")}
                  </span>
                ) : (
                  <span />
                )}
                {showTVBadge && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <QuizCategoryIcon iconSlug="retro-tv" size={24} className="h-6 w-6" />
                  </div>
                )}
              </div>
              {roomFace && (
                <img
                  src={roomFace}
                  alt=""
                  className="absolute left-1/2 top-[62px] h-10 w-10 -translate-x-1/2 object-contain drop-shadow-lg"
                />
              )}
              <h3 className="absolute inset-x-[18px] top-[117px] truncate text-center font-display font-bold text-[18px] leading-[22.5px] tracking-[-0.16px] text-white">
                {displayName}
              </h3>
              <span aria-hidden className="absolute left-[18px] right-[17px] top-[160px] h-px bg-white/30" />
              <p className="absolute left-[20px] top-[180px] font-[Nunito] text-xs font-bold leading-4 tracking-[-0.16px] text-white">
                {room.max_players
                  ? t("extra.roomPlayersOf", { count: displayPlayerCount, max: room.max_players })
                  : t("extra.roomPlayersCount", { count: displayPlayerCount })}
              </p>
              {/* 31px faces with a 2px peach ring, each overlapping the last
                  by 7px; the later one sits on top, as in the frame. */}
              <div className="absolute right-[17px] top-[173px] flex -space-x-[7px]">
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
                  {isNew && (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-white font-bold text-xs">
                      <span
                        className={`w-1.5 h-1.5 shrink-0 rounded-full animate-pulse ${
                          someoneInRoom || allPlayersOnline ? "bg-green-400" : "bg-amber-400"
                        }`}
                      />
                      {t("extra.roomStatusNew")}
                    </span>
                  )}
                  
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
                {roomFace && (
                  <img
                    src={roomFace}
                    alt=""
                    className="w-10 h-10 object-contain drop-shadow-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-white text-lg leading-tight truncate drop-shadow-md">
                    {displayName}
                  </h3>
                  {(isPartyRoom || room.category_name || (lounge && room.room_name)) && (
                    <p className="text-sm text-white/70 truncate font-medium drop-shadow-sm">
                      {isPartyRoom ? t("extra.myTriviaPartyLabel") : room.category_name ? localizeCategory(room.category_name) : lounge!.label}
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
  /** Tapping the card anywhere but a control: what does this room play? */
  /** The card's tap: what the room is, with the card's own button along when it has one. */
  onPreview: (action?: PreviewActionFactory) => void;
  onDelete: (roomId: string) => void;
  onLeave: (roomId: string) => void;
  /** The host's way to fill this room from the list, without opening it. */
  onInvite?: (room: MyRoom) => void;
  /** Opening this room: the card says so and stops taking taps. */
  isJoining?: boolean;
  /** Give up the seat somebody reserved for this player. */
  onDeclineInvite?: (room: MyRoom) => void;
}

export function RoomCardGrid({ room, index, onJoin, onPreview, onDelete, onLeave, onInvite, isJoining = false, onDeclineInvite }: RoomCardGridProps) {
  const { user } = useAuth();
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
          // A classic room — party or not — has no fixed lounge face; it
          // wears a crest dealt from the shared pool, same as everywhere
          // else that pool is used (the lobby, the public tab).
          : undefined;
  // A room built on one of the player's own trivias — a MyTrivia Party among
  // them. The line under the room's own name used to show the trivia's raw
  // title here ("tt"), which is what the room's OWN name is for; this line
  // says what KIND of room it is, the way it does for every other room
  // (owner: "instead tt we show My Trivia Party... replace 'tt' to always
  // show My Trivia party").
  const isPartyRoom = !!room.user_trivia_id;
  // A party room's own name is a room name like any other's — dealt at
  // creation, renamed through the same sheet, no "Untitled" stand-in for it
  // (owner: "we don't need 'untitled', use random names for my trivia
  // party rooms as we do on other rooms").
  const displayName = room.room_name || lounge?.label || t("extra.gameRoomLabel");
  // The card's own face: the host's icon, else the game's lounge icon, else
  // — for an actual party room — My Trivia Party's icon, else a crest dealt
  // from the shared pool by room id. A "Mixed"-category room used to
  // inherit the party icon too, because the fallback was not gated on
  // isPartyRoom at all (owner: "on default rooms with classic trivia
  // rounds in it should have random icon on room card").
  const iconPool = useRoomIconPool();
  const roomFace =
    room.room_icon ?? lounge?.icon ?? (isPartyRoom ? iconPartyLounge : dealtRoomIcon(room.id, iconPool));
  // How long ago the room was made — the thing that tells two similar rooms
  // apart in a list of them.
  // "New" for the room's first hour, then no time label at all (owner's ask).
  const isNew = useRoomIsNew(room.created_at);

  /**
   * The room I just made, marked the way the Public tab marks it.
   *
   * A host who leaves the lobby with "Create" lands on whichever tab their
   * room is listed under, and a private room got no greeting at all: the
   * list already put it first (see compareRooms — the newest thing that
   * happened leads), but nothing said WHICH card was theirs. Same condition
   * and same three seconds as the public card, so the two tabs cannot
   * disagree about the room they are both describing.
   */
  const freshlyMine =
    room.is_host && room.participants.length <= 1 && isRoomStampFresh(room.last_activity_at ?? room.created_at);
  const [ringUp, setRingUp] = useState(freshlyMine);
  useEffect(() => {
    if (!freshlyMine) {
      setRingUp(false);
      return;
    }
    setRingUp(true);
    const t = setTimeout(() => setRingUp(false), FRESH_RING_MS);
    return () => clearTimeout(t);
  }, [freshlyMine, room.id]);

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
  
  // Rounds beyond the one named beside the room's name. A room whose queue
  // has not loaded reports none and the card reads as it always did.
  const extraRounds = Math.max(0, (room.rounds?.length ?? 0) - 1);

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

  /**
   * The card's button, as a factory: the card draws it, and hands the same
   * one to the preview sheet to draw beside Close (RoomPreviewSheet).
   *
   * The three states no longer wear three labels: "Play" is what every one
   * of them does, and a live round says so by pulsing rather than by being
   * called something else. "ითამაშე", not the lobby's "თამაშის დაწყება" —
   * the long form is four syllables of Georgian in a pill that shares its
   * row with a count and up to two faces, and it pushed the whole group
   * off the card.
   */
  const playButton: PreviewActionFactory = (opts = {}) => (
    <RoomCardPlayButton
      tone={room.has_pending_invite ? "mint" : "white"}
      className={opts.className}
      onClick={(e) => {
        e.stopPropagation();
        if (!isJoining) onJoin();
        opts.then?.();
      }}
      disabled={isJoining}
      animate={action === "live" ? { scale: [1, 1.05, 1] } : undefined}
      transition={
        action === "live"
          ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      {/* An invitation is answered, not played: the same tap (enter the
          room, which takes the seat and reads the invite) under the word
          the asker is waiting for, in green like every button one tap from
          a game (owner: "show green button - confirm button and X besides
          that green button to deny"). */}
      {room.has_pending_invite ? (
        <>
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          {t("common.confirm")}
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5 fill-current" />
          {t("extra.roomPlay")}
        </>
      )}
    </RoomCardPlayButton>
  );
  /**
   * The host's way to fill an open seat, from the list rather than from
   * inside the room.
   *
   * Only the host invites — a guest has no seats to give away. And only
   * while a seat is actually open: an unlimited room (no max_players) always
   * has one, a capped room does once its count is below the cap. Same rule
   * the Public tab's cards already use (PublicRoomsSection.canInvite).
   */
  const canInvite = room.is_host && (!room.max_players || displayPlayerCount < room.max_players);

  // The faces used to be trimmed to two whenever the card carried a button,
  // with the "+N" bubble suppressed on the reasoning that the count pill above
  // already said how many there were. It read as a missing player rather than
  // as a crop. Same five as every other card now: the row is the one thing in
  // this group allowed to give way (overflow-hidden, above), so a card too
  // narrow for all of it clips a face rather than sliding under the button.
  const avatarLimit = ROOM_CARD_FACES;
  // The host leads the faces as a label — face, crown, name — so their
  // face is not drawn twice and the label says they are in the room as
  // its host (owner's ask). Everyone else stays a face in the cluster.
  const cardHost = displayPlayers.find((p) => p.is_host) ?? null;
  const guests = displayPlayers.filter((p) => !p.is_host);

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
    // The card opens what the room IS; the button does what it offers.
    // A tap used to join, so the only way to read a room was to enter it
    // (owner: "only button click opens room ... click on card shows
    // categories list and cost for participating").
    //
    // Except a lounge — the King's couch, the arena — which carries its own
    // stake and its own idea of a round, so the sheet would describe it
    // wrongly. Their card keeps the tap it had.
    if (!isSwiping.current && !isJoining) {
      if (roomKind(room) === "classic") onPreview(action ? playButton : undefined);
      else onJoin();
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
          className={`relative aspect-[1.45/1] md:aspect-[1.15/1] rounded-2xl overflow-hidden cursor-pointer ${!isMobile ? "transition-transform duration-200 hover:scale-[1.02]" : ""} active:scale-[0.98] ${
            room.has_unread_activity ? "ring-2 ring-primary ring-offset-2" : ""
          }`}
        >
          {/* Drawn over the card, inside the same clip, so it sits exactly on
              the card's edge — the Public tab's card does it this way too. It
              fades out and unmounts rather than turning invisibly forever. */}
          <AnimatePresence>
            {ringUp && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="fresh-room-ring pointer-events-none absolute inset-0 z-30 rounded-2xl"
              />
            )}
          </AnimatePresence>
          <GradientBackground
            colors={gradientPreset.colors}
            gradientSize="125% 125%"
            gradientOrigin="bottom-middle"
            enableNoise={false}
            className="relative w-full h-full p-3 flex flex-col"
          >
            {/* The pale card (owner's design, shared with the Public tab —
                see PublicRoomsSection's INK): a white wash over the
                gradient, dark type on it, white pills, a white bar. */}
            <div className="absolute inset-0 bg-white/55 pointer-events-none" aria-hidden />
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
                {/* "New" for the room's first hour, then no time label at all:
                    the running age was one pill too many on a row already
                    carrying the count and the way out (owner's ask). The dot
                    still says whether anyone is there. */}
                {/* Seats first, on the left. */}
                <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-sm px-2.5 py-1">
                  <Users className="w-3.5 h-3.5 text-[#2b1a4a]" />
                  <span className="text-[#2b1a4a] font-bold text-xs">{displayPlayerCount}</span>
                </div>
                {isNew && (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-sm text-[#2b1a4a] font-bold text-xs">
                    <span
                      className={`w-1.5 h-1.5 shrink-0 rounded-full animate-pulse ${
                        someoneInRoom || allPlayersOnline ? "bg-green-400" : "bg-amber-400"
                      }`}
                    />
                    {t("extra.roomStatusNew")}
                  </span>
                )}
              </div>

              {/* Right: the controls. The count used to lead this group and
                  moved to the left of the card, where the eye lands first
                  (owner: "show players count on left side of the cards") —
                  it is a fact about the room, not something to press, and it
                  was sharing a row with two things that are. */}
              <div className="flex items-center gap-2">

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
                className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center hover:bg-white/80 active:scale-95 transition"
              >
                {room.is_host ? (
                  <Trash2 className="w-4 h-4 text-[#2b1a4a]" />
                ) : (
                  <LogOut className="w-4 h-4 text-[#2b1a4a]" />
                )}
              </button>
              </div>
            </div>
            
            {/* Middle: Icon + Title + Category + Time */}
            <div className="relative z-10 flex-1 flex flex-col justify-center py-3">
              <div className="flex items-center gap-3">
                {roomFace && (
                  <img
                    src={roomFace}
                    alt=""
                    className="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-lg flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-[#2b1a4a] text-lg leading-tight line-clamp-2">
                    {displayName}
                  </h3>
                  {(isPartyRoom || room.category_name || (lounge && room.room_name)) && (
                    <p className="text-[#2b1a4a]/70 text-sm truncate mt-0.5 flex items-center gap-1.5">
                      <span className="truncate">
                        {isPartyRoom ? t("extra.myTriviaPartyLabel") : room.category_name ? localizeCategory(room.category_name) : lounge!.label}
                      </span>
                      {/* How much more there is, without saying what (owner:
                          "show +X if there are more rounds in the room
                          selected"). Tapping the card is what names them. */}
                      {extraRounds > 0 && (
                        <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold text-[#2b1a4a]">
                          +{extraRounds}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Bottom: Glass container — who is in the room on the left, the
                way into it on the right. */}
            <div className="relative z-10">
              <div className="bg-white/60 backdrop-blur-md rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2">
                {/* Left: TV marker (played or live on TV, no container) +
                    the faces of who is in there + the "+" for an open seat,
                    which belong beside the number they are the count of.

                    The "+" lives HERE, in this left-hand group, always — not
                    only when the Play button is on the right. Putting it on
                    the right only sometimes (when there was no Play button
                    to share the row with) meant the same room could show a
                    Play button on one visit and not on the next, as who else
                    was online changed, and the "+" jumped sides with it
                    (owner: "it is confusing now"). One GROUP for the host to
                    learn, regardless of what the right side is doing.

                    Within that group it sits AFTER the faces now, not before
                    — the Public tab's own cards have always drawn it as the
                    last seat in the row, and putting it first here was this
                    tab's own invention, not something borrowed from Public
                    (owner: "let's show + button next to the avatars on right
                    side, not left side on private rooms too"). */}
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
                  {cardHost && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cardHost.user_id) openProfile(cardHost.user_id);
                      }}
                      className="flex items-center gap-1.5 min-w-0 shrink-0 rounded-full bg-white/60 backdrop-blur-sm pl-1.5 pr-2.5 py-1"
                    >
                      {/* Face, name: the face is the same 34px as every other
                          face on the row with a gold ring rather than a white
                          one - at 24px in a white pill the host read as the
                          smallest person in their own room - and the crown
                          sits ON the ring, centred over the top of the face,
                          the way a crown is worn (owner: "put crown icon on
                          stroke, above the avatar"). */}
                      <span className="relative shrink-0">
                        <span className="block w-[34px] h-[34px] rounded-full overflow-hidden ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent">
                          <SafeAvatarImage
                            avatarUrl={cardHost.avatar_url}
                            fallback={cardHost.nickname || "?"}
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
                          />
                        </span>
                        <img src={crownIcon} alt="" className="pointer-events-none absolute -top-2 left-1/2 z-10 w-[18px] h-[18px] -translate-x-1/2 object-contain drop-shadow-sm" />
                        {room.online_participants.some((op) => op.user_id === cardHost.user_id) && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                        )}
                      </span>
                      <span className="text-xs font-semibold truncate max-w-[104px] text-[#2b1a4a]">
                        {cardHost.nickname || t("extra.friendFallback")}
                      </span>
                    </button>
                  )}
                  <div className="flex -space-x-2 min-w-0 overflow-hidden p-1 -m-1">
                    {guests.slice(0, avatarLimit).map((p, idx) => {
                      // Check if this participant is online
                      const isOnline = room.online_participants.some(op => op.user_id === p.user_id);
                      // The seat reserved for the viewer, not yet taken: their
                      // own face in black and white beside the host's (owner:
                      // "show avatar who was invited as black and white
                      // besides the host avatar"). The private list carries
                      // every participant row, the invited one included, so
                      // the face is already here — it is only greyed.
                      const reservedForMe = room.has_pending_invite && p.user_id === user?.id;
                    
                      return (
                        // Descending z-index so the first avatar sits on top of
                        // the ones behind it — the negative margin alone would
                        // put the last one in front.
                        <div
                          key={p.user_id || idx}
                          className="relative flex-shrink-0"
                          style={{ zIndex: guests.length - idx }}
                        >
                          <div
                            className={`w-[34px] h-[34px] rounded-full overflow-hidden bg-white/20 cursor-pointer hover:scale-110 transition-transform active:scale-95 shadow-md ${
                              reservedForMe
                                ? "grayscale opacity-70 ring-2 ring-slate-400/70 ring-offset-1 ring-offset-transparent"
                                : isOnline
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
                        </div>
                      );
                    })}
                    {guests.length > avatarLimit && (
                      <div className="w-[34px] h-[34px] rounded-full border-2 border-white bg-white/60 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-[#2b1a4a] text-[10px] font-bold">
                          +{guests.length - avatarLimit}
                        </span>
                      </div>
                    )}
                  </div>
                  {canInvite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInvite?.(room);
                      }}
                      aria-label={t("extra.inviteFriendsTitle")}
                      className="w-[34px] h-[34px] rounded-full border-2 border-dashed border-[#2b1a4a]/30 bg-white/70 flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-[#2b1a4a]" />
                    </button>
                  )}
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
                {/* The right-hand group: the button, and beside it the X that
                    answers an invitation with no — one group, so the two sit
                    together rather than being spread across the bar. */}
                <div className="flex items-center gap-2 shrink-0">
                {action && (
                  /* The public list's button in white — same shape, same
                     word, same play triangle. Which list you are on is the
                     only difference between them. Drawn by playButton, so
                     the preview sheet can draw the same one. */
                  playButton()
                )}
                {/* No: the reserved seat is given up and the invite answered. */}
                {room.has_pending_invite && !isJoining && (
                  <button
                    type="button"
                    aria-label={t("extra.notifDecline")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeclineInvite?.(room);
                    }}
                    className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center hover:bg-white/80 active:scale-95 transition"
                  >
                    <X className="w-4 h-4 text-[#2b1a4a]" strokeWidth={2.5} />
                  </button>
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
