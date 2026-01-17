import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Bell, MessageCircle, Layers, ScanLine } from "lucide-react";
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
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { NotificationsPanel } from "@/components/home/NotificationsPanel";
import { RoomChatsPanel } from "@/components/team/RoomChatsPanel";
import { LiveBadge } from "@/components/social/LiveBadge";
import { SocialFeed } from "@/components/social/SocialFeed";
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
import { TabsContent } from "@/components/ui/tabs";

import { DesktopRightSidebar } from "@/components/team/DesktopRightSidebar";
import { FeedFiltersBar, SortFilter } from "@/components/social/FeedFiltersBar";
import { RoomFiltersBar, RoomFilter, RoomSort } from "@/components/team/RoomFiltersBar";
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

  // Challenge context from URL
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
  };

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllGamesModal, setShowAllGamesModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showRoomChatsPanel, setShowRoomChatsPanel] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [activeTab, setActiveTab] = useState("rooms");
  
  // Scroll to top when changing tabs to prevent layout jump
  const handleTabChange = (tab: string) => {
    const mainContent = document.getElementById('team-main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    setActiveTab(tab);
  };
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [showBlindTriviaModal, setShowBlindTriviaModal] = useState(false);
  const [showPersonalTriviaModal, setShowPersonalTriviaModal] = useState(false);
  const [playingQuiz, setPlayingQuiz] = useState<{ post: SamplePost; collectionPosts?: SamplePost[] } | null>(null);
  const [previewPost, setPreviewPost] = useState<SamplePost | null>(null);
  const [showAllFriendsModal, setShowAllFriendsModal] = useState(false);
  const [sortFilter, setSortFilter] = useState<SortFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [roomsFilter, setRoomsFilter] = useState<RoomFilter>("all");
  const [roomsSort, setRoomsSort] = useState<RoomSort>("recent");
  const [roomsSearchQuery, setRoomsSearchQuery] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const [showCreateRoomScreen, setShowCreateRoomScreen] = useState(false);
  const [showCategorySelectorModal, setShowCategorySelectorModal] = useState(false);
  const [isEditingRound, setIsEditingRound] = useState(false);
  const [pendingRandomPlay, setPendingRandomPlay] = useState(false);
  const [preSelectedCategory, setPreSelectedCategory] = useState<{
    id: string;
    category_id: string;
    name: string;
    color: string;
    image_url?: string | null;
    total_levels: number;
  } | null>(null);

  const { unreadCount } = useNotifications();
  const { totalUnread: unreadMessagesCount } = useUnreadRoomMessages();

  // Handle join code from URL
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode && user && phase === "idle") {
      enterRoom(joinCode);
    }
  }, [searchParams, user, phase, enterRoom]);

  // Handle challenge context from URL
  useEffect(() => {
    const challengeUserId = searchParams.get("challenge");
    const challengeType = searchParams.get("type") as "random" | "library" | "my-trivias" | "create" | null;
    
    if (challengeUserId && challengeType && user) {
      // Store challenge context and open create modal
      setChallengeContext({
        targetUserId: challengeUserId,
        challengeType: challengeType,
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
            toast.error("ტრივია ვერ მოიძებნა");
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
          toast.error("შეცდომა მოხდა");
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
            toast.error("კოლექცია ვერ მოიძებნა");
            return;
          }
          
          const { data: rounds } = await supabase
            .from("user_quiz_posts")
            .select("*")
            .eq("collection_id", playCollectionId)
            .order("round_number", { ascending: true });
          
          if (!rounds || rounds.length === 0) {
            toast.error("კოლექციაში რაუნდები ვერ მოიძებნა");
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
          toast.error("შეცდომა მოხდა");
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
    showTeamMenu;

  return (
    <MainLayout showPlayButton={false} showBottomNav={!isCreationModalOpen}>
      {/* Main Content Area */}
      <main id="team-main-content" className="flex-1 h-screen overflow-y-auto relative pb-24 lg:pb-0 bg-background scroll-smooth scrollbar-hide">
        {/* Sticky Header - matching Shop/PowerUps style */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-900/10">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
                  Live
                </h1>
                <LiveBadge />
              </div>

              <div className="flex items-center gap-2">
                {/* QR Scanner */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowQRScanner(true)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground"
                  style={{ boxShadow: "0 3px 0 hsl(var(--border))" }}
                >
                  <ScanLine className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotificationsPanel(true)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground"
                  style={{ boxShadow: "0 3px 0 hsl(var(--border))" }}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-destructive rounded-full">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRoomChatsPanel(true)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground"
                  style={{ boxShadow: "0 3px 0 hsl(var(--border))" }}
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-destructive rounded-full">
                      {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                    </span>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Friends Bar - show on all tabs */}
            <div className="py-2">
              <FriendsStoriesBar
                onAddFriendClick={() => setShowAddFriendModal(true)}
                onFriendClick={() => {}}
                onShowAllFriends={() => setShowAllFriendsModal(true)}
              />
            </div>

            {/* Unified Tab Bar with Create Button */}
            <div className="flex items-center justify-between gap-3">
              <div 
                className="inline-flex rounded-2xl bg-muted p-1.5"
                style={{
                  boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.05)",
                }}
              >
                {[
                  { id: "rooms", label: "ოთახები" },
                  { id: "explore", label: "აღმოჩენა" },
                  { id: "my-content", label: "ჩემი ტრივია" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabTeam"
                        className="absolute inset-0 rounded-xl bg-primary"
                        style={{
                          boxShadow: "0 4px 0 0 hsl(var(--primary) / 0.5)",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>
              
              {/* New Room Button - Far Right (hidden on mobile) */}
              <ChunkyButton 
                onClick={() => setShowTeamMenu(true)}
                variant="primary"
                size="sm"
                className="hidden sm:flex"
              >
                <Plus className="w-4 h-4 mr-1" />
                {activeTab === "my-content" ? "ახალი ტრივია" : "ახალი ოთახი"}
              </ChunkyButton>
            </div>
          </div>
        </div>

        {/* Content Area - Full width like Shop/PowerUps */}
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          
          {/* Mobile Full-Width Create Button */}
          <div className="sm:hidden px-4 pt-3">
            <ChunkyButton 
              onClick={() => setShowTeamMenu(true)}
              variant="primary"
              size="md"
              className="w-full justify-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              {activeTab === "my-content" ? "ახალი ტრივია" : "ახალი ოთახი"}
            </ChunkyButton>
          </div>


          {/* Rooms Tab */}
          {activeTab === "rooms" && (
            <div className="px-4 pt-4 pb-4">
              <MyRoomsSection 
                hideTV 
                onCreateRoom={() => setShowTeamMenu(true)}
                onShowAllRooms={() => setShowAllGamesModal(true)}
                vertical
              />
            </div>
          )}

          {/* Explore Tab */}
          {activeTab === "explore" && (
            <div className="px-4 py-4 sm:flex sm:justify-center">
              <div className="w-full sm:max-w-[600px]">
                <SocialFeed 
                  onPlayQuiz={(post, collectionPosts) => {
                    setPlayingQuiz({ post, collectionPosts });
                  }}
                />
              </div>
            </div>
          )}

          {/* My Trivia Tab */}
          {activeTab === "my-content" && (
            <div className="px-4 py-4 sm:flex sm:justify-center">
              <div className="w-full sm:max-w-[600px]">
                <MyTriviaTab 
                  onCreateQuiz={() => setShowCreateTypeModal(true)}
                  onPlay={(post, collectionPosts) => {
                    setPlayingQuiz({ post, collectionPosts });
                  }}
                />
              </div>
            </div>
          )}
          
        </div>

      </main>

      {/* Desktop Right Sidebar - Instagram style */}
      <DesktopRightSidebar onAddFriendClick={() => setShowAddFriendModal(true)} />

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
            onSelectTrivia={async () => {
              setShowCreateRoomScreen(false);
              const room = await createRoom();
              if (room) navigate(`/team?room=${room.room_code}`);
            }}
            onSelectCollection={async () => {
              setShowCreateRoomScreen(false);
              const room = await createRoom();
              if (room) navigate(`/team?room=${room.room_code}`);
            }}
            onSelectPersonalTrivia={async () => {
              setShowCreateRoomScreen(false);
              const room = await createRoom();
              if (room) navigate(`/team?room=${room.room_code}`);
            }}
            onSelectRandom={async () => {
              setShowCreateRoomScreen(false);
              const room = await createRoom();
              if (room) navigate(`/team?room=${room.room_code}`);
            }}
            onSelectLibrary={async () => {
              setShowCreateRoomScreen(false);
              const room = await createRoom();
              if (room) navigate(`/team?room=${room.room_code}`);
            }}
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
      <NotificationsPanel
        isOpen={showNotificationsPanel}
        onClose={() => setShowNotificationsPanel(false)}
      />
      <RoomChatsPanel
        isOpen={showRoomChatsPanel}
        onClose={() => setShowRoomChatsPanel(false)}
      />
      <CreateTriviaTypeModal
        open={showCreateTypeModal}
        onOpenChange={setShowCreateTypeModal}
        onSelectSingle={() => setShowCreateQuizModal(true)}
        onSelectCollection={(draftId) => {
          if (draftId) {
            setEditingDraftId(draftId);
          }
          setShowCreateCollectionModal(true);
        }}
        onSelectPersonal={() => setShowPersonalTriviaModal(true)}
      />
      <GameStylePersonalTrivia
        isOpen={showPersonalTriviaModal}
        onClose={() => setShowPersonalTriviaModal(false)}
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
            toast.error("შეცდომა შენახვისას");
            console.error(error);
            return;
          }
          
          setShowPersonalTriviaModal(false);
          setActiveTab("my-content");
          toast.success("MyTrivia Party შენახულია!");
        }}
      />
      <CreateBlindTriviaModal
        open={showBlindTriviaModal}
        onOpenChange={setShowBlindTriviaModal}
        onTriviaReady={() => {
          setShowBlindTriviaModal(false);
          setActiveTab("my-content");
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
          if (!open) setEditingDraftId(null);
        }}
        onCollectionCreated={() => setActiveTab("my-content")}
        draftId={editingDraftId}
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
    </MainLayout>
  );
}

// Main component with provider wrapper
export default function TeamV2() {
  return (
    <MultiplayerProviderV2>
      <TeamContentV2 />
    </MultiplayerProviderV2>
  );
}
