import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, KeyRound, Users, DoorOpen } from "lucide-react";
import { useMultiplayer, MultiplayerProvider } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { CreateRoomModal } from "@/components/team/CreateRoomModal";
import { JoinRoomModal } from "@/components/team/JoinRoomModal";
import { RoomLobby } from "@/components/team/RoomLobby";
import { MultiplayerGameScreen } from "@/components/team/MultiplayerGameScreen";
import { MultiplayerResultScreen } from "@/components/team/MultiplayerResultScreen";
import { WaitingForOpponentScreen } from "@/components/team/WaitingForOpponentScreen";
import { FriendsList } from "@/components/team/FriendsList";
import { RecentPlayersList } from "@/components/team/RecentPlayersList";
import { AddFriendModal } from "@/components/team/AddFriendModal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";

function TeamContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { 
    phase, 
    room,
    showCreateModal, 
    setShowCreateModal, 
    showJoinModal, 
    setShowJoinModal,
    joinRoom,
  } = useMultiplayer();
  const { playSound } = useSound();

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  // Handle join code from URL
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode && user) {
      joinRoom(joinCode);
    }
  }, [searchParams, user, joinRoom]);

  // Handle inviting a friend (share room code)
  const handleInviteFriend = async (friendId: string) => {
    if (!room) {
      toast.info("შექმენი ოთახი მეგობრის მოსაწვევად");
      return;
    }
    
    // Copy room link to clipboard
    const roomLink = `${window.location.origin}/team?join=${room.room_code}`;
    try {
      await navigator.clipboard.writeText(roomLink);
      toast.success("ლინკი დაკოპირდა! გაუზიარე მეგობარს");
    } catch {
      toast.error("კოპირება ვერ მოხერხდა");
    }
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

  // Show lobby if in room
  if (phase === "lobby" || phase === "countdown") {
    return <RoomLobby />;
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div 
          className="fixed inset-0 z-0"
          style={{
            background: "linear-gradient(180deg, hsl(260 70% 65%) 0%, hsl(280 60% 55%) 50%, hsl(300 50% 45%) 100%)"
          }}
        />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6"
          >
            <Users className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="font-display text-2xl text-white mb-3">მულტიპლეიერი</h1>
          <p className="text-white/80 text-center mb-6">შედი ანგარიშზე მეგობრებთან სათამაშოდ</p>
          <ChunkyButton variant="secondary" onClick={() => navigate("/auth")}>
            შესვლა
          </ChunkyButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-24">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(180deg, hsl(260 70% 65%) 0%, hsl(280 60% 55%) 50%, hsl(300 50% 45%) 100%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">უკან</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-sm"
          >
            <DoorOpen className="w-5 h-5 text-white" />
            <span className="font-display text-white font-bold">ოთახები</span>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 mb-6"
        >
          <ChunkyButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              playSound("button-click");
              setShowCreateModal(true);
            }}
            icon={<Plus className="w-5 h-5" />}
          >
            შექმნა
          </ChunkyButton>

          <ChunkyButton
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => {
              playSound("button-click");
              setShowJoinModal(true);
            }}
            icon={<KeyRound className="w-5 h-5" />}
          >
            შესვლა
          </ChunkyButton>
        </motion.div>

        {/* Friends Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <FriendsList
            onAddFriendClick={() => setShowAddFriendModal(true)}
            onInviteFriend={handleInviteFriend}
            roomCode={room?.room_code}
          />

          {/* Recent Players Section */}
          <RecentPlayersList />
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
