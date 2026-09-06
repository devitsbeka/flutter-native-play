import { roomKind, routeForRoom, ROOM_KIND_COLUMNS } from "@/utils/roomRoutes";
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
import { PublicRoomsSection } from "@/components/team/PublicRoomsSection";
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
  privateFilterOptions,
  visibleFilter,
  visibleFilterOptions,
  publicRoomFilterOptions,
  myTriviaFilterOptions,
  exploreFilterOptions,
  exploreSortOptions,
  RoomFilter,
  PrivateFilter,
  PublicRoomsFilter,
  MyTriviaFilter,
  ExploreFilter,
  ExploreSort,
} from "@/components/team/UnifiedFiltersBar";
import { supabase } from "@/integrations/supabase/client";
import { instantTouchProps } from "@/utils/instantTouch";
import { generateRoomIdentity } from "@/utils/roomNameGenerator";
import { readAppLanguage } from "@/utils/appLanguage";
import { toast } from "@/lib/toast";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";

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

  // Sent here to create a room (the play button, a mission, the drawer):
  // the create screen is on the very first paint. The context flag that
  // keeps it open is set by the effect below, one render later — and that
  // one render showed the rooms list for a flash before the screen slid
  // over it. This remembers the arrival until the flag catches up.
  const arrivedToCreate = useRef<boolean>(
    Boolean(location.state?.openCreateRoom || location.state?.openPersonalTrivia),
  );
  const createOpen = showCreateModal || arrivedToCreate.current;
  // Rendering it on the first paint was only half of it. The create screen is
  // a full-bleed opaque overlay, but it entered from `opacity: 0` — so for the
  // length of that fade the rooms hub behind it was what you actually saw, and
  // the play chooser looked like it had landed on the wrong page and then
  // corrected itself. Arriving here to create means this screen IS the
  // destination, so it paints opaque immediately. Cleared on close, so opening
  // it again from inside the hub still cross-fades.
  const enteredOnCreate = useRef<boolean>(arrivedToCreate.current);

  useEffect(() => {
    if (location.state?.openPersonalTrivia) {
      setAutoOpenPersonalTrivia(true);
      setShowCreateModal(true);
      arrivedToCreate.current = false;
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.openCreateRoom) {
      setShowCreateModal(true);
      arrivedToCreate.current = false;
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
    // The play chooser's My Trivias tile, with nothing made yet: ask what
    // to make (Figma 1065:1019) rather than opening the trivia editor cold.
    if (location.state?.openCreateChooser) {
      setCreateChooserForTrivias(true);
      setShowCreateTypeModal(true);
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

  /**
   * The Private tab's + makes the room and opens its lobby.
   *
   * It used to open the create screen, which is the screen for deciding
   * WHAT to publish — a game type, a category, public or private. On the
   * Private tab all of that is already answered: it is a private room, and
   * the category, the players and the rounds are chosen in the lobby, which
   * is where the host is going anyway. Two screens to reach the one they
   * wanted.
   */
  const createPrivateRoomAndOpen = async () => {
    const identity = generateRoomIdentity(readAppLanguage());
    const room = await createRoom(
      undefined,
      undefined,
      undefined,
      identity.name,
      null,
      undefined,
      false,
    );
    if (room) navigate(`/team?room=${room.room_code}`);
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
  /**
   * The title and the friends reel ride the scroll; the tabs and filter stay.
   *
   * Both rows were pinned, so a third of the screen was chrome no matter how
   * far down the list you were. Only the controls earn that space: the tabs
   * and the filter are what you reach for while scanning rooms, and the page's
   * own name is not. So the header retracts on the way down and comes back the
   * moment you scroll up — where you are heading is the thing that decides.
   *
   * Both rows move by transform rather than by changing the sticky `top`,
   * which cannot be animated: the header slides out by its own height and the
   * tab row, pinned at that height, is carried the same distance so it lands
   * flush against the top. Transforms do not touch layout, so the list behind
   * them never reflows while it animates.
   */
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  useEffect(() => {
    const scroller = document.getElementById("main-scroll-container");
    if (!scroller) return;
    let last = scroller.scrollTop;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = scroller.scrollTop;
        const delta = y - last;
        // Small movements accumulate rather than toggling: a few pixels of
        // rubber-banding or a thumb resting on the glass should not flip it.
        if (Math.abs(delta) < 6) return;
        last = y;
        // Above the fold the header always belongs on screen, whichever way
        // the last gesture went.
        if (y <= headerHeight) setHeaderCollapsed(false);
        else setHeaderCollapsed(delta > 0);
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headerHeight]);
  const chromeShift = headerCollapsed ? `translateY(-${headerHeight}px)` : "translateY(0)";
  const CHROME_EASE = "transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)";
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  /**
   * Two tabs: what everyone can find, and what is mine.
   *
   * They replace three — rooms, my trivia, and the never-enabled explore —
   * which between them split "my stuff" across two tabs and had nowhere at
   * all to put somebody else's room. Old links still work: ?tab=rooms and
   * ?tab=my-content both open Private, ?tab=explore opens Public, because
   * those URLs are in people's history and in notifications already sent.
   */
  const LEGACY_TABS: Record<string, string> = {
    rooms: "private",
    "my-content": "private",
    explore: "public",
  };
  const isKnownTab = (tab: string | null): tab is string =>
    tab === "public" || tab === "private";
  const normalizeTab = (tab: string | null): string | null =>
    (tab && (isKnownTab(tab) ? tab : LEGACY_TABS[tab])) || null;
  const [activeTab, setActiveTab] = useState(
    () => normalizeTab(searchParams.get("tab")) ?? "public",
  );
  
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
    const tabFromUrl = normalizeTab(searchParams.get("tab"));
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
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
  // True while the chooser is open because the play chooser's My Trivias
  // tile sent the player here with nothing made yet: the owner's frame for
  // that entry (1065:1019) has no room card. The hub's + keeps it.
  const [createChooserForTrivias, setCreateChooserForTrivias] = useState(false);
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
  // Private spans rooms and trivias under one filter; Public is rooms only.
  const [privateFilter, setPrivateFilter] = useState<PrivateFilter>("all");
  const [privateSearchQuery, setPrivateSearchQuery] = useState("");
  const [publicFilter, setPublicFilter] = useState<PublicRoomsFilter>("all");
  const [publicSearchQuery, setPublicSearchQuery] = useState("");
  const [exploreFilter, setExploreFilter] = useState<ExploreFilter>("all");
  const [exploreSort, setExploreSort] = useState<ExploreSort>("recent");
  const [exploreSearchQuery, setExploreSearchQuery] = useState("");

  // The unreleased modes (registry: DEVELOPER_ONLY_GAME_TYPES) are an
  // admin's alone. Their chips come off the filter menus, and a filter left
  // set to one — from a session before developer mode was switched off —
  // falls back to "all" rather than filtering the list by a game the viewer
  // cannot see anywhere else.
  const { developerMode } = useDeveloperMode();
  const publicFilterOptionsShown = visibleFilterOptions(publicRoomFilterOptions, developerMode);
  const privateFilterOptionsShown = visibleFilterOptions(privateFilterOptions, developerMode);
  const publicFilterApplied = visibleFilter(publicFilter, publicRoomFilterOptions, developerMode, "all");
  const privateFilterApplied = visibleFilter(privateFilter, privateFilterOptions, developerMode, "all");

  // Switching a filter/sort keeps the old scroll offset, which leaves the
  // first result's header hidden under the sticky friends/tabs/filter stack —
  // reset the scroll so refiltered content starts fully visible
  useEffect(() => {
    document.getElementById("main-scroll-container")?.scrollTo({ top: 0 });
    document.getElementById("team-main-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [exploreFilter, exploreSort, roomsFilter, sortFilter]);
  // The same for the Public and Private tabs' own filters and searches: a
  // narrower list under the old offset put its first card half under the
  // sticky stack.
  useEffect(() => {
    document.getElementById("main-scroll-container")?.scrollTo({ top: 0 });
    document.getElementById("team-main-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [publicFilter, publicSearchQuery, privateFilter, privateSearchQuery]);

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
  // Which half of the Private tab a filter is asking for. "all" is both;
  // every other chip belongs to exactly one of them, and showing the other
  // list underneath it would make the filter look like it had done nothing.
  const ROOM_ONLY_FILTERS: PrivateFilter[] = ["my_rooms", "friends_rooms", "king", "team_battle"];
  const TRIVIA_ONLY_FILTERS: PrivateFilter[] = ["trivias", "collections", "personal"];
  const showsPrivateRooms =
    privateFilterApplied === "all" || ROOM_ONLY_FILTERS.includes(privateFilterApplied);
  const showsPrivateTrivias =
    privateFilterApplied === "all" || TRIVIA_ONLY_FILTERS.includes(privateFilterApplied);
  // The two sections underneath each speak their own dialect of the filter.
  const privateRoomFilter: RoomFilter = ROOM_ONLY_FILTERS.includes(privateFilterApplied)
    ? (privateFilterApplied as RoomFilter)
    : "all";
  const privateTriviaFilter: MyTriviaFilter = TRIVIA_ONLY_FILTERS.includes(privateFilterApplied)
    ? (privateFilterApplied as MyTriviaFilter)
    : "all";
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
  /**
   * How long the create flow's "I am entering a room" claim is honoured.
   *
   * Long enough for a slow join, short enough that a failed one gives the
   * page back instead of leaving a spinner with no way out.
   */
  const ENTERING_MAX_MS = 8000;
  const enteringSinceRef = useRef<number | null>(null);
  // Once the claim has been honoured it is spent; a lingering `entering` in
  // the location state must not re-arm it after the room has been left.
  const enteringSettledRef = useRef(false);
  if (
    (location.state as { entering?: boolean } | null)?.entering &&
    enteringSinceRef.current === null &&
    !enteringSettledRef.current
  ) {
    enteringSinceRef.current = Date.now();
  }
  const enteringRoom =
    enteringSinceRef.current !== null && Date.now() - enteringSinceRef.current < ENTERING_MAX_MS;

  // The claim ends when the room opens, not when the clock runs out. It
  // used to stand on the timer alone: arrive through /team?join= — the home
  // rail's way in — and back out of the lobby inside eight seconds, and the
  // page came back to a claim still standing, phase idle, no room: the
  // spinner, and nothing to ever render past it (owner: "click back and I
  // see a white page with endless loading").
  useEffect(() => {
    if (enteringSinceRef.current !== null && (phase !== "idle" || currentRoom)) {
      enteringSinceRef.current = null;
      enteringSettledRef.current = true;
    }
  }, [phase, currentRoom]);

  // And when the join never opens a room, the deadline itself re-renders the
  // page. A clock read at render time needs something to run that render;
  // without this the bound only ever applied to a page something ELSE had
  // reason to redraw.
  const [, enteringTick] = useState(0);
  useEffect(() => {
    if (!enteringRoom || enteringSinceRef.current === null) return;
    const left = ENTERING_MAX_MS - (Date.now() - enteringSinceRef.current);
    const id = window.setTimeout(() => enteringTick((n) => n + 1), Math.max(0, left) + 20);
    return () => window.clearTimeout(id);
  }, [enteringRoom]);

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
    if (!joinCode) {
      // The URL carries no code, so the attempt it remembers is spent. It
      // used to be remembered for the life of the page: open a room, back
      // out, and tap the same room's Play — /team?join=CODE again — and
      // the join bailed here as "already attempted", never opening the room
      // and never stripping the param, so the joining wash below held the
      // screen with nothing behind it (owner: "click Play and I see a blank
      // page"). Once-per-code only has to hold while the code is in the URL.
      attemptedJoinCodeRef.current = null;
      return;
    }

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
        .select(ROOM_KIND_COLUMNS)
        .eq("room_code", joinCode.toUpperCase())
        .maybeSingle()
        .then(({ data: typed }) => {
          // Words rooms included: a push sent before the edge function knew
          // the mode still says /team?join=, and this is where it recovers.
          if (roomKind(typed) !== "classic") {
            navigate(routeForRoom(typed, joinCode), { replace: true });
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
        try {
          await leaveRoomPermanently();
          await enterRoom(joinCode);
        } finally {
          const next = new URLSearchParams(searchParams);
          next.delete("join");
          next.delete("room");
          next.delete("tv");
          setSearchParams(next, { replace: true });
        }
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
        let opened = false;
        try {
          opened = await enterRoom(joinCode);
        } finally {
          const next = new URLSearchParams(searchParams);
          next.delete("join");
          next.delete("tv");
          // ?room= stays for a refresh mid-lobby to rejoin — but only a
          // lobby that exists. A code that did not open has nothing to
          // rejoin, and leaving it would hold the joining wash over a
          // room that is never going to appear.
          if (!opened) next.delete("room");
          setSearchParams(next, { replace: true });
        }
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
  const instantChallengeRef = useRef(false);
  useEffect(() => {
    const challengeUserId = searchParams.get("challenge");
    const rawChallengeType = searchParams.get("type") as ChallengeType;

    if (challengeUserId && rawChallengeType && user) {
      // Clear URL params to prevent re-triggering
      searchParams.delete("challenge");
      searchParams.delete("type");
      setSearchParams(searchParams, { replace: true });

      // The profile's (and player search's) Challenge button: no picker
      // screens — the room IS the challenge. Create it, seat the challenged
      // player as invited (their row's trigger notifies them, the game
      // invitation carries the push), and land the host straight in the
      // lobby, where the rounds' categories and more friends are added.
      if (rawChallengeType === "create-room") {
        if (instantChallengeRef.current) return;
        instantChallengeRef.current = true;
        void (async () => {
          try {
            const room = await createRoom();
            if (!room) return;
            const { data: target } = await supabase
              .from("profiles")
              .select("nickname, avatar_url, country_code")
              .eq("user_id", challengeUserId)
              .maybeSingle();
            await addInvitedParticipant(
              room.id,
              challengeUserId,
              target?.nickname || "?",
              target?.avatar_url ?? null,
              target?.country_code ?? null,
            );
            await sendInvitation(challengeUserId, room.id);
            navigate(`/team?room=${room.room_code}`);
          } finally {
            instantChallengeRef.current = false;
          }
        })();
        return;
      }

      // Map the remaining specialized types to internal categories:
      // "trivia" / "collection" -> "my-trivias" (open trivia picker)
      const mappedType =
        rawChallengeType === "trivia" || rawChallengeType === "collection"
          ? "my-trivias"
          : (rawChallengeType as "random" | "library" | "my-trivias" | "create");

      // Store challenge context and open create modal
      setChallengeContext({
        targetUserId: challengeUserId,
        challengeType: mappedType,
      });
      setShowCreateModal(true);
    }
  }, [searchParams, user, setSearchParams, setShowCreateModal, createRoom, addInvitedParticipant, sendInvitation, navigate]);

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

  // A room being joined by its code — the create screen hands a room it
  // inserted itself to /team?join=CODE — took two round-trips to resolve,
  // and the rooms list rendered underneath for all of them: a screen that
  // flashed before the lobby. Hold the lobby's wash instead; the join
  // effect strips the param whether or not the room opens.
  const joiningByCode =
    !!(searchParams.get("join") || searchParams.get("room")) && phase === "idle" && !!user;
  if (joiningByCode) {
    return <div className="h-[100dvh] w-full safe-bleed" style={{ background: "#f5d9ff" }} />;
  }

  // Show loading when phase is set but room isn't ready yet — or when the
  // create flow has just handed us a room to enter.
  //
  // `phase` is still "idle" on the first paint after that navigate: the join
  // starts in an effect, which runs after this render. Without the second
  // half of this condition the chooser paints for the whole round trip,
  // which is the flash a host sees between picking a category and reaching
  // the lobby.
  //
  // Bounded, because a join can fail: past ENTERING_MAX_MS the page comes
  // back rather than spinning forever on a room that is never going to open.
  if ((phase !== "idle" || enteringRoom) && !currentRoom) {
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
    createOpen ||
    showTeamMenu ||
    showBlindTriviaModal ||
    showCreateTypeModal;

  return (
    <MainLayout showPlayButton={false} showBottomNav={!isCreationModalOpen}>
      {/* Full-width header - spans above the right sidebar too, icons on the
          right like every other page header; the friends reel rides the same
          row on md+ so it sits as high as possible */}
      <div
        ref={headerRef}
        className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 will-change-transform"
        style={{ transform: chromeShift, transition: CHROME_EASE }}
      >
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
          <div
            className="sticky z-20 bg-background/95 backdrop-blur-md w-full max-w-full will-change-transform"
            style={{ top: headerHeight, transform: chromeShift, transition: CHROME_EASE }}
          >
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
                      { id: "public", label: t("extra.tabPublic") },
                      { id: "private", label: t("extra.tabPrivate") },
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
                    {activeTab === "public" && (
                      <UnifiedFiltersBar<PublicRoomsFilter, string>
                        compact
                        filter={publicFilterApplied}
                        onFilterChange={(f) => setPublicFilter(f)}
                        filterOptions={publicFilterOptionsShown}
                        searchQuery={publicSearchQuery}
                        onSearchQueryChange={setPublicSearchQuery}
                      />
                    )}
                    {activeTab === "private" && (hasRooms || hasTrivias) && (
                      <UnifiedFiltersBar<PrivateFilter, string>
                        compact
                        filter={privateFilterApplied}
                        onFilterChange={(f) => setPrivateFilter(f)}
                        filterOptions={privateFilterOptionsShown}
                        searchQuery={privateSearchQuery}
                        onSearchQueryChange={setPrivateSearchQuery}
                      />
                    )}
                  </div>

                  {/* Create button - right edge, aligned with the tabs (md+) */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    {...instantTouchProps(() =>
                      activeTab === "public"
                        ? setShowCreateModal(true)
                        : setShowCreateTypeModal(true),
                    )}
                    className="hidden md:flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-sm shrink-0 text-sm font-bold"
                  >
                    {/* Public makes a room, because that is the only thing
                        that can go on a public list. Private opens the
                        chooser, which leads with a room and offers the three
                        trivia types under it. */}
                    {activeTab === "public" ? t("extra.addRoom") : t("extra.createBtn")}
                  </motion.button>
                </div>
              </div>

              {/* Filter Bar - inside sticky header (mobile) */}
              <div key={activeTab} id="sticky-filter-bar" className="md:hidden border-b border-border/50">
                {activeTab === "public" && (
                  <UnifiedFiltersBar<PublicRoomsFilter, string>
                    filter={publicFilterApplied}
                    onFilterChange={(f) => setPublicFilter(f)}
                    filterOptions={publicFilterOptionsShown}
                    searchQuery={publicSearchQuery}
                    onSearchQueryChange={setPublicSearchQuery}
                    onAddClick={() => setShowCreateModal(true)}
                    addButtonText={t("extra.addRoom")}
                  />
                )}

                {activeTab === "private" && (
                  <UnifiedFiltersBar<PrivateFilter, string>
                    filter={privateFilterApplied}
                    onFilterChange={(f) => setPrivateFilter(f)}
                    filterOptions={privateFilterOptionsShown}
                    searchQuery={privateSearchQuery}
                    onSearchQueryChange={setPrivateSearchQuery}
                    onAddClick={() => setShowCreateTypeModal(true)}
                    addButtonText={t("extra.createBtn")}
                  />
                )}
              </div>
            </div>

            {/* Content Area - Full width like Shop/PowerUps */}
            <div className="flex-1 pb-4 overflow-x-hidden max-w-full">
              {/* Public: rooms anybody can find, other people's included.
                  It brings its own padding, because its cards run edge to
                  edge the way the games list's do. */}
              {activeTab === "public" && (
                <PublicRoomsSection filter={publicFilterApplied} searchQuery={publicSearchQuery} />
              )}

              {/* Private: my rooms and my trivias, under one filter. Both
                  lists at once under "all" — they are two halves of "mine",
                  and the tab that held only the second one was the one
                  nobody found. */}
              {activeTab === "private" && (
                <div className="px-4 pt-4 space-y-2">
                  {showsPrivateRooms && (privateFilterApplied !== "all" || hasRooms || !hasTrivias) && (
                    <MyRoomsSection
                      hideTV
                      onCreateRoom={() => setShowCreateModal(true)}
                      onShowAllRooms={() => setShowAllGamesModal(true)}
                      vertical
                      visibility="private"
                      filter={privateRoomFilter}
                      searchQuery={privateSearchQuery}
                      onNavigateToTab={handleTabChange}
                    />
                  )}

                  {/* Under "all" each half appears only if it has anything
                      in it: two empty states stacked, each with its own
                      "create something" pitch, reads as a broken page. A
                      person with neither still gets one — the rooms one,
                      which is the thing this page is for. */}
                  {showsPrivateTrivias && (privateFilterApplied !== "all" || hasTrivias) && (
                    <MyTriviaTab
                      onCreateQuiz={() => setShowCreateTypeModal(true)}
                      onPlay={(post, collectionPosts) => {
                        setPlayingQuiz({ post, collectionPosts });
                      }}
                      searchQuery={privateSearchQuery}
                      sortFilter={privateTriviaFilter}
                      onNavigateToTab={handleTabChange}
                    />
                  )}
                </div>
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
            onViewAllRooms={() => handleTabChange("private")}
            onViewAllTrivias={() => handleTabChange("private")}
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
        {createOpen && (
        <CreateRoomPage 
            enterInstantly={enteredOnCreate.current}
            onClose={() => {
              enteredOnCreate.current = false;
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
        allowParty
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
        onOpenChange={(open) => {
          setShowCreateTypeModal(open);
          if (!open) setCreateChooserForTrivias(false);
        }}
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
        onSelectPersonal={(draftId) => {
          if (draftId) setPersonalTriviaDraftId(draftId);
          setShowPersonalTriviaModal(true);
        }}
        onSelectGameRoom={() => void createPrivateRoomAndOpen()}
        hideGameRoom={createChooserForTrivias}
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
          setActiveTab("private");
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
          setActiveTab("private");
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
        onQuizCreated={() => setActiveTab("private")}
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
        onCollectionCreated={() => setActiveTab("private")}
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
