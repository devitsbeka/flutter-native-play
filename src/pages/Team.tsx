import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, KeyRound, Users, Gamepad2 } from "lucide-react";
import { useMultiplayer, MultiplayerProvider } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { CreateRoomModal } from "@/components/team/CreateRoomModal";
import { JoinRoomModal } from "@/components/team/JoinRoomModal";
import { RoomLobby } from "@/components/team/RoomLobby";
import { MultiplayerGameScreen } from "@/components/team/MultiplayerGameScreen";
import { MultiplayerResultScreen } from "@/components/team/MultiplayerResultScreen";
import { ChunkyButton } from "@/components/ui/chunky-button";

function TeamContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { 
    phase, 
    showCreateModal, 
    setShowCreateModal, 
    showJoinModal, 
    setShowJoinModal,
    joinRoom,
  } = useMultiplayer();

  // Handle join code from URL
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode && user) {
      joinRoom(joinCode);
    }
  }, [searchParams, user, joinRoom]);

  // Show game screen if playing
  if (phase === "playing" || phase === "question-result") {
    return <MultiplayerGameScreen />;
  }

  // Show result screen
  if (phase === "match-result") {
    return <MultiplayerResultScreen />;
  }

  // Show lobby if in room

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(180deg, hsl(260 70% 65%) 0%, hsl(280 60% 55%) 50%, hsl(300 50% 45%) 100%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col px-6 py-8">
        {/* Header */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">უკან</span>
        </motion.button>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
            style={{
              background: "linear-gradient(135deg, hsl(280 70% 60%) 0%, hsl(320 70% 50%) 100%)",
              boxShadow: "0 12px 40px rgba(168, 85, 247, 0.4)"
            }}
          >
            <Gamepad2 className="w-14 h-14 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl font-bold text-white mb-3 text-center"
          >
            მულტიპლეიერი
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80 text-center mb-8"
          >
            შექმენი ოთახი ან შეუერთდი მეგობარს
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full space-y-3"
          >
            <ChunkyButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setShowCreateModal(true)}
              icon={<Plus className="w-5 h-5" />}
            >
              ოთახის შექმნა
            </ChunkyButton>

            <ChunkyButton
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => setShowJoinModal(true)}
              icon={<KeyRound className="w-5 h-5" />}
            >
              კოდით შესვლა
            </ChunkyButton>
          </motion.div>
        </div>
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
