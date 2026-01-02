import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useMultiplayer, MultiplayerProvider } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { CreateRoomModal } from "@/components/team/CreateRoomModal";
import { JoinRoomModal } from "@/components/team/JoinRoomModal";
import { RoomLobby } from "@/components/team/RoomLobby";
import { MultiplayerGameScreen } from "@/components/team/MultiplayerGameScreen";
import { MultiplayerResultScreen } from "@/components/team/MultiplayerResultScreen";
import { WaitingForOpponentScreen } from "@/components/team/WaitingForOpponentScreen";
import { AsyncResultScreen } from "@/components/team/AsyncResultScreen";
import { FriendsList } from "@/components/team/FriendsList";
import { RecentPlayersList } from "@/components/team/RecentPlayersList";
import { RecentRoomsSection } from "@/components/team/RecentRoomsSection";
import { AddFriendModal } from "@/components/team/AddFriendModal";
import { ChatModal } from "@/components/team/ChatModal";
import { GameInviteModal } from "@/components/team/GameInviteModal";
import { QuickPlayModal } from "@/components/team/QuickPlayModal";
import { HelpModal } from "@/components/team/HelpModal";
import { AllRecentRoomsModal } from "@/components/team/AllRecentRoomsModal";
import { AllRecentPlayersModal } from "@/components/team/AllRecentPlayersModal";
import { PendingChallengesSection } from "@/components/team/PendingChallengesSection";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { PageHeader } from "@/components/shared/PageHeader";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { Friend } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { PendingChallenge } from "@/hooks/usePendingChallenges";
import { Category } from "@/data/categories";

function TeamContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
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

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllRoomsModal, setShowAllRoomsModal] = useState(false);
  const [showAllPlayersModal, setShowAllPlayersModal] = useState(false);
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [quickPlayFriend, setQuickPlayFriend] = useState<Friend | null>(null);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [currentInvitation, setCurrentInvitation] = useState<typeof pendingInvitations[0] | null>(null);

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

  // Handle quick play with friend (opens category picker)
  const handleQuickPlay = (friend: Friend) => {
    playSound("button-click");
    setQuickPlayFriend(friend);
  };

  // Handle starting a challenge from quick play modal
  const handleStartChallenge = async (friend: Friend, category: Category) => {
    setIsCreatingChallenge(true);
    try {
      const success = await createChallengeRoom(friend.friendId, category.id, category.name, friend.isOnline || false);
      if (success) {
        setQuickPlayFriend(null);
        // If friend is online, send real-time invitation as well
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

  // Show game screen if playing
  if (phase === "playing" || phase === "question-result") {
    return <MultiplayerGameScreen />;
  }

  // Show waiting screen if waiting for opponent
  if (phase === "waiting-for-opponent") {
    return <WaitingForOpponentScreen />;
  }

  // Show result screen
  if (phase === "match-result") {
    return <MultiplayerResultScreen />;
  }

  // Show async result screen
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

  // Show lobby if in room
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
          <h1 className="font-display text-2xl text-slate-800 mb-3">მულტიპლეიერი</h1>
          <p className="text-slate-600 text-center mb-6">შედი ანგარიშზე მეგობრებთან სათამაშოდ</p>
          <ChunkyButton variant="secondary" onClick={() => navigate("/auth")}>
            შესვლა
          </ChunkyButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-24">
      {/* Header */}
      <PageHeader
        title="მეგობრები"
        showBack={false}
        rightElements={
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 text-lg font-bold shadow-sm hover:bg-white transition-colors"
          >
            ?
          </button>
        }
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col px-4 pb-6">

        {/* Create Game Button - Right after header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="p-3 rounded-2xl bg-white/90 backdrop-blur-lg border border-slate-200 shadow-lg">
            <ChunkyButton
              variant="success"
              size="lg"
              className="w-full"
              onClick={() => {
                playSound("button-click");
                setShowCreateModal(true);
              }}
            >
              + თამაშის შექმნა
            </ChunkyButton>
          </div>
        </motion.div>

        {/* Friends Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <FriendsList
            onAddFriendClick={() => setShowAddFriendModal(true)}
            onQuickPlay={handleQuickPlay}
            onStartChat={(friend) => setChatFriend(friend)}
          />
        </motion.div>

        {/* Recent Rooms Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-6"
        >
          <RecentRoomsSection onViewAll={() => setShowAllRoomsModal(true)} />
        </motion.div>

        {/* Pending Challenges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mb-6"
        >
          <PendingChallengesSection onAcceptChallenge={handleAcceptChallenge} />
        </motion.div>

        {/* Recent Players Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mb-6"
        >
          <RecentPlayersList onViewAll={() => setShowAllPlayersModal(true)} />
        </motion.div>
      </div>

      {/* Modals */}
      <CreateRoomModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
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
        isOpen={showAllRoomsModal}
        onClose={() => setShowAllRoomsModal(false)}
      />
      <AllRecentPlayersModal
        isOpen={showAllPlayersModal}
        onClose={() => setShowAllPlayersModal(false)}
      />

      {/* Bottom Navigation */}
      <UniversalBottomNav />
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
