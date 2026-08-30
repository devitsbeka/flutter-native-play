import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Layers } from "lucide-react";
import { MultiplayerProviderV2, useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CreateRoomPage } from "@/components/team/CreateRoomPage";
import { CreateBlindTriviaModal } from "@/components/team/CreateBlindTriviaModal";
import { GameStylePersonalTrivia } from "@/components/team/GameStylePersonalTrivia";
import { JoinRoomModal } from "@/components/team/JoinRoomModal";
import { RoomLobbyV2 } from "@/components/team/RoomLobbyV2";
import { RoundCountdown } from "@/components/team/RoundCountdown";
import { useRoundCountdown, useRoundStartHold } from "@/hooks/useRoundCountdown";
import { useCategoryIdentity } from "@/hooks/useCategoryIdentity";
import { MultiplayerGameScreenV2 } from "@/components/team/MultiplayerGameScreenV2";
import { GameResultsScreenV2 } from "@/components/team/GameResultsScreenV2";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MyRoomsSection } from "@/components/team/MyRoomsSection";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { HelpModal } from "@/components/team/HelpModal";
import { AllRecentRoomsModal } from "@/components/team/AllRecentRoomsModal";
import { AllFriendsModal } from "@/components/team/AllFriendsModal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { LiveBadge } from "@/components/social/LiveBadge";
import { ExplorePortfolioFeed } from "@/components/social/ExplorePortfolioFeed";
import { PUBLIC_SHARING_ENABLED } from "@/config/features";
import { MyTriviaTab } from "@/components/social/MyTriviaTab";
import { CreateQuizModal } from "@/components/social/CreateQuizModal";
import { CreateCollectionModal } from "@/components/social/CreateCollectionModal";
import { CreateTriviaTypeModal } from "@/components/social/CreateTriviaTypeModal";
import { QuizPlayModal } from "@/components/social/QuizPlayModal";
import { QuickPlayModal } from "@/components/team/QuickPlayModal";
import { TeamMenuScreen } from "@/components/team/TeamMenuScreen";
import { CreateRoomScreen } from "@/components/team/CreateRoomScreen";
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";
import { SamplePost } from "@/data/samplePosts";
import { TriviaPreviewModal } from "@/components/social/TriviaPreviewModal";
import { FeatureOnboardingCarousel, hasSeenFeatureOnboarding } from "@/components/team/FeatureOnboardingCarousel";
import { useMyRooms } from "@/hooks/useMyRooms";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections } from "@/hooks/useCollections";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { GuestJoinModal } from "@/components/controller/GuestJoinModal";

import { TeamRightSidebar } from "@/components/team/TeamRightSidebar";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
import { PageHeader } from "@/components/shared/PageHeader";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { useProGating } from "@/hooks/useProGating";
import { ProRequiredModal } from "@/components/shared/ProRequiredModal";
import {
  UnifiedFiltersBar,
  roomFilterOptions,
  myTriviaFilterOptions,
  exploreFilterOptions,
  exploreSortOptions,
  RoomFilter,
  MyTriviaFilter,
  ExploreFilter,
  ExploreSort,
} from "@/components/team/UnifiedFiltersBar";
import { supabase } from "@/integrations/supabase/client";
import { instantTouchProps } from "@/utils/instantTouch";
import { toast } from "@/lib/toast";

function TeamContentV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { 
    phase, 
    currentRoom,
    showCreateModal, 
    setShowCreateModal, 
    showJoinModal, 
    setShowJoinModal,
    enterRoom,
    leaveRoomPermanently,
  } = useMultiplayerV2();
  // Before any early return below: the 3-2-1 is read from the room's start
  // time, and the game screen is withheld while it runs.
  const countdownNumber = useRoundCountdown(currentRoom?.started_at);
  const withinRoundStart = useRoundStartHold(currentRoom?.started_at);
  // Resolved here rather than inside the countdown so the category list is
  // already loaded by the time a round starts — the count is only three
  // seconds long, and players sit on this page for far longer than that
  // beforehand.
  const roundCategory = useCategoryIdentity(currentRoom?.category_id);
  const { playSound } = useSound();
  const { 
    sendInvitation,
    addInvitedParticipant,
    acceptInvitation,
  } = useGameInvitations();
  const { createRoom } = useMultiplayerV2();
  const queryClient = useQueryClient();
  const { showProModal, setShowProModal, gatedFeature } = useProGating();
  // Ads are strictly opt-in: a player sees one only by pressing a button
  // that says so (extra plays, spins, power-ups). Room creation, challenges
  // and TV flows run without any ad gate.

  // Auto-open PersonalTrivia from navigation state
  const [autoOpenPersonalTrivia, setAutoOpenPersonalTrivia] = useState(false);
  
  useEffect(() => {
    if (location.state?.openPersonalTrivia) {
      setAutoOpenPersonalTrivia(true);
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.openCreateRoom) {
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.openTV) {
      // Mission CTA for "play on TV": create the room and land in the lobby
      // with TV mode already toggled on (same flow as the sidebar TV button)
      navigate(location.pathname, { replace: true, state: {} });
      void (async () => {
        const room = await createRoom();
        if (room) navigate(`/team?room=${room.room_code}&tvMode=true`);
      })();
    }
    if (location.state?.openTrivia) {
      setShowCreateQuizModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.openCollection) {
      setShowCreateCollectionModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, setShowCreateModal]);

  // Push-notification deep links. A tapped push navigates with a URL, not
  // router state, so the mission-CTA flows above get query-param twins:
  // ?open=tv creates a room and lands in the lobby with TV mode on (the
  // sidebar TV button's flow), ?open=trivia opens the trivia builder.
  // While auth is still resolving the param stays put so the effect can
  // re-run and act for the signed-in player — same race as ?join= below.
  const attemptedOpenActionRef = useRef(false);
  useEffect(() => {
    const action = searchParams.get("open");
    if (action !== "tv" && action !== "trivia") return;
    if (!user && authLoading) return;
    if (attemptedOpenActionRef.current) return;
    attemptedOpenActionRef.current = true;

    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });

    if (action === "tv") {
      void (async () => {
        const room = await createRoom();
        if (room) navigate(`/team?room=${room.room_code}&tvMode=true`);
      })();
    } else {
      setShowCreateQuizModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, authLoading]);

  // Challenge context from URL - supports all types from ChallengeTypeModal
  type ChallengeType = "random" | "library" | "my-trivias" | "create" | "create-room" | "trivia" | "collection" | null;
  const [challengeContext, setChallengeContext] = useState<{
    targetUserId: string;
    challengeType: "random" | "library" | "my-trivias" | "create";
  } | null>(null);

  // Quick play state
  const [quickPlayFriend, setQuickPlayFriend] = useState<{
    friendId: string;
    nickname: string;
    avatarUrl: string | null;
    countryCode: string | null;
  } | null>(null);
  const [showQuickPlayModal, setShowQuickPlayModal] = useState(false);
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);
  const [isConnectingTV, setIsConnectingTV] = useState(false);

  const handleQuickPlay = (friend: {
    friendId: string;
    nickname: string;
    avatarUrl: string | null;
    countryCode: string | null;
  }) => {
    setQuickPlayFriend(friend);
    setShowQuickPlayModal(true);
  };

  const handleStartChallenge = async (categoryId: string, categoryName: string) => {
    if (!quickPlayFriend) return;

    await (async () => {
      if (!quickPlayFriend) return;
      setIsStartingChallenge(true);
      try {
        const room = await createRoom(categoryId, categoryName);
        if (room) {
          // Add friend as invited participant
          await addInvitedParticipant(
            room.id,
            quickPlayFriend.friendId,
            quickPlayFriend.nickname,
            quickPlayFriend.avatarUrl,
            quickPlayFriend.countryCode
          );

          // Send invitation notification
          await sendInvitation(quickPlayFriend.friendId, room.id);

          setShowQuickPlayModal(false);
          setQuickPlayFriend(null);
        }
      } finally {
        setIsStartingChallenge(false);
      }
    })();
  };

  // Shared by CreateRoomScreen callbacks: create room -> lobby
  const gatedCreateRoomAndNavigate = async () => {
    setShowCreateRoomScreen(false);
    const room = await createRoom();
    if (room) navigate(`/team?room=${room.room_code}`);
  };

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllGamesModal, setShowAllGamesModal] = useState(false);

  // The page header hosts the friends reel, so its height varies by
  // breakpoint/content — measure it so the sticky tab bar and the right
  // sidebar can sit exactly below it.
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // "explore" is only a real tab while public sharing is on; a stale
  // ?tab=explore link falls back to rooms instead of opening a hidden tab.
  const isKnownTab = (tab: string | null): tab is string =>
    tab === "my-content" || tab === "rooms" || (PUBLIC_SHARING_ENABLED && tab === "explore");
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get("tab");
    return isKnownTab(tabFromUrl) ? tabFromUrl : "rooms";
  });
  
  // Scroll to top when changing tabs to prevent layout jump
  const handleTabChange = (tab: string) => {
    const mainContent = document.getElementById('team-main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    setActiveTab(tab);

    // Persist tab in URL so navigation away/back (e.g. /trivia/:id) returns to the same tab
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  // Keep state in sync with browser navigation (back/forward) when ?tab changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      if (isKnownTab(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Ensure URL stays in sync even when tabs are changed via direct setActiveTab(...) calls
  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", activeTab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Mobile Safari can sometimes require a "second tap" when relying on click-only.
  // Using pointer events makes the interaction feel immediate on touch devices.
  const handleTabPress = (tab: string) => {
    if (tab === activeTab) return;
    handleTabChange(tab);
  };
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [showBlindTriviaModal, setShowBlindTriviaModal] = useState(false);
  const [showPersonalTriviaModal, setShowPersonalTriviaModal] = useState(false);
  const [collectionInitialSubject, setCollectionInitialSubject] = useState<string>("");
  const [playingQuiz, setPlayingQuiz] = useState<{ post: SamplePost; collectionPosts?: SamplePost[] } | null>(null);
  const [previewPost, setPreviewPost] = useState<SamplePost | null>(null);
  const [showAllFriendsModal, setShowAllFriendsModal] = useState(false);
  const [sortFilter, setSortFilter] = useState<MyTriviaFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [roomsFilter, setRoomsFilter] = useState<RoomFilter>("all");
  const [roomsSearchQuery, setRoomsSearchQuery] = useState("");
  const [exploreFilter, setExploreFilter] = useState<ExploreFilter>("all");
  const [exploreSort, setExploreSort] = useState<ExploreSort>("recent");
  const [exploreSearchQuery, setExploreSearchQuery] = useState("");

  // Switching a filter/sort keeps the old scroll offset, which leaves the
  // first result's header hidden under the sticky friends/tabs/filter stack —
  // reset the scroll so refiltered content starts fully visible
  useEffect(() => {
    document.getElementById("main-scroll-container")?.scrollTo({ top: 0 });
    document.getElementById("team-main-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [exploreFilter, exploreSort, roomsFilter, sortFilter]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [personalTriviaDraftId, setPersonalTriviaDraftId] = useState<string | null>(null);
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const [showCreateRoomScreen, setShowCreateRoomScreen] = useState(false);
  const [showTVModal, setShowTVModal] = useState(false);
  const [showCategorySelectorModal, setShowCategorySelectorModal] = useState(false);
  const [pendingRandomPlay, setPendingRandomPlay] = useState(false);
  const [preSelectedCategory, setPreSelectedCategory] = useState<{
    id: string;
    category_id: string;
    name: string;
    color: string;
    image_url?: string | null;
    total_levels: number;
  } | null>(null);

  // Feature onboarding state
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => hasSeenFeatureOnboarding());

  // Check if rooms/trivias are empty to conditionally hide filter bar
  const { rooms: checkRooms } = useMyRooms({ limit: 1 });
  const { data: myPosts } = useMyQuizPosts();
  const { data: myCollections } = useMyCollections();
  const hasRooms = checkRooms.length > 0;
  const hasTrivias = (myPosts?.length || 0) > 0 || (myCollections?.length || 0) > 0;
  // Guest auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuestJoinModal, setShowGuestJoinModal] = useState(false);
  const [pendingGuestJoinCode, setPendingGuestJoinCode] = useState<string | null>(null);
  // Set when a guest could not be created for an invite (anonymous sign-ins
  // disabled), so the invite screen can explain itself instead of the
  // generic multiplayer wall.
  const [guestSignInBlocked, setGuestSignInBlocked] = useState(false);
  const isGuest = !user;
  
  // Show auth modal for guests on mount (but NOT if they have a join code - show guest modal instead)
  useEffect(() => {
    const joinCode = searchParams.get("join");
    // Once per session - re-prompting on every tab visit was hostile; the page
    // itself already shows a sign-in prompt for guests
    if (isGuest && !joinCode && !sessionStorage.getItem("auth_prompt_shown")) {
      sessionStorage.setItem("auth_prompt_shown", "true");
      setShowAuthModal(true);
    }
  }, [isGuest, searchParams]);




  // Warm up the Supabase connection and auth token as soon as the page
  // mounts. The first API call after idling (expired token, stale socket
  // from laptop sleep) otherwise pays the refresh/reconnect cost — or hangs
  // outright — exactly when the user clicks "create room" or the TV button.
  useEffect(() => {
    void supabase.auth.getSession();
    void supabase.from("game_rooms").select("id").limit(1).maybeSingle();
  }, []);

  // Link pending challenge attempt to user after registration
  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem("pending_challenge_link");
    if (!pending) return;

    try {
      const { attemptId } = JSON.parse(pending);
      if (attemptId) {
        // .select() so a zero-row match reads as the failure it is — the
        // claim policy only covers ownerless rows, and RLS-filtered updates
        // "succeed" silently. The pointer is only cleared once a row was
        // actually claimed; before, it was removed unconditionally, so one
        // silent miss orphaned the guest's score forever.
        supabase
          .from("challenge_attempts")
          .update({ user_id: user.id })
          .eq("id", attemptId)
          .select("id")
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to link challenge attempt:", error);
            } else if (!data || data.length === 0) {
              console.warn("Challenge attempt claim matched no row:", attemptId);
              localStorage.removeItem("pending_challenge_link");
            } else {
              localStorage.removeItem("pending_challenge_link");
            }
          });
      } else {
        localStorage.removeItem("pending_challenge_link");
      }
    } catch (e) {
      console.error("Error parsing pending challenge:", e);
      localStorage.removeItem("pending_challenge_link");
    }
  }, [user]);

  // Track room membership so a lingering ?room= code can't auto-rejoin the
  // user right after they leave; also strip the code from the URL on leave.
  //
  // Which room was left matters: this used to strip ANY join/room param on
  // the way back to idle, and block the join effect while armed — so a
  // notification tap for a DIFFERENT room ("come play", host ping) that
  // arrived while the player had room state this session was eaten, and the
  // tap "opened the games tab" doing nothing. Only the code of the room
  // actually left is lingering state; any other code is a fresh invite.
  const wasInRoomRef = useRef(false);
  const lastRoomCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== "idle") {
      wasInRoomRef.current = true;
      if (currentRoom?.room_code) lastRoomCodeRef.current = currentRoom.room_code.toUpperCase();
      return;
    }
    if (!wasInRoomRef.current) return;
    const lingering = searchParams.get("join") || searchParams.get("room");
    if (lingering) {
      if (lingering.toUpperCase() === lastRoomCodeRef.current) {
        const next = new URLSearchParams(searchParams);
        next.delete("room");
        next.delete("join");
        setSearchParams(next, { replace: true });
        // Keep the ref set until the params are actually gone, so the join
        // effect (which sees the same pre-strip params this render) stays
        // blocked from re-joining the room that was just left.
        return;
      }
      // A different room's code is not lingering state — it is a fresh
      // invite. Disarm so the join effect takes it.
      wasInRoomRef.current = false;
      return;
    }
    // Back at idle with a clean URL: re-arm so a future invite link works.
    wasInRoomRef.current = false;
  }, [phase, searchParams, setSearchParams, currentRoom]);

  // Handle join code from URL. ?join= is the invite flow (consumed after
  // joining); ?room= stays in the URL so a refresh mid-lobby rejoins the room.
  // Each code is attempted once — without this, a ?room= code that fails to
  // join (expired room) would retry on every render forever.
  const attemptedJoinCodeRef = useRef<string | null>(null);
  const peekedJoinCodeRef = useRef<string | null>(null);
  // The code whose game type resolved as classic — the join below waits on it.
  const [classicJoinCode, setClassicJoinCode] = useState<string | null>(null);
  useEffect(() => {
    const joinCode = searchParams.get("join") || searchParams.get("room");
    if (!joinCode) return;

    // Every invite path in the app converges on /team?join=CODE — including
    // room-invite notifications for the new game types. A Team Battle room
    // must open its own page, not the classic lobby, so peek at the type and
    // hold the classic join until the answer is in. A missing or unreadable
    // row falls through to the classic flow, where enterRoom reports the
    // real error.
    if (peekedJoinCodeRef.current !== joinCode) {
      peekedJoinCodeRef.current = joinCode;
      void supabase
        .from("game_rooms")
        .select("game_type_key")
        .eq("room_code", joinCode.toUpperCase())
        .maybeSingle()
        .then(({ data: typed }) => {
          if (typed?.game_type_key === "team_battle") {
            navigate(`/team-battle?code=${joinCode.toUpperCase()}`, { replace: true });
          } else if (typed?.game_type_key === "king") {
            navigate(`/king?code=${joinCode.toUpperCase()}`, { replace: true });
          } else {
            setClassicJoinCode(joinCode);
          }
        });
      return;
    }
    if (classicJoinCode !== joinCode) return;

    // Already in a room. If the code IS that room, the lobby on screen is
    // the destination and the cleanup effect above strips the param. If it
    // is a different room's code — an invite or host-ping tap — honour the
    // tap: leave the current room and join the one the notification is
    // about. Never mid-game: a code cannot yank someone out of live play.
    if (phase !== "idle") {
      if (!user) return;
      const here = currentRoom?.room_code?.toUpperCase();
      if (!here || joinCode.toUpperCase() === here) return;
      if (phase === "playing") return;
      if (attemptedJoinCodeRef.current === joinCode) return;
      attemptedJoinCodeRef.current = joinCode;
      (async () => {
        await leaveRoomPermanently();
        await enterRoom(joinCode);
        const next = new URLSearchParams(searchParams);
        next.delete("join");
        next.delete("room");
        next.delete("tv");
        setSearchParams(next, { replace: true });
      })();
      return;
    }

    if (wasInRoomRef.current) return;

    // A push-notification tap cold-starts the app straight onto
    // /team?join=CODE, and for the first moments the stored session is still
    // loading — user is null NOT because this is a guest, but because auth
    // hasn't answered yet. Falling through to the guest branch here started
    // an anonymous sign-in against a real account's half-loaded session, the
    // join never ran for the signed-in player, and the tap "opened the app
    // on the games tab" doing nothing. Wait; the effect re-runs when auth
    // resolves and takes the right branch.
    if (!user && authLoading) return;

    if (user) {
      // Authenticated user: join directly (once per code — the guest branch
      // below must stay re-runnable, it re-triggers this effect after
      // anonymous sign-in)
      if (attemptedJoinCodeRef.current === joinCode) return;
      attemptedJoinCodeRef.current = joinCode;
      (async () => {
        await enterRoom(joinCode);
        const next = new URLSearchParams(searchParams);
        next.delete("join");
        next.delete("tv");
        setSearchParams(next, { replace: true });
      })();
    } else if (!pendingGuestJoinCode && !guestSignInBlocked) {
      // Guest: auto-join with anonymous sign-in (no modal). Once it has been
      // refused, stop asking — clearing the pending code re-runs this effect,
      // which otherwise retries the same rejected sign-in forever.
      setPendingGuestJoinCode(joinCode);
      (async () => {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError || !anonData.user) {
          // Anonymous sign-ins can be turned off for the project, in which
          // case guests cannot be created at all. Remember the room so the
          // prompt below can be about THIS invite, and send them back into it
          // once they have an account, rather than dropping them on a generic
          // "sign in to play" page with the invite lost.
          console.warn("[TeamV2] Guest sign-in unavailable:", anonError?.message);
          setGuestSignInBlocked(true);
          setPendingGuestJoinCode(null);
          return;
        }
        // Wait for profile trigger, then set default nickname
        await new Promise(resolve => setTimeout(resolve, 800));
        await supabase.from("profiles")
          .update({ nickname: "Trivia King" })
          .eq("user_id", anonData.user.id);
        // The useEffect will re-trigger with the new user and auto-join
      })();
    }
  }, [searchParams, user, authLoading, phase, currentRoom, enterRoom, leaveRoomPermanently, setSearchParams, showGuestJoinModal, pendingGuestJoinCode, guestSignInBlocked, classicJoinCode, navigate]);

  // Handle guest joining a room via invite link
  const handleGuestJoinRoom = async (nickname: string) => {
    const code = pendingGuestJoinCode;
    if (!code) return;

    try {
      // Sign in anonymously to get a real user_id
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError || !anonData.user) {
        toast.error(t("extra.signInFailedToast"));
        return;
      }

      // Update profile nickname (trigger auto-creates profile with random name)
      // Small delay to let the trigger create the profile first
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await supabase
        .from("profiles")
        .update({ nickname: nickname.trim() })
        .eq("user_id", anonData.user.id);

      // Close the modal - the useEffect above will re-trigger with the new user 
      // and auto-join the room
      setShowGuestJoinModal(false);
      // Don't clear pendingGuestJoinCode yet - let the URL param handle re-join
    } catch (error) {
      console.error("Guest join error:", error);
      toast.error(t("extra.mpJoinFailed"));
    }
  };

  // Handle challenge context from URL - maps all types from ChallengeTypeModal
  useEffect(() => {
    const challengeUserId = searchParams.get("challenge");
    const rawChallengeType = searchParams.get("type") as ChallengeType;
    
    if (challengeUserId && rawChallengeType && user) {
      // Map specialized types to internal categories:
      // - "create-room" -> "create" (standard room creation)
      // - "trivia" / "collection" -> "my-trivias" (open trivia picker)
      const mappedType = rawChallengeType === "create-room" ? "create" 
        : (rawChallengeType === "trivia" || rawChallengeType === "collection") ? "my-trivias"
        : rawChallengeType as "random" | "library" | "my-trivias" | "create";
      
      // Store challenge context and open create modal
      setChallengeContext({
        targetUserId: challengeUserId,
        challengeType: mappedType,
      });
      setShowCreateModal(true);
      
      // Clear URL params to prevent re-triggering
      searchParams.delete("challenge");
      searchParams.delete("type");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, user, setSearchParams, setShowCreateModal]);

  // Handle playTrivia and playCollection from URL (from PlayerProfileModal)
  useEffect(() => {
    const playTriviaId = searchParams.get("playTrivia");
    const playCollectionId = searchParams.get("playCollection");
    
    if (playTriviaId && user) {
      // Clear URL param first
      searchParams.delete("playTrivia");
      setSearchParams(searchParams, { replace: true });
      
      // Fetch and play trivia
      (async () => {
        try {
          const { data: trivia, error } = await supabase
            .from("user_quiz_posts")
            .select("*, profiles:user_id(nickname, avatar_url)")
            .eq("id", playTriviaId)
            .single();
          
          if (error || !trivia) {
            toast.error(t("extra.triviaNotFound"));
            return;
          }
          
          const post: SamplePost = {
            id: trivia.id,
            username: (trivia.profiles as any)?.nickname || "user",
            displayName: (trivia.profiles as any)?.nickname || t("extra.guestUser"),
            avatarUrl: (trivia.profiles as any)?.avatar_url || "",
            verified: false,
            createdAt: trivia.created_at || new Date().toISOString(),
            title: trivia.title,
            description: trivia.description || "",
            subject: trivia.subject,
            hashtags: trivia.hashtags || [],
            coverGradient: trivia.cover_gradient,
            coverImage: trivia.cover_image || undefined,
            questionCount: trivia.question_count,
            answerFormat: trivia.answer_format as '4_answers' | 'true_false',
            likesCount: trivia.likes_count || 0,
            playsCount: trivia.plays_count || 0,
            commentsCount: 0,
            questions: (trivia.questions as any[]) || [],
            isPublic: trivia.is_public,
          };
          
          setPreviewPost(post);
        } catch (err) {
          toast.error(t("extra.errorOccurredToast"));
        }
      })();
    }
    
    if (playCollectionId && user) {
      // Clear URL param first
      searchParams.delete("playCollection");
      setSearchParams(searchParams, { replace: true });
      
      // Fetch and play collection
      (async () => {
        try {
          const { data: collection, error: collError } = await supabase
            .from("quiz_collections")
            .select("*, profiles:user_id(nickname, avatar_url)")
            .eq("id", playCollectionId)
            .single();
          
          if (collError || !collection) {
            toast.error(t("extra.collectionNotFound"));
            return;
          }
          
          const { data: rounds } = await supabase
            .from("user_quiz_posts")
            .select("*")
            .eq("collection_id", playCollectionId)
            .order("round_number", { ascending: true });
          
          if (!rounds || rounds.length === 0) {
            toast.error(t("extra.collectionRoundsNotFound"));
            return;
          }
          
          const posts: SamplePost[] = rounds.map(r => ({
            id: r.id,
            username: (collection.profiles as any)?.nickname || "user",
            displayName: (collection.profiles as any)?.nickname || t("extra.guestUser"),
            avatarUrl: (collection.profiles as any)?.avatar_url || "",
            verified: false,
            createdAt: r.created_at || new Date().toISOString(),
            title: r.title,
            description: r.description || "",
            subject: r.subject,
            hashtags: r.hashtags || [],
            coverGradient: r.cover_gradient,
            coverImage: r.cover_image || undefined,
            questionCount: r.question_count,
            answerFormat: r.answer_format as '4_answers' | 'true_false',
            likesCount: r.likes_count || 0,
            playsCount: r.plays_count || 0,
            commentsCount: 0,
            questions: (r.questions as any[]) || [],
            isPublic: r.is_public,
            roundNumber: r.round_number,
          }));
          
          setPlayingQuiz({ post: posts[0], collectionPosts: posts });
        } catch (err) {
          toast.error(t("extra.errorOccurredToast"));
        }
      })();
    }
  }, [searchParams, user, setSearchParams]);

  // Handle accepting invitation
  const handleAcceptInvitation = async (invitationId: string) => {
    return await acceptInvitation(invitationId);
  };

  // Handle joining room from invitation
  const handleJoinFromInvitation = (roomCode: string) => {
    enterRoom(roomCode);
  };

  // Handle playing from preview modal
  const handlePlayFromPreview = (post: SamplePost) => {
    setPreviewPost(null);
    setPlayingQuiz({ post });
  };

  // The countdown goes in front of the game screen rather than inside it:
  // mounting the game screen starts the question clock, so anything that
  // delays the first question has to delay the mount too. The count runs out
  // on its own, which is what sends a mid-round rejoin straight to the
  // question instead of making them watch a 3-2-1 for a round already in
  // progress.
  //
  // The count belongs to the ROOM, not to this client's progress through it.
  //
  // An invited player learns the round started from a realtime update, then
  // has to fetch the round's questions before their own phase becomes
  // "playing". Gating the countdown on that phase meant they sat in the lobby
  // through their own 3-2-1 and arrived at whatever was left of it — often
  // nothing, since the count is measured from the host's start time and the
  // fetch can outlast it. The host, who stamps that time only after their
  // questions are ready, saw all three digits every time.
  //
  // Driving it from room status + started_at instead means everyone sees the
  // same count at the same moment, which was the point of deriving it from a
  // shared timestamp in the first place. A player who is still loading when
  // the digits run out keeps this screen rather than dropping to the lobby.
  // The hold is bounded. enterRoom parks a client in the lobby when a
  // "playing" room yields no questions, and a room can stay that way, so an
  // unbounded hold would be a screen with no exit. After the grace they get
  // the room back whether or not the round ever reached them.
  const roundIsStarting = currentRoom?.status === "playing";
  const holdForQuestions = roundIsStarting && phase !== "playing" && withinRoundStart;
  if (currentRoom && roundIsStarting && (countdownNumber !== null || holdForQuestions)) {
    return (
      <RoundCountdown
        number={countdownNumber}
        categoryId={roundCategory.categoryId ?? currentRoom.category_id}
        categoryName={currentRoom.category_name}
        iconSlug={roundCategory.iconSlug}
      />
    );
  }

  if (phase === "playing" && currentRoom) {
    return <MultiplayerGameScreenV2 />;
  }

  // Show result screen (with guard for currentRoom)
  if (phase === "results" && currentRoom) {
    return <GameResultsScreenV2 />;
  }

  // Show lobby if in room (with guard for currentRoom)
  if (phase === "lobby" && currentRoom) {
    return <RoomLobbyV2 />;
  }

  // Show loading when phase is set but room isn't ready yet
  if (phase !== "idle" && !currentRoom) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Auth has not answered yet. `user` is null until it does, and null is the
  // same shape as signed-out, so without this the wall renders over a session
  // that is about to arrive.
  //
  // That is what a host thrown here from a TV session saw: they are signed
  // in, they land on a fresh mount of this page, and for as long as the
  // session takes to restore they are told to sign in. authLoading was
  // already read for the effects below; the render was the one place that
  // ignored it.
  if (!user && authLoading) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // An invite is being opened by a signed-out visitor: the anonymous guest is
  // still being created, so hold the screen rather than flashing the "sign in
  // to play" wall over an invite that is about to open itself.
  const inviteCode = searchParams.get("join") || searchParams.get("room");
  if (!user && inviteCode && !guestSignInBlocked) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto relative">
        <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-6 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center mb-6 shadow-lg"
          >
            <Users className="w-12 h-12 text-slate-700" />
          </motion.div>
          <h1 className="font-display text-2xl text-slate-800 mb-3">{t('team.multiplayer')}</h1>
          <p className="text-slate-600 text-center mb-6">
            {inviteCode ? t('team.signInToJoinInvite') : t('team.signInToPlay')}
          </p>
          <ChunkyButton
            variant="secondary"
            onClick={() => {
              // Carry the invite through the sign-up so they land in the room
              // they were invited to, not on an empty multiplayer page.
              const returnTo = inviteCode ? `/team?join=${inviteCode}` : "/team";
              navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(returnTo)}`);
            }}
          >
            {inviteCode ? t('extra.notifJoin') : t('auth.signIn')}
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // Hide bottom nav when any creation modal/overlay is open
  const isCreationModalOpen = 
    showCreateQuizModal || 
    showCreateCollectionModal || 
    showPersonalTriviaModal ||
    showCreateRoomScreen ||
    showCreateModal ||
    showTeamMenu ||
    showBlindTriviaModal ||
    showCreateTypeModal;

  return (
    <MainLayout showPlayButton={false} showBottomNav={!isCreationModalOpen}>
      {/* Full-width header - spans above the right sidebar too, icons on the
          right like every other page header; the friends reel rides the same
          row on md+ so it sits as high as possible */}
      <div ref={headerRef} className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30">
        {/* The same header as every other page: the page's name on the left,
            no back arrow, actions on the right. It replaces a row that led
            with the wordmark on mobile and the title only on lg+, so the
            title appeared and disappeared depending on the width. */}
        <PageHeader
          title={t("extra.navOnlineGame")}
          showBack={false}
          rightElements={
            <HeaderActions />
          }
        />

        {/* Friends reel: its own full-width row under the header, all sizes */}
        <div className="px-4">
          <FriendsStoriesBar
            onAddFriendClick={() => setShowAddFriendModal(true)}
            onShowAllFriends={() => setShowAllFriendsModal(true)}
          />
        </div>
      </div>

      {/* Flex wrapper for main content + right sidebar */}
      <div className="flex min-h-full">
        {/* Main Content Area */}
        <div id="team-main-content" className="flex-1 flex flex-col pb-[calc(var(--bottom-nav-height)_+_var(--safe-bottom)_+_1rem)] lg:pb-0 bg-background min-w-0">
          {/* STICKY: Tabs - sits below the page header */}
          <div className="sticky z-20 bg-background/95 backdrop-blur-md w-full max-w-full" style={{ top: headerHeight }}>
              {/* Unified Tab Bar - compact left-aligned tabs on md+, with the
                  create button pinned to the right edge of the same row;
                  mobile keeps full-width equal tabs (create stays in the
                  filter bar there). Full-width like the content below, so
                  tabs sit flush left and the CTA flush right. */}
              <div className="px-4 w-full pt-3 pb-2 overflow-hidden">
                <div className="flex items-center gap-3">
                  {/* Tab container */}
                  <div
                    className="relative flex-1 md:flex-initial md:w-fit flex rounded-2xl bg-muted p-1.5"
                    style={{
                      boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.05)",
                    }}
                  >
                    {[
                      ...(PUBLIC_SHARING_ENABLED ? [{ id: "explore", label: t("extra.tabExplore") }] : []),
                      { id: "rooms", label: t("extra.tabRooms") },
                      { id: "my-content", label: t("extra.tabMyTrivia") },
                    ].map((tab) => (
                        <button
                          key={tab.id}
                          onPointerDown={(e) => {
                            if (e.pointerType === "touch") {
                              e.preventDefault();
                              handleTabPress(tab.id);
                            }
                          }}
                          onClick={() => handleTabPress(tab.id)}
                          className={`touch-manipulation relative flex-1 md:flex-none min-w-0 flex items-center justify-center gap-2 rounded-xl px-2 py-2 sm:px-4 sm:py-2.5 md:px-5 text-[13px] sm:text-sm font-semibold transition-colors ${
                          activeTab === tab.id
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeTabTeam"
                            className="absolute inset-0 rounded-xl bg-white"
                            style={{
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 truncate">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* md+: search + filter ride the tab row, just before the
                      create button (mobile keeps its own filter bar below) */}
                  <div className="hidden md:flex items-center gap-1.5 ml-auto shrink-0">
                    {activeTab === "rooms" && hasRooms && (
                      <UnifiedFiltersBar<RoomFilter, string>
                        compact
                        filter={roomsFilter}
                        onFilterChange={(f) => setRoomsFilter(f)}
                        filterOptions={roomFilterOptions}
                        searchQuery={roomsSearchQuery}
                        onSearchQueryChange={setRoomsSearchQuery}
                      />
                    )}
                    {activeTab === "explore" && (
                      <UnifiedFiltersBar<ExploreFilter, ExploreSort>
                        compact
                        filter={exploreFilter}
                        onFilterChange={(f) => setExploreFilter(f)}
                        filterOptions={exploreFilterOptions}
                        sort={exploreSort}
                        onSortChange={(s) => setExploreSort(s)}
                        sortOptions={exploreSortOptions}
                        searchQuery={exploreSearchQuery}
                        onSearchQueryChange={setExploreSearchQuery}
                      />
                    )}
                    {activeTab === "my-content" && hasTrivias && (
                      <UnifiedFiltersBar<MyTriviaFilter, string>
                        compact
                        filter={sortFilter}
                        onFilterChange={(f) => setSortFilter(f)}
                        filterOptions={myTriviaFilterOptions}
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                      />
                    )}
                  </div>

                  {/* Create button - right edge, aligned with the tabs (md+) */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    {...instantTouchProps(() =>
                      activeTab === "rooms"
                        ? setShowCreateModal(true)
                        : setShowCreateTypeModal(true),
                    )}
                    className="hidden md:flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-sm shrink-0 text-sm font-bold"
                  >
                    {activeTab === "rooms"
                      ? t("extra.addRoom")
                      : activeTab === "my-content"
                        ? t("extra.feedCreateTriviaBtn")
                        : t("extra.createTriviaBtn")}
                  </motion.button>
                </div>
              </div>

              {/* Filter Bar - inside sticky header */}
              {((activeTab === "rooms" && hasRooms) || 
                (activeTab === "explore") || 
                (activeTab === "my-content" && hasTrivias)) && (
                <div key={activeTab} id="sticky-filter-bar" className="md:hidden border-b border-border/50">
                  {activeTab === "rooms" && hasRooms && (
                    <UnifiedFiltersBar<RoomFilter, string>
                      filter={roomsFilter}
                      onFilterChange={(f) => setRoomsFilter(f)}
                      filterOptions={roomFilterOptions}
                      searchQuery={roomsSearchQuery}
                      onSearchQueryChange={setRoomsSearchQuery}
                      onAddClick={() => setShowCreateModal(true)}
                      addButtonText={t("extra.addRoom")}
                    />
                  )}

                  {activeTab === "explore" && (
                    <UnifiedFiltersBar<ExploreFilter, ExploreSort>
                      filter={exploreFilter}
                      onFilterChange={(f) => setExploreFilter(f)}
                      filterOptions={exploreFilterOptions}
                      sort={exploreSort}
                      onSortChange={(s) => setExploreSort(s)}
                      sortOptions={exploreSortOptions}
                      searchQuery={exploreSearchQuery}
                      onSearchQueryChange={setExploreSearchQuery}
                      onAddClick={() => setShowCreateTypeModal(true)}
                      addButtonText={t("extra.createTriviaBtn")}
                    />
                  )}

                  {activeTab === "my-content" && hasTrivias && (
                    <UnifiedFiltersBar<MyTriviaFilter, string>
                      filter={sortFilter}
                      onFilterChange={(f) => setSortFilter(f)}
                      filterOptions={myTriviaFilterOptions}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      onAddClick={() => setShowCreateTypeModal(true)}
                      addButtonText={t("extra.feedCreateTriviaBtn")}
                    />
                  )}
                  
                  {/* Fade gradient below sticky filter bar */}
                  <div 
                    className="h-4 -mb-4 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to bottom, hsl(var(--background) / 0.95), transparent)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Content Area - Full width like Shop/PowerUps */}
            <div className="flex-1 px-4 pt-4 pb-4 overflow-x-hidden max-w-full">
              {/* Rooms Tab */}
              {activeTab === "rooms" && (
                <MyRoomsSection
                  hideTV 
                  onCreateRoom={() => setShowCreateModal(true)}
                  onShowAllRooms={() => setShowAllGamesModal(true)}
                  vertical
                  filter={roomsFilter}
                  searchQuery={roomsSearchQuery}
                  onNavigateToTab={handleTabChange}
                />
              )}

              {/* Explore Tab */}
              {activeTab === "explore" && (
                <ExplorePortfolioFeed
                  searchQuery={exploreSearchQuery}
                  filter={exploreFilter}
                  sort={exploreSort}
                  onPlayQuiz={(post, collectionPosts) => {
                    setPlayingQuiz({ post, collectionPosts });
                  }}
                />
              )}

              {/* My Trivia Tab */}
              {activeTab === "my-content" && (
                <MyTriviaTab
                  onCreateQuiz={() => setShowCreateTypeModal(true)}
                  onPlay={(post, collectionPosts) => {
                    setPlayingQuiz({ post, collectionPosts });
                  }}
                  searchQuery={searchQuery}
                  sortFilter={sortFilter}
                  onNavigateToTab={handleTabChange}
                />
              )}
            </div>
          </div>

          {/* Desktop Right Sidebar - Shows on xl screens only */}
          <TeamRightSidebar
            topOffset={headerHeight}
            onAcceptInvitation={handleAcceptInvitation}
            onJoinRoom={handleJoinFromInvitation}
            onOpenTV={async () => {
              if (isConnectingTV) return;
              setIsConnectingTV(true);
              try {
                // Race against a deadline: a hung request (stale socket
                // after sleep, dead connection) otherwise spins forever and
                // only a page refresh recovers. On timeout the button
                // resets and an immediate retry usually succeeds on a
                // fresh connection.
                await Promise.race([
                  (async () => {
                    const room = await createRoom();
                    if (room) navigate(`/team?room=${room.room_code}&tvMode=true`);
                  })(),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("tv-connect-timeout")), 12000)
                  ),
                ]);
              } catch (e) {
                if (e instanceof Error && e.message === "tv-connect-timeout") {
                  toast.error(t("extra.errorOccurredToast"));
                }
              } finally {
                setIsConnectingTV(false);
              }
            }}
            isConnectingTV={isConnectingTV}
            activeTab={activeTab}
            onViewAllRooms={() => handleTabChange("rooms")}
            onViewAllTrivias={() => handleTabChange("my-content")}
          />
      </div>

      {/* TV Modal */}
      <TVMirrorModal 
        open={showTVModal} 
        onOpenChange={setShowTVModal} 
      />


      {/* Modals */}
      <AnimatePresence>
        {showTeamMenu && (
          <TeamMenuScreen
            onClose={() => setShowTeamMenu(false)}
            onSelectCreateRoom={() => {
              setShowTeamMenu(false);
              setShowCreateModal(true);
            }}
            onSelectTrivia={() => {
              setShowTeamMenu(false);
              setShowCreateQuizModal(true);
            }}
            onSelectCollection={(draftId) => {
              setShowTeamMenu(false);
              if (draftId) setEditingDraftId(draftId);
              setShowCreateCollectionModal(true);
            }}
            onSelectPersonalTrivia={() => {
              setShowTeamMenu(false);
              setShowPersonalTriviaModal(true);
            }}
            onSelectRandom={() => {
              setShowTeamMenu(false);
              setPendingRandomPlay(true);
              setShowCreateModal(true);
            }}
            onSelectLibrary={() => {
              setShowTeamMenu(false);
              setShowCategorySelectorModal(true);
            }}
          />
        )}
        {showCreateRoomScreen && (
          <CreateRoomScreen
            onClose={() => setShowCreateRoomScreen(false)}
            onSelectTrivia={() => gatedCreateRoomAndNavigate()}
            onSelectCollection={() => gatedCreateRoomAndNavigate()}
            onSelectPersonalTrivia={() => gatedCreateRoomAndNavigate()}
            onSelectRandom={() => gatedCreateRoomAndNavigate()}
            onSelectLibrary={() => gatedCreateRoomAndNavigate()}
          />
        )}
        {showCreateModal && (
        <CreateRoomPage 
            onClose={() => {
              setShowCreateModal(false);
              setChallengeContext(null);
              setAutoOpenPersonalTrivia(false);
              setPendingRandomPlay(false);
              setPreSelectedCategory(null);
            }}
            challengeUserId={challengeContext?.targetUserId}
            defaultChallengeType={pendingRandomPlay ? "random" : challengeContext?.challengeType}
            autoOpenPersonalTrivia={autoOpenPersonalTrivia}
            preSelectedCategory={preSelectedCategory}
          />
        )}
      </AnimatePresence>
      
      <CategorySelectorModal
        open={showCategorySelectorModal}
        onOpenChange={setShowCategorySelectorModal}
        onSelect={(category) => {
          setShowCategorySelectorModal(false);
          // Store the pre-selected category and open create room
          setPreSelectedCategory({
            id: category.id,
            category_id: category.category_id,
            name: category.name,
            color: category.color,
            image_url: category.image_url,
            total_levels: category.total_levels,
          });
          setShowCreateModal(true);
        }}
      />
      
      <JoinRoomModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
      <InviteFriendsModal
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      <AllRecentRoomsModal
        isOpen={showAllGamesModal}
        onClose={() => setShowAllGamesModal(false)}
      />
      <CreateTriviaTypeModal
        open={showCreateTypeModal}
        onOpenChange={setShowCreateTypeModal}
        onSelectSingle={(draftId) => {
          if (draftId) {
            setEditingDraftId(draftId);
          }
          setShowBlindTriviaModal(true);
        }}
        onSelectCollection={(draftId) => {
          if (draftId) {
            setEditingDraftId(draftId);
          }
          setShowCreateCollectionModal(true);
        }}
        onSelectPersonal={activeTab !== "explore" ? (draftId) => {
          if (draftId) setPersonalTriviaDraftId(draftId);
          setShowPersonalTriviaModal(true);
        } : undefined}
      />
      <GameStylePersonalTrivia
        isOpen={showPersonalTriviaModal}
        onClose={() => {
          setShowPersonalTriviaModal(false);
          setPersonalTriviaDraftId(null);
        }}
        resumeDraftId={personalTriviaDraftId}
        onDraftResumed={() => setPersonalTriviaDraftId(null)}
        onSave={async (questions, title) => {
          if (!user) return false;

          const { error } = await supabase.from("user_quiz_posts").insert([{
            user_id: user.id,
            title: title || "MyTrivia Party",
            subject: "personal",
            cover_gradient: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
            question_count: questions.length,
            answer_format: "4_answers",
            questions: questions,
            is_public: false,
          }]);

          if (error) {
            toast.error(t("extra.saveErrorToast"));
            console.error(error);
            return false;
          }

          setShowPersonalTriviaModal(false);
          // Land on the list the trivia was just added to, at the top of it.
          setSortFilter("all");
          setActiveTab("my-content");
          toast.success(t("extra.myTriviaPartySaved"));
          // Tells the editor the draft behind this is spent.
          return true;
        }}
      />
      <CreateBlindTriviaModal
        open={showBlindTriviaModal}
        onOpenChange={(open) => {
          setShowBlindTriviaModal(open);
          if (!open) setEditingDraftId(null);
        }}
        onTriviaReady={async (questions, title, subject) => {
          if (!user) return;
          
          // Generate hashtags from subject
          const hashtags = subject
            .split(/[\s,]+/)
            .filter(word => word.length > 2)
            .slice(0, 5)
            .map(word => `#${word.replace(/[^a-zA-Zა-ჰ0-9]/g, "")}`);

          // Format questions for storage
          const questionsToSave = questions.map(q => ({
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            incorrect_answers: q.incorrect_answers,
            difficulty: q.difficulty || "medium",
            iconSlug: q.icon_slug || null,
          }));

          // Get random gradient for cover
          const gradients = [
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
          ];
          const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

          // Insert into user_quiz_posts
          const { error } = await supabase
            .from("user_quiz_posts")
            .insert([{
              user_id: user.id,
              title,
              subject,
              hashtags,
              cover_gradient: randomGradient,
              question_count: questions.length,
              answer_format: questions[0]?.incorrect_answers?.length === 1 ? 'true_false' : '4_answers',
              questions: questionsToSave,
              icon_slug: questions[0]?.icon_slug || null,
              is_public: false,
              is_blind: true, // Creator never saw answers (play mode)
            }]);

          if (error) {
            console.error("Error saving trivia:", error);
            toast.error(t("extra.triviaSaveFailed"));
            return;
          }

          // Invalidate queries to refresh the list
          await queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
          await queryClient.invalidateQueries({ queryKey: ["my-trivias-for-room"] });
          await queryClient.invalidateQueries({ queryKey: ["my-recent-trivias-widget"] });

          // Brief delay to allow UI to refresh before switching tabs
          await new Promise(resolve => setTimeout(resolve, 200));

          // Close modal and show success
          setShowBlindTriviaModal(false);
          setEditingDraftId(null);
          setActiveTab("my-content");
          toast.success(t("extra.triviaCreatedToast", { title }));
        }}
        resumeDraftId={editingDraftId}
        onDraftResumed={() => setEditingDraftId(null)}
        onSwitchToCollection={(subject) => {
          setCollectionInitialSubject(subject);
          setShowCreateCollectionModal(true);
        }}
      />
      <CreateQuizModal
        open={showCreateQuizModal}
        onOpenChange={setShowCreateQuizModal}
        onQuizCreated={() => setActiveTab("my-content")}
        onSwitchToCollection={() => setShowCreateCollectionModal(true)}
      />
      <CreateCollectionModal
        open={showCreateCollectionModal}
        onOpenChange={(open) => {
          setShowCreateCollectionModal(open);
          if (!open) {
            setEditingDraftId(null);
            setCollectionInitialSubject("");
          }
        }}
        onCollectionCreated={() => setActiveTab("my-content")}
        draftId={editingDraftId}
        initialRoundSubject={collectionInitialSubject}
      />
      <TriviaPreviewModal
        open={!!previewPost}
        onOpenChange={(open) => !open && setPreviewPost(null)}
        post={previewPost}
        onPlay={handlePlayFromPreview}
      />
      <QuizPlayModal
        open={!!playingQuiz}
        onOpenChange={(open) => !open && setPlayingQuiz(null)}
        post={playingQuiz?.post || null}
        collectionPosts={playingQuiz?.collectionPosts}
      />
      <AllFriendsModal
        isOpen={showAllFriendsModal}
        onClose={() => setShowAllFriendsModal(false)}
        onAddFriendClick={() => {
          setShowAllFriendsModal(false);
          setShowAddFriendModal(true);
        }}
        onQuickPlay={(friend) => {
          setShowAllFriendsModal(false);
          handleQuickPlay({
            friendId: friend.friendId,
            nickname: friend.nickname,
            avatarUrl: friend.avatarUrl,
            countryCode: friend.countryCode,
          });
        }}
      />
      <QuickPlayModal
        isOpen={showQuickPlayModal}
        onClose={() => {
          setShowQuickPlayModal(false);
          setQuickPlayFriend(null);
        }}
        friend={quickPlayFriend ? {
          id: "",
          friendId: quickPlayFriend.friendId,
          nickname: quickPlayFriend.nickname,
          avatarUrl: quickPlayFriend.avatarUrl,
          animatedAvatarUrl: null,
          countryCode: quickPlayFriend.countryCode,
          status: "accepted" as const,
          isOnline: false,
          isOutgoing: false,
        } : null}
        onStartChallenge={(friend, category) => handleStartChallenge(category.id, category.name)}
        isLoading={isStartingChallenge}
      />
      
      {/* Auth Required Modal for guests */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        returnToPath="/team"
        message={t("extra.signInForOnlineGame")}
      />
      
      {/* Guest Join Modal for invite links */}
      <GuestJoinModal
        isOpen={showGuestJoinModal}
        onJoinAsGuest={handleGuestJoinRoom}
        onClose={() => {
          setShowGuestJoinModal(false);
          setPendingGuestJoinCode(null);
          setShowAuthModal(true); // Fall back to auth modal
        }}
        code={pendingGuestJoinCode || ""}
      />

      {/* PRO Required Modal */}
      <ProRequiredModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature={gatedFeature}
      />
    </MainLayout>
  );
}

// Main component with provider wrapper - Forces Vite rebundle
export default function TeamV2() {
  return (
    <MultiplayerProviderV2>
      <TeamContentV2 />
    </MultiplayerProviderV2>
  );
}
