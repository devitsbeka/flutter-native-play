import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Bell, MessageCircle, Clock, ArrowLeft } from "lucide-react";
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
import { AddFriendModal } from "@/components/team/AddFriendModal";
import { HelpModal } from "@/components/team/HelpModal";
import { AllRecentRoomsModal } from "@/components/team/AllRecentRoomsModal";
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
import { QuizPlayModal } from "@/components/social/QuizPlayModal";
import { SamplePost } from "@/data/samplePosts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("for-me");
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [playingQuiz, setPlayingQuiz] = useState<SamplePost | null>(null);

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
    <div className="min-h-screen relative overflow-hidden pb-24">
      {/* New Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80">
        <div className="flex items-center justify-between px-4 h-14 safe-top">
          {/* Left Side: Back + History */}
          <div className="flex items-center gap-2">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-card text-foreground shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => setShowAllGamesModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-card text-foreground shadow-sm"
            >
              <Clock className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Center: MyTrivia LIVE */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center"
          >
            <span className="text-lg font-bold text-foreground tracking-tight">
              MyTrivia
            </span>
            <LiveBadge />
          </motion.div>

          {/* Right Side: Notifications + Messages */}
          <div className="flex items-center gap-2">
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowNotificationsPanel(true)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-card text-foreground shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
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
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-col">
        {/* Friends Stories Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3"
        >
          <FriendsStoriesBar
            onAddFriendClick={() => setShowAddFriendModal(true)}
            onFriendClick={() => {}}
          />
        </motion.div>

        {/* My Rooms Section - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 mb-3"
        >
          <MyRoomsSection hideTV />
        </motion.div>

        {/* New Room Button */}
        <div className="px-4 mb-4">
          <ChunkyButton 
            onClick={() => setShowCreateModal(true)}
            className="w-full whitespace-nowrap flex-row"
            variant="primary"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>ახალი ოთახი</span>
          </ChunkyButton>
        </div>

        {/* Tabs: For Me / My Trivia */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-4 mb-2">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="for-me" className="text-sm font-semibold">
                For Me
              </TabsTrigger>
              <TabsTrigger value="my-trivia" className="text-sm font-semibold">
                My Trivia
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="for-me" className="mt-0">
            <SocialFeed onPlayQuiz={(post) => setPlayingQuiz(post)} />
          </TabsContent>

          <TabsContent value="my-trivia" className="mt-0 px-4">
            <MyTriviaTab onCreateQuiz={() => setShowCreateQuizModal(true)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Room Page (full screen) */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRoomPage onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
      
      <JoinRoomModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
      <AddFriendModal
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
      <QuizPlayModal
        open={!!playingQuiz}
        onOpenChange={(open) => !open && setPlayingQuiz(null)}
        post={playingQuiz}
      />

      {/* Bottom Navigation - hide when CreateRoomPage is open */}
      {!showCreateModal && (
        <UniversalBottomNav 
          onTeamPlayClick={() => {
            playSound("button-click");
            setShowCreateModal(true);
          }}
        />
      )}
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
