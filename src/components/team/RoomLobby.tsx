import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Share2, Users, Play, LogOut, Check, Loader2, UserX, Edit2, Crown, MessageCircle, Send, X } from "lucide-react";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { ParticipantCard } from "./ParticipantCard";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoomChat } from "@/hooks/useRoomChat";
import { Input } from "@/components/ui/input";

export function RoomLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSound } = useSound();
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const prevParticipantsRef = useRef<string[]>([]);

  const { messages, sendMessage } = useRoomChat(room?.id || null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentParticipant = participants.find(p => p.user_id === user?.id);
  const isCurrentUserReady = currentParticipant?.status === "ready";
  const otherParticipants = participants.filter(p => p.user_id !== user?.id);

  // Play sound when new participant joins
  useEffect(() => {
    const currentIds = participants.map(p => p.user_id);
    const prevIds = prevParticipantsRef.current;
    
    // Check for new participants (excluding first load)
    if (prevIds.length > 0) {
      const newParticipants = currentIds.filter(id => !prevIds.includes(id));
      if (newParticipants.length > 0 && newParticipants[0] !== user?.id) {
        playSound("room-join");
      }
    }
    
    prevParticipantsRef.current = currentIds;
  }, [participants, user?.id, playSound]);

  // Play sound when new message arrives
  const prevMessagesCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current && prevMessagesCountRef.current > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.user_id !== user?.id) {
        playSound("room-message");
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, user?.id, playSound]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setIsReady(isCurrentUserReady);
  }, [isCurrentUserReady]);

  useEffect(() => {
    if (room) {
      setEditedName(room.room_name || "");
    }
  }, [room]);

  const handleCopyCode = async () => {
    if (!room) return;
    
    try {
      const fullLink = `${window.location.origin}/team?join=${room.room_code}`;
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      toast.success("ლინკი დაკოპირდა!");
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
    if (isHost) return;
    const newReady = !isReady;
    setIsReady(newReady);
    await setReady(newReady);
  };

  const handleLeave = async () => {
    // If host and there are other participants, show transfer modal
    if (isHost && otherParticipants.length > 0) {
      setShowTransferModal(true);
      return;
    }
    await leaveRoom();
    navigate("/team");
  };

  const handleTransferHost = async (newHostId: string) => {
    if (!room) return;
    
    try {
      // Transfer host in database
      await supabase
        .from("game_rooms")
        .update({ host_user_id: newHostId })
        .eq("id", room.id);
      
      await supabase
        .from("room_participants")
        .update({ is_host: false })
        .eq("room_id", room.id)
        .eq("user_id", user?.id);
        
      await supabase
        .from("room_participants")
        .update({ is_host: true })
        .eq("room_id", room.id)
        .eq("user_id", newHostId);
      
      toast.success("ჰოსტი გადაეცა!");
      setShowTransferModal(false);
      
      // Now leave
      await leaveRoom();
      navigate("/team");
    } catch (error) {
      console.error("Error transferring host:", error);
      toast.error("ჰოსტის გადაცემა ვერ მოხერხდა");
    }
  };

  const handleLeaveWithoutTransfer = async () => {
    setShowTransferModal(false);
    await leaveRoom();
    navigate("/team");
  };

  const handleStart = async () => {
    await startGame();
  };

  const handleStartSolo = async () => {
    await startGameSolo();
  };

  const handleSaveRoomName = async () => {
    if (!room || !editedName.trim()) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ room_name: editedName.trim() })
        .eq("id", room.id);
      
      toast.success("სახელი შეიცვალა!");
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating room name:", error);
      toast.error("სახელის შეცვლა ვერ მოხერხდა");
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const success = await sendMessage(chatMessage);
    if (success) {
      setChatMessage("");
    }
  };

  if (!room) return null;

  // Show countdown if in countdown phase
  if (phase === "countdown") {
    return <CountdownOverlay />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            onClick={handleLeave}
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4 text-gray-600" />
          </motion.button>

          <div className="flex items-center gap-2">
            {/* Chat toggle */}
            <motion.button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl relative ${
                showChat ? "bg-purple-500 text-white" : "bg-white/95"
              }`}
              style={{
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle className={`w-4 h-4 ${showChat ? "text-white" : "text-gray-600"}`} />
              {messages.length > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {messages.length}
                </span>
              )}
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
        </div>

        {/* Category */}
        {room.category_name && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto px-4 py-2 rounded-full mb-4"
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

        {/* Room Name (editable by host) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center"
        >
          {isEditingName ? (
            <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-center font-bold"
                placeholder="ოთახის სახელი"
                autoFocus
              />
              <ChunkyButton size="sm" variant="primary" onClick={handleSaveRoomName}>
                <Check className="w-4 h-4" />
              </ChunkyButton>
              <ChunkyButton size="sm" variant="secondary" onClick={() => setIsEditingName(false)}>
                <X className="w-4 h-4" />
              </ChunkyButton>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">
                {room.room_name || `ოთახი #${room.room_code.slice(-4)}`}
              </h2>
              {isHost && (
                <motion.button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* Copy/Share Link Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <motion.button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
            <span className="text-sm font-medium text-gray-700">ლინკის კოპირება</span>
          </motion.button>
          
          <motion.button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Share2 className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">გაზიარება</span>
          </motion.button>
        </motion.div>

        {/* Chat Panel (slide in) */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 200 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">
                      ჯერ შეტყობინება არ არის
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${
                          msg.user_id === user?.id ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {msg.avatar_url ? (
                            <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                              {msg.nickname?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div
                          className={`max-w-[70%] px-3 py-1.5 rounded-2xl text-sm ${
                            msg.user_id === user?.id
                              ? "bg-purple-500 text-white rounded-tr-sm"
                              : "bg-gray-100 text-gray-800 rounded-tl-sm"
                          }`}
                        >
                          {msg.user_id !== user?.id && (
                            <p className="text-[10px] font-medium text-purple-600 mb-0.5">{msg.nickname}</p>
                          )}
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t border-gray-100 flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="დაწერე შეტყობინება..."
                    className="flex-1 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <ChunkyButton size="sm" variant="primary" onClick={handleSendMessage}>
                    <Send className="w-4 h-4" />
                  </ChunkyButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        </div>
      </div>

      {/* Host Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-800">ჰოსტის გადაცემა</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                შენ ხარ ჰოსტი. გადაეცი ჰოსტის უფლება სხვა მოთამაშეს გასვლამდე:
              </p>
              <div className="space-y-2 mb-4">
                {otherParticipants.map((p) => (
                  <motion.button
                    key={p.id}
                    onClick={() => handleTransferHost(p.user_id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-bold">
                          {p.nickname?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-gray-800">{p.nickname}</span>
                    <Crown className="w-4 h-4 text-amber-500 ml-auto" />
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-2">
                <ChunkyButton
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowTransferModal(false)}
                >
                  გაუქმება
                </ChunkyButton>
                <ChunkyButton
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={handleLeaveWithoutTransfer}
                >
                  მაინც გასვლა
                </ChunkyButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
