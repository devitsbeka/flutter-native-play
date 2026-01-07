import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Bell, MessageCircle, Clock, HelpCircle, ArrowLeft } from "lucide-react";
import { useMultiplayer, MultiplayerProvider } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CreateRoomPage } from "@/components/team/CreateRoomPage";
import { JoinRoomModal } from "@/components/team/JoinRoomModal";
import { RoomLobby } from "@/components/team/RoomLobby";
import { MultiplayerGameScreen } from "@/components/team/MultiplayerGameScreen";
import { MultiplayerResultScreen } from "@/components/team/MultiplayerResultScreen";
import { WaitingForOpponentScreen } from "@/components/team/WaitingForOpponentScreen";
import { AsyncResultScreen } from "@/components/team/AsyncResultScreen";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MyRoomsSection } from "@/components/team/MyRoomsSection";
import { AddFriendModal } from "@/components/team/AddFriendModal";
import { ChatModal } from "@/components/team/ChatModal";
import { GameInviteModal } from "@/components/team/GameInviteModal";
import { QuickPlayModal } from "@/components/team/QuickPlayModal";
import { HelpModal } from "@/components/team/HelpModal";
import { AllRecentRoomsModal } from "@/components/team/AllRecentRoomsModal";
import { NotificationsPanel } from "@/components/home/NotificationsPanel";
import { RoomChatsPanel } from "@/components/team/RoomChatsPanel";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { Friend } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { PendingChallenge } from "@/hooks/usePendingChallenges";
import { Category } from "@/data/categories";
import { LiveBadge } from "@/components/social/LiveBadge";
import { SocialFeed } from "@/components/social/SocialFeed";
import { MyTriviaTab } from "@/components/social/MyTriviaTab";
import { CreateQuizModal } from "@/components/social/CreateQuizModal";
import { QuizPlayModal } from "@/components/social/QuizPlayModal";
import { SamplePost } from "@/data/samplePosts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

function TeamContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { 
    phase, 
    room,
    myScore,
    asyncChallengerInfo,
    asyncOpponentCompleted,
    showCreateModal, 
    setShowCreateModal, 
    showJoinModal, 
    setShowJoinModal,
    joinRoom,
    createChallengeRoom,
  } = useMultiplayer();
  const { playSound } = useSound();
  const { 
    pendingInvitations, 
    acceptInvitation, 
    declineInvitation,
    sendInvitation,
  } = useGameInvitations();

  const { unreadCount } = useNotifications();
  const { totalUnread: unreadMessagesCount } = useUnreadRoomMessages();

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllGamesModal, setShowAllGamesModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showRoomChatsPanel, setShowRoomChatsPanel] = useState(false);
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [quickPlayFriend, setQuickPlayFriend] = useState<Friend | null>(null);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [currentInvitation, setCurrentInvitation] = useState<typeof pendingInvitations[0] | null>(null);
  const [activeTab, setActiveTab] = useState("for-me");
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [playingQuiz, setPlayingQuiz] = useState<SamplePost | null>(null);

  // Show latest pending invitation
  useEffect(() => {
    if (pendingInvitations.length > 0 && !currentInvitation) {
      setCurrentInvitation(pendingInvitations[0]);
    }
  }, [pendingInvitations, currentInvitation]);

  // Handle join code from URL
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode && user) {
      joinRoom(joinCode);
    }
  }, [searchParams, user, joinRoom]);

  // Handle quick play with friend
  const handleQuickPlay = (friend: Friend) => {
    playSound("button-click");
    setQuickPlayFriend(friend);
  };

  // Handle starting a challenge
  const handleStartChallenge = async (friend: Friend, category: Category) => {
    setIsCreatingChallenge(true);
    try {
      const success = await createChallengeRoom(friend.friendId, category.id, category.name, friend.isOnline || false);
      if (success) {
        setQuickPlayFriend(null);
        if (friend.isOnline && room) {
          await sendInvitation(friend.friendId, room.id);
        }
      }
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  // Handle accepting a pending challenge
  const handleAcceptChallenge = async (challenge: PendingChallenge) => {
    playSound("button-click");
    await joinRoom(challenge.roomCode);
  };

  // Handle accepting invitation
  const handleAcceptInvitation = async (invitationId: string) => {
    setCurrentInvitation(null);
    return await acceptInvitation(invitationId);
  };

  // Handle declining invitation
  const handleDeclineInvitation = async (invitationId: string) => {
    setCurrentInvitation(null);
    return await declineInvitation(invitationId);
  };

  // Handle joining room from invitation
  const handleJoinFromInvitation = (roomCode: string) => {
    joinRoom(roomCode);
  };

  // Show game screens based on phase
  if (phase === "playing" || phase === "question-result") {
    return <MultiplayerGameScreen />;
  }

  if (phase === "waiting-for-opponent") {
    return <WaitingForOpponentScreen />;
  }

  if (phase === "match-result") {
    return <MultiplayerResultScreen />;
  }

  if (phase === "async-result") {
    const isChallenger = room?.host_user_id === user?.id;
    const opponentUserId = isChallenger ? room?.challenged_user_id : room?.host_user_id;
    return (
      <AsyncResultScreen
        challengerInfo={asyncChallengerInfo || undefined}
        myScore={myScore}
        isChallenger={isChallenger}
        opponentCompleted={asyncOpponentCompleted}
        roomCategoryId={room?.category_id || undefined}
        roomCategoryName={room?.category_name || undefined}
        opponentUserId={opponentUserId || undefined}
      />
    );
  }

  if (phase === "lobby" || phase === "countdown") {
    return <RoomLobby />;
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
            onFriendClick={handleQuickPlay}
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
            className="w-full gap-2"
            variant="secondary"
          >
            <Plus className="w-5 h-5" />
            + ახალი ოთახი
          </ChunkyButton>
        </div>

        {/* Tabs: For Me / My Trivia */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-4 mb-4">
            <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
              <button
                onClick={() => setActiveTab("for-me")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === "for-me"
                    ? "bg-background text-foreground shadow-[0_4px_0_0_hsl(var(--border)),inset_0_1px_0_0_rgba(255,255,255,0.1)] translate-y-0"
                    : "bg-muted text-muted-foreground shadow-[0_4px_0_0_hsl(var(--border)/0.5)] hover:translate-y-[-1px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                შენთვის
              </button>
              <button
                onClick={() => setActiveTab("my-trivia")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === "my-trivia"
                    ? "bg-background text-foreground shadow-[0_4px_0_0_hsl(var(--border)),inset_0_1px_0_0_rgba(255,255,255,0.1)] translate-y-0"
                    : "bg-muted text-muted-foreground shadow-[0_4px_0_0_hsl(var(--border)/0.5)] hover:translate-y-[-1px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                ჩემი ტრივია
              </button>
            </div>
          </div>

          <TabsContent value="for-me" className="mt-0">
            <SocialFeed onPlayQuiz={(post) => setPlayingQuiz(post)} />
          </TabsContent>

          <TabsContent value="my-trivia" className="mt-0 px-4">
            <MyTriviaTab onCreateQuiz={() => setShowCreateQuizModal(true)} />
          </TabsContent>
        </Tabs>

        {/* How it works button */}
        <div className="px-4 py-6">
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            How it works
          </button>
        </div>
      </div>

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
      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />
      <ChatModal
        isOpen={!!chatFriend}
        onClose={() => setChatFriend(null)}
        friend={chatFriend}
      />
      <GameInviteModal
        invitation={currentInvitation}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        onJoinRoom={handleJoinFromInvitation}
      />
      <QuickPlayModal
        isOpen={!!quickPlayFriend}
        onClose={() => setQuickPlayFriend(null)}
        friend={quickPlayFriend}
        onStartChallenge={handleStartChallenge}
        isLoading={isCreatingChallenge}
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

export default function Team() {
  return (
    <MultiplayerProvider>
      <TeamContent />
    </MultiplayerProvider>
  );
}
