import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { MultiplayerProviderV2, useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { CreateRoomPage } from "@/components/team/CreateRoomPage";
import { JoinRoomModal } from "@/components/team/JoinRoomModal";
import { RoomLobbyV2 } from "@/components/team/RoomLobbyV2";
import { MultiplayerGameScreenV2 } from "@/components/team/MultiplayerGameScreenV2";
import { GameResultsScreenV2 } from "@/components/team/GameResultsScreenV2";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MyRoomsSection } from "@/components/team/MyRoomsSection";
import { GameHistoryTable } from "@/components/team/GameHistoryTable";
import { AddFriendModal } from "@/components/team/AddFriendModal";
import { HelpModal } from "@/components/team/HelpModal";
import { AllRecentRoomsModal } from "@/components/team/AllRecentRoomsModal";
import { GameInvitationsSection } from "@/components/team/GameInvitationsSection";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { PageHeader } from "@/components/shared/PageHeader";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { useGameInvitations } from "@/hooks/useGameInvitations";

function TeamContentV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
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
          <h1 className="font-display text-2xl text-slate-800 mb-3">Multiplayer</h1>
          <p className="text-slate-600 text-center mb-6">Sign in to play with friends</p>
          <ChunkyButton variant="secondary" onClick={() => navigate("/auth")}>
            Sign In
          </ChunkyButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-24">
      {/* Header */}
      <PageHeader
        title="ონლაინ თამაში"
        showBack={true}
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

        {/* Friends Stories Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <FriendsStoriesBar
            onAddFriendClick={() => setShowAddFriendModal(true)}
            onFriendClick={() => {}}
          />
        </motion.div>

        {/* My Rooms Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <MyRoomsSection
            onCreateRoom={() => {
              playSound("button-click");
              setShowCreateModal(true);
            }}
          />
        </motion.div>

        {/* Game Invitations Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="mb-6"
        >
          <GameInvitationsSection 
            onAcceptInvitation={handleAcceptInvitation}
            onJoinRoom={handleJoinFromInvitation}
          />
        </motion.div>

        {/* Game History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mb-6"
        >
          <GameHistoryTable onViewAll={() => setShowAllGamesModal(true)} />
        </motion.div>
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
