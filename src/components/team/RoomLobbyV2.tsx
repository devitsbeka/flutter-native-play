import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import retroTvIcon from "@/assets/images/retro-tv.png";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { containsBlockedText } from "@/utils/contentFilter";
import { Share2, ArrowLeft, Edit2, MessageCircle, Send, X, Trash2, Play, Tv, AlertTriangle, Palette, MoreVertical, Info, LogOut, Plus, BellRing } from "lucide-react";
import { createNotification } from "@/hooks/useNotifications";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { shareOrCopy } from "@/utils/shareLink";
import { isRoomActive } from "@/hooks/useMyRooms";
import { RoomIconPickerModal } from "./RoomIconPickerModal";
import { useMultiplayerV2, getShareLink } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoomMatchHistory } from "@/hooks/useRoomMatchHistory";
import { useRoomCategoryQueue } from "@/hooks/useRoomCategoryQueue";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    
    const link = getShareLink(currentRoom.room_code);
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

  // Handler for resending invitation
  const handleResendInvitation = async (userId: string) => {
    if (!currentRoom) return;
    try {
      // Re-trigger notification by updating and re-inserting participant
      // The database trigger will create the notification
      await supabase.from("notifications").insert({
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
      toast.success(t("extra.invitationResent"));
    } catch (error) {
      console.error("Resend invitation error:", error);
      toast.error(t("extra.invitationResendFailed"));
    }
  };

  // handleStartTVMode removed - now using toggle with handleTVModeToggle

  const handleUpdateRoomIconAndName = async (iconUrl: string, newName: string) => {
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
          room_icon: iconUrl,
          room_name: newName.trim() 
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

  const canStartGame = participants.length >= 1;
  const roomGradient = getGradientById(currentRoom?.background_gradient);
  const roomName = currentRoom.room_name || t("extra.gameRoomDefault");

  return (
    /* The room's gradient runs under the status bar, and the header still
       clears it.
       #root carries a padding-top of --safe-top so every screen's content
       misses the clock. That is right for a screen whose background is the
       page wash, and wrong here: it would leave a band of the wash above a
       dark gradient. Cancelling with a negative margin and re-adding the
       same value as padding puts the background back at the true top edge
       while leaving everything inside exactly where the root put it. */
    /* h-[100dvh] + overflow-y-auto, NOT min-h-screen: the native shell
       disables the document scroller outright (AGENTS.md 4b), so a page
       that merely grows past the viewport is frozen solid on device — the
       lobby shipped that way and could not be scrolled at all once the TV
       card and player strip pushed content below the fold. A fixed-height
       box that scrolls itself is the recipe every standalone page uses. */
    <div
      className="h-[100dvh] relative flex flex-col overflow-hidden"
      style={{
        background: roomGradient?.gradient || 'var(--background)',
        /* Not .safe-bleed: that re-adds the top inset as padding, and the
           sticky header would then need a negative margin to reach the true
           top — which iOS WebKit answers by clamping the sticky box to the
           content edge, shifting the whole header DOWN by one extra
           safe-top (the giant gap above the lobby header on device;
           Chromium does not clamp, which is why it looked right in the
           browser). So the root cancels #root's padding without re-adding
           it, content starts at the true screen edge, and the header
           carries the inset itself. */
        marginTop: "calc(-1 * var(--safe-top))",
        marginBottom: "calc(-1 * var(--safe-bottom))",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      {/* Header. A plain flex row at the top — the content area below is
          the scroller, so nothing sticky is needed and no negative margins
          are in play (iOS WebKit clamps sticky boxes with negative margins,
          which is what shoved this header down a full safe-top). The blur's
          own padding keeps the row clear of the status bar. */}
      <div className="relative z-30 w-full shrink-0">
        {/* Header content with subtle background blur */}
        <div
          className="px-4 sm:px-6 pb-4 backdrop-blur-md bg-black/10"
          style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <motion.button
              onClick={handleExitRoom}
              className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-white/10 border border-white/[0.12]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </motion.button>

            {/* Middle stays empty — the room's name lives in the content
                below, next to the host's rename and background controls. */}
            <div className="min-w-0 flex-1" />

            <div className="flex items-center gap-2 shrink-0">
              {/* TEMPORARILY HIDDEN - Chat toggle */}
              {/* <motion.button
                onClick={() => setShowChat(!showChat)}
                className="flex items-center justify-center w-10 h-10 rounded-xl relative bg-white/10 backdrop-blur-sm border border-white/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle className="w-4 h-4 text-white" />
                {unreadMessageCount > 0 && !showChat && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadMessageCount}
                  </span>
                )}
              </motion.button> */}

              {/* Share button */}
              <motion.button
                onClick={handleShare}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/[0.12]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Share2 className="w-4 h-4 text-white" />
              </motion.button>

              {/* Three-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/[0.12]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MoreVertical className="w-4 h-4 text-white" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuItem onClick={() => setShowHowItWorks(true)} className="cursor-pointer">
                    <Info className="w-4 h-4 mr-2" />
                    {t("extra.rlHowItWorks")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLeaveConfirm} className="cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("extra.rlLeaveRoom")}
                  </DropdownMenuItem>
                  {isHost && (
                    <DropdownMenuItem 
                      onClick={handleDeleteRoom} 
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("extra.rlDeleteRoom")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Fade-out gradient for smooth transition */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 -mb-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), transparent)'
          }}
        />
      </div>

      {/* Scrollable content area. min-h-0: a flex child's implicit
          min-height is its content, so without this the box grows past the
          viewport instead of scrolling — the frozen lobby on device. */}
      <div className="flex-1 min-h-0 overflow-y-auto relative z-10 px-4 sm:px-6 pb-32 sm:max-w-[520px] mx-auto w-full will-change-transform">

        {/* Room name row, below the header: icon + name for everyone; the
            host also gets the rename (pencil) and background (palette)
            controls beside it. */}
        <div className="text-center mb-4 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center gap-3">
              {isHost ? (
                <motion.button
                  onClick={() => setShowIconPicker(true)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={t("team.editRoom")}
                >
                  {currentRoom.room_icon && (
                    <img
                      src={currentRoom.room_icon}
                      alt="Room icon"
                      className="w-8 h-8 object-contain"
                    />
                  )}
                  <h2 className="max-w-[55vw] truncate text-base font-bold text-white drop-shadow-lg">
                    {roomName}
                  </h2>
                </motion.button>
              ) : (
                <>
                  {currentRoom.room_icon && (
                    <img
                      src={currentRoom.room_icon}
                      alt="Room icon"
                      className="w-8 h-8 object-contain"
                    />
                  )}
                  <h2 className="max-w-[55vw] truncate text-base font-bold text-white drop-shadow-lg">
                    {roomName}
                  </h2>
                </>
              )}
              {isHost && (
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => setShowIconPicker(true)}
                    className="w-8 h-8 text-white/70 hover:text-white transition-colors flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={t("team.editRoom")}
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => setShowGradientPicker(true)}
                    className="w-8 h-8 text-white/70 hover:text-white transition-colors flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={t("team.changeBackground")}
                  >
                    <Palette className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Category Picker Section */}
        <CategoryPickerSection
          categoryName={
            // Show category if: user made new selection OR queue has items
            (justReturnedFromResults && !madeNewSelection && queue.length === 0) ? null : (
              currentRoom.category_name ??
              (((currentRoom as any).game_mode?.startsWith('trivia:') || (currentRoom as any).game_mode?.startsWith('collection:'))
                ? null  // Don't use room_name as category fallback
                : null)
            )
          }
          categoryId={(justReturnedFromResults && !madeNewSelection && queue.length === 0) ? null : currentRoom.category_id}
          iconSlug={
            (justReturnedFromResults && !madeNewSelection && queue.length === 0) ? null : (
              currentRoom.category_name === t("extra.randomCategoryName") 
                ? null
                : currentRoom.category_id 
                  ? getCategoryIconSlug(currentRoom.category_id) 
                  : currentRoom.category_name 
                    ? getCategoryIconSlug(currentRoom.category_name)
                    : null
            )
          }
          isHost={isHost}
          queue={queue}  // Always show queue - remove conditional hiding
          onOpenPicker={() => setShowCategoryPicker(true)}
          onRemoveQueueItem={removeFromQueue}
          onReorderQueue={reorderQueue}
          isAlreadyPlayed={!!lastPlayedTriviaId && lastPlayedTriviaId === currentRoom.user_trivia_id}
          willBeObserver={willBeObserver}
        />

        {/* TV Mode Toggle - Host only */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={tvHintGlow
              ? {
                  opacity: 1,
                  y: 0,
                  boxShadow: [
                    "0 0 0px rgba(139,92,246,0)",
                    "0 0 24px rgba(139,92,246,0.6)",
                    "0 0 0px rgba(139,92,246,0)",
                  ],
                }
              : { opacity: 1, y: 0 }
            }
            transition={tvHintGlow
              ? { boxShadow: { repeat: 2, duration: 1 }, opacity: { duration: 0.3 }, y: { duration: 0.3 } }
              : undefined
            }
            onAnimationComplete={() => {
              if (tvHintGlow) {
                setTvHintGlow(false);
                searchParams.delete("tvHint");
                setSearchParams(searchParams, { replace: true });
              }
            }}
            className="w-full p-4 rounded-2xl bg-white/10 border border-white/[0.12] mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={retroTvIcon} 
                  alt="TV" 
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <p className="text-white font-medium text-sm">{t("extra.tvModeLabel")}</p>
                  <p className="text-white/60 text-xs">{t("extra.tvQuestionsOnTV")}</p>
                </div>
              </div>
              <Switch
                checked={isTVModeEnabled}
                onCheckedChange={handleTVModeToggle}
              />
            </div>
          </motion.div>
        )}

        {/* TV Setup (when enabled) */}
        <AnimatePresence>
          {isTVModeEnabled && currentRoom && (
            <TVSetupInline
              onComplete={handleTVSetupComplete}
              onCancel={() => setIsTVModeEnabled(false)}
              roomId={currentRoom.id}
            />
          )}
        </AnimatePresence>

        {/* Scoreboard */}
        <div className="w-full">
          <RoomScoreboard
            participants={participants as any}
            matches={matches}
            currentUserId={user?.id}
            showHostCrown={true}
            maxPlayers={currentRoom.max_players || 10}
            isHost={isHost}
            isRoomActive={isRoomActive(currentRoom.last_activity_at || null, currentRoom.created_at)}
            onInviteFriends={() => setShowInviteModal(true)}
            onRemoveParticipant={handleRemoveParticipant}
            onResendInvitation={handleResendInvitation}
          />
        </div>

        {/* Challenge Results */}
        <ChallengeResultsSection roomId={currentRoom.id} />

        {/* Invite Friends Modal */}
        <InviteFriendsModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          inviteLink={getShareLink(currentRoom.room_code)}
          roomId={currentRoom.id}
          roomCode={currentRoom.room_code}
        />
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-5 pt-4 pb-[calc(1.5rem_+_var(--safe-bottom))] bg-gradient-to-t from-black/60 via-black/30 to-transparent">
        <div className="max-w-[520px] mx-auto">
          {isHost ? (
            // Show different button based on context
            (() => {
              const hasContent = queue.length > 0 || currentRoom.category_id || currentRoom.user_trivia_id;
              // Only show "აირჩიე კატეგორია" when there's truly nothing to play
              const needsCategorySelection = !hasContent;
              
              const handleStartOrPick = () => {
                if (needsCategorySelection) {
                  // No content or returned from game - just open picker (no auto-start)
                  setStartAfterPick(false);
                  setShowCategoryPicker(true);
                } else {
                  // Content selected - start the game
                  handleStartGame();
                }
              };
              
              return (
                <ChunkyButton
                  variant="white"
                  size="xl"
                  className="w-full"
                  onClick={handleStartOrPick}
                  disabled={!canStartGame || isStarting || loading}
                  icon={needsCategorySelection ? <Plus className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                >
                  {isStarting 
                    ? t("extra.rlStarting")
                    : needsCategorySelection 
                      ? t("extra.rlChooseCategory")
                      : t("extra.rlStartGame")
                  }
                </ChunkyButton>
              );
            })()
          ) : (
            /* space-y-5, not 3: the button carries a chunky drop shadow that
               eats most of a 12px gap, so the caption read as attached to it
               rather than as a separate line. */
            <div className="text-center py-2 space-y-5">
              <ChunkyButton
                variant="white"
                size="lg"
                className="w-full"
                onClick={handlePingHost}
                disabled={pingCooldown}
                icon={<BellRing className="w-5 h-5" />}
              >
                {pingCooldown ? t("extra.pingHostSent") : t("extra.pingHostBtn")}
              </ChunkyButton>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-white/80 font-medium"
              >
                {t("team.waitingForHost")}
              </motion.div>
            </div>
          )}
        </div>
      </div>

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
        currentIconUrl={currentRoom?.room_icon || null}
        roomName={roomName}
        onConfirm={handleUpdateRoomIconAndName}
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
    </div>
  );
}
