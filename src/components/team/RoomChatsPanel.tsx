import { useState, useRef, useEffect, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Send, MessageCircle, Users, Search, ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { useMyRooms } from "@/hooks/useMyRooms";
import { useFriends } from "@/hooks/useFriends";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useChat } from "@/hooks/useChat";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { useUnreadMessages } from "@/hooks/useChat";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useUserModeration } from "@/hooks/useUserModeration";
import { useConversationPreviews, ConversationPreview } from "@/hooks/useConversationPreviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserActionMenu } from "@/components/shared/UserActionMenu";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { MAP_VIDEOS } from "@/config/videoConfig";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface RoomChatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = "all" | "rooms" | "friends";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "ყველა" },
  { id: "rooms", label: "ოთახები" },
  { id: "friends", label: "მეგობრები" },
];

const truncateTitle = (text: string) => {
  // If title > 22 chars, show 3 dots after 20 chars
  return text.length > 22 ? `${text.slice(0, 20)}...` : text;
};

const SWIPE_THRESHOLD = 100;
const TAP_MOVE_THRESHOLD = 8;

interface ConversationCardProps {
  conversation: ConversationPreview;
  onClick: () => void;
  onDelete?: (id: string, type: "room" | "friend") => void;
}

const ConversationCard = memo(function ConversationCard({ conversation, onClick, onDelete }: ConversationCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-SWIPE_THRESHOLD, -50, 0], [1, 0.8, 0.5]);

  // Tap vs swipe detection (mobile-friendly): if user doesn't meaningfully move, treat as tap.
  const pointerDownXRef = useRef<number | null>(null);
  const didMoveRef = useRef(false);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && onDelete) {
      setIsDismissing(true);
      onDelete(conversation.id, conversation.type);
    }
  };

  if (isDismissing) {
    return (
      <motion.div
        initial={{ height: 'auto', opacity: 1 }}
        animate={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      />
    );
  }

  const isUnread = conversation.unreadCount > 0;

  return (
    <div className="relative overflow-hidden mx-2 my-2 rounded-2xl">
      {/* Delete background indicator */}
      <motion.div 
        className="absolute inset-0 bg-destructive flex items-center justify-end pr-6 pointer-events-none"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-5 h-5 text-destructive-foreground" />
        </motion.div>
      </motion.div>

      {/* Swipeable card */}
      <motion.button
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        onPointerDown={(e) => {
          pointerDownXRef.current = e.clientX;
          didMoveRef.current = false;
        }}
        onPointerMove={(e) => {
          if (pointerDownXRef.current == null) return;
          if (Math.abs(e.clientX - pointerDownXRef.current) > TAP_MOVE_THRESHOLD) {
            didMoveRef.current = true;
          }
        }}
        onPointerUp={() => {
          if (!didMoveRef.current) onClick();
          pointerDownXRef.current = null;
          didMoveRef.current = false;
        }}
        className={cn(
          "relative z-10 flex items-center gap-3 w-full px-4 py-3 text-left transition-colors backdrop-blur-sm border border-border/40 rounded-2xl active:bg-foreground/5",
          isUnread ? "bg-primary/10" : "bg-card/80"
        )}
      >
        {/* Avatar - no badges */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-11 h-11">
            {conversation.type === "room" && conversation.roomIcon ? (
              <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                <img src={conversation.roomIcon} alt="" className="w-6 h-6 object-contain" />
              </div>
            ) : (
              <>
                <AvatarImage src={conversation.avatarUrl || undefined} />
                <AvatarFallback 
                  className="text-sm font-bold text-primary-foreground"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 50%) 100%)"
                  }}
                >
                  {conversation.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </>
            )}
          </Avatar>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {/* Title row */}
              <p className="text-base font-bold text-foreground truncate">
                {truncateTitle(conversation.name)}
              </p>

              {/* Subtitle row */}
              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                {conversation.type === "room"
                  ? `${conversation.roomParticipantCount} მონაწილე`
                  : (conversation.lastMessage || "დაიწყე საუბარი...")}
              </p>
            </div>

            {/* Right side: date + unread dot */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
              {conversation.lastMessageTime && (
                <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                  {conversation.lastMessageTime}
                </span>
              )}
              {conversation.unreadCount > 0 && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </div>
        </div>
      </motion.button>
    </div>
  );
});

export function RoomChatsPanel({ isOpen, onClose }: RoomChatsPanelProps) {
  const { user } = useAuth();
  const { rooms, loading: roomsLoading } = useMyRooms();
  const { friends, loading: friendsLoading } = useFriends();
  const { unreadCounts: roomUnreadCounts, markRoomAsRead } = useUnreadRoomMessages();
  const { unreadCounts: friendUnreadCounts, clearUnreadForFriend } = useUnreadMessages();
  const { filterBlockedUsers } = useUserModeration();
  
  const { conversations, loading: previewsLoading } = useConversationPreviews(
    rooms,
    friends,
    roomUnreadCounts,
    friendUnreadCounts
  );

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<ConversationPreview | null>(null);
  
  // Chat state
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [userMenuTarget, setUserMenuTarget] = useState<{ userId: string; nickname: string } | null>(null);
  const sendingRef = useRef(false); // Use ref to prevent double-sends
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Room chat hooks
  const { 
    messages: roomMessages, 
    loading: roomMessagesLoading, 
    sendMessage: sendRoomMessage 
  } = useRoomChat(selectedConversation?.type === "room" ? selectedConversation.id : null);
  
  const { typingUsers, setIsTyping } = useTypingIndicator(
    selectedConversation?.type === "room" ? selectedConversation.id : null
  );

  // Friend chat hooks
  const {
    messages: friendMessages,
    loading: friendMessagesLoading,
    sendMessage: sendFriendMessage,
    markAsRead: markFriendAsRead,
  } = useChat(selectedConversation?.type === "friend" ? selectedConversation.id : null);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Apply type filter
    switch (activeFilter) {
      case "rooms":
        result = result.filter(c => c.type === "room");
        break;
      case "friends":
        result = result.filter(c => c.type === "friend");
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(query));
    }

    return result;
  }, [conversations, activeFilter, searchQuery]);

  const filteredRooms = useMemo(
    () => filteredConversations.filter((c) => c.type === "room"),
    [filteredConversations]
  );
  const filteredFriends = useMemo(
    () => filteredConversations.filter((c) => c.type === "friend"),
    [filteredConversations]
  );

  // Get current messages based on conversation type
  const currentMessages = selectedConversation?.type === "room" 
    ? filterBlockedUsers(roomMessages) 
    : friendMessages;
  const messagesLoading = selectedConversation?.type === "room" 
    ? roomMessagesLoading 
    : friendMessagesLoading;

  // Mark as read when conversation selected
  useEffect(() => {
    if (!selectedConversation || !isOpen) return;

    if (selectedConversation.type === "room") {
      markRoomAsRead(selectedConversation.id);
    } else {
      markFriendAsRead();
      // Also immediately clear local unread count for this friend
      clearUnreadForFriend(selectedConversation.id);
    }
  }, [selectedConversation, isOpen, markRoomAsRead, markFriendAsRead, clearUnreadForFriend]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Focus input when conversation selected
  useEffect(() => {
    if (selectedConversation && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedConversation, isOpen]);

  const handleSend = async () => {
    const messageToSend = inputValue.trim();
    if (!messageToSend || sendingRef.current || !selectedConversation) return;
    
    // Immediately clear input and set sending state
    sendingRef.current = true;
    setSending(true);
    setInputValue("");
    
    if (selectedConversation.type === "room") {
      setIsTyping(false);
    }

    try {
      const success = selectedConversation.type === "room"
        ? await sendRoomMessage(messageToSend)
        : await sendFriendMessage(messageToSend);

      if (!success) {
        // Restore message if send failed
        setInputValue(messageToSend);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (selectedConversation?.type === "room" && e.target.value.trim()) {
      setIsTyping(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
  };

  const handleConversationClick = (conversation: ConversationPreview) => {
    setSelectedConversation(conversation);
    setInputValue("");
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setInputValue("");
  };

  const handleDeleteConversation = async (id: string, type: "room" | "friend") => {
    if (!user) return;
    
    try {
      if (type === "room") {
        // Leave the room
        await supabase
          .from("room_participants")
          .delete()
          .eq("room_id", id)
          .eq("user_id", user.id);
      } else {
        // For friends, just clear the conversation by deleting messages
        await supabase
          .from("chat_messages")
          .delete()
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`);
      }
    } catch (error) {
      console.error("Delete conversation error:", error);
    }
  };

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  const isLoading = roomsLoading || friendsLoading || previewsLoading;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 w-screen h-screen bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Panel - slides from right, 35% width on desktop, full on mobile */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[45%] lg:w-[35%] z-[9999] flex flex-col overflow-hidden bg-background border-l border-border shadow-2xl"
          >

            <AnimatePresence mode="wait">
              {!selectedConversation ? (
                // Conversation List View
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="relative flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <h2 className="font-bold text-base text-foreground">შეტყობინებები</h2>
                      </div>
                      <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/40 transition-colors"
                      >
                        <X className="w-4 h-4 text-foreground" />
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                      <button
                        type="button"
                        aria-label="ძებნა"
                        onClick={() => {
                          // make the search action feel explicit + focus input
                          const el = document.getElementById("room-chats-search") as HTMLInputElement | null;
                          el?.focus();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card transition-colors z-10"
                      >
                        <Search className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <input
                        id="room-chats-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ძებნა..."
                        className="w-full h-10 pl-4 pr-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    {/* Filter Chips */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                      {filters.map(filter => (
                        <motion.button
                          key={filter.id}
                          onClick={() => setActiveFilter(filter.id)}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                            activeFilter === filter.id 
                              ? "bg-foreground text-background border-foreground" 
                              : "bg-card/80 backdrop-blur-sm text-foreground border-border/50 hover:bg-card"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {filter.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Conversation List - full width, hidden scroll */}
                  <div className="relative z-10 flex-1 overflow-y-auto px-0 scrollbar-hide">
                    <div className="bg-card/60 backdrop-blur-sm rounded-none overflow-hidden">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <MessageCircle className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground text-center">
                            {searchQuery 
                              ? "ვერ მოიძებნა" 
                              : "საუბრები არ არის"
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/20">
                          {(activeFilter === "all" || activeFilter === "rooms") && (
                            <div>
                              {filteredRooms.map((conversation, index) => (
                                <motion.div
                                  key={conversation.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                >
                                  <ConversationCard
                                    conversation={conversation}
                                    onClick={() => handleConversationClick(conversation)}
                                    onDelete={handleDeleteConversation}
                                  />
                                </motion.div>
                              ))}
                              {filteredRooms.length === 0 && (
                                <div className="px-4 py-4 text-sm text-muted-foreground">ოთახები არ არის</div>
                              )}
                            </div>
                          )}

                          {(activeFilter === "all" || activeFilter === "friends") && (
                            <div>
                              {filteredFriends.map((conversation, index) => (
                                <motion.div
                                  key={conversation.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                >
                                  <ConversationCard
                                    conversation={conversation}
                                    onClick={() => handleConversationClick(conversation)}
                                    onDelete={handleDeleteConversation}
                                  />
                                </motion.div>
                              ))}
                              {filteredFriends.length === 0 && (
                                <div className="px-4 py-4 text-sm text-muted-foreground">მეგობრების ჩატები არ არის</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="h-8" />
                  </div>
                </motion.div>
              ) : (
                // Chat View
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="relative flex flex-col h-full"
                >
                  {/* Chat Header */}
                  <div className="relative z-10 flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
                    <button
                      onClick={handleBack}
                      className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-foreground" />
                    </button>
                    
                    <div className="relative">
                      <Avatar className="w-11 h-11 border-2 border-background">
                        {selectedConversation.type === "room" && selectedConversation.roomIcon ? (
                          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                            <img src={selectedConversation.roomIcon} alt="" className="w-6 h-6 object-contain" />
                          </div>
                        ) : (
                          <>
                            <AvatarImage src={selectedConversation.avatarUrl || undefined} />
                            <AvatarFallback 
                              className="font-bold text-primary-foreground"
                              style={{
                                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 50%) 100%)"
                              }}
                            >
                              {selectedConversation.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      {selectedConversation.type === "friend" && selectedConversation.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{selectedConversation.name}</h3>
                      {selectedConversation.type === "room" && typingUsers.length > 0 && (
                        <p className="text-xs text-primary animate-pulse">
                          {typingUsers.join(", ")} წერს...
                        </p>
                      )}
                    </div>

                    {selectedConversation.type === "friend" && (
                      <button
                        onClick={() => setUserMenuTarget({ 
                          userId: selectedConversation.id, 
                          nickname: selectedConversation.name 
                        })}
                        className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : currentMessages.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="flex flex-col items-center justify-center h-full"
                      >
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
                        >
                          <Send className="w-8 h-8 text-muted-foreground" />
                        </motion.div>
                        <motion.p 
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-muted-foreground text-sm"
                        >
                          დაიწყეთ საუბარი!
                        </motion.p>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {currentMessages.map((msg, index) => {
                          const isOwn = msg.sender_id === user?.id || msg.user_id === user?.id;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ 
                                opacity: 0, 
                                y: 20, 
                                scale: 0.9,
                                x: isOwn ? 20 : -20 
                              }}
                              animate={{ 
                                opacity: 1, 
                                y: 0, 
                                scale: 1,
                                x: 0 
                              }}
                              transition={{ 
                                type: "spring", 
                                damping: 20, 
                                stiffness: 300,
                                delay: Math.min(index * 0.03, 0.3)
                              }}
                              className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                            >
                              <div className="flex items-end gap-2 max-w-[75%]">
                                {!isOwn && selectedConversation.type === "room" && (
                                  <Avatar className="w-8 h-8 flex-shrink-0">
                                    <AvatarImage src={msg.avatar_url} />
                                    <AvatarFallback className="bg-muted text-xs">
                                      {(msg.nickname || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  className="px-4 py-2 rounded-2xl"
                                  style={isOwn ? {
                                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(271, 81%, 56%) 100%)",
                                    color: "hsl(var(--primary-foreground))",
                                    borderBottomRightRadius: "4px",
                                    boxShadow: "0 4px 12px hsla(var(--primary), 0.35)",
                                  } : {
                                    background: "hsl(var(--muted))",
                                    backdropFilter: "blur(8px)",
                                    color: "hsl(var(--foreground))",
                                    borderBottomLeftRadius: "4px",
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                                  }}
                                >
                                  {!isOwn && selectedConversation.type === "room" && (
                                    <p className="text-xs font-medium text-primary mb-1">{msg.nickname}</p>
                                  )}
                                  <p className="text-sm break-words">{msg.message}</p>
                                  <p className={cn(
                                    "text-xs mt-1",
                                    isOwn ? "opacity-70" : "text-muted-foreground"
                                  )}>
                                    {formatTime(msg.created_at)}
                                  </p>
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.1 }}
                    className="relative z-10 px-4 py-3 border-t border-border bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="შეტყობინება..."
                        className="flex-1 h-12 px-5 rounded-full bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <motion.button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || sending}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: inputValue.trim() 
                            ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(271, 81%, 56%) 100%)"
                            : "hsl(var(--muted))",
                          boxShadow: inputValue.trim() ? "0 4px 12px hsla(var(--primary), 0.35)" : "none",
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Send className={cn(
                          "w-5 h-5",
                          inputValue.trim() ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Action Menu */}
            <UserActionMenu
              isOpen={!!userMenuTarget}
              targetUserId={userMenuTarget?.userId || ""}
              targetUserName={userMenuTarget?.nickname || ""}
              onClose={() => setUserMenuTarget(null)}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}