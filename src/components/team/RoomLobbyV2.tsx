import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Share2, ArrowLeft, Check, Edit2, MessageCircle, Send, X, Trash2, Play, Tv, AlertTriangle, Palette, MoreVertical, Info, LogOut } from "lucide-react";
import { useMultiplayerV2, getShareLink } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useRoomMatchHistory } from "@/hooks/useRoomMatchHistory";
import { Input } from "@/components/ui/input";
import { RoomScoreboard } from "./RoomScoreboard";
import { TVSetupInline } from "./TVSetupInline";
import { GradientPicker } from "./GradientPicker";
import { getGradientById } from "@/config/roomGradients";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function RoomLobbyV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSound } = useSound();
  const { t } = useLanguage();
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
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isTVModeEnabled, setIsTVModeEnabled] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
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
        toast.success(t("team.newPlayerJoined"));
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

  const handleShare = async () => {
    if (!currentRoom) return;
    
    const link = getShareLink(currentRoom.room_code);
    const shareData = {
      title: "MyTrivia - Join my game!",
      text: `Join my trivia game! Code: ${currentRoom.room_code}`,
      url: link,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(link);
        toast.success(t("team.linkCopied"));
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        // Fallback to copy
        try {
          await navigator.clipboard.writeText(link);
          toast.success(t("team.linkCopied"));
        } catch {
          toast.error(t("team.shareFailed"));
        }
      }
    }
  };

  const handleTVModeToggle = (checked: boolean) => {
    setIsTVModeEnabled(checked);
  };

  const handleTVSetupComplete = () => {
    setIsTVModeEnabled(false);
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

  const handleDeleteRoom = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRoom = async () => {
    await deleteRoom();
    setShowDeleteConfirm(false);
    navigate("/team");
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    playSound("button-click");
    await startGame();
    setIsStarting(false);
  };

  // handleStartTVMode removed - now using toggle with handleTVModeToggle

  const handleSaveRoomName = async () => {
    if (!currentRoom || !editedName.trim()) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ room_name: editedName.trim() })
        .eq("id", currentRoom.id);
      
      toast.success(t("team.nameUpdated"));
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating room name:", error);
      toast.error(t("team.nameUpdateFailed"));
    }
  };

  const handleChangeGradient = async (gradientId: string) => {
    if (!currentRoom) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ background_gradient: gradientId })
        .eq("id", currentRoom.id);
      
      toast.success(t("team.backgroundChanged"));
    } catch (error) {
      console.error("Error updating background:", error);
      toast.error(t("team.backgroundChangeFailed"));
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
  const roomGradient = getGradientById(currentRoom?.background_gradient);
  const roomName = currentRoom.room_name || "თამაშის ოთახი";

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ background: roomGradient?.gradient || 'var(--background)' }}
    >
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            onClick={handleExitRoom}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </motion.button>

          <div className="flex items-center gap-2">
            {/* Chat toggle */}
            <motion.button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center justify-center w-10 h-10 rounded-xl relative bg-white/10 backdrop-blur-sm border border-white/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle className="w-4 h-4 text-white" />
              {unreadMessageCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessageCount}
                </span>
              )}
            </motion.button>

            {/* Share button */}
            <motion.button
              onClick={handleShare}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="w-4 h-4 text-white" />
            </motion.button>

            {/* Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                <DropdownMenuItem onClick={() => setShowHowItWorks(true)} className="cursor-pointer">
                  <Info className="w-4 h-4 mr-2" />
                  როგორ მუშაობს
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLeaveConfirm} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  ოთახიდან გასვლა
                </DropdownMenuItem>
                {isHost && (
                  <DropdownMenuItem 
                    onClick={handleDeleteRoom} 
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ოთახის წაშლა
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Room Name Section */}
        <div className="text-center mb-6 space-y-3">
          {/* Category badge */}
          {currentRoom.category_name && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium"
            >
              <span>{currentRoom.category_name}</span>
            </motion.div>
          )}

          {/* Room Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-center font-bold bg-white/20 border-white/30 text-white placeholder:text-white/50"
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
              <div className="flex items-center justify-center gap-3">
                {/* Room Icon */}
                {currentRoom.room_icon && (
                  <img 
                    src={currentRoom.room_icon} 
                    alt="Room icon" 
                    className="w-8 h-8 object-contain"
                  />
                )}
                <h2 className="text-base font-bold text-white drop-shadow-lg">
                  {roomName}
                </h2>
                {isHost && (
                  <>
                    <motion.button
                      onClick={() => setIsEditingName(true)}
                      className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 transition-colors flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Edit name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => setShowGradientPicker(true)}
                      className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 transition-colors flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Change background"
                    >
                      <Palette className="w-4 h-4" />
                    </motion.button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* TV Mode Toggle - Host only */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Tv className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">TV-ზე თამაში</p>
                  <p className="text-white/60 text-sm">წვეულების რეჟიმი</p>
                </div>
              </div>
              <Switch
                checked={isTVModeEnabled}
                onCheckedChange={handleTVModeToggle}
              />
            </div>
          </motion.div>
        )}

        {/* TV Setup Inline Widget */}
        <AnimatePresence>
          {isTVModeEnabled && (
            <div className="mb-6">
              <TVSetupInline
                onComplete={handleTVSetupComplete}
                onCancel={() => setIsTVModeEnabled(false)}
              />
            </div>
          )}
        </AnimatePresence>

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
                    {roomName}
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
                      {t("team.noMessagesYet")}
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
            maxPlayers={currentRoom.max_players || 10}
          />
        </div>

        {/* Bottom Action Area */}
        <div className="mt-auto pt-4 pb-6">
          {/* Start Game Button (Host only) */}
          {isHost ? (
            <ChunkyButton
              variant="white"
              size="xl"
              className="w-full max-w-md mx-auto"
              onClick={handleStartGame}
              disabled={!canStartGame || isStarting || loading}
              icon={<Play className="w-5 h-5" />}
            >
              {isStarting ? "იწყება..." : canStartGame ? "თამაშის დაწყება" : `ველოდებით ${(currentRoom.min_players || 2) - participants.length} მოთამაშეს`}
            </ChunkyButton>
          ) : (
            <div className="text-center py-4">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-white/80 font-medium"
              >
                {t("team.waitingForHost")}
              </motion.div>
            </div>
          )}
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
              <h3 className="text-lg font-bold text-foreground mb-2">{t("team.leaveConfirmTitle")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("team.leaveConfirmMessage")}
              </p>
              <div className="space-y-2">
                <ChunkyButton
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={handleExitRoom}
                >
                  {t("team.exitKeepRoom")}
                </ChunkyButton>
                <ChunkyButton
                  variant="danger"
                  size="md"
                  className="w-full"
                  onClick={handleLeavePermanently}
                >
                  {t("team.leavePermanently")}
                </ChunkyButton>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full py-2 text-muted-foreground text-sm hover:text-foreground"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Delete Room Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-foreground font-display text-xl">
              ოთახის წაშლა
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              დარწმუნებული ხარ, რომ გინდა ამ ოთახის წაშლა? ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:justify-center mt-2">
            <AlertDialogCancel className="flex-1 bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 rounded-xl">
              გაუქმება
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRoom}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* How It Works Modal */}
      <AlertDialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground font-display text-xl">
              <Info className="w-5 h-5 text-primary" />
              როგორ მუშაობს
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="text-lg">1️⃣</span>
                  <p>გააზიარეთ ლინკი მეგობრებს რომ შემოგვიერთდნენ</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">2️⃣</span>
                  <p>მასპინძელი იწყებს თამაშს როცა ყველა მზადაა</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">3️⃣</span>
                  <p>უპასუხეთ კითხვებს და დააგროვეთ ქულები</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">📺</span>
                  <p>გამოიყენეთ TV რეჟიმი წვეულებისთვის - კითხვები გამოჩნდება ტელევიზორზე!</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
              გასაგებია
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gradient Picker Modal */}
      <GradientPicker
        isOpen={showGradientPicker}
        onClose={() => setShowGradientPicker(false)}
        currentGradient={(currentRoom as any)?.background_gradient || 'lavender_mist'}
        onSelect={handleChangeGradient}
      />
    </div>
  );
}
