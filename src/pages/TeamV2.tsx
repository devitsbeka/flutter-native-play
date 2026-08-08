import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Layers, ScanLine } from "lucide-react";
import { MultiplayerProviderV2, useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CreateRoomPage } from "@/components/team/CreateRoomPage";
import { CreateBlindTriviaModal } from "@/components/team/CreateBlindTriviaModal";
import { GameStylePersonalTrivia } from "@/components/team/GameStylePersonalTrivia";
import { JoinRoomModal } from "@/components/team/JoinRoomModal";
import { RoomLobbyV2 } from "@/components/team/RoomLobbyV2";
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
import { HeaderActions } from "@/components/shared/HeaderActions";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { useProGating } from "@/hooks/useProGating";
import { useAds } from "@/hooks/useAds";
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
import { QRScannerModal } from "@/components/team/QRScannerModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function TeamContentV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { 
    phase, 
    currentRoom,
    showCreateModal, 
    setShowCreateModal, 
    showJoinModal, 
    setShowJoinModal,
    enterRoom,
  } = useMultiplayerV2();
  const { playSound } = useSound();
  const { 
    sendInvitation,
    addInvitedParticipant,
    acceptInvitation,
  } = useGameInvitations();
  const { createRoom } = useMultiplayerV2();
  const queryClient = useQueryClient();
  const { showProModal, setShowProModal, gatedFeature } = useProGating();
  const { gateWithRewardedAd } = useAds();

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
    if (location.state?.openTrivia) {
      setShowCreateQuizModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.openCollection) {
      setShowCreateCollectionModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, setShowCreateModal]);

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

    // Room creation is gated behind a rewarded ad for non-PRO users (fail-open)
    await gateWithRewardedAd(async () => {
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
    });
  };

  // Shared by CreateRoomScreen callbacks: rewarded gate -> create room -> lobby
  const gatedCreateRoomAndNavigate = async () => {
    setShowCreateRoomScreen(false);
    await gateWithRewardedAd(async () => {
      const room = await createRoom();
      if (room) navigate(`/team?room=${room.room_code}`);
    });
  };

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllGamesModal, setShowAllGamesModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl === "explore" || tabFromUrl === "my-content" || tabFromUrl === "rooms"
      ? tabFromUrl
      : "rooms";
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
      if (tabFromUrl === "explore" || tabFromUrl === "my-content" || tabFromUrl === "rooms") {
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
        supabase
          .from("challenge_attempts")
          .update({ user_id: user.id })
          .eq("id", attemptId)
          .then(({ error }) => {
            if (error) console.error("Failed to link challenge attempt:", error);
          });
      }
    } catch (e) {
      console.error("Error parsing pending challenge:", e);
    }
    localStorage.removeItem("pending_challenge_link");
  }, [user]);

  // Track room membership so a lingering ?room= code can't auto-rejoin the
  // user right after they leave; also strip the code from the URL on leave.
  const wasInRoomRef = useRef(false);
  useEffect(() => {
    if (phase !== "idle") {
      wasInRoomRef.current = true;
      return;
    }
    if (!wasInRoomRef.current) return;
    if (searchParams.has("room") || searchParams.has("join")) {
      const next = new URLSearchParams(searchParams);
      next.delete("room");
      next.delete("join");
      setSearchParams(next, { replace: true });
      // Keep the ref set until the params are actually gone, so the join
      // effect (which sees the same pre-strip params this render) stays
      // blocked from re-joining the room that was just left.
      return;
    }
    // Back at idle with a clean URL: re-arm so a future invite link works.
    wasInRoomRef.current = false;
  }, [phase, searchParams, setSearchParams]);

  // Handle join code from URL. ?join= is the invite flow (consumed after
  // joining); ?room= stays in the URL so a refresh mid-lobby rejoins the room.
  // Each code is attempted once — without this, a ?room= code that fails to
  // join (expired room) would retry on every render forever.
  const attemptedJoinCodeRef = useRef<string | null>(null);
  useEffect(() => {
    const joinCode = searchParams.get("join") || searchParams.get("room");
    if (!joinCode || phase !== "idle" || wasInRoomRef.current) return;

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
    } else if (!pendingGuestJoinCode) {
      // Guest: auto-join with anonymous sign-in (no modal)
      setPendingGuestJoinCode(joinCode);
      (async () => {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError || !anonData.user) {
          toast.error(t("extra.signInFailedToast"));
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
  }, [searchParams, user, phase, enterRoom, setSearchParams, showGuestJoinModal, pendingGuestJoinCode]);

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
            displayName: (trivia.profiles as any)?.nickname || "მომხმარებელი",
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
            displayName: (collection.profiles as any)?.nickname || "მომხმარებელი",
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

  // Show game screen if playing (with guard for currentRoom)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center mb-6 shadow-lg"
          >
            <Users className="w-12 h-12 text-slate-700" />
          </motion.div>
          <h1 className="font-display text-2xl text-slate-800 mb-3">{t('team.multiplayer')}</h1>
          <p className="text-slate-600 text-center mb-6">{t('team.signInToPlay')}</p>
          <ChunkyButton variant="secondary" onClick={() => navigate("/auth")}>
            {t('auth.signIn')}
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
          right like every other page header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          {/* Left: Logo - aligned to left edge (lg+ shows it in the sidebar) */}
          <div className="flex items-center gap-4 lg:hidden">
            <MyTriviaLiveLogo responsive />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* QR Scanner */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowQRScanner(true)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors"
            >
              <ScanLine className="w-5 h-5 text-gray-600" />
            </motion.button>

            <HeaderActions />
          </div>
        </div>
      </div>

      {/* Flex wrapper for main content + right sidebar */}
      <div className="flex min-h-full">
        {/* Main Content Area */}
        <div id="team-main-content" className="flex-1 flex flex-col pb-24 lg:pb-0 bg-background min-w-0">
          {/* STICKY: Friends Bar, Tabs - sits below the page header */}
          <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-md w-full max-w-full">
              <div className="px-4">

                {/* Friends Bar - show on all tabs */}
                <div className="py-2">
                  <FriendsStoriesBar
                    onAddFriendClick={() => setShowAddFriendModal(true)}
                    onShowAllFriends={() => setShowAllFriendsModal(true)}
                  />
                </div>

              </div>

              {/* Unified Tab Bar - Full Width */}
              <div className="px-4 w-full md:max-w-[1115px] mx-auto pt-3 pb-2 overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  {/* Tab container - takes available space */}
                  <div 
                    className="relative flex-1 flex rounded-2xl bg-muted p-1.5"
                    style={{
                      boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.05)",
                    }}
                  >
                    {/* Tabs with equal distribution */}
                     {[
                      { id: "explore", label: t("extra.tabExplore") },
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
                          className={`touch-manipulation relative flex-1 min-w-0 flex items-center justify-center gap-2 rounded-xl px-2 py-2 sm:px-4 sm:py-2.5 text-[13px] sm:text-sm font-semibold transition-colors ${
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
                </div>
              </div>

              {/* Filter Bar - inside sticky header */}
              {((activeTab === "rooms" && hasRooms) || 
                (activeTab === "explore") || 
                (activeTab === "my-content" && hasTrivias)) && (
                <div key={activeTab} id="sticky-filter-bar" className="border-b border-border/50">
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
                      onAddClick={() => gateWithRewardedAd(() => setShowCreateTypeModal(true))}
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
                      onAddClick={() => gateWithRewardedAd(() => setShowCreateTypeModal(true))}
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
                  onCreateQuiz={() => gateWithRewardedAd(() => setShowCreateTypeModal(true))}
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
                  gateWithRewardedAd(async () => {
                    const room = await createRoom();
                    if (room) navigate(`/team?room=${room.room_code}&tvMode=true`);
                  }),
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
          if (!user) return;
          
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
            return;
          }
          
          setShowPersonalTriviaModal(false);
          setActiveTab("my-content");
          toast.success(t("extra.myTriviaPartySaved"));
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
      <QRScannerModal
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
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
