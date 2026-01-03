import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, Users, ArrowLeft, Check, Edit2, Crown, MessageCircle, Send, X, Gamepad2, Trash2, Play } from "lucide-react";
import { useMultiplayerV2, getShareLink } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useRoomMatchHistory } from "@/hooks/useRoomMatchHistory";
import { Input } from "@/components/ui/input";
import { RoomScoreboard } from "./RoomScoreboard";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";

export function RoomLobbyV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSound } = useSound();
  const { 
    currentRoom, 
    participants, 
    isHost, 
    exitRoom,
    leaveRoomPermanently,
    deleteRoom,
    startGame,
    loading,
  } = useMultiplayerV2();
  
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const prevParticipantsRef = useRef<string[]>([]);

  const { messages, sendMessage } = useRoomChat(currentRoom?.id || null);
  const { matches } = useRoomMatchHistory(currentRoom?.id || null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Play sound when new participant joins
  useEffect(() => {
    const currentIds = participants.map(p => p.user_id);
    const prevIds = prevParticipantsRef.current;
    
    if (prevIds.length > 0) {
      const newParticipants = currentIds.filter(id => !prevIds.includes(id));
      if (newParticipants.length > 0 && newParticipants[0] !== user?.id) {
        playSound("room-join");
        toast.success("New player joined!");
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
    if (currentRoom) {
      setEditedName(currentRoom.room_name || "");
    }
  }, [currentRoom]);

  const handleCopyLink = async () => {
    if (!currentRoom) return;
    
    try {
      const link = getShareLink(currentRoom.room_code);
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (!currentRoom) return;
    
    const link = getShareLink(currentRoom.room_code);
    const shareData = {
      title: "WorldQuizzes - Join my game!",
      text: `Join my trivia game! Code: ${currentRoom.room_code}`,
      url: link,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Failed to share");
      }
    }
  };

  const handleExitRoom = () => {
    exitRoom();
    navigate("/team");
  };

  const handleLeaveConfirm = () => {
    setShowLeaveConfirm(true);
  };

  const handleLeavePermanently = async () => {
    await leaveRoomPermanently();
    navigate("/team");
  };

  const handleDeleteRoom = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this room?");
    if (confirmed) {
      await deleteRoom();
      navigate("/team");
    }
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    playSound("button-click");
    await startGame();
    setIsStarting(false);
  };

  const getCategoryVideo = () => {
    if (!currentRoom?.category_id) return null;
    const categorySlug = currentRoom.category_id.toLowerCase().replace(/-/g, "_");
    return CATEGORY_VIDEOS[categorySlug] || null;
  };

  const categoryVideo = getCategoryVideo();

  const handleSaveRoomName = async () => {
    if (!currentRoom || !editedName.trim()) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ room_name: editedName.trim() })
        .eq("id", currentRoom.id);
      
      toast.success("Name updated!");
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating room name:", error);
      toast.error("Failed to update name");
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const success = await sendMessage(chatMessage);
    if (success) {
      setChatMessage("");
    }
  };

  if (!currentRoom) return null;

  const canStartGame = participants.length >= (currentRoom.min_players || 2);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <motion.button
            onClick={handleExitRoom}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-card border border-border"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </motion.button>

          <div className="flex items-center gap-2">
            {/* Chat toggle */}
            <motion.button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl relative border ${
                showChat ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle className={`w-4 h-4 ${showChat ? "text-primary-foreground" : "text-muted-foreground"}`} />
              {messages.length > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {messages.length}
                </span>
              )}
            </motion.button>

            {/* Delete room button for host */}
            {isHost && (
              <motion.button
                onClick={handleDeleteRoom}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </motion.button>
            )}

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{participants.length}/{currentRoom.max_players}</span>
            </div>
          </div>
        </div>

        {/* Category with video circle */}
        {currentRoom.category_name && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 mb-4"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/30 bg-card relative">
              {categoryVideo ? (
                <PingPongVideo 
                  src={categoryVideo} 
                  className="w-full h-full object-cover scale-125" 
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 text-primary/50" />
                </div>
              )}
            </div>
            <span className="text-lg font-bold text-primary">{currentRoom.category_name}</span>
          </motion.div>
        )}

        {/* Room Name */}
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
                placeholder="Room name"
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
              <h2 className="text-2xl font-bold text-foreground">
                {currentRoom.room_name || `Room #${currentRoom.room_code.slice(-4)}`}
              </h2>
              {isHost && (
                <motion.button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* Copy/Share Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            icon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          >
            Copy Link
          </ChunkyButton>
          
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={handleShare}
            icon={<Share2 className="w-4 h-4" />}
          >
            Share
          </ChunkyButton>
        </motion.div>

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 180 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 rounded-2xl overflow-hidden bg-card border border-border"
            >
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      No messages yet
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${
                          msg.user_id === user?.id ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {msg.avatar_url ? (
                            <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                              {msg.nickname?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div
                          className={`max-w-[70%] px-3 py-1.5 rounded-2xl text-sm ${
                            msg.user_id === user?.id
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted text-foreground rounded-tl-sm"
                          }`}
                        >
                          {msg.user_id !== user?.id && (
                            <p className="text-[10px] font-medium text-primary mb-0.5">{msg.nickname}</p>
                          )}
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t border-border flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
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

        {/* Scoreboard */}
        <div className="flex-1 max-w-md mx-auto w-full">
          <RoomScoreboard
            participants={participants as any}
            matches={matches}
            currentUserId={user?.id}
          />

          {/* Participants row */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {participants.map((p) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <SmartAvatar
                  avatarUrl={p.avatar_url}
                  fallback={p.nickname}
                  size="lg"
                />
                {p.is_host && (
                  <Crown className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-amber-500 fill-amber-400" />
                )}
              </motion.div>
            ))}
            
            {/* Empty slots */}
            {participants.length < (currentRoom.min_players || 2) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground">+?</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom Action Area */}
        <div className="mt-auto pt-4 pb-6 space-y-3">
          {/* Start Game Button (Host only) */}
          {isHost && (
            <ChunkyButton
              variant="primary"
              size="xl"
              className="w-full"
              onClick={handleStartGame}
              disabled={!canStartGame || isStarting || loading}
              icon={<Play className="w-5 h-5" />}
            >
              {isStarting ? "Starting..." : canStartGame ? "Start Game" : `Waiting for ${(currentRoom.min_players || 2) - participants.length} more`}
            </ChunkyButton>
          )}
          
          {/* Waiting message for non-host */}
          {!isHost && (
            <div className="text-center py-4">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-muted-foreground"
              >
                Waiting for host to start the game...
              </motion.div>
            </div>
          )}

          {/* Leave Room Button */}
          <ChunkyButton
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleLeaveConfirm}
          >
            Leave Room
          </ChunkyButton>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-2">Leave Room?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                You can exit now and come back later, or leave permanently.
              </p>
              <div className="space-y-2">
                <ChunkyButton
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={handleExitRoom}
                >
                  Exit (Stay in room)
                </ChunkyButton>
                <ChunkyButton
                  variant="danger"
                  size="md"
                  className="w-full"
                  onClick={handleLeavePermanently}
                >
                  Leave Permanently
                </ChunkyButton>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full py-2 text-muted-foreground text-sm hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
