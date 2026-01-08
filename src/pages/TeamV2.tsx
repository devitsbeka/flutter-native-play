import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Bell, MessageCircle, Layers } from "lucide-react";
import { MultiplayerProviderV2, useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CreateRoomPage } from "@/components/team/CreateRoomPage";
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
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
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
import { QuizPlayModal } from "@/components/social/QuizPlayModal";
import { SamplePost } from "@/data/samplePosts";
import { TabsContent } from "@/components/ui/tabs";
import { DesktopLeftNav } from "@/components/team/DesktopLeftNav";
import { DesktopRightSidebar } from "@/components/team/DesktopRightSidebar";
import { FeedFiltersBar, SortFilter } from "@/components/social/FeedFiltersBar";

function TeamContentV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    acceptInvitation,
  } = useGameInvitations();

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllGamesModal, setShowAllGamesModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showRoomChatsPanel, setShowRoomChatsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("my-trivia");
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [playingQuiz, setPlayingQuiz] = useState<SamplePost | null>(null);
  const [showAllFriendsModal, setShowAllFriendsModal] = useState(false);
  const [sortFilter, setSortFilter] = useState<SortFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { unreadCount } = useNotifications();
  const { totalUnread: unreadMessagesCount } = useUnreadRoomMessages();

  // Handle join code from URL
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode && user && phase === "idle") {
      enterRoom(joinCode);
    }
  }, [searchParams, user, phase, enterRoom]);

  // Handle accepting invitation
  const handleAcceptInvitation = async (invitationId: string) => {
    return await acceptInvitation(invitationId);
  };

  // Handle joining room from invitation
  const handleJoinFromInvitation = (roomCode: string) => {
    enterRoom(roomCode);
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

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop Left Navigation - Instagram style */}
      <DesktopLeftNav 
        onNotificationsClick={() => setShowNotificationsPanel(true)}
        onMessagesClick={() => setShowRoomChatsPanel(true)}
        onCreateClick={() => setShowCreateModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative pb-24 lg:pb-0 bg-background">
        {/* Mobile Sticky Section: Header + Tabs + Create Buttons */}
        <div className="lg:hidden sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/50">
          {/* Header Row */}
          <div className="flex items-center justify-between px-4 h-14 safe-top">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <span className="text-lg font-bold text-foreground tracking-tight">
                MyTrivia
              </span>
              <LiveBadge />
            </motion.div>

            <div className="flex items-center gap-2">
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setShowNotificationsPanel(true)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-card text-foreground shadow-sm"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-destructive rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </motion.button>

              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                onClick={() => setShowRoomChatsPanel(true)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-card text-foreground shadow-sm"
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

          {/* Tabs Row */}
          <div className="px-4 py-2">
            <div className="flex gap-1.5 p-1.5 bg-muted rounded-2xl shadow-inner">
              <button
                onClick={() => setActiveTab("for-me")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === "for-me"
                    ? "bg-background text-foreground shadow-[0_3px_0_0_hsl(var(--border)),0_4px_8px_-2px_rgba(0,0,0,0.1)]"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                შენთვის
              </button>
              <button
                onClick={() => setActiveTab("my-trivia")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === "my-trivia"
                    ? "bg-background text-foreground shadow-[0_3px_0_0_hsl(var(--border)),0_4px_8px_-2px_rgba(0,0,0,0.1)]"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                ჩემი ტრივია
              </button>
            </div>
          </div>

          {/* Create Button - Single CTA */}
          {activeTab === "my-trivia" && (
            <div className="px-4 pb-2">
              <ChunkyButton 
                onClick={() => setShowCreateQuizModal(true)}
                className="w-full gap-2"
                variant="primary"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                შექმენი ტრივია
              </ChunkyButton>
            </div>
          )}

          {/* Filter & Search Bar - Only show on "For You" tab in sticky header */}
          {activeTab === "for-me" && (
            <FeedFiltersBar
              sortFilter={sortFilter}
              onSortFilterChange={setSortFilter}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          )}

        </div>

        {/* Content - Centered on tablet/desktop like Instagram */}
        <div className="relative flex flex-col lg:max-w-[756px] xl:max-w-[630px] lg:mx-auto lg:border-x lg:border-border/40 bg-background">
          {activeTab === "my-trivia" ? (
            <>
              {/* Friends Stories Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3"
              >
                <FriendsStoriesBar
                  onAddFriendClick={() => setShowAddFriendModal(true)}
                  onFriendClick={() => {}}
                  onShowAllFriends={() => setShowAllFriendsModal(true)}
                />
              </motion.div>

              {/* My Rooms Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="px-4 mb-3"
              >
                <MyRoomsSection 
                  hideTV 
                  onCreateRoom={() => setShowCreateModal(true)}
                  onShowAllRooms={() => setShowAllGamesModal(true)}
                />
              </motion.div>

              {/* Filter & Search Bar - Below rooms for my-trivia tab */}
              <FeedFiltersBar
                sortFilter={sortFilter}
                onSortFilterChange={setSortFilter}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />

              <div className="px-4">
                <MyTriviaTab 
                  onCreateQuiz={() => setShowCreateQuizModal(true)} 
                  onCreateCollection={() => setShowCreateCollectionModal(true)}
                  searchQuery={searchQuery}
                />
              </div>
            </>
          ) : (
            <SocialFeed 
              onPlayQuiz={(post) => setPlayingQuiz(post)}
              sortFilter={sortFilter}
              searchQuery={searchQuery}
            />
          )}
        </div>

        {/* Bottom Navigation - Mobile only (hidden on tablet/desktop) */}
        {!showCreateModal && (
          <div className="lg:hidden">
            <UniversalBottomNav 
              onTeamPlayClick={() => {
                playSound("button-click");
                setShowCreateModal(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Desktop Right Sidebar - Instagram style */}
      <DesktopRightSidebar onAddFriendClick={() => setShowAddFriendModal(true)} />

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRoomPage onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
      
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
      <CreateQuizModal
        open={showCreateQuizModal}
        onOpenChange={setShowCreateQuizModal}
        onQuizCreated={() => setActiveTab("my-trivia")}
      />
      <CreateCollectionModal
        open={showCreateCollectionModal}
        onOpenChange={setShowCreateCollectionModal}
        onCollectionCreated={() => setActiveTab("my-trivia")}
      />
      <QuizPlayModal
        open={!!playingQuiz}
        onOpenChange={(open) => !open && setPlayingQuiz(null)}
        post={playingQuiz}
      />
      <AllFriendsModal
        isOpen={showAllFriendsModal}
        onClose={() => setShowAllFriendsModal(false)}
        onAddFriendClick={() => {
          setShowAllFriendsModal(false);
          setShowAddFriendModal(true);
        }}
      />
    </div>
  );
}

export default function TeamV2() {
  return (
    <MultiplayerProviderV2>
      <TeamContentV2 />
    </MultiplayerProviderV2>
  );
}
