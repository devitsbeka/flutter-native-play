import { useState, useEffect, useRef } from "react";
import retroTvIcon from "@/assets/images/retro-tv.png";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Share2, ArrowLeft, Edit2, MessageCircle, Send, X, Trash2, Play, Tv, AlertTriangle, Palette, MoreVertical, Info, LogOut } from "lucide-react";
import { RoomIconPickerModal } from "./RoomIconPickerModal";
import { useMultiplayerV2, getShareLink } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useRoomMatchHistory } from "@/hooks/useRoomMatchHistory";
import { useRoomCategoryQueue } from "@/hooks/useRoomCategoryQueue";
import { Input } from "@/components/ui/input";
import { RoomScoreboard } from "./RoomScoreboard";
import { TVSetupInline } from "./TVSetupInline";
import { GradientPicker } from "./GradientPicker";
import { getGradientById } from "@/config/roomGradients";
import { getCategoryIconSlug } from "@/data/categoryIconMap";
import { Switch } from "@/components/ui/switch";
import { CategoryPickerSection } from "./CategoryPickerSection";
import { CategoryPickerModal } from "./CategoryPickerModal";
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
  
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isTVModeEnabled, setIsTVModeEnabled] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const prevParticipantsRef = useRef<string[]>([]);

  const { messages, sendMessage } = useRoomChat(currentRoom?.id || null);
  const { matches } = useRoomMatchHistory(currentRoom?.id || null);
  const { queue, addToQueue, removeFromQueue, reorderQueue } = useRoomCategoryQueue(currentRoom?.id || null);
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

  const handleUpdateRoomIconAndName = async (iconUrl: string, newName: string) => {
    if (!currentRoom) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ 
          room_icon: iconUrl,
          room_name: newName.trim() 
        })
        .eq("id", currentRoom.id);
      
      toast.success(t("team.roomUpdated") || "ოთახი განახლდა");
      setShowIconPicker(false);
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error(t("team.updateFailed") || "განახლება ვერ მოხერხდა");
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

  // Category selection handlers
  const handleSelectCategory = async (category: { id: string; name: string; iconSlug?: string | null }) => {
    if (!currentRoom) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ 
          category_id: category.id, 
          category_name: category.name 
        })
        .eq("id", currentRoom.id);
      
      toast.success("კატეგორია შეიცვალა");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("კატეგორიის შეცვლა ვერ მოხერხდა");
    }
  };

  const handleSelectRandom = async () => {
    if (!currentRoom) return;
    
    try {
      await supabase
        .from("game_rooms")
        .update({ 
          category_id: null, 
          category_name: "შემთხვევითი" 
        })
        .eq("id", currentRoom.id);
      
      toast.success("შემთხვევითი კატეგორია");
    } catch (error) {
      console.error("Error setting random:", error);
    }
  };

  const handleSelectTrivia = async (trivia: { id: string; title: string }) => {
    if (!currentRoom) return;
    
    try {
      // Fetch trivia questions
      const { data: triviaData } = await supabase
        .from("user_quiz_posts")
        .select("questions")
        .eq("id", trivia.id)
        .single();
      
      if (!triviaData?.questions) {
        toast.error("ტრივიის კითხვები ვერ მოიძებნა");
        return;
      }

      // Store questions in room_questions
      const questions = triviaData.questions as any[];
      
      // Clear existing questions
      await supabase.from("room_questions").delete().eq("room_id", currentRoom.id);
      
      // Insert new questions
      await Promise.all(questions.map((q: any, index: number) => 
        supabase.from("room_questions").insert({
          room_id: currentRoom.id,
          question_index: index,
          question_text: q.question_text || q.question,
          correct_answer: q.correct_answer || q.correctAnswer,
          incorrect_answers: q.incorrect_answers || q.incorrectAnswers,
          difficulty: q.difficulty || "medium",
          icon_slug: q.icon_slug || null,
        })
      ));

      // Update room with trivia info
      await supabase
        .from("game_rooms")
        .update({ 
          category_id: null,
          category_name: trivia.title,
          total_questions: questions.length,
        })
        .eq("id", currentRoom.id);
      
      toast.success("ტრივია დაემატა");
    } catch (error) {
      console.error("Error setting trivia:", error);
      toast.error("ტრივიის დამატება ვერ მოხერხდა");
    }
  };

  const handleAddToQueue = async (item: {
    source_type: "category" | "random" | "user_trivia";
    category_id?: string | null;
    category_name?: string | null;
    user_trivia_id?: string | null;
    icon_slug?: string | null;
  }) => {
    const success = await addToQueue(item);
    if (success) {
      toast.success("რიგში დაემატა");
    }
  };

  if (!currentRoom) return null;

  const canStartGame = participants.length >= (currentRoom.min_players || 2);
  const roomGradient = getGradientById(currentRoom?.background_gradient);
  const roomName = currentRoom.room_name || "თამაშის ოთახი";

  return (
    <div 
      className="min-h-screen relative flex flex-col"
      style={{ background: roomGradient?.gradient || 'var(--background)' }}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 w-full">
        {/* Header content with subtle background blur */}
        <div className="px-4 sm:px-6 py-4 backdrop-blur-md bg-black/10">
          <div className="flex items-center justify-between">
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
        </div>
        
        {/* Fade-out gradient for smooth transition */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 -mb-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), transparent)'
          }}
        />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto relative z-10 px-4 sm:px-6 pb-32 sm:max-w-[520px] mx-auto w-full">

        {/* Room Name Section */}
        <div className="text-center mb-4 space-y-3">

          {/* Room Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
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
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => setShowIconPicker(true)}
                    className="w-8 h-8 text-white/70 hover:text-white transition-colors flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Edit room"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => setShowGradientPicker(true)}
                    className="w-8 h-8 text-white/70 hover:text-white transition-colors flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Change background"
                  >
                    <Palette className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Category Picker Section */}
        <CategoryPickerSection
          categoryName={currentRoom.category_name}
          categoryId={currentRoom.category_id}
          iconSlug={
            currentRoom.category_name === "შემთხვევითი" 
              ? null
              : currentRoom.category_id 
                ? getCategoryIconSlug(currentRoom.category_id) 
                : currentRoom.category_name 
                  ? getCategoryIconSlug(currentRoom.category_name)
                  : null
          }
          isHost={isHost}
          queue={queue}
          onOpenPicker={() => setShowCategoryPicker(true)}
          onRemoveQueueItem={removeFromQueue}
          onReorderQueue={reorderQueue}
        />

        {/* TV Mode Toggle - Host only */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={retroTvIcon} 
                  alt="TV" 
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <p className="text-white font-medium text-sm">TV რეჟიმი</p>
                  <p className="text-white/60 text-xs">კითხვები ტელევიზორზე</p>
                </div>
              </div>
              <Switch
                checked={isTVModeEnabled}
                onCheckedChange={handleTVModeToggle}
              />
            </div>
          </motion.div>
        )}

        {/* TV Setup (when enabled) */}
        <AnimatePresence>
          {isTVModeEnabled && currentRoom && (
            <TVSetupInline
              onComplete={handleTVSetupComplete}
              onCancel={() => setIsTVModeEnabled(false)}
              roomId={currentRoom.id}
            />
          )}
        </AnimatePresence>

        {/* Chat Overlay */}
        <AnimatePresence>
          {showChat && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                onClick={() => setShowChat(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[360px] bg-card z-40 flex flex-col"
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">{t("team.chat")}</h3>
                  <button
                    onClick={() => setShowChat(false)}
                    className="p-2 rounded-lg bg-secondary"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Quick mention chips */}
                <div className="px-4 py-2 border-b border-border overflow-x-auto flex gap-2">
                  {participants
                    .filter((p) => p.user_id !== user?.id)
                    .slice(0, 5)
                    .map((p) => (
                      <button
                        key={p.user_id}
                        onClick={() => handleMentionPlayer(p.nickname)}
                        className="flex-shrink-0 px-3 py-1 rounded-full bg-secondary text-xs text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        @{p.nickname}
                      </button>
                    ))}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>{t("team.noMessages")}</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${
                          msg.user_id === user?.id ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          {msg.avatar_url ? (
                            <img
                              src={msg.avatar_url}
                              alt={msg.nickname}
                              className="w-full h-full object-cover"
                            />
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
        <div className="w-full">
          <RoomScoreboard
            participants={participants as any}
            matches={matches}
            currentUserId={user?.id}
            showHostCrown={true}
            maxPlayers={currentRoom.max_players || 10}
          />
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
        <div className="max-w-[520px] mx-auto">
          {isHost ? (
            <ChunkyButton
              variant="white"
              size="xl"
              className="w-full"
              onClick={handleStartGame}
              disabled={!canStartGame || isStarting || loading}
              icon={<Play className="w-5 h-5" />}
            >
              {isStarting ? "იწყება..." : canStartGame ? "თამაშის დაწყება" : `ველოდებით ${(currentRoom.min_players || 2) - participants.length} მოთამაშეს`}
            </ChunkyButton>
          ) : (
            <div className="text-center py-2">
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

      {/* Room Icon & Name Picker Modal */}
      <RoomIconPickerModal
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        currentIconUrl={currentRoom?.room_icon || null}
        roomName={roomName}
        onConfirm={handleUpdateRoomIconAndName}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        isOpen={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelectCategory={handleSelectCategory}
        onSelectRandom={handleSelectRandom}
        onSelectTrivia={handleSelectTrivia}
        onAddToQueue={handleAddToQueue}
        showQueueOption={true}
        roomGradient={roomGradient?.gradient}
      />
    </div>
  );
}
