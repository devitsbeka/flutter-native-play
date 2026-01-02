import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Share2, Users, Play, LogOut, Check, X, Loader2, UserX } from "lucide-react";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { ParticipantCard } from "./ParticipantCard";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";

export function RoomLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    room, 
    participants, 
    allReady, 
    isHost, 
    leaveRoom, 
    setReady, 
    startGame,
    startGameSolo,
    loading,
    phase,
  } = useMultiplayer();
  
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(isHost);

  const currentParticipant = participants.find(p => p.user_id === user?.id);
  const isCurrentUserReady = currentParticipant?.status === "ready";

  useEffect(() => {
    setIsReady(isCurrentUserReady);
  }, [isCurrentUserReady]);

  const handleCopyCode = async () => {
    if (!room) return;
    
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      toast.success("კოდი დაკოპირდა!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("კოპირება ვერ მოხერხდა");
    }
  };

  const handleShare = async () => {
    if (!room) return;
    
    const shareData = {
      title: "WorldQuizzes - მოწვევა",
      text: `შემოგვიერთდი ტრივია ბრძოლაში! კოდი: ${room.room_code}`,
      url: `${window.location.origin}/team?join=${room.room_code}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        toast.success("ლინკი დაკოპირდა!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("გაზიარება ვერ მოხერხდა");
      }
    }
  };

  const handleToggleReady = async () => {
    if (isHost) return; // Host is always ready
    const newReady = !isReady;
    setIsReady(newReady);
    await setReady(newReady);
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/team");
  };

  const handleStart = async () => {
    await startGame();
  };

  const handleStartSolo = async () => {
    await startGameSolo();
  };

  if (!room) return null;

  // Show countdown if in countdown phase
  if (phase === "countdown") {
    return <CountdownOverlay />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* No local background - uses GlobalSplineBackground */}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            onClick={handleLeave}
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">გასვლა</span>
          </motion.button>

          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <Users className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">{participants.length}/{room.max_players}</span>
          </div>
        </div>

        {/* Room Code - Single Line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-gray-600 text-sm mb-2 text-center font-medium">ოთახის კოდი</p>
          <div className="flex items-center justify-center gap-2">
            <motion.div
              className="px-4 py-2 rounded-xl"
              style={{
                background: "linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)",
                boxShadow: "0 4px 0 #7C3AED, 0 6px 16px rgba(139, 92, 246, 0.3)",
              }}
              animate={{ 
                boxShadow: ["0 4px 0 #7C3AED, 0 6px 20px rgba(139, 92, 246, 0.3)", "0 4px 0 #7C3AED, 0 6px 30px rgba(139, 92, 246, 0.5)", "0 4px 0 #7C3AED, 0 6px 20px rgba(139, 92, 246, 0.3)"]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="font-display text-2xl font-bold text-white tracking-[0.2em]">
                {room.room_code}
              </span>
            </motion.div>
            
            <motion.button
              onClick={handleCopyCode}
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
            </motion.button>
            
            <motion.button
              onClick={handleShare}
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="w-4 h-4 text-gray-600" />
            </motion.button>
          </div>
        </motion.div>

        {/* Category */}
        {room.category_name && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto px-4 py-2 rounded-full mb-6"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <span className="text-sm text-gray-700">
              კატეგორია: <strong className="text-purple-600">{room.category_name}</strong>
            </span>
          </motion.div>
        )}

        {/* Participants */}
        <div className="flex-1 max-w-md mx-auto w-full">
          <h3 className="text-gray-700 font-medium text-center mb-4">
            მოთამაშეები
          </h3>
          
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {participants.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  isCurrentUser={participant.user_id === user?.id}
                />
              ))}
            </AnimatePresence>

            {/* Empty slot */}
            {participants.length < room.max_players && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border-2 border-dashed border-gray-300 p-4 flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.6)",
                }}
              >
                <div className="text-center">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">ველოდებით მოთამაშეს...</p>
                  {isHost && participants.length < 2 && (
                    <p className="text-gray-400 text-xs mt-1">ან დაიწყე მარტო - მეგობარი მოგვიანებით ითამაშებს</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="max-w-md mx-auto w-full mt-6 space-y-3">
          {/* Ready button (for non-hosts) */}
          {!isHost && (
            <ChunkyButton
              variant={isReady ? "success" : "secondary"}
              size="lg"
              className="w-full"
              onClick={handleToggleReady}
              icon={isReady ? <Check className="w-5 h-5" /> : undefined}
            >
              {isReady ? "მზადაა" : "მზად ვარ"}
            </ChunkyButton>
          )}

          {/* Start button (for host) */}
          {isHost && (
            <>
              {/* Normal start when multiple players ready */}
              {participants.length >= 2 && allReady && (
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleStart}
                  disabled={loading}
                  icon={<Play className="w-5 h-5" />}
                >
                  {loading ? "იწყება..." : "დაწყება"}
                </ChunkyButton>
              )}
              
              {/* Start solo when alone - converts to async */}
              {participants.length < 2 && (
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleStartSolo}
                  disabled={loading}
                  icon={<UserX className="w-5 h-5" />}
                >
                  {loading ? "იწყება..." : "დაწყება მარტო"}
                </ChunkyButton>
              )}
              
              {/* Waiting state when multiple players but not all ready */}
              {participants.length >= 2 && !allReady && (
                <ChunkyButton
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  disabled
                  icon={<Loader2 className="w-5 h-5 animate-spin" />}
                >
                  ველოდებით მოთამაშეებს...
                </ChunkyButton>
              )}
            </>
          )}

          {/* Leave button */}
          <button
            onClick={handleLeave}
            className="w-full text-center text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            ოთახიდან გასვლა
          </button>
        </div>
      </div>
    </div>
  );
}

// Countdown overlay component
function CountdownOverlay() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative"
        >
          {/* Glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)",
              transform: "scale(3)",
            }}
            animate={{ scale: [3, 4, 3], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          
          {/* Number */}
          <span 
            className="font-display text-[120px] font-bold text-white"
            style={{ textShadow: "0 0 60px rgba(168,85,247,0.8)" }}
          >
            {count === 0 ? "GO!" : count}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
