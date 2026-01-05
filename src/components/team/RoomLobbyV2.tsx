import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, Users, ArrowLeft, Check, Edit2, Crown, MessageCircle, Send, X, Gamepad2, Trash2, Play, Tv } from "lucide-react";
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
import { TVSessionProvider, useTVSession } from "@/contexts/TVSessionContext";
import { TVEnterCodeModal } from "./TVEnterCodeModal";

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
  const [isStartingTV, setIsStartingTV] = useState(false);
  const [showTVModal, setShowTVModal] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const prevParticipantsRef = useRef<string[]>([]);

  const { messages, sendMessage } = useRoomChat(currentRoom?.id || null);
  const { matches } = useRoomMatchHistory(currentRoom?.id || null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Calculate unread count
  const unreadMessageCount = Math.max(0, messages.length - lastSeenMessageCount);
  
  // Mark messages as read when chat is opened
  useEffect(() => {
    if (showChat) {
      setLastSeenMessageCount(messages.length);
    }
  }, [showChat, messages.length]);

  // Play sound when new participant joins
  useEffect(() => {
    const currentIds = participants.map(p => p.user_id);
    const prevIds = prevParticipantsRef.current;
    
    if (prevIds.length > 0) {
      const newParticipants = currentIds.filter(id => !prevIds.includes(id));
      if (newParticipants.length > 0 && newParticipants[0] !== user?.id) {
        playSound("room-join");
        toast.success("ახალი მოთამაშე შემოუერთდა!");
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
      toast.success("ლინკი დაკოპირდა!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("კოპირება ვერ მოხერხდა");
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
        toast.success("ლინკი დაკოპირდა!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("გაზიარება ვერ მოხერხდა");
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
    const confirmed = window.confirm("დარწმუნებული ხარ, რომ გინდა ამ ოთახის წაშლა?");
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

  const handleStartTVMode = () => {
    if (!currentRoom) return;
    playSound("button-click");
    setShowTVModal(true);
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
      
      toast.success("სახელი განახლდა!");
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating room name:", error);
      toast.error("სახელის განახლება ვერ მოხერხდა");
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const success = await sendMessage(chatMessage);
    if (success) {
      setChatMessage("");
    }
  };

  const handleMentionPlayer = (nickname: string) => {
    setChatMessage((prev) => {
      if (!prev || prev.endsWith(' ')) {
        return `${prev}@${nickname} `;
      }
      return `${prev} @${nickname} `;
    });
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
            ლინკის კოპირება
          </ChunkyButton>
          
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={handleShare}
            icon={<Share2 className="w-4 h-4" />}
          >
            გაზიარება
          </ChunkyButton>
        </motion.div>

        {/* Full-Screen Chat Modal */}
        <AnimatePresence>
          {showChat && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
                onClick={() => setShowChat(false)}
              />

              {/* Chat Modal */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[60] bg-card flex flex-col"
              >
                {/* Header with title and close button */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="text-xl font-bold text-foreground truncate">
                    {currentRoom.room_name || `Room #${currentRoom.room_code.slice(-4)}`}
                  </h2>
                  <motion.button
                    onClick={() => setShowChat(false)}
                    className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </motion.button>
                </div>

                {/* Participants row - avatars only, scrollable, clickable for mentions */}
                <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto border-b border-border/50 bg-muted/30 scrollbar-hide">
                  {participants.map((p) => (
                    <motion.button
                      key={p.user_id}
                      onClick={() => handleMentionPlayer(p.nickname)}
                      className="flex-shrink-0 focus:outline-none"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-muted ring-2 ring-transparent hover:ring-primary transition-all">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                            {p.nickname?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Messages area - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      ჯერ შეტყობინებები არ არის
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${
                          msg.user_id === user?.id ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {msg.avatar_url ? (
                            <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                              {msg.nickname?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                            msg.user_id === user?.id
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted text-foreground rounded-tl-sm"
                          }`}
                        >
                          {msg.user_id !== user?.id && (
                            <p className="text-xs font-medium text-primary mb-1">{msg.nickname}</p>
                          )}
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input area at bottom */}
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="დაწერე შეტყობინება..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <ChunkyButton size="sm" variant="primary" onClick={handleSendMessage}>
                    <Send className="w-5 h-5" />
                  </ChunkyButton>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Scoreboard */}
        <div className="flex-1 max-w-md mx-auto w-full">
          <RoomScoreboard
            participants={participants as any}
            matches={matches}
            currentUserId={user?.id}
            showHostCrown={true}
          />
        </div>

        {/* Bottom Action Area */}
        <div className="mt-auto pt-4 pb-6 space-y-3">
          {/* Start Game Buttons (Host only) */}
          {isHost && (
            <div className="space-y-2">
              <ChunkyButton
                variant="primary"
                size="xl"
                className="w-full"
                onClick={handleStartGame}
                disabled={!canStartGame || isStarting || loading}
                icon={<Play className="w-5 h-5" />}
              >
                {isStarting ? "იწყება..." : canStartGame ? "თამაშის დაწყება" : `ველოდებით ${(currentRoom.min_players || 2) - participants.length} მოთამაშეს`}
              </ChunkyButton>
              
              <ChunkyButton
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handleStartTVMode}
                disabled={loading}
                icon={<Tv className="w-5 h-5" />}
              >
                TV-სთან დაკავშირება
              </ChunkyButton>
            </div>
          )}
          
          {/* Waiting message for non-host */}
          {!isHost && (
            <div className="text-center py-4">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-muted-foreground"
              >
                ველოდებით ჰოსტს თამაშის დასაწყებად...
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
            ოთახის დატოვება
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
              <h3 className="text-lg font-bold text-foreground mb-2">დატოვება?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                შეგიძლია გახვიდე და მოგვიანებით დაბრუნდე, ან სამუდამოდ დატოვო ოთახი.
              </p>
              <div className="space-y-2">
                <ChunkyButton
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={handleExitRoom}
                >
                  გასვლა (დარჩენა ოთახში)
                </ChunkyButton>
                <ChunkyButton
                  variant="danger"
                  size="md"
                  className="w-full"
                  onClick={handleLeavePermanently}
                >
                  სამუდამოდ დატოვება
                </ChunkyButton>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full py-2 text-muted-foreground text-sm hover:text-foreground"
                >
                  გაუქმება
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TV Enter Code Modal */}
      {currentRoom && (
        <TVEnterCodeModal
          open={showTVModal}
          onOpenChange={setShowTVModal}
          roomId={currentRoom.id}
          categoryId={currentRoom.category_id || ''}
        />
      )}
    </div>
  );
}
