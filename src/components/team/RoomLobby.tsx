import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, Users, LogOut, Check, Edit2, Crown, Send, X, Gamepad2, Trash2 } from "lucide-react";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useRoomMatchHistory } from "@/hooks/useRoomMatchHistory";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { Input } from "@/components/ui/input";
import { RoomScoreboard } from "./RoomScoreboard";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";

export function RoomLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSound } = useSound();
  const { 
    room, 
    participants, 
    isHost, 
    leaveRoom, 
    startGame,
    loading,
    phase,
  } = useMultiplayer();
  
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const prevParticipantsRef = useRef<string[]>([]);

  const { matches } = useRoomMatchHistory(room?.id || null);
  const { sendInvitation } = useGameInvitations();
  

  const otherParticipants = participants.filter(p => p.user_id !== user?.id);

  // Play sound when new participant joins
  useEffect(() => {
    const currentIds = participants.map(p => p.user_id);
    const prevIds = prevParticipantsRef.current;
    
    if (prevIds.length > 0) {
      const newParticipants = currentIds.filter(id => !prevIds.includes(id));
      if (newParticipants.length > 0 && newParticipants[0] !== user?.id) {
        playSound("room-join");
      }
    }
    
    prevParticipantsRef.current = currentIds;
  }, [participants, user?.id, playSound]);

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
      title: "MyTrivia - მოწვევა",
      text: `შემოგვიერთდი ტრივია ბრძოლაში!`,
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

  const handleLeave = async () => {
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

  const handleStartGame = async () => {
    await startGame();
  };

  const handleDeleteRoom = async () => {
    if (!room || !isHost) return;
    
    const confirmed = window.confirm("დარწმუნებული ხარ რომ გინდა ოთახის წაშლა?");
    if (!confirmed) return;
    
    try {
      await supabase
        .from("game_rooms")
        .delete()
        .eq("id", room.id);
      
      toast.success("ოთახი წაიშალა!");
      navigate("/team");
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("ოთახის წაშლა ვერ მოხერხდა");
    }
  };

  // Get category video URL
  const getCategoryVideo = () => {
    if (!room?.category_id) return null;
    const categorySlug = room.category_id.toLowerCase().replace(/-/g, "_");
    return CATEGORY_VIDEOS[categorySlug] || null;
  };

  const categoryVideo = getCategoryVideo();

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

  const handleResendInvitation = async (userId: string) => {
    if (!room) return;
    const success = await sendInvitation(userId, room.id, true);
    if (success) {
      toast.success("მოწვევა თავიდან გაიგზავნა!");
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!room || !isHost) return;
    
    try {
      const participant = participants.find(p => p.id === participantId);
      
      // Delete from room_participants
      await supabase
        .from("room_participants")
        .delete()
        .eq("id", participantId);
      
      // Cancel any pending invitations
      if (participant) {
        await supabase
          .from("game_invitations")
          .update({ status: "expired" })
          .eq("receiver_id", participant.user_id)
          .eq("room_id", room.id)
          .eq("status", "pending");
      }
      
      toast.success(t("extra.playerRemovedFromRoom"));
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error(t("extra.removeFailed"));
    }
  };

  if (!room) return null;

  // Show countdown if in countdown phase
  if (phase === "countdown") {
    return <CountdownOverlay />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <motion.button
            onClick={handleLeave}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-card border border-border"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
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
              {unreadMessageCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessageCount}
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
              <span className="text-sm font-medium text-foreground">{participants.length}/{room.max_players}</span>
            </div>
          </div>
        </div>

        {/* Category with video circle */}
        {room.category_name && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 mb-4"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/30 bg-card">
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
            <span className="text-lg font-bold text-primary">{room.category_name}</span>
          </motion.div>
        )}

        {/* Room Name with Icon */}
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
                placeholder={t("extra.roomNamePlaceholder")}
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
              {room.room_icon && (
                <img 
                  src={room.room_icon} 
                  alt="" 
                  className="w-8 h-8 object-contain"
                />
              )}
              <h2 className="text-2xl font-bold text-foreground">
                {room.room_name || t("extra.roomDefaultName", { code: room.room_code.slice(-4) })}
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

        {/* Copy/Share Buttons - 3D Chunky Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={handleCopyCode}
            icon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          >
            {t("extra.linkBtn")}
          </ChunkyButton>
          
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={handleShare}
            icon={<Share2 className="w-4 h-4" />}
          >
            {t("extra.lobbyShareBtn")}
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
                      {t("extra.lobbyNoMessages")}
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
                            <img src={resolveAvatarUrl(msg.avatar_url) || msg.avatar_url} alt="" className="w-full h-full object-cover" />
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
                    placeholder={t("extra.lobbyWriteMessage")}
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

        {/* BIG SCOREBOARD */}
        <div className="flex-1 max-w-md mx-auto w-full">
          <RoomScoreboard
            participants={participants}
            matches={matches}
            currentUserId={user?.id}
            isHost={isHost}
            onResendInvitation={handleResendInvitation}
            onRemoveParticipant={handleRemoveParticipant}
          />

          {/* Participants row */}
          <div className="mt-4 flex items-center justify-center gap-2">
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
            {participants.length < (room.min_players || 2) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
              >
                <span className="text-muted-foreground text-lg">?</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom Actions - SINGLE PLAY BUTTON */}
        <div className="max-w-md mx-auto w-full mt-6 space-y-3">
          {isHost ? (
            <ChunkyButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartGame}
              disabled={loading}
              icon={<Gamepad2 className="w-5 h-5" />}
            >
              {loading ? t("extra.startingGame") : `🎮 ${t("extra.startRound")}`}
            </ChunkyButton>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">
                {t("extra.waitingForHostEllipsis")}
              </p>
            </div>
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
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-bold text-foreground">{t("extra.hostTransfer")}</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                {t("extra.hostTransferDesc")}
              </p>
              <div className="space-y-2 mb-4">
                {otherParticipants.map((p) => (
                  <motion.button
                    key={p.id}
                    onClick={() => handleTransferHost(p.user_id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/30 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <SmartAvatar
                      avatarUrl={p.avatar_url}
                      fallback={p.nickname}
                      size="sm"
                    />
                    <span className="font-medium text-foreground">{p.nickname}</span>
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
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)",
              transform: "scale(3)",
            }}
            animate={{ scale: [3, 4, 3], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          
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
