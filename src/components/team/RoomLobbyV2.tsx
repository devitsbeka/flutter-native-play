import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import retroTvIcon from "@/assets/images/retro-tv.png";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { containsBlockedText } from "@/utils/contentFilter";
import { Share2, ArrowLeft, Edit2, MessageCircle, Send, X, Trash2, Play, Tv, AlertTriangle, Palette, MoreVertical, Info, LogOut, Plus, BellRing } from "lucide-react";
import { createNotification, useNotifications } from "@/hooks/useNotifications";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { shareOrCopy } from "@/utils/shareLink";
import { isRoomActive, MY_ROOMS_KEY, type MyRoom } from "@/hooks/useMyRooms";
import { PUBLIC_ROOMS_KEY, type PublicRoom } from "@/hooks/usePublicRooms";
import { useQueryClient } from "@tanstack/react-query";
import { RoomIconPickerModal } from "./RoomIconPickerModal";
import { useMultiplayerV2, getShareLink, QUESTIONS_PER_ROUND, questionsPerRound } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { routeForRoom } from "@/utils/roomRoutes";
import { OWN_TRIVIA_ICON_SLUG, roomPlaysOwnTrivia, roundIconSlug } from "@/utils/ownTriviaRound";
import { isUndecidedRound, UNDECIDED_ICON_SLUG } from "@/utils/undecidedRound";
import { MatchSummarySheet } from "./MatchSummarySheet";
import { RematchWaitSheet, type RematchSeat } from "./RematchWaitSheet";
import { sendRematchRequest, type RematchPick } from "@/utils/rematchRequests";
import { siteUrl } from "@/config/site";
import { inviteLinkPath } from "@/utils/inviteLink";
import { useRoomMatchHistory } from "@/hooks/useRoomMatchHistory";
import { useRoomCategoryQueue } from "@/hooks/useRoomCategoryQueue";
import { useCategoryIconByName, useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { Input } from "@/components/ui/input";
import { RoomScoreboard } from "./RoomScoreboard";
import { TVSetupInline } from "./TVSetupInline";
import { GradientPicker } from "./GradientPicker";
import { InviteFriendsModal } from "./InviteFriendsModal";
import { getGradientById } from "@/config/roomGradients";
import { ChallengeResultsSection } from "./ChallengeResultsSection";
import { getCategoryIconSlug } from "@/data/categoryIconMap";
import { Switch } from "@/components/ui/switch";
import { CategoryPickerSection } from "./CategoryPickerSection";
import { CategoryPickerModal } from "./CategoryPickerModal";
import { JoinRequestGate } from "./JoinRequestGate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UniversalLobby, type LobbyPlayer, type LobbyRuleRow } from "@/components/lobby/UniversalLobby";
import { RoundOrderModal } from "@/components/team/RoundOrderModal";
import type { QueueItem } from "@/hooks/useRoomCategoryQueue";
import { classicLobbyScene } from "@/utils/lobbyScene";
import { gameRoomsHasApproval } from "@/utils/roomVisibility";
import { dealtRoomIcon, fetchCrestPool } from "@/utils/roomCrests";
import { forgetDraftRoom, hasPressedCreate, rememberPressedCreate, roomIsDraft, roomWantsPublic } from "@/utils/roomCreateOffered";
import { roomDraftFields } from "@/utils/roomVisibility";
import { useParticipantPresence } from "@/hooks/useParticipantPresence";
import coinIconAsset from "@/assets/tb-lobby/coin.png";
import { NotEnoughStakeModal } from "@/components/home/NotEnoughStakeModal";
import { useCurrency } from "@/hooks/useCurrency";
import { REWARDS } from "@/config/rewardConfig";
import { firstPlaceShare } from "@/utils/roomPot";
import { triviaDisplayTitle } from "@/utils/triviaTitle";
import { useFriends } from "@/hooks/useFriends";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function RoomLobbyV2() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { playSound } = useSound();
  const { t } = useLanguage();
  const { 
    currentRoom, 
    participants, 
    isHost, 
    exitRoom,
    leaveRoomPermanently,
    deleteRoom,
    startGame,
    startNextFromQueue,
    loading,
    lastPlayedTriviaId,
    justReturnedFromResults,
  } = useMultiplayerV2();
  
  const [showIconPicker, setShowIconPicker] = useState(false);
  // The ordered icon deck a faceless room is dealt from — see roomFace below.
  /**
   * Whether this database knows about `requires_approval` yet.
   *
   * The switch is HIDDEN until it does. Migrations land here by hand, and a
   * switch that silently writes nothing is worse than no switch at all — the
   * host would set it, watch it snap back, and conclude the room is broken.
   */
  const [hasApprovalColumn, setHasApprovalColumn] = useState(false);
  useEffect(() => {
    let alive = true;
    void gameRoomsHasApproval().then((ok) => {
      if (alive) setHasApprovalColumn(ok);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [iconPool, setIconPool] = useState<readonly string[]>([]);
  useEffect(() => {
    void fetchCrestPool().then(setIconPool);
  }, []);
  /**
   * Has the host pressed Create on this room?
   *
   * It is the moment a room stops being a draft. Before it, the lobby is
   * where the room is built; after it, a PUBLIC room is a thing other people
   * are looking at on a list, and what it says it plays has to stay true
   * (see rulesLocked). It is also why Create is offered once.
   *
   * Read per room rather than once — the lobby survives the host moving
   * between rooms — and seeded on the first render rather than by the effect
   * alone, so a created room is never briefly editable while the effect
   * catches up.
   */
  const [roomCreated, setRoomCreated] = useState(() => hasPressedCreate(currentRoom?.id));
  useEffect(() => {
    setRoomCreated(hasPressedCreate(currentRoom?.id));
  }, [currentRoom?.id]);
  /**
   * Whether the room can start, for the handler rather than the button.
   *
   * `enoughPlayers` is worked out far below, after the early returns —
   * handleStartGame is declared above it and closes over nothing useful. A
   * ref carries the answer down: the button's disabled state is the first
   * line of defence, this is the one that holds when the picker auto-starts
   * or the last guest leaves between the tap and the write.
   */
  const enoughPlayersRef = useRef(false);
  /**
   * Who of the people seated here is in the app right now.
   *
   * Up here with the other hooks, not down beside the count that reads it:
   * everything below `if (!currentRoom) return null` runs on some renders
   * and not others, and a hook may not.
   */
  const seatedIdsForPresence = useMemo(
    () => participants.filter((p) => (p.status as string) !== "invited").map((p) => p.user_id),
    [participants],
  );
  const { online: onlineInRoom, loaded: presenceLoaded } = useParticipantPresence(seatedIdsForPresence);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  /** The player the host's bin is asking about, until they answer. */
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);
  // Can this player cover a seat at the table? The pot is collected when the
  // round ends, but being told then is being told too late.
  /**
   * Can this player cover a seat at the table?
   *
   * The BALANCE, not useGameStake's `hasEnoughCoins`, which is
   * `isVipFreePlay || canAfford` — PRO is exempt from a quick game's loss,
   * because nobody is on the other side of one. A room pot is other
   * players' money and PRO stakes into it like everyone else
   * (settle_room_round: "Everyone stakes, PRO included"), so a PRO player
   * with nothing waved through here reached the settlement and paid what
   * they had, leaving the pot short and the table funding them.
   */
  const { coins } = useCurrency();
  const canCoverStake = coins >= REWARDS.GAME_STAKE;
  const [showNoStake, setShowNoStake] = useState(false);
  const [showMatchSummary, setShowMatchSummary] = useState(false);
  const [showRematchWait, setShowRematchWait] = useState(false);
  /**
   * Who was ASKED, taken when the ask goes out.
   *
   * Not read off `participants` at render time: saying no gives the seat up
   * (answerRematchRequest deletes the row), so a declined player is not in
   * the room any more and a list built from the room would simply lose them
   * — leaving the host to work out "who did not" from a gap. The snapshot
   * remembers the table; the room says what each of them has answered since.
   */
  const [askedSeats, setAskedSeats] = useState<Omit<RematchSeat, "answer">[]>([]);
  /**
   * Why the summary sheet is open: Create (the room, once) or Start on a
   * later match, which asks the table rather than commits. Set by Start,
   * cleared whenever the sheet closes, so Create never inherits it.
   */
  const [askingTable, setAskingTable] = useState(false);
  useEffect(() => {
    if (!showMatchSummary) setAskingTable(false);
  }, [showMatchSummary]);
  const [isStarting, setIsStarting] = useState(false);
  const [isTVModeEnabled, setIsTVModeEnabled] = useState(() => searchParams.get("tvMode") === "true");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [tvHintGlow, setTvHintGlow] = useState(() => searchParams.get("tvHint") === "true");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [startAfterPick, setStartAfterPick] = useState(false); // Flag to auto-start game after category pick
  const [madeNewSelection, setMadeNewSelection] = useState(false); // Track if user made a new selection after returning from results
  const [hasCheckedTVSession, setHasCheckedTVSession] = useState(false);
  const [showHostObserverWarning, setShowHostObserverWarning] = useState(false);
  const [willBeObserver, setWillBeObserver] = useState(false); // Pre-calculate if host will be observer
  const prevParticipantsRef = useRef<string[]>([]);
  // The faces of whoever was seated last render, so a departed player's row
  // can still wear their name and picture while it says "left".
  const prevFacesRef = useRef<Map<string, { name: string; avatarUrl: string | null }>>(new Map());
  // Which room the two refs above describe. The lobby is not remounted when
  // the host leaves one room and makes another, so without this the last
  // room's roster was diffed against the new room's: everybody from the old
  // table read as having "left" a room they were never in (ghost rows on a
  // brand-new room, owner's screenshot).
  const prevRoomIdRef = useRef<string | null>(null);
  // The "left" notes' removal timers. Kept here rather than in the effect's
  // own cleanup: that cleanup ran on every roster change, which cancelled a
  // pending removal the moment anyone else moved - and the ghost stayed.
  const noteTimersRef = useRef<number[]>([]);
  useEffect(() => () => noteTimersRef.current.forEach((id) => window.clearTimeout(id)), []);
  const { friends, sendFriendRequest } = useFriends();
  // Who this player has asked to be friends from this lobby, this visit:
  // the + on their row becomes a tick until the friends list catches up.
  const [askedIds, setAskedIds] = useState<Set<string>>(() => new Set());
  const { unreadCount } = useNotifications();

  // The TV entry points create the room first — mounting this lobby — and only
  // then navigate to ?tvMode=true, so the mount-time initializer above misses
  // the param. React to it arriving late as well, opening the toggle and the
  // TV pairing (code entry) section. The param is consumed so switching the
  // toggle off afterwards isn't re-forced on by the lingering URL.
  useEffect(() => {
    if (searchParams.get("tvMode") === "true") {
      setIsTVModeEnabled(true);
      const next = new URLSearchParams(searchParams);
      next.delete("tvMode");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Detect and handle TV session when host returns to room
  // - Active session: redirect to controller
  // - Expired/inactive session: clear and stay in lobby
  useEffect(() => {
    if (!currentRoom?.id || !isHost || hasCheckedTVSession) return;
    
    const checkActiveSession = async () => {
      try {
        // Check if room has a TV session
        if (currentRoom.tv_session_id) {
          const { data: session } = await supabase
            .from('tv_sessions')
            .select('id, status, created_at')
            .eq('id', currentRoom.tv_session_id)
            .maybeSingle();
          
          // Check if session is expired (3+ hours old)
          const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
          const sessionCreatedAt = session?.created_at ? new Date(session.created_at).getTime() : 0;
          const isExpired = !session || sessionCreatedAt < threeHoursAgo;
          
          // Inactive statuses that should NOT redirect
          const inactiveStatuses = ['completed', 'cancelled', 'results'];
          const isInactive = !session || inactiveStatuses.includes(session.status || '');
          
          // Clear expired/inactive TV session from room
          if (isExpired || isInactive) {
            console.log('[RoomLobbyV2] Clearing expired/inactive TV session from room');
            await supabase
              .from("game_rooms")
              .update({ tv_session_id: null })
              .eq("id", currentRoom.id);
            
            setHasCheckedTVSession(true);
            return;
          }
          
          // Active session statuses that should redirect host to controller
          const activeStatuses = ['waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 'poll-voting', 'poll-results', 'category-select'];
          
          if (session && activeStatuses.includes(session.status || '')) {
            console.log('[RoomLobbyV2] Active TV session detected, redirecting host to controller');
            navigate(`/tv/host/${session.id}`, { replace: true });
            return;
          }
        }
        setHasCheckedTVSession(true);
      } catch (error) {
        console.error('[RoomLobbyV2] Error checking TV session:', error);
        setHasCheckedTVSession(true);
      }
    };
    
    checkActiveSession();
  }, [currentRoom?.id, currentRoom?.tv_session_id, isHost, hasCheckedTVSession, navigate]);

  // NON-host participants: when the room's game runs on a TV session, the
  // regular lobby waits forever ("waiting for host...") because TV mode never
  // flips the room's own status - the game lives in tv_sessions. Send them
  // into the TV player join flow instead. Re-runs when tv_session_id lands
  // via realtime, so players already sitting in the lobby get pulled in the
  // moment the host opens TV mode.
  useEffect(() => {
    if (!currentRoom?.tv_session_id || isHost) return;
    const tvSessionId = currentRoom.tv_session_id;
    let cancelled = false;

    const checkAndJoinTVSession = async () => {
      try {
        const { data: session } = await supabase
          .from('tv_sessions')
          .select('id, status, created_at')
          .eq('id', tvSessionId)
          .maybeSingle();
        if (cancelled || !session) return;

        // Same liveness rules as the host-side check above
        const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
        const sessionCreatedAt = session.created_at ? new Date(session.created_at).getTime() : 0;
        const isExpired = sessionCreatedAt < threeHoursAgo;
        const activeStatuses = ['waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 'poll-voting', 'poll-results', 'category-select'];

        if (!isExpired && activeStatuses.includes(session.status || '')) {
          console.log('[RoomLobbyV2] Active TV session detected, sending participant to TV join');
          navigate(`/join/session/${session.id}`, { replace: true });
        }
      } catch (error) {
        console.error('[RoomLobbyV2] Error checking TV session for participant:', error);
      }
    };

    checkAndJoinTVSession();
    return () => {
      cancelled = true;
    };
  }, [currentRoom?.tv_session_id, isHost, navigate]);

  const { matches } = useRoomMatchHistory(currentRoom?.id || null);
  const { queue, addToQueue, removeFromQueue, reorderQueue, replaceQueueItem } = useRoomCategoryQueue(currentRoom?.id || null);
  /**
   * The party this room is playing, when it is playing one.
   *
   * A room built on a MyTrivia Party was dealt a creature and a made-up name
   * like every other room: a parrot over "Cheerful Rabbits", which named
   * neither the party nor the kind of thing it was (owner: "we should show
   * one of the my trivia party icons here instead random icons and random
   * name for room, we should show name user provided for their trivia party
   * or untitled").
   *
   * The room row carries `category_name` — the trivia's title as it stood
   * when the room was made — but not whether that trivia is a PARTY, and
   * the four party icons belong to parties. So one row is read, once per
   * room, and it also keeps the name current when the party is renamed.
   *
   * The trivia checked is whichever one plays FIRST, not only one baked
   * directly onto the room: a party trivia QUEUED into a room (rather than
   * the room being created from it) carries its `user_trivia_id` on the
   * queue row instead, and a room playing "round 1" from the queue is still
   * a party room. Missing that case is what left a room playing a party
   * showing a dealt name like "Crazy Zombies" instead of the party's own
   * title (owner: "we don't give these rooms — where players going to play
   * my trivia party — random names, host gives a name to that room").
   */
  const [partyTitle, setPartyTitle] = useState<string | null | undefined>(undefined);
  // Round 1's trivia, whichever holds it: the room's own held round, exactly
  // as heldRound below decides it (a category_id also holding that slot
  // means round 1 is a category, not whatever sits at the head of the
  // queue) — and only once neither is set does the queue's own head count.
  const ownTriviaId =
    currentRoom?.user_trivia_id
    ?? (currentRoom?.category_id ? null : queue[0]?.user_trivia_id)
    ?? null;
  useEffect(() => {
    if (!ownTriviaId) {
      setPartyTitle(undefined);
      return;
    }
    let alive = true;
    void supabase
      .from("user_quiz_posts")
      .select("title, subject")
      .eq("id", ownTriviaId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        // Only a party. A trivia the player wrote is not one of these, and
        // dressing its room in balloons would say it was.
        setPartyTitle(data?.subject === "personal" ? (data.title ?? "") : undefined);
      });
    return () => {
      alive = false;
    };
  }, [ownTriviaId]);
  const isPartyRoom = partyTitle !== undefined;
  // The queue, made visible. More than one category has always been queueable
  // — the picker takes several at once and each becomes a round — but the chip
  // showed the room's single category_name, so three queued topics read as
  // one, and reorderQueue/removeFromQueue were never called by anything.
  const [showRoundOrder, setShowRoundOrder] = useState(false);
  const localizeQueueCategory = useLocalizedCategoryName();
  const iconForCategoryName = useCategoryIconByName();

  // Who just left: their row kept a moment longer to carry "left" (owner's
  // ask). The first snapshot is the room as found, not arrivals.
  //
  // There is no "joined" note any more. Two reasons, and the second is the
  // one that was actually visible: the avatar already says it — a seat that
  // is only invited is drawn in grey and turns full colour on arrival, so a
  // word saying the same thing is the third time of asking. And this fired
  // on the wrong event. Inviting somebody INSERTS their participant row, so
  // the diff below counted them as an arrival and flashed "joined" beside a
  // name that had done nothing of the kind — then the row settled to
  // "invited" half a second later and contradicted it.
  const [seatNotes, setSeatNotes] = useState<Map<string, "left">>(() => new Map());
  const [departed, setDeparted] = useState<{ id: string; name: string; avatarUrl: string | null }[]>([]);
  const SEAT_NOTE_MS = 3500;

  // Play sound when new participant joins
  useEffect(() => {
    const currentIds = participants.map(p => p.user_id);
    // An invited seat is a row too. Counting it as an arrival is what played
    // the join sound and toasted "a new player joined" the moment the HOST
    // sent an invitation — for somebody who had not answered it yet.
    const seatedIds = participants
      .filter((p) => (p.status as string) !== "invited")
      .map((p) => p.user_id);
    const faces = new Map(participants.map((p) => [p.user_id, { name: p.nickname, avatarUrl: p.avatar_url }]));
    const roomId = currentRoom?.id ?? null;
    if (roomId !== prevRoomIdRef.current) {
      // A different room: nobody arrived or left, the table is simply a
      // different table. Start its history here, and drop the old room's
      // notes and ghosts with it.
      prevRoomIdRef.current = roomId;
      prevParticipantsRef.current = seatedIds;
      prevFacesRef.current = faces;
      setSeatNotes(new Map());
      setDeparted([]);
      return;
    }
    const prevIds = prevParticipantsRef.current;

    if (prevIds.length > 0) {
      const arrived = seatedIds.filter((id) => !prevIds.includes(id));
      if (arrived.length > 0 && arrived[0] !== user?.id) {
        playSound("room-join");
        toast.success(t("team.newPlayerJoined"));
      }
      const gone = prevIds.filter((id) => !currentIds.includes(id) && id !== user?.id);
      if (gone.length > 0) {
        setSeatNotes((prev) => {
          const next = new Map(prev);
          gone.forEach((id) => next.set(id, "left"));
          return next;
        });
        const lastFaces = prevFacesRef.current;
        setDeparted((prev) => [
          ...prev.filter((d) => !gone.includes(d.id)),
          ...gone.map((id) => ({ id, name: lastFaces.get(id)?.name ?? "", avatarUrl: lastFaces.get(id)?.avatarUrl ?? null })),
        ]);
        noteTimersRef.current.push(
          window.setTimeout(() => {
            setSeatNotes((prev) => {
              const next = new Map(prev);
              gone.forEach((id) => next.delete(id));
              return next;
            });
            setDeparted((prev) => prev.filter((d) => !gone.includes(d.id)));
          }, SEAT_NOTE_MS),
        );
      }
    }

    // Seated ids, matching what `arrived` is diffed against: an invitation
    // that is later accepted has to read as an arrival at that moment, not
    // at the moment it was sent.
    prevParticipantsRef.current = seatedIds;
    prevFacesRef.current = faces;
  }, [participants, currentRoom?.id, user?.id, playSound]);

  // Pre-calculate if host will be observer for current trivia selection
  // This enables UI indicators before game start
  useEffect(() => {
    const checkObserverStatus = async () => {
      // Only check for user trivias (not library/random) and only for host
      if (!currentRoom?.user_trivia_id || !user?.id || !isHost) {
        setWillBeObserver(false);
        return;
      }
      
      try {
        const { data: trivia } = await supabase
          .from("user_quiz_posts")
          .select("user_id, is_blind, plays_count")
          .eq("id", currentRoom.user_trivia_id)
          .maybeSingle();
        
        // Host knows answers if: they own it AND (it's not blind OR they've already played it)
        const hostKnowsAnswers = trivia?.user_id === user.id && 
          (!trivia?.is_blind || (trivia?.plays_count || 0) > 0);
        
        setWillBeObserver(hostKnowsAnswers);
      } catch (error) {
        console.error("Error checking observer status:", error);
        setWillBeObserver(false);
      }
    };
    
    checkObserverStatus();
  }, [currentRoom?.user_trivia_id, user?.id, isHost]);

  const handleShare = async () => {
    if (!currentRoom) return;

    // The sender's own invite link, so opening it makes the two of them
    // friends — and it names THIS room, the one on screen.
    //
    // It used to name no room at all and let the far end work one out, as
    // "the most recently touched waiting room the sender is in". That is this
    // room most of the time and quietly the wrong one the rest of it: any
    // other lobby the sender is still a participant of wins the moment it is
    // touched. See utils/inviteLink.
    //
    // The room link is the fallback and nothing more. A room is archived once
    // it is finished with, and both room_preview and room_players skip
    // archived rooms, so a /room/<code> link shared into a chat is dead by
    // the time the game is over — "this invitation link no longer works",
    // pointing at a room that existed when it was sent. The personal link
    // has no expiry: no room, and the friendship is still the outcome.
    const { data: inviteCode } = await supabase.rpc("get_or_create_invite_code");
    const link = inviteCode
      ? siteUrl(inviteLinkPath(inviteCode, { kind: "room", roomCode: currentRoom.room_code }))
      : getShareLink(currentRoom.room_code);
    const shareData = {
      title: t("extra.shareTitle"),
      text: t("extra.shareText"),
      url: link,
    };

    const outcome = await shareOrCopy(shareData);
    if (outcome === "copied") toast.success(t("team.linkCopied"));
    if (outcome === "failed") toast.error(t("team.shareFailed"));
  };

  const handleTVModeToggle = (checked: boolean) => {
    setIsTVModeEnabled(checked);
  };

  // Non-host: ping the host to start the game. In-app the host gets a
  // clickable popup (plus the notification sound the realtime insert already
  // plays); away from the app a push goes out best-effort. Cooldown stops spam.
  const [pingCooldown, setPingCooldown] = useState(false);
  const handlePingHost = async () => {
    if (!currentRoom || !user || pingCooldown) return;
    setPingCooldown(true);
    setTimeout(() => setPingCooldown(false), 30_000);

    const senderName = profile?.nickname || "";
    const title = t("extra.pingHostNotifTitle").replace("{name}", senderName || "...");
    await createNotification(
      currentRoom.host_user_id,
      "room_ping",
      title,
      currentRoom.room_name || undefined,
      {
        room_id: currentRoom.id,
        room_code: currentRoom.room_code,
        room_icon: currentRoom.room_icon || undefined,
        sender_nickname: senderName,
      }
    );
    // Push for hosts away from the app; fails quietly if push isn't
    // configured. send-social-push, NOT send-push-notification: that one
    // requires the admin role (it is the admin broadcast), so a regular
    // player's ping 403'd silently — and it carried no route, so even a
    // delivered tap could only open the app. The server re-reads the room,
    // checks this caller is a participant, composes the text in the HOST's
    // language and routes the tap to /team?join=<code>.
    supabase.functions
      .invoke("send-social-push", { body: { kind: "room_ping", roomId: currentRoom.id } })
      .catch(() => {});
    toast.success(t("extra.pingHostSent"));
  };

  const handleTVSetupComplete = () => {
    setIsTVModeEnabled(false);
  };

  /**
   * The back arrow.
   *
   * A room made by "+ Room" is a draft until Create or Start settles it. A
   * host backing out of one before that, still alone in it, did not make a
   * room — they looked at one and left — so the row goes with them rather
   * than sitting on the list as a room nobody built (owner: "if i click +
   * room and didn't choose category and clicked back button, room
   * shouldn't be created, only after clicking create - we create rooms").
   *
   * Only ever alone: a seat somebody else holds — joined, or invited and
   * waiting on their answer — is a room in use, and it stays.
   */
  const handleExitRoom = () => {
    const abandonedDraft =
      !!currentRoom &&
      isHost &&
      roomIsDraft(currentRoom) &&
      !roomCreated &&
      currentRoom.status !== "playing" &&
      participants.every((p) => p.user_id === user?.id);
    const draftId = abandonedDraft ? currentRoom.id : null;
    exitRoom();
    if (draftId) {
      forgetDraftRoom(draftId);
      void deleteDraftRoom(draftId);
    }
    // Use replace to avoid going back to a /team?join=... history entry that can auto-rejoin.
    navigate("/team", { replace: true });
  };

  /**
   * The draft's row goes, and no list gets to show it on the way out.
   *
   * The delete used to be fired and forgotten while the lobby closed - and
   * closing the lobby mounts the room lists again, which ask the server in
   * the same tick. The Public list's answer raced the delete and won: it
   * listed the draft, and asked nothing more for twenty-five seconds. So
   * the host backed out of a room they never made and found it on the
   * list, "New", with their name on it (owner: "it creates room when i
   * clicked back button"). The row WAS deleted; the list was a photograph
   * taken a moment too early.
   *
   * So: first drop the room from both lists' caches - which also marks them
   * fresh, so the remount does not ask at all - then delete the row, then
   * have both lists ask again with the row gone. Nothing is left to what
   * arrives first.
   */
  const queryClient = useQueryClient();
  const deleteDraftRoom = async (id: string) => {
    void queryClient.cancelQueries({ queryKey: PUBLIC_ROOMS_KEY });
    void queryClient.cancelQueries({ queryKey: [MY_ROOMS_KEY] });
    queryClient.setQueryData<PublicRoom[]>(PUBLIC_ROOMS_KEY, (rooms) => rooms?.filter((r) => r.id !== id));
    queryClient.setQueriesData<MyRoom[]>({ queryKey: [MY_ROOMS_KEY] }, (rooms) => rooms?.filter((r) => r.id !== id));
    const { error } = await supabase.from("game_rooms").delete().eq("id", id);
    if (error) console.warn("[RoomLobbyV2] draft room was not deleted:", error.message);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PUBLIC_ROOMS_KEY }),
      queryClient.invalidateQueries({ queryKey: [MY_ROOMS_KEY] }),
    ]);
  };

  /**
   * A draft the Public tab made is published here, not at birth.
   *
   * The row was born private so it would not sit on everybody's Public list
   * before it was a room (owner: "until i click create do not create room
   * and show on public list"). Create and Start are what make it one, so
   * they flip is_public — once, on the host's own row — and the lobby
   * treats the room as public from then on without waiting for the row to
   * come back round. Returns whether the room is public afterwards.
   */
  const [publishedNow, setPublishedNow] = useState(false);
  // Once the row itself says public, the bridge is not needed — and must
  // not stay: complete_room_round makes a public room private after its
  // first round, and a sticky flag kept the lobby believing otherwise
  // (TV hidden, the Open/Ask row live on a door that no longer exists).
  useEffect(() => {
    if (currentRoom?.is_public) setPublishedNow(false);
  }, [currentRoom?.is_public]);
  /**
   * Settle the draft: the row stops being one, and is published if the
   * Public tab made it. Resolves to whether the room is public afterwards,
   * or null when the write FAILED — offline, RLS, a transient — in which
   * case the caller says so and does not pretend. A swallowed failure here
   * used to leave the room permanently private, no longer a draft, the
   * host on the wrong tab and nothing on screen about it.
   */
  const publishDraft = async (): Promise<boolean | null> => {
    if (!currentRoom) return null;
    const alreadyPublic = Boolean(currentRoom.is_public) || publishedNow;
    const wantsPublic = roomWantsPublic(currentRoom);
    const patch: { is_public?: boolean; is_draft?: boolean } = {
      ...(roomIsDraft(currentRoom) ? await roomDraftFields(false) : {}),
      ...(wantsPublic && !alreadyPublic ? { is_public: true } : {}),
    };
    if (Object.keys(patch).length === 0) return alreadyPublic;
    const { error } = await supabase.from("game_rooms").update(patch).eq("id", currentRoom.id);
    if (error) {
      console.warn("[RoomLobbyV2] draft room was not settled:", error.message);
      toast.error(t("extra.errorOccurred"));
      return null;
    }
    if (patch.is_public) setPublishedNow(true);
    return alreadyPublic || Boolean(patch.is_public);
  };

  /**
   * "Create": the way out of a room that is set up but cannot start yet.
   *
   * A host alone in their own room met a dead Start button — the screen's one
   * big call to action, greyed, in front of the person it was for — and the
   * only way on was the back arrow, which reads as abandoning what they just
   * built. The room IS built; what it needs is somebody else, and that is on
   * the list, not in here (owner: "instead start game disabled show create
   * button and after clicking it user goes on online game page").
   *
   * It lands on the tab the room is actually listed under, because a public
   * room shown on the Private tab looks like it was not published. Both
   * lists already lead with the room just made and ring it for three seconds
   * (isFreshOwnRoom / .fresh-room-ring), so the room is where the eye lands.
   *
   * Offered once per room (see roomCreateOffered): pressing it and coming
   * back finds the same finished room, so a second offer of the same trip
   * would be a loop rather than a way on.
   */
  const handleDoneCreating = async () => {
    // Published first, so the list it lands on is the one it is on. A
    // failed publish is said, and Create is not settled over it.
    const isPublic = await publishDraft();
    if (isPublic === null) return;
    // The list it lands on is asked again: the Public tab's cache was up
    // to ten seconds old, and the room just published was not on it.
    if (isPublic) void queryClient.invalidateQueries({ queryKey: PUBLIC_ROOMS_KEY });
    rememberPressedCreate(currentRoom?.id);
    setRoomCreated(true);
    // Created is settled: the draft is a room now, and backing out keeps it.
    forgetDraftRoom(currentRoom?.id);
    // Only leave when leaving is the point. The trip to the list exists to
    // go and find a second player; with somebody already here it would walk
    // the host out of a room that is ready to start, past the people
    // waiting in it. Then the footer is just Start.
    if (enoughPlayersRef.current) return;
    exitRoom();
    navigate(`/team?tab=${isPublic ? "public" : "private"}`, { replace: true });
  };

  /**
   * Create shows what it is about to commit to, and then commits.
   *
   * The summary — the rounds, the question count, the stake — used to stand
   * in front of Start. It belongs here: this is the tap that settles a
   * public room, and afterwards the rounds and the count cannot be changed
   * from the lobby at all, so it is the last honest moment to show the host
   * what they made (owner: "we need it after 'create' so host can be sure
   * what kind of room was created by them"). "Change" closes it and leaves
   * them in the lobby with everything still editable.
   */
  const handleCreatePress = () => setShowMatchSummary(true);

  const handleLeaveConfirm = () => {
    setShowLeaveConfirm(true);
  };

  const handleLeavePermanently = async () => {
    await leaveRoomPermanently();
    navigate("/team");
  };

  const handleDeleteRoom = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRoom = async () => {
    await deleteRoom();
    setShowDeleteConfirm(false);
    navigate("/team");
  };

  const handleStartGame = async () => {
    if (!currentRoom) return;
    // A round played in it settles a draft as surely as Create does - and
    // publishes one the Public tab made. Not over a failed write.
    if ((await publishDraft()) === null) return;
    forgetDraftRoom(currentRoom.id);
    // The button is disabled for this, but the category picker can start a
    // round on its own (startAfterPick) and the last player can leave between
    // the tap and the write.
    if (!enoughPlayersRef.current) {
      toast.error(t("extra.rlNeedsSecondPlayer"));
      return;
    }

    // When rounds are queued and no current category/trivia is selected
    // (adding to the queue clears the room's current selection), start from
    // the queue - startGame would otherwise pick RANDOM questions and leave
    // the queued topics unconsumed.
    // Branch on FRESH room data: local currentRoom lags behind the realtime
    // event after the results screen clears the selection, so a quick Start
    // tap would otherwise replay the just-finished category. While the
    // previous round is still "playing" (a slow player hasn't finished yet)
    // the room keeps that round's category - it's leftover state, not a new
    // selection, so the queue wins there too.
    if (queue.length > 0) {
      const { data: freshRoom } = await supabase
        .from("game_rooms")
        .select("status, category_id, user_trivia_id")
        .eq("id", currentRoom.id)
        .maybeSingle();

      const roundStillLive = freshRoom?.status === "playing";
      const hasExplicitSelection =
        !!(freshRoom ? (freshRoom.category_id || freshRoom.user_trivia_id)
                     : (currentRoom.category_id || currentRoom.user_trivia_id)) &&
        !roundStillLive;

      if (!hasExplicitSelection) {
        setIsStarting(true);
        playSound("button-click");
        await startNextFromQueue();
        setIsStarting(false);
        return;
      }
    }

    // CRITICAL: Host-Observer policy for multiplayer rooms
    // - Library categories (category_id without user_trivia_id): Host ALWAYS plays
    // - Random categories (no category_id, no user_trivia_id): Host ALWAYS plays
    // - Open trivia (ღია): Host OBSERVES if they own it
    // - Closed trivia (დახურული): Host PLAYS if never played (plays_count=0), OBSERVES if already played

    // Only check for observer mode if playing a user trivia (not library/random)
    if (currentRoom?.user_trivia_id && user?.id) {
      // Fetch the trivia to check ownership and play status
      const { data: trivia } = await supabase
        .from("user_quiz_posts")
        .select("user_id, is_blind, plays_count")
        .eq("id", currentRoom.user_trivia_id)
        .single();
      
      // Host knows answers if: they own it AND (it's not blind OR they've already played it)
      // - Open (ღია) trivia: is_blind = false → always show warning
      // - Closed (დახურული) trivia: is_blind = true → show warning only if plays_count > 0
      const hostKnowsAnswers = trivia?.user_id === user.id && 
        (!trivia?.is_blind || (trivia?.plays_count || 0) > 0);
      
      if (hostKnowsAnswers) {
        setShowHostObserverWarning(true);
        return; // Show warning modal first
      }
    }
    
    // For library categories, random selection, or blind trivias not yet played:
    // Proceed with starting the game (host can participate normally)
    await proceedWithStartGame(false);
  };

  // Called when proceeding after warning modal - host will observe
  const proceedWithStartGame = async (hostShouldObserve: boolean = false) => {
    setShowHostObserverWarning(false);
    setIsStarting(true);
    playSound("button-click");
    await startGame(hostShouldObserve);
    setIsStarting(false);
  };

  /**
   * The host removes a player.
   *
   * There was a handler here that deleted the participant row itself and
   * nothing that called it. This one goes through lobby_manage_seat, the
   * function the battle lobby's benches already use: it checks that the
   * caller is the host, that the room is still waiting (a seat is not
   * pulled mid-round), and that the host is not removing themself — so a
   * stale button gets a refusal, not a silent zero-row delete. The row
   * vanishes for everyone by realtime; the removed player's own device
   * notices its seat is gone and leaves (below).
   */
  const handleRemovePlayer = async (userId: string) => {
    if (!currentRoom || !isHost || userId === user?.id) return;
    try {
      const { error } = await supabase.rpc("lobby_manage_seat", {
        p_room_id: currentRoom.id,
        p_user_id: userId,
        p_action: "remove",
      });
      if (error) throw error;
      toast.success(t("extra.playerRemoved"));
    } catch (error) {
      console.error("Remove player error:", error);
      toast.error(t("extra.removePlayerFailed"));
    } finally {
      setRemoveTarget(null);
    }
  };

  /**
   * Your seat is gone: leave.
   *
   * A removed player's row disappears from the list on every device,
   * including their own — where the lobby would otherwise stay open on a
   * room they are no longer in, and carry them into the next round with no
   * row to score on. So: once seated, if the list comes back without you
   * while the room is still waiting, and the table agrees, you are out —
   * told so, and put back on the rooms page. Your own leave resets the room
   * state first, so this never fires on it.
   */
  const wasSeatedRef = useRef(false);
  useEffect(() => {
    const roomId = currentRoom?.id;
    const userId = user?.id;
    if (!roomId || !userId) return;
    if (participants.some((p) => p.user_id === userId)) {
      wasSeatedRef.current = true;
      return;
    }
    if (!wasSeatedRef.current || participants.length === 0) return;
    if (currentRoom.status !== "waiting") return;
    let cancelled = false;
    void supabase
      .from("room_participants")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || data) return;
        wasSeatedRef.current = false;
        toast.info(t("extra.removedByHost"));
        exitRoom();
        navigate("/team", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [participants, currentRoom?.id, currentRoom?.status, user?.id, exitRoom, navigate, t]);

  // "Come and play" — one notification, two callers.
  //
  // The invited placeholder who never arrived gets it as a nudge to accept;
  // a player who already has a seat gets it as a call back to the table. Same
  // row in notifications, same tap target on the other end, so the difference
  // between them is only which word this side says afterwards.
  const sendRoomInvite = async (userId: string) => {
    if (!currentRoom) return;
    // The notify_room_invite trigger only fires on a new room_participants
    // row, and both of these people already have one — so the notification is
    // written here rather than waiting for a trigger that will not run.
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: "room_invite",
      title: t("extra.invitedToGame"),
      message: t("extra.invitedToGameMsg", { name: profile?.nickname || t("extra.friendFallback") }),
      data: {
        room_id: currentRoom.id,
        room_code: currentRoom.room_code,
        room_name: currentRoom.room_name,
        category_name: currentRoom.category_name,
        host_user_id: currentRoom.host_user_id,
        sender_nickname: profile?.nickname,
        sender_avatar: profile?.avatar_url
      },
    });
    if (error) throw error;
  };

  // Handler for resending invitation
  const handleResendInvitation = async (userId: string) => {
    try {
      await sendRoomInvite(userId);
      toast.success(t("extra.invitationResent"));
    } catch (error) {
      console.error("Resend invitation error:", error);
      toast.error(t("extra.invitationResendFailed"));
    }
  };

  // Host tapping "მოწვევა" beside a player already on the scoreboard. Not a
  // resend — nothing was pending — so it says "sent", not "sent again".
  const handleInvitePlayer = async (userId: string) => {
    try {
      await sendRoomInvite(userId);
      toast.success(t("extra.inviteSent"));
    } catch (error) {
      console.error("Invite player error:", error);
      toast.error(t("extra.invitationResendFailed"));
      // Rethrow: the button turns green on success, and a failed invite that
      // still went green is the one outcome worse than a failed invite.
      throw error;
    }
  };

  // handleStartTVMode removed - now using toggle with handleTVModeToggle

  // iconUrl is null when the sheet was opened to rename and nothing new was
  // picked — the room keeps whatever it wore.
  const handleUpdateRoomIconAndName = async (iconUrl: string | null, newName: string) => {
    if (!currentRoom) return;

    // Room names are shown to every participant and ride push notifications.
    if (containsBlockedText(newName)) {
      toast.error(t("extra.textNotAllowed"));
      return;
    }

    try {
      await supabase
        .from("game_rooms")
        .update({
          ...(iconUrl ? { room_icon: iconUrl } : {}),
          room_name: newName.trim(),
        })
        .eq("id", currentRoom.id);
      
      toast.success(t("team.roomUpdated"));
      setShowIconPicker(false);
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error(t("team.updateFailed"));
    }
  };

  const handleChangeGradient = async (gradientId: string) => {
    if (!currentRoom) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ background_gradient: gradientId })
        .eq("id", currentRoom.id);
      
      toast.success(t("team.backgroundChanged"));
    } catch (error) {
      console.error("Error updating background:", error);
      toast.error(t("team.backgroundChangeFailed"));
    }
  };


  // Category selection handlers
  const handleSelectCategory = async (category: { id: string; name: string; iconSlug?: string | null }) => {
    if (!currentRoom) return;
    
    try {
      // Clear any existing room_questions from previous trivia selection
      await supabase.from("room_questions").delete().eq("room_id", currentRoom.id);
      
      // Update room with new category and clear user_trivia_id
      await supabase
        .from("game_rooms")
        .update({ 
          category_id: category.id, 
          category_name: category.name,
          user_trivia_id: null, // Clear any previously selected user trivia
        })
        .eq("id", currentRoom.id);
      
      toast.success(t("extra.categoryChanged"));
      setMadeNewSelection(true); // Mark that user made a new selection
      
      // Auto-start game if startAfterPick is true
      if (startAfterPick) {
        setStartAfterPick(false);
        setShowCategoryPicker(false);
        setTimeout(() => handleStartGame(), 100);
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error(t("extra.categoryChangeFailed"));
    }
  };

  const handleSelectRandom = async () => {
    if (!currentRoom) return;
    
    try {
      // Clear any existing room_questions from previous trivia selection
      await supabase.from("room_questions").delete().eq("room_id", currentRoom.id);
      
      // Update room with random category and clear user_trivia_id
      await supabase
        .from("game_rooms")
        .update({ 
          category_id: null, 
          category_name: t("extra.randomCategoryName"),
          user_trivia_id: null, // Clear any previously selected user trivia
        })
        .eq("id", currentRoom.id);
      
      toast.success(t("extra.randomCategoryToast"));
      setMadeNewSelection(true); // Mark that user made a new selection
      
      // Auto-start game if startAfterPick is true
      if (startAfterPick) {
        setStartAfterPick(false);
        setShowCategoryPicker(false);
        setTimeout(() => handleStartGame(), 100);
      }
    } catch (error) {
      console.error("Error setting random:", error);
    }
  };

  const handleSelectTrivia = async (trivia: { id: string; title: string }) => {
    if (!currentRoom) return;
    
    try {
      // Fetch trivia to get question count (for display purposes only)
      const { data: triviaData } = await supabase
        .from("user_quiz_posts")
        .select("questions")
        .eq("id", trivia.id)
        .single();
      
      if (!triviaData?.questions) {
        toast.error(t("extra.triviaQuestionsNotFound"));
        return;
      }

      const questions = triviaData.questions as any[];
      
      // SIMPLIFIED: Only update room metadata - questions will be fetched fresh on game start
      // This eliminates race conditions between lobby selection and game start
      await supabase.from("room_questions").delete().eq("room_id", currentRoom.id);
      
      await supabase
        .from("game_rooms")
        .update({ 
          category_id: null,
          category_name: trivia.title,
          total_questions: questions.length,
          user_trivia_id: trivia.id,
        })
        .eq("id", currentRoom.id);
      
      toast.success(t("extra.triviaAdded"));
      setMadeNewSelection(true); // Mark that user made a new selection
      
      // Auto-start game if startAfterPick is true
      if (startAfterPick) {
        setStartAfterPick(false);
        setShowCategoryPicker(false);
        setTimeout(() => handleStartGame(), 100);
      }
    } catch (error) {
      console.error("Error setting trivia:", error);
      toast.error(t("extra.triviaAddFailed"));
    }
  };

  /**
   * A queued round dragged to round 1.
   *
   * Round 1 lives on the room (game_rooms.category_id / user_trivia_id),
   * the rest in room_category_queue, so "move this above the first" is two
   * writes: the room takes the dragged round, the way picking it alone
   * would (same fields handleSelectCategory / handleSelectTrivia /
   * handleSelectRandom write), and the round the room WAS holding goes
   * into the dragged round's own queue row — rewritten in place, so its id
   * is known and the new order can place it.
   */
  const handlePromoteToFirst = async (item: QueueItem, queueIds: string[]) => {
    if (!currentRoom || !heldRound) return;
    const wasHolding = {
      source_type: currentRoom.user_trivia_id ? ("user_trivia" as const) : ("category" as const),
      category_id: currentRoom.user_trivia_id ? null : currentRoom.category_id,
      category_name: currentRoom.category_name,
      user_trivia_id: currentRoom.user_trivia_id,
      icon_slug: heldRound.iconSlug ?? null,
    };
    try {
      let totalQuestions: number | undefined;
      if (item.source_type === "user_trivia" && item.user_trivia_id) {
        const { data } = await supabase
          .from("user_quiz_posts")
          .select("questions")
          .eq("id", item.user_trivia_id)
          .single();
        const questions = data?.questions;
        if (Array.isArray(questions)) totalQuestions = questions.length;
      }
      await supabase.from("room_questions").delete().eq("room_id", currentRoom.id);
      await supabase
        .from("game_rooms")
        .update({
          category_id: item.source_type === "category" ? item.category_id : null,
          category_name:
            item.category_name || (item.source_type === "random" ? t("extra.randomCategoryName") : null),
          user_trivia_id: item.source_type === "user_trivia" ? item.user_trivia_id : null,
          ...(totalQuestions !== undefined ? { total_questions: totalQuestions } : {}),
        })
        .eq("id", currentRoom.id);
      await replaceQueueItem(item.id, wasHolding);
      const byId = new Map(queue.map((q) => [q.id, q]));
      const next = queueIds
        .map((id) => (id === item.id ? { ...item, ...wasHolding } : byId.get(id)))
        .filter((q): q is QueueItem => !!q);
      await reorderQueue(next);
      setMadeNewSelection(true);
    } catch (error) {
      console.error("Error promoting round:", error);
      toast.error(t("extra.categoryChangeFailed"));
    }
  };

  const handleAddToQueue = async (item: {
    source_type: "category" | "random" | "user_trivia";
    category_id?: string | null;
    category_name?: string | null;
    user_trivia_id?: string | null;
    icon_slug?: string | null;
  }) => {
    const success = await addToQueue(item);
    if (success) {
      toast.success(t("extra.addedToQueueToast"));
    }
  };

  if (!currentRoom) return null;


  /**
   * A game needs somebody to play against.
   *
   * The gate was `>= 1`, which is every room the moment its host walks in,
   * so "start game" was armed on an empty lobby and the round began with
   * one player in it. A pending invitation is a row here too (status
   * 'invited', greyed in the list), and counting it would arm the button
   * for somebody who has not arrived — so only seated players count.
   *
   * Picking a category is deliberately NOT gated: the host arrives at an
   * empty room and has to choose what it plays before there is any reason
   * for a second person to accept.
   */
  const seatedPlayers = participants.filter((p) => (p.status as string) !== "invited").length;
  // Somebody the host already asked, who has not answered yet. Telling that
  // host to "invite a friend" is telling them to do the thing they just did
  // (owner's ask) — the room is not short of an invitation, it is short of
  // an acceptance, and that is a different sentence.
  const invitedPlayers = participants.filter((p) => (p.status as string) === "invited").length;
  // A room is two people. A lone host used to be allowed to start — a solo
  // round IS a real game — but this room is not where you play one: there is
  // a whole library to play by yourself, and a quick VS if you want an
  // opponent found for you. What a room is FOR is the people you asked into
  // it, and starting without them turned an empty lobby into a game nobody
  // else was in (owner's ask).
  //
  // Counted in answerers, not seats: a host who knows their own trivia's
  // answers sits out of it (willBeObserver), so that room needs two guests
  // rather than one.
  const answeringPlayers = seatedPlayers - (willBeObserver ? 1 : 0);
  // Published to the rooms page, which decides how this room is played:
  // through, together, now. Read here rather than beside the Visibility row
  // that writes it, because the Start button below asks the same question.
  // ...or a draft the Public tab made, which is born private and published
  // by Create (draftWantsPublic); or one published a moment ago, before the
  // row's own column has caught up (publishedNow).
  const isPublicRoom =
    Boolean(currentRoom.is_public) ||
    publishedNow ||
    roomWantsPublic(currentRoom);
  /**
   * A PUBLIC room counts the people who are actually in the app.
   *
   * A published room is played through: everyone answers now and the results
   * screen names a winner and a loser while they are all still looking at
   * it. Seated-but-gone does not do that — a stranger who joined this
   * morning and closed the app is a row in the table and nobody at it, and
   * starting on their behalf produces a "result" against somebody who never
   * saw a question (owner: "we need literal online players to start game in
   * public rooms to see results instantly who won who lose").
   *
   * A PRIVATE room deliberately keeps counting seats: those are played
   * across the evening as each invited friend gets to it, so requiring them
   * all to be awake at once is the opposite of what it is for.
   *
   * Presence is only allowed to WITHHOLD the button once it has actually
   * answered — before `loaded` the set is empty, which is indistinguishable
   * from everybody having closed the app, and would grey out Start on a room
   * with a full couch for as long as the first fetch takes.
   */
  const onlineAnswerers =
    seatedIdsForPresence.filter((id) => onlineInRoom.has(id)).length - (willBeObserver ? 1 : 0);
  const enoughPlayers =
    isPublicRoom && presenceLoaded ? onlineAnswerers >= 2 : answeringPlayers >= 2;
  enoughPlayersRef.current = enoughPlayers;
  const canStartGame = participants.length >= 1;
  const roomGradient = getGradientById(currentRoom?.background_gradient);
  // A party room's own name is a room name, full stop — dealt at creation
  // and renamed through the same sheet every other room uses, with no
  // "Untitled"/trivia-title stand-in for it (owner: "we don't need
  // 'untitled', use random names for my trivia party rooms as we do on
  // other rooms"). The trivia's own title still names the CHIP below —
  // what the room plays, not what it's called.
  const roomName = currentRoom.room_name || t("extra.gameRoomDefault");

  // What the universal lobby shows for this room.
  const hasContent = queue.length > 0 || currentRoom.category_id || currentRoom.user_trivia_id;
  // Only offer "choose a category" when there's truly nothing to play
  const needsCategorySelection = !hasContent;

  /**
   * What the room plays first, and how many rounds it has.
   *
   * The chip and the round list used to work this out separately and get
   * different answers: the chip counted the room's own held round plus the
   * queue, the list showed the queue alone. So a room with a category and
   * eleven queued topics said "+11" on the chip (twelve rounds) over a list
   * numbered 1 to 11, and the two named different categories as round one.
   *
   * One answer now, computed here and handed to both. It follows the same
   * rule handleStartGame does: a room holding an explicit selection plays it
   * first and the queue follows; otherwise the queue's head opens.
   */
  /**
   * Set up, and waiting on a person rather than on the host.
   *
   * The one state where Start has nothing to offer: what it plays is
   * decided, so there is no category to pick, and it cannot begin, so there
   * is nothing to press.
   */
  const awaitingPlayers = !needsCategorySelection && !enoughPlayers && !isStarting;
  /**
   * A room that has something to play but has not been created yet.
   *
   * Create comes before Start, always — it is the tap that raises the
   * summary and settles the room, and a host who never sees it never got to
   * check what they made.
   *
   * It used to require `awaitingPlayers`, and that lost the summary exactly
   * where it mattered most: a public room is listed the moment it exists, so
   * somebody could walk in before the host pressed anything. The room then
   * had enough players, the button skipped straight to Start — and the room
   * was already settled by being listed, so the host had lost the right to
   * change it without ever having been shown it.
   *
   * Once per room either way: pressing it and coming back finds the same
   * room, and from then on the footer says the true thing — Start, dead
   * until somebody else is here, arming itself the moment they are (owner:
   * "when i click create once we should show disable start game button
   * again and when there are minimum 2 online players in the room - we show
   * start game as clickable").
   */
  const offerCreate = !needsCategorySelection && !isStarting && !roomCreated;

  const heldRound = (currentRoom.category_id || currentRoom.user_trivia_id)
    ? {
        // Through the same resolver the queue rows use. The room's own
        // round was the one name on this screen still drawn exactly as
        // stored, so a room set up in Georgian kept saying so under an
        // English UI — next to a queued round that had been translated.
        name:
          localizeQueueCategory(currentRoom.category_name)
          || currentRoom.category_name
          || t("extra.categoryType"),
        iconSlug:
          iconForCategoryName(currentRoom.category_name)
          || getCategoryIconSlug(currentRoom.category_id ?? "")
          // A trivia the player wrote has no category to take an icon from.
          || (currentRoom.user_trivia_id ? OWN_TRIVIA_ICON_SLUG : null)
          // A mixed round held by the room itself: the box, as everywhere else.
          || (isUndecidedRound(currentRoom.category_id, currentRoom.category_name) ? UNDECIDED_ICON_SLUG : null),
      }
    : null;
  const totalRounds = (heldRound ? 1 : 0) + queue.length;

  const handleStartOrPick = () => {
    if (needsCategorySelection) {
      // No content or returned from game - just open picker (no auto-start)
      setStartAfterPick(false);
      setShowCategoryPicker(true);
    } else {
      // A round with somebody else in it is played for a pot, and every seat
      // pays the stake into it. Asked here rather than at the end, where the
      // answer is a balance that already moved (owner: "when user enters room
      // to play they should have 500 coins to participate"). A solo room is
      // practice and costs nothing, so it is never blocked.
      if (seatedPlayers >= 2 && !canCoverStake) {
        setShowNoStake(true);
        return;
      }
      // Straight into it. The summary used to stand here, and by then it was
      // asking the wrong question: a host pressing Start has people waiting
      // on them and nothing left to decide — the room was settled when it
      // was created. It moved to Create, which is the moment that summary
      // is actually about (owner: "we don't need to show this modal after i
      // click start game, we need it after 'create'").
      //
      // Except on a later match with people at the table: Start then asks
      // them first, through the same sheet in its rematch dress - the
      // rounds, the question count and the stake, and "Ask for rematch"
      // where Create was (owner's ask; see askTableForRematch).
      if (asksTable) {
        setAskingTable(true);
        setShowMatchSummary(true);
        return;
      }
      void handleStartGame();
    }
  };

  /**
   * The rounds as the summary lists them - the same order the game plays
   * them: the room's held round first, then the queue.
   */
  const summaryRounds = [
    ...(heldRound ? [{ name: heldRound.name, iconSlug: heldRound.iconSlug ?? null }] : []),
    ...queue.map((item) => ({
      name:
        item.source_type === "random"
          ? t("extra.cpRandomTitle")
          : localizeQueueCategory(item.category_name) || t("extra.categoryType"),
      iconSlug: roundIconSlug(item) ?? null,
    })),
  ];

  /**
   * A match that has started is played as it was created.
   *
   * The rounds and the question count are what the summary sheet asked the
   * host to confirm; changing them under a round in progress would make the
   * confirmation a lie. The next match can differ - the editors come back
   * when the round ends.
   */
  const matchLive = currentRoom.status === "playing";
  /**
   * A published room is played as it was listed.
   *
   * The Public tab tells a stranger what a room plays before they ask to
   * come in, and that card is the only thing they have to go on. A host who
   * could still swap the category and the question count afterwards would be
   * answering a different question than the one people joined for (owner:
   * "players entering public room they should have info what they are
   * playing and if host could modify room after players joined that would be
   * confusing and unfair").
   *
   * Create is what settles it. Until that tap the room is a draft the host
   * is still building — "+ Room" publishes on creation, so a room is public
   * long before it is finished, and locking on that alone took the category
   * and the name away from a host who had not said they were done (owner:
   * "i didn't clicked create yet but can't add categories or change icon or
   * room name, enable it before i click create, disable when room is public
   * already").
   *
   * Keying it on the tap failed once before, for a reason that is now
   * fixed rather than avoided: Create was only offered while the room was
   * short of players, so a room somebody joined first could never be
   * created and so never locked. Create depends on the round being decided
   * now, not on the seats (see offerCreate), so every public room with
   * something to play can reach this.
   *
   * There is no way out of the lock through a Visibility switch any more:
   * a room is public or private by the tab that made it, and the lobby
   * does not offer to change that (owner: "remove public/private tabs").
   * The lock lifts on its own once the room has nothing to play.
   */
  // ...and only while there is something to play. A published room whose
  // round has been played and nothing queued has nobody "who joined for"
  // anything; locking it left its host in an empty lobby they could not
  // change (owner: "they see empty room with no ability to be modified").
  const publishedRoom = isPublicRoom && roomCreated && !needsCategorySelection;
  const rulesLocked = matchLive || publishedRoom;
  /**
   * The pencil settles with the rest of it.
   *
   * A room people are picking off a list should not rename or re-face
   * itself under them either — the card they tapped is the room they get
   * (owner: "we let hosts switch public/private, only that option").
   *
   * On `publishedRoom` rather than `rulesLocked`, so a live match can still
   * be renamed: a name changing mid-round is nothing anyone was shown
   * before they joined, and taking that away would be a change nobody
   * asked for.
   */
  const canRename = isHost && !publishedRoom;
  // The + that asks to be friends, on everyone in the room who is not one
  // yet and is not you (owner's ask: people become friends in the lobby).
  // If they have already asked YOU, the same tap accepts — sendFriendRequest
  // answers a pending ask from the other side — and the friends list then
  // takes the + away on its own.
  const friendIds = new Set(friends.map((f) => f.friendId));
  const friendAsk = (userId: string): Pick<LobbyPlayer, "onAddFriend" | "friendRequested"> => {
    if (!user || userId === user.id || friendIds.has(userId)) return {};
    if (askedIds.has(userId)) return { friendRequested: true };
    return {
      onAddFriend: () => {
        void sendFriendRequest(userId).then((ok) => {
          if (ok) setAskedIds((prev) => new Set(prev).add(userId));
        });
      },
    };
  };
  /**
   * The Players tab, highest score first.
   *
   * It listed people in whatever order `participants` arrived in — join
   * order — so the player with 680 points sat fourth under three players on
   * zero, and read as being in fourth place. A tab that shows scores is a
   * scoreboard whether or not it is called one.
   *
   * Seated players before invitations that nobody has answered: a
   * placeholder has no score to rank and belongs at the end either way.
   */
  const rankedParticipants = [...participants].sort((a, b) => {
    const pendingA = (a.status as string) === "invited" ? 1 : 0;
    const pendingB = (b.status as string) === "invited" ? 1 : 0;
    if (pendingA !== pendingB) return pendingA - pendingB;
    return (b.total_score || 0) - (a.total_score || 0);
  });
  const lobbyPlayers: LobbyPlayer[] = rankedParticipants.map((p) => ({
    id: p.id,
    ...friendAsk(p.user_id),
    name: p.nickname,
    avatarUrl: p.avatar_url,
    isHost: p.is_host,
    isYou: p.user_id === user?.id,
    note: seatNotes.get(p.user_id),
    score: p.total_score || 0,
    rounds: p.total_rounds_played || 0,
    pending: (p.status as string) === "invited",
    // The host's bin, on everybody else's row while the room waits. A
    // question first: a tap on a 36px circle beside a name is not a thing
    // to be sure of.
    onRemove:
      isHost && p.user_id !== user?.id && !matchLive
        ? () => setRemoveTarget({ userId: p.user_id, name: p.nickname })
        : undefined,
    // Your own row opens the way out (owner's ask: a leave-room button
    // behind your name). The host's tap on somebody else: "come and play"
    // for a seated player, the invitation again for a placeholder who never
    // arrived.
    onPress:
      p.user_id === user?.id
        ? () => setShowLeaveConfirm(true)
        : isHost
          ? (p.status as string) === "invited"
            ? () => void handleResendInvitation(p.user_id)
            : () => void handleInvitePlayer(p.user_id)
          : undefined,
  }));
  // A departed player's row, kept a moment to say "left": faded, no tally,
  // no tap.
  const departedPlayers: LobbyPlayer[] = departed.map((d) => ({
    id: `left-${d.id}`,
    name: d.name,
    avatarUrl: d.avatarUrl,
    isHost: false,
    isYou: false,
    pending: true,
    note: "left" as const,
  }));
  // No faces on the invite line: see UniversalLobby's `inviteFaces`. Three
  // friends drawn beside the + read as three friends already in the room.
  // The rules the host sets: how many questions a round deals, and (on a
  // public room) who may walk in. Both are the room row's own columns — the
  // context reads total_questions when it deals — and the realtime row
  // update brings the choice back here. Whether the room is public is NOT
  // a rule here: the tab it was made from decided that, for good (owner:
  // "remove public/private tabs ... room can't be public").
  const setQuestions = async (value: string) => {
    if (!isHost) return;
    await supabase.from("game_rooms").update({ total_questions: Number(value) }).eq("id", currentRoom.id);
  };
  /**
   * Who may walk in.
   *
   * Every published room used to be a door you knocked on: tap Join, an ask
   * goes to the host, and until they look at their phone you sit on a card
   * that says "Waiting" — for a room whose whole point is being listed where
   * strangers can find it. Open is the default now, and vetting arrivals is
   * the host's choice. The server decides it either way
   * (request_room_join); this row only says which.
   */
  const needsApproval = Boolean((currentRoom as { requires_approval?: boolean }).requires_approval);
  const setApproval = async (value: string) => {
    if (!isHost || !hasApprovalColumn) return;
    await supabase
      .from("game_rooms")
      .update({ requires_approval: value === "ask" })
      .eq("id", currentRoom.id);
  };

  /**
   * The room's face, beside its name.
   *
   * A room the host has never dressed gets the same per-room random icon the
   * public card and the search strip already deal it — seeded by the room id
   * off one ordered pool, so it is the SAME face everywhere rather than a
   * different one per screen. Tapping it opens the sheet that sets both the
   * icon and the name. (The pool itself is fetched up with the other hooks;
   * everything from here down runs after an early return.)
   *
   * A party room used to wear one of a fixed set of four house-party icons
   * here instead of a dealt one — walked back with the rest of the party's
   * special-cased naming (owner: "we don't need [the 4 icons] anymore...
   * we need random icons and room names here"). A host who picked an icon
   * still wins over the dealt one, party or not.
   */
  const roomFace = currentRoom.room_icon ?? dealtRoomIcon(currentRoom.id, iconPool);
  // A My Trivia room plays the quiz as written — its own question count —
  // so the questions-per-round choice is a library/random room's alone.
  const playsUserTrivia = !!currentRoom.user_trivia_id && !currentRoom.category_id;
  /**
   * The room is playing the player's own writing.
   *
   * Then it is not a room for strangers: it is for the friends the host
   * invites, or for nobody (owner: "trivias created by me or my trivia
   * parties are private ... host invites friends to join or plays solo").
   * The Joining row stands down — a door policy is a question a private
   * room does not have.
   *
   * A room CREATED from a trivia is private by construction — `canPublish`
   * has never included My Trivia, so `publishRoom` is false on that path.
   * A trivia merely QUEUED into a room only counts while the room is
   * private: on a public one the door still needs answering.
   */
  const playsOwnTrivia = roomPlaysOwnTrivia(currentRoom, isPublicRoom, queue);

  /**
   * Whether this table has played: the roster's round counts say so. It is
   * what makes the next Start a rematch ask rather than a start (below).
   */
  const roomHasPlayed = participants.some((p) => (p.total_rounds_played ?? 0) > 0);

  const lobbyRules: LobbyRuleRow[] = [
    // No player-count picker on a classic room (owner's ask): the cap is 10
    // and the host starts whenever — with one friend or ten. The card no
    // longer draws ten empty chairs to imply otherwise.
    //
    // A published room drops the row outright rather than showing it frozen
    // (owner: "we don't show other 5,10,20 questions tabs"): the length is
    // settled, and a dead control invites a tap that does nothing. A LIVE
    // match still shows it — that one comes back when the round ends, so it
    // is worth leaving where the host can see it.
    ...(playsUserTrivia || publishedRoom ? [] : [{
      key: "questions",
      label: t("lobby.uQuestionsPerRound"),
      options: QUESTIONS_PER_ROUND.map((n) => ({ value: String(n), label: String(n) })),
      value: String(questionsPerRound(currentRoom.total_questions)),
      onChange: isHost && !rulesLocked ? (v: string) => void setQuestions(v) : undefined,
    } satisfies LobbyRuleRow]),
    // No Visibility row: the tab the room was made from decided that, and
    // the lobby does not offer to change it (owner: "remove public/private
    // tabs"). A public room's rules are the question count and this door;
    // a private room's the question count and Play on TV (the `tv` prop).
    //
    // Only a PUBLIC room has a door worth guarding. A private one is joined
    // with its code, and whoever handed that over has already said yes — so
    // the row would be a switch with nothing on the other side of it.
    ...(isPublicRoom && hasApprovalColumn && !playsOwnTrivia
      ? [{
          key: "joining",
          label: t("lobby.uJoining"),
          options: [
            { value: "open", label: t("extra.roomJoinOpen") },
            { value: "ask", label: t("extra.roomJoinAsk") },
          ],
          value: needsApproval ? "ask" : "open",
          onChange: isHost ? (v: string) => void setApproval(v) : undefined,
        } satisfies LobbyRuleRow]
      : []),
  ];

  /**
   * A later match is asked, not sprung.
   *
   * The first match starts on the host's Start. Once the table has played,
   * Start on the next one asks everyone seated first - with the rounds, the
   * question count and the stake on the card - and the host starts with
   * whoever said yes. A seat that declines is given up; one still deciding
   * when the host starts is removed, because every seat that stays is
   * staked and nobody pays for a game they did not agree to (owner's ask).
   * Solo, or with nobody else seated, there is nobody to ask.
   */
  const isRematch = roomHasPlayed;
  const tableToAsk = participants.filter(
    (p) => p.user_id !== user?.id && (p.status as string) !== "invited",
  );
  const asksTable = isRematch && tableToAsk.length > 0;

  const askTableForRematch = async () => {
    if (!currentRoom || !user) return;
    const head = queue[0];
    const pick: RematchPick = currentRoom.user_trivia_id
      ? { source_type: "user_trivia", user_trivia_id: currentRoom.user_trivia_id, category_name: currentRoom.category_name }
      : currentRoom.category_id
        ? { source_type: "category", category_id: currentRoom.category_id, category_name: currentRoom.category_name, icon_slug: heldRound?.iconSlug ?? null }
        : head
          ? { source_type: head.source_type, category_id: head.category_id, category_name: head.category_name, user_trivia_id: head.user_trivia_id, icon_slug: head.icon_slug }
          : { source_type: "random" };
    try {
      await sendRematchRequest({
        room: currentRoom,
        requester: { id: user.id, nickname: profile?.nickname ?? null, avatar_url: profile?.avatar_url ?? null },
        pick,
        kind: "host_new_game",
        recipientIds: tableToAsk.map((p) => p.user_id),
        title: t("extra.rematchRequestTitle"),
        message: t("extra.rematchNewGameBody", { name: profile?.nickname || t("extra.friendFallback") }),
        match: {
          rounds: summaryRounds.map((r) => ({ name: r.name, icon_slug: r.iconSlug })),
          questions_per_round: playsUserTrivia ? null : questionsPerRound(currentRoom.total_questions),
          stake: REWARDS.GAME_STAKE,
        },
      });
    } catch (e) {
      console.error("[lobby] rematch ask failed", e);
      toast.error(t("extra.errorOccurred"));
      return;
    }
    setAskedSeats(
      tableToAsk.map((p) => ({ user_id: p.user_id, nickname: p.nickname, avatar_url: p.avatar_url })),
    );
    setShowRematchWait(true);
  };

  /**
   * The asked table, as it stands right now.
   *
   * `participants` is kept live by the room's own realtime channel, so a yes
   * (the player's row goes "ready") and a no (the row is deleted) both land
   * here without the host touching anything — which is what makes the sheet
   * answer live.
   */
  const rematchSeats: RematchSeat[] = askedSeats.map((seat) => {
    const seated = participants.find((p) => p.user_id === seat.user_id);
    return {
      ...seat,
      answer: !seated ? "declined" : (seated.status as string) === "ready" ? "ready" : "waiting",
    };
  });

  const startWithWhoSaidYes = async () => {
    if (!currentRoom) return;
    // Whoever was ASKED and has not said yes leaves the table before the
    // stake is taken. Their row, not their status: the host may delete a
    // seat but not rewrite it (RLS), and a deleted seat is exactly "not
    // playing". Only the asked: somebody who sat down during the ask never
    // got a card, and was being removed for not answering a question they
    // were never asked. And the removed are told — a seat that vanished
    // with no word, followed by "game already started" at the door, read
    // as a broken room.
    const asked = new Set(askedSeats.map((s) => s.user_id));
    const undecided = tableToAsk.filter((p) => asked.has(p.user_id) && (p.status as string) !== "ready");
    if (undecided.length > 0) {
      await supabase.from("room_participants").delete().in("id", undecided.map((p) => p.id));
      const hostName = profile?.nickname || t("extra.friendFallback");
      void supabase
        .from("notifications")
        .insert(
          undecided.map((p) => ({
            user_id: p.user_id,
            type: "rematch_removed",
            title: t("extra.rematchRemovedTitle"),
            message: t("extra.rematchRemovedBody", { name: hostName }),
            data: { room_id: currentRoom.id, room_code: currentRoom.room_code, room_name: currentRoom.room_name },
          })),
        )
        .then(({ error }) => {
          if (error) console.error("[lobby] could not tell the removed seats", error);
        });
    }
    setShowRematchWait(false);
    // Counted off the table as it stands AFTER the undecided left, not off
    // last render's gate: with nobody saying yes the host used to start a
    // solo round, which settles as practice, under a lobby that had shown a
    // pot.
    const gone = new Set(undecided.map((p) => p.id));
    const staying = participants.filter((p) => !gone.has(p.id) && (p.status as string) !== "invited");
    if (staying.length < 2) {
      toast.error(t("extra.rlNeedsSecondPlayer"));
      return;
    }
    void handleStartGame();
  };

  return (
    <UniversalLobby
      sceneArt={classicLobbyScene(currentRoom)}
      roomName={roomName}
      icon={roomFace}
      onRename={canRename ? () => setShowIconPicker(true) : undefined}
      onBack={handleExitRoom}
      unreadCount={unreadCount}
      // The Activity page is a look, not a way out: its Back comes back to
      // THIS room. The route rides along so the page can return here even
      // if the room is no longer held in context by then - /team?room=CODE
      // re-enters it (owner: "when i click activity to see notifications in
      // lobby i shouldn't leave the lobby").
      onBell={() => navigate("/notifications", { state: { backTo: routeForRoom(currentRoom) } })}
      category={(() => {
        // Just the FIRST round on the chip, with its category's own icon and
        // a "(+N)" when more are queued (owner's ask). The first round is the
        // room's own category if it has one, else the head of the queue.
        const firstQueue = queue[0];
        const rounds = totalRounds;
        const extra = rounds - 1;
        const freshStart = justReturnedFromResults && !madeNewSelection && queue.length === 0 && !heldRound;
        const firstName = heldRound
          ? heldRound.name
          : firstQueue
            ? (firstQueue.source_type === "random"
                ? t("extra.cpRandomTitle")
                : localizeQueueCategory(firstQueue.category_name) || t("extra.categoryType"))
            : null;
        const firstIconSlug = heldRound
          ? (heldRound.iconSlug ?? undefined)
          // Rounds queued before the icon was written carry none, so it is
          // resolved here too rather than only at the picker.
          : roundIconSlug(firstQueue);
        return {
          // The chip names what is actually being played: the trivia's own
          // title, the same one the round list and the "+" picker show for
          // every other round. The generic product name ("My Trivia Party")
          // sat here once and said nothing about THIS party in particular —
          // triviaDisplayTitle is the same fallback the room's own heading
          // above it uses, so a still-unnamed trivia reads as "Untitled"
          // here too rather than repeating the brand.
          label: isPartyRoom
            ? triviaDisplayTitle(partyTitle, t)
            : freshStart || !firstName
              ? t("lobby.uSelectCategory")
              : firstName,
          // The extra rounds ride the FAR RIGHT of the chip (owner's ask),
          // not crowded against the category's name.
          trailing: !freshStart && firstName && extra > 0 ? `+${extra}` : undefined,
          iconSlug: freshStart ? undefined : (firstIconSlug ?? undefined),
          // Tapping opens the round list when there is more than one; a single
          // round opens the picker to change it. The + always queues another.
          onPress:
            rounds > 1
              ? () => setShowRoundOrder(true)
              : isHost && !rulesLocked
                ? () => { setStartAfterPick(false); setShowCategoryPicker(true); }
                : undefined,
          onAdd: isHost && !rulesLocked ? () => { setStartAfterPick(false); setShowCategoryPicker(true); } : undefined,
          // The host's chip and + wear the travelling ring only until a
          // category is picked — a pointer to the thing to do, not a
          // permanent decoration. Nobody else's chip wears it; they see
          // the "+N" pop as rounds are added.
          glow: isHost && needsCategorySelection,
        };
      })()}
      categoryMenu={{
        open: showRoundOrder,
        onClose: () => setShowRoundOrder(false),
        children: (
          <RoundOrderModal
            open={showRoundOrder}
            onClose={() => setShowRoundOrder(false)}
            items={queue}
            // The same round the chip names — so the list's "1" and the chip
            // cannot disagree about which category opens the game.
            current={heldRound}
            canEdit={isHost && !rulesLocked}
            onReorder={reorderQueue}
            onPromote={handlePromoteToFirst}
            onRemove={removeFromQueue}
            onAdd={() => {
              setShowRoundOrder(false);
              setStartAfterPick(false);
              setShowCategoryPicker(true);
            }}
          />
        ),
      }}
      /* TV mode pairs the room with a single screen everyone in the ROOM
         plays toward — the friends the host invited. A public room has no
         such group: whoever the list matches it with, one TV cannot be
         "the" screen for, and the row offered a device nobody in a public
         room has a reason to reach for (owner: "tv mode is for only
         private rooms"). */
      tv={isHost && !isPublicRoom ? { label: t("lobby.uPlayOnTv"), onPress: () => setIsTVModeEnabled(true) } : undefined}
      labels={{
        rules: t("lobby.uGameRules"),
        players: t("lobby.uPlayersTab"),
        invite: t("lobby.uInvite"),
        you: t("lobby.uYou"),
        rounds: (count) => t("lobby.uRoundsShort", { count }),
        notifications: t("extra.notifications"),
        addFriend: t("extra.lobbyAddFriend"),
        friendRequested: t("extra.lobbyFriendRequested"),
        remove: t("extra.lobbyRemovePlayer"),
        left: t("lobby.uLeftNote"),
        invited: t("lobby.uInvitedNote"),
      }}
      /**
       * What the round is played for.
       *
       * Every seat puts REWARDS.GAME_STAKE in and the pot goes to the top
       * three — so the host has to be able to read the number BEFORE Start,
       * not discover it on the coin counter afterwards. The number is what
       * FIRST PLACE takes (firstPlaceShare): the whole pot at two players,
       * 70% of it at three or more. It used to print the whole pot under
       * "Winner takes" and a three-player winner then got 70% of what they
       * were promised. Counted off the seated players, which is what
       * settle_room_round collects from: an invitation nobody accepted
       * neither pays in nor is paid out.
       *
       * Hidden below two players, where there is no pot: the arena and the
       * King's couch carry their own stake strips and are not this screen.
       */
      reward={
        seatedPlayers >= 2
          ? {
              label: t("lobby.winnerTakes"),
              icon: coinIconAsset,
              amount: firstPlaceShare(seatedPlayers) ?? 0,
            }
          : undefined
      }
      rules={lobbyRules}
      rulesText={[
        { key: "rules", heading: t("lobby.rulesHeading"), body: t("lobby.rulesClassic") },
        { key: "time", heading: t("lobby.timeHeading"), body: t("lobby.timeClassic") },
      ]}
      players={[...lobbyPlayers, ...departedPlayers]}
      // No playersHint here: the footer caption below the Start button says
      // exactly this, word for word, and the two were on screen together —
      // once under the player rows and once under the CTA. The arena keeps
      // its hint because there it says something else ("2 more to start").
      // The room's own cap (max_players), and one seat more than the host
      // when the host will sit out of their own trivia.
      capacity={{
        min: willBeObserver ? 2 : 1,
        // Never below who is actually here, so an under-set cap can't read
        // as "2/2" over three seated players.
        max: Math.max(currentRoom.max_players || 10, participants.length),
        taken: participants.length,
        // The headline count is the people who are HERE. Counting an
        // invitation nobody has accepted read "3/10 players" over a room
        // that could not start, because starting counts answerers.
        seated: seatedPlayers,
        fullLabel: t("extra.mpRoomFull"),
      }}
      onInvite={() => setShowInviteModal(true)}
      playersExtra={<ChallengeResultsSection roomId={currentRoom.id} />}
      initialTab={needsCategorySelection ? "players" : "rules"}
      /* A guest's way out, above the ping. The only leave was behind their
         own row on the Players tab and the back arrow, neither of which
         reads as "leave this room" (owner's ask). The host keeps the
         delete in the menu; this is for the people who were invited in.

         A line, not a slab. It wore a white chunky button first, and two
         stacked slabs made the way out as loud as the way in (owner: "leave
         room do not need white button, show as icon + text, without white
         button but make sure it is visible"). So: the icon and the words in
         the footer's own dark ink, bold, on a 44px tap target — the same
         weight as the caption under the button, and nothing to compete
         with the violet slab below it. */
      footerExtraPlacement="below"
      footerExtra={
        !isHost ? (
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="mx-auto mb-1 flex min-h-[44px] items-center justify-center gap-2 px-4 font-display text-[17px] font-bold leading-[22px] text-[#402666] transition-opacity active:opacity-60"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} />
            {t("team.leaveRoom")}
          </button>
        ) : null
      }
      start={
        isHost
          ? {
              label: isStarting
                ? t("extra.rlStarting")
                : needsCategorySelection
                  ? t("extra.rlChooseCategory")
                  : offerCreate
                    ? t("extra.createBtn")
                    : t("lobby.uStartGame"),
              onPress: offerCreate ? handleCreatePress : handleStartOrPick,
              // Short of a second player, the button is either the one-time
              // way out (enabled, above) or the plain truth: Start, dead
              // until somebody else is here.
              disabled:
                !canStartGame || isStarting || loading || (awaitingPlayers && !offerCreate),
              loading: isStarting,
              icon: needsCategorySelection ? <Plus className="h-5 w-5" /> : undefined,
              // Still says why the game has not begun; it just sits under a
              // button that now leads somewhere instead of over a dead one.
              caption: awaitingPlayers
                ? invitedPlayers > 0
                  ? t("extra.rlWaitingOnInvites")
                  : t("extra.rlNeedsSecondPlayer")
                : null,
            }
          : {
              label: pingCooldown ? t("extra.pingHostSent") : t("extra.pingHostBtn"),
              onPress: () => void handlePingHost(),
              disabled: pingCooldown,
              icon: <BellRing className="h-5 w-5" />,
              caption: t("team.waitingForHost"),
              captionPulse: true,
              // State above the act: the wait, then the button that pokes
              // the host, then the way out under both (owner's ask).
              captionAbove: true,
              // The host's face after the "…" — the person being waited on.
              captionAvatarUrl: participants.find((p) => p.is_host)?.avatar_url ?? null,
              captionAvatarName: participants.find((p) => p.is_host)?.nickname ?? null,
            }
      }
    >
      {/* Somebody asking to come into a published room, above everything. */}
      {/* The doorstep is app-wide now (GlobalJoinRequestGate in App): a
          host is rarely sitting in the lobby when somebody knocks. */}

      {/* The Invite line: the room's own invite sheet — friends, the link,
          the share sheet — whose picks are seated as invited. */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteLink={getShareLink(currentRoom.room_code)}
        roomId={currentRoom.id}
        roomCode={currentRoom.room_code}
      />

      {/* What Create commits to, shown before it does it. */}
      <MatchSummarySheet
        open={showMatchSummary}
        rounds={summaryRounds}
        questionsPerRound={playsUserTrivia ? null : questionsPerRound(currentRoom.total_questions)}
        stake={REWARDS.GAME_STAKE}
        soloFree={seatedPlayers < 2}
        starting={isStarting}
        rematch={askingTable}
        onChange={() => setShowMatchSummary(false)}
        onConfirm={() => {
          setShowMatchSummary(false);
          if (askingTable) void askTableForRematch();
          else handleDoneCreating();
        }}
      />

      {/* The host's side of the ask: who said yes, and Start with them. */}
      <RematchWaitSheet
        open={showRematchWait}
        seats={rematchSeats}
        stake={REWARDS.GAME_STAKE}
        starting={isStarting}
        onCancel={() => setShowRematchWait(false)}
        onStart={() => void startWithWhoSaidYes()}
      />

      {/* Not enough for a seat at the table. */}
      <NotEnoughStakeModal
        isOpen={showNoStake}
        onClose={() => setShowNoStake(false)}
      />

      {/* Play on TV: the pairing code entry, as a sheet over the lobby.

          The sheet sits on the bottom edge and its code boxes take focus on
          open, which raises the numeric keypad — and on iOS the webview is
          NOT resized for the keyboard (KeyboardResize.None, see
          nativeShell.ts), so a bottom-anchored sheet stays exactly where it
          was: underneath the keys. The native shell publishes the keyboard's
          height as --keyboard-height for this reason; the padding below
          lifts the sheet by it, and the sheet scrolls itself if what is left
          of the screen is shorter than it is. */}
      <AnimatePresence>
        {isTVModeEnabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(64,38,102,0.35)] backdrop-blur-[6px] p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom)_+_var(--keyboard-height,0px))] transition-[padding] duration-200"
            onClick={() => setIsTVModeEnabled(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-[468px] max-h-full overflow-y-auto rounded-[24px] border-2 border-white/60 bg-[rgba(252,247,255,0.92)] p-2 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <TVSetupInline
                onComplete={handleTVSetupComplete}
                onCancel={() => setIsTVModeEnabled(false)}
                roomId={currentRoom.id}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {removeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-2">{t("team.removePlayerTitle", { name: removeTarget.name })}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t("team.removePlayerMessage")}</p>
              <div className="space-y-2">
                <ChunkyButton
                  variant="danger"
                  size="md"
                  className="w-full"
                  onClick={() => void handleRemovePlayer(removeTarget.userId)}
                >
                  {t("lobby.removeSeat")}
                </ChunkyButton>
                <button
                  onClick={() => setRemoveTarget(null)}
                  className="w-full py-2 text-muted-foreground text-sm hover:text-foreground"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-2">{t("team.leaveConfirmTitle")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("team.leaveConfirmMessage")}
              </p>
              <div className="space-y-2">
                <ChunkyButton
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={handleExitRoom}
                >
                  {t("team.exitKeepRoom")}
                </ChunkyButton>
                <ChunkyButton
                  variant="danger"
                  size="md"
                  className="w-full"
                  onClick={handleLeavePermanently}
                >
                  {t("team.leavePermanently")}
                </ChunkyButton>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full py-2 text-muted-foreground text-sm hover:text-foreground"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Delete Room Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-foreground font-display text-xl">
              {t("extra.rlDeleteRoom")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("extra.rlDeleteRoomConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:justify-center mt-2">
            <AlertDialogCancel className="flex-1 bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 rounded-xl">
              {t("extra.rlCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRoom}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {t("extra.rlDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* How It Works Modal */}
      <AlertDialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground font-display text-xl">
              <Info className="w-5 h-5 text-primary" />
              {t("extra.rlHowItWorks")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="text-lg">1️⃣</span>
                  <p>{t("extra.rlHowStep1")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">2️⃣</span>
                  <p>{t("extra.rlHowStep2")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">3️⃣</span>
                  <p>{t("extra.rlHowStep3")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">📺</span>
                  <p>{t("extra.rlHowTV")}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
              {t("extra.rlGotIt")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gradient Picker Modal */}
      <GradientPicker
        isOpen={showGradientPicker}
        onClose={() => setShowGradientPicker(false)}
        currentGradient={(currentRoom as any)?.background_gradient || 'lavender_mist'}
        onSelect={handleChangeGradient}
      />

      {/* Room Icon & Name Picker Modal */}
      <RoomIconPickerModal
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        // Open on what the lobby is showing — the dealt face when the host
        // has not set one — so a rename does not silently clear the icon.
        currentIconUrl={roomFace}
        roomName={roomName}
        onConfirm={handleUpdateRoomIconAndName}
      />

      {/* The rounds, in the order they play, drop under the chip: see the
          categoryMenu handed to UniversalLobby above. */}

      {/* Category Picker Modal */}
      <CategoryPickerModal
        isOpen={showCategoryPicker}
        onClose={() => {
          setShowCategoryPicker(false);
          setStartAfterPick(false); // Reset auto-start flag when modal is closed manually
        }}
        onSelectCategory={handleSelectCategory}
        onSelectRandom={handleSelectRandom}
        onSelectTrivia={handleSelectTrivia}
        onAddToQueue={handleAddToQueue}
        showQueueOption={true}
        allowParty={!currentRoom?.is_public}
        allowMyTrivias={!currentRoom?.is_public}
        roomGradient={roomGradient?.gradient}
        excludeTriviaId={currentRoom?.user_trivia_id}
      />

      {/* Host Observer Warning Modal */}
      <AlertDialog open={showHostObserverWarning} onOpenChange={setShowHostObserverWarning}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-foreground font-display text-xl">
              {t("extra.observerSkipTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                {t("extra.observerSkipDesc")}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            <AlertDialogAction
              onClick={() => proceedWithStartGame(true)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
            >
              {t("extra.observerProceed")}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 rounded-xl">
              {t("extra.observerCancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UniversalLobby>
  );
}
