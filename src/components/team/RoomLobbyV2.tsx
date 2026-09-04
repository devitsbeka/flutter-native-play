import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import retroTvIcon from "@/assets/images/retro-tv.png";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { containsBlockedText } from "@/utils/contentFilter";
import { Share2, ArrowLeft, Edit2, MessageCircle, Send, X, Trash2, Play, Tv, AlertTriangle, Palette, MoreVertical, Info, LogOut, Plus, BellRing } from "lucide-react";
import { createNotification, useNotifications } from "@/hooks/useNotifications";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { shareOrCopy } from "@/utils/shareLink";
import { isRoomActive } from "@/hooks/useMyRooms";
import { RoomIconPickerModal } from "./RoomIconPickerModal";
import { useMultiplayerV2, getShareLink, QUESTIONS_PER_ROUND, questionsPerRound } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
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
import { classicLobbyScene } from "@/utils/lobbyScene";
import { roomVisibilityFields } from "@/utils/roomVisibility";
import { dealtRoomIcon, fetchCrestPool } from "@/utils/roomCrests";
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
  const [iconPool, setIconPool] = useState<readonly string[]>([]);
  useEffect(() => {
    void fetchCrestPool().then(setIconPool);
  }, []);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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
  const { friends } = useFriends();
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
  const { queue, addToQueue, removeFromQueue, reorderQueue } = useRoomCategoryQueue(currentRoom?.id || null);
  // The queue, made visible. More than one category has always been queueable
  // — the picker takes several at once and each becomes a round — but the chip
  // showed the room's single category_name, so three queued topics read as
  // one, and reorderQueue/removeFromQueue were never called by anything.
  const [showRoundOrder, setShowRoundOrder] = useState(false);
  const localizeQueueCategory = useLocalizedCategoryName();
  const iconForCategoryName = useCategoryIconByName();

  // Play sound when new participant joins
  useEffect(() => {
    const currentIds = participants.map(p => p.user_id);
    const prevIds = prevParticipantsRef.current;
    
    if (prevIds.length > 0) {
      const newParticipants = currentIds.filter(id => !prevIds.includes(id));
      if (newParticipants.length > 0 && newParticipants[0] !== user?.id) {
        playSound("room-join");
        toast.success(t("team.newPlayerJoined"));
      }
    }
    
    prevParticipantsRef.current = currentIds;
  }, [participants, user?.id, playSound]);

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

  const handleExitRoom = () => {
    exitRoom();
    // Use replace to avoid going back to a /team?join=... history entry that can auto-rejoin.
    navigate("/team", { replace: true });
  };

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

  // Handler for removing a participant (invited players)
  const handleRemoveParticipant = async (participantId: string) => {
    if (!currentRoom || !isHost) return;
    try {
      // RLS silently matches 0 rows when the delete isn't permitted,
      // so verify via returned rows instead of assuming success
      const { data: removed, error } = await supabase
        .from("room_participants")
        .delete()
        .eq("id", participantId)
        .select("id");
      if (error) throw error;
      if (!removed || removed.length === 0) {
        toast.error(t("extra.removePlayerFailed"));
        return;
      }
      toast.success(t("extra.playerRemoved"));
    } catch (error) {
      console.error("Remove participant error:", error);
      toast.error(t("extra.removePlayerFailed"));
    }
  };

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
  // A round needs somebody who can ANSWER. The host plays a random or a
  // library category, so a lone host can start — a solo round is a real
  // game — but a host who knows their own trivia's answers sits out
  // (willBeObserver), and then the room needs one more seat filled.
  const answeringPlayers = seatedPlayers - (willBeObserver ? 1 : 0);
  const enoughPlayers = answeringPlayers >= 1;
  const canStartGame = participants.length >= 1;
  const roomGradient = getGradientById(currentRoom?.background_gradient);
  const roomName = currentRoom.room_name || t("extra.gameRoomDefault");

  // What the universal lobby shows for this room.
  const hasContent = queue.length > 0 || currentRoom.category_id || currentRoom.user_trivia_id;
  // Only offer "choose a category" when there's truly nothing to play
  const needsCategorySelection = !hasContent;
  const handleStartOrPick = () => {
    if (needsCategorySelection) {
      // No content or returned from game - just open picker (no auto-start)
      setStartAfterPick(false);
      setShowCategoryPicker(true);
    } else {
      handleStartGame();
    }
  };
  const lobbyPlayers: LobbyPlayer[] = participants.map((p) => ({
    id: p.id,
    name: p.nickname,
    avatarUrl: p.avatar_url,
    isHost: p.is_host,
    isYou: p.user_id === user?.id,
    score: p.total_score || 0,
    rounds: p.total_rounds_played || 0,
    pending: (p.status as string) === "invited",
    // The host's tap on somebody else: "come and play" for a seated player,
    // the invitation again for a placeholder who never arrived.
    onPress:
      isHost && p.user_id !== user?.id
        ? (p.status as string) === "invited"
          ? () => void handleResendInvitation(p.user_id)
          : () => void handleInvitePlayer(p.user_id)
        : undefined,
  }));
  const inviteFaces = [...friends]
    .filter((f) => f.status === "accepted")
    .sort((a, b) => Number(!!b.isOnline) - Number(!!a.isOnline))
    .slice(0, 3)
    .map((f) => ({ url: f.avatarUrl, online: !!f.isOnline }));
  // The rules the host sets: how many questions a round deals, and whether
  // the room is on the public list. Both are the room row's own columns —
  // the context reads total_questions when it deals, the public tab reads
  // is_public — and the realtime row update brings the choice back here.
  const setQuestions = async (value: string) => {
    if (!isHost) return;
    await supabase.from("game_rooms").update({ total_questions: Number(value) }).eq("id", currentRoom.id);
  };
  // How many players the host wants — 2 through 10, always starting at 2
  // (owner's ask). It caps the room and the seats the players tab draws.
  const setMaxPlayers = async (value: string) => {
    if (!isHost) return;
    const n = Math.max(2, Math.min(10, Number(value) || 2));
    await supabase.from("game_rooms").update({ max_players: n }).eq("id", currentRoom.id);
  };
  const setVisibility = async (value: string) => {
    if (!isHost) return;
    await supabase
      .from("game_rooms")
      .update({ ...(await roomVisibilityFields(value === "public")) })
      .eq("id", currentRoom.id);
  };
  const isPublicRoom = Boolean((currentRoom as { is_public?: boolean }).is_public);

  /**
   * The room's face, beside its name.
   *
   * A room the host has never dressed gets the same per-room random icon the
   * public card and the search strip already deal it — seeded by the room id
   * off one ordered pool, so it is the SAME face everywhere rather than a
   * different one per screen. Tapping it opens the sheet that sets both the
   * icon and the name. (The pool itself is fetched up with the other hooks;
   * everything from here down runs after an early return.)
   */
  const roomFace = currentRoom.room_icon ?? dealtRoomIcon(currentRoom.id, iconPool);
  // A My Trivia room plays the quiz as written — its own question count —
  // so the questions-per-round choice is a library/random room's alone.
  const playsUserTrivia = !!currentRoom.user_trivia_id && !currentRoom.category_id;
  const lobbyRules: LobbyRuleRow[] = [
    // The host picks the player count (2–10) from a dropdown; a guest sees
    // the room's cap on the static line instead (UniversalLobby).
    ...(isHost ? [{
      key: "players",
      label: t("lobby.uPlayersTab"),
      variant: "dropdown" as const,
      options: [2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) })),
      value: String(Math.max(2, Math.min(10, currentRoom.max_players || 10))),
      onChange: (v: string) => void setMaxPlayers(v),
    } satisfies LobbyRuleRow] : []),
    ...(playsUserTrivia ? [] : [{
      key: "questions",
      label: t("lobby.uQuestionsPerRound"),
      options: QUESTIONS_PER_ROUND.map((n) => ({ value: String(n), label: String(n) })),
      value: String(questionsPerRound(currentRoom.total_questions)),
      onChange: isHost ? (v: string) => void setQuestions(v) : undefined,
    } satisfies LobbyRuleRow]),
    {
      key: "visibility",
      label: t("lobby.uVisibility"),
      options: [
        { value: "public", label: t("extra.roomPublic") },
        { value: "private", label: t("extra.roomPrivate") },
      ],
      value: isPublicRoom ? "public" : "private",
      onChange: isHost ? (v) => void setVisibility(v) : undefined,
    },
  ];

  return (
    <UniversalLobby
      sceneArt={classicLobbyScene(currentRoom)}
      roomName={roomName}
      icon={roomFace}
      onRename={isHost ? () => setShowIconPicker(true) : undefined}
      onBack={handleExitRoom}
      unreadCount={unreadCount}
      onBell={() => navigate("/notifications")}
      category={(() => {
        // Just the FIRST round on the chip, with its category's own icon and
        // a "(+N)" when more are queued (owner's ask). The first round is the
        // room's own category if it has one, else the head of the queue.
        const hasCurrent = !!(currentRoom.category_id || currentRoom.user_trivia_id);
        const firstQueue = queue[0];
        const rounds = (hasCurrent ? 1 : 0) + queue.length;
        const extra = rounds - 1;
        const freshStart = justReturnedFromResults && !madeNewSelection && queue.length === 0 && !hasCurrent;
        const firstName = hasCurrent
          ? currentRoom.category_name
          : firstQueue
            ? (firstQueue.source_type === "random"
                ? t("extra.cpRandomTitle")
                : localizeQueueCategory(firstQueue.category_name) || t("extra.categoryType"))
            : null;
        const firstIconSlug = hasCurrent
          ? (iconForCategoryName(currentRoom.category_name) || getCategoryIconSlug(currentRoom.category_id ?? "") || undefined)
          : (firstQueue?.icon_slug ?? undefined);
        return {
          label: freshStart || !firstName ? t("lobby.uSelectCategory") : firstName,
          // The extra rounds ride the FAR RIGHT of the chip (owner's ask),
          // not crowded against the category's name.
          trailing: !freshStart && firstName && extra > 0 ? `+${extra}` : undefined,
          iconSlug: freshStart ? undefined : (firstIconSlug ?? undefined),
          // Tapping opens the round list when there is more than one; a single
          // round opens the picker to change it. The + always queues another.
          onPress:
            rounds > 1
              ? () => setShowRoundOrder(true)
              : isHost
                ? () => { setStartAfterPick(false); setShowCategoryPicker(true); }
                : undefined,
          onAdd: isHost ? () => { setStartAfterPick(false); setShowCategoryPicker(true); } : undefined,
        };
      })()}
      tv={isHost ? { label: t("lobby.uPlayOnTv"), onPress: () => setIsTVModeEnabled(true) } : undefined}
      labels={{
        rules: t("lobby.uGameRules"),
        players: t("lobby.uPlayersTab"),
        invite: t("lobby.uInvite"),
        you: t("lobby.uYou"),
        rounds: (count) => t("lobby.uRoundsShort", { count }),
        notifications: t("extra.notifications"),
      }}
      rules={lobbyRules}
      players={lobbyPlayers}
      playersHint={enoughPlayers ? null : t("extra.rlNeedsSecondPlayer")}
      // The room's own cap (max_players), and one seat more than the host
      // when the host will sit out of their own trivia.
      capacity={{
        min: willBeObserver ? 2 : 1,
        max: currentRoom.max_players || 10,
        taken: participants.length,
        fullLabel: t("extra.mpRoomFull"),
      }}
      inviteFaces={inviteFaces}
      onInvite={() => setShowInviteModal(true)}
      playersExtra={<ChallengeResultsSection roomId={currentRoom.id} />}
      initialTab={needsCategorySelection ? "players" : "rules"}
      start={
        isHost
          ? {
              label: isStarting
                ? t("extra.rlStarting")
                : needsCategorySelection
                  ? t("extra.rlChooseCategory")
                  : t("lobby.uStartGame"),
              onPress: handleStartOrPick,
              disabled:
                !canStartGame
                || isStarting
                || loading
                || (!needsCategorySelection && !enoughPlayers),
              loading: isStarting,
              icon: needsCategorySelection ? <Plus className="h-5 w-5" /> : undefined,
              caption: !needsCategorySelection && !enoughPlayers && !isStarting ? t("extra.rlNeedsSecondPlayer") : null,
            }
          : {
              label: pingCooldown ? t("extra.pingHostSent") : t("extra.pingHostBtn"),
              onPress: () => void handlePingHost(),
              disabled: pingCooldown,
              icon: <BellRing className="h-5 w-5" />,
              caption: t("team.waitingForHost"),
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

      {/* Play on TV: the pairing code entry, as a sheet over the lobby. */}
      <AnimatePresence>
        {isTVModeEnabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(64,38,102,0.35)] backdrop-blur-[6px] p-4 pb-[calc(1rem_+_var(--safe-bottom))]"
            onClick={() => setIsTVModeEnabled(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-[468px] rounded-[24px] border-2 border-white/60 bg-[rgba(252,247,255,0.92)] p-2 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
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

      {/* The rounds, in the order they play. */}
      <RoundOrderModal
        open={showRoundOrder}
        onClose={() => setShowRoundOrder(false)}
        items={queue}
        canEdit={isHost}
        onReorder={reorderQueue}
        onRemove={removeFromQueue}
        onAdd={() => {
          setShowRoundOrder(false);
          setStartAfterPick(false);
          setShowCategoryPicker(true);
        }}
      />

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
