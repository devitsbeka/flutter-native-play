import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Users, Search, ChevronLeft, ArrowLeft } from "lucide-react";
import { useMyRooms, MyRoom } from "@/hooks/useMyRooms";
import { useFriends, Friend } from "@/hooks/useFriends";
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
import { cn } from "@/lib/utils";

interface RoomChatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = "all" | "unread" | "rooms" | "friends";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "ყველა" },
  { id: "unread", label: "ახალი" },
  { id: "rooms", label: "ოთახები" },
  { id: "friends", label: "მეგობრები" },
];

interface ConversationCardProps {
  conversation: ConversationPreview;
  onClick: () => void;
}

function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/30 last:border-b-0"
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-14 h-14">
          {conversation.type === "room" && conversation.roomIcon ? (
            <div className="w-full h-full bg-muted/50 flex items-center justify-center">
              <img src={conversation.roomIcon} alt="" className="w-8 h-8 object-contain" />
            </div>
          ) : (
            <>
              <AvatarImage src={conversation.avatarUrl || undefined} />
              <AvatarFallback 
                className="text-lg font-bold text-primary-foreground"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 50%) 100%)"
                }}
              >
                {conversation.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        
        {/* Badge overlay */}
        {conversation.type === "room" && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-card">
            <Users className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
        {conversation.type === "friend" && conversation.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-semibold truncate",
            conversation.unreadCount > 0 ? "text-foreground" : "text-foreground/90"
          )}>
            {conversation.name}
          </h3>
          {conversation.lastMessageTime && (
            <span className={cn(
              "text-xs flex-shrink-0",
              conversation.unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {conversation.lastMessageTime}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-sm truncate",
            conversation.unreadCount > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"
          )}>
            {conversation.lastMessage || (conversation.type === "room" 
              ? `${conversation.roomParticipantCount} მონაწილე`
              : "დაიწყე საუბარი..."
            )}
          </p>
          
          {/* Unread badge */}
          {conversation.unreadCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[11px] font-bold text-destructive-foreground bg-destructive rounded-full flex-shrink-0">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export function RoomChatsPanel({ isOpen, onClose }: RoomChatsPanelProps) {
  const { user } = useAuth();
  const { rooms, loading: roomsLoading } = useMyRooms();
  const { friends, loading: friendsLoading } = useFriends();
  const { unreadCounts: roomUnreadCounts, markRoomAsRead } = useUnreadRoomMessages();
  const friendUnreadCounts = useUnreadMessages();
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
      case "unread":
        result = result.filter(c => c.unreadCount > 0);
        break;
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
    }
  }, [selectedConversation, isOpen, markRoomAsRead, markFriendAsRead]);

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
    if (!inputValue.trim() || sending || !selectedConversation) return;
    
    setSending(true);
    if (selectedConversation.type === "room") {
      setIsTyping(false);
    }

    const success = selectedConversation.type === "room"
      ? await sendRoomMessage(inputValue)
      : await sendFriendMessage(inputValue);

    if (success) {
      setInputValue("");
    }
    setSending(false);
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

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  const isLoading = roomsLoading || friendsLoading || previewsLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[60] bg-card flex flex-col overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {!selectedConversation ? (
                // Conversation List View
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">შეტყობინებები</h2>
                        {totalUnread > 0 && (
                          <p className="text-xs text-primary font-medium">
                            {totalUnread} ახალი
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="px-4 py-3 border-b border-border/30">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ძებნა..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* Filter Chips */}
                  <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border/30">
                    {filters.map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                          activeFilter === filter.id 
                            ? "bg-foreground text-background" 
                            : "bg-secondary text-foreground/70 hover:bg-secondary/80"
                        )}
                      >
                        {filter.label}
                        {filter.id === "unread" && totalUnread > 0 && (
                          <span className="ml-1.5 text-xs">({totalUnread})</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Conversation List */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                        <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground text-sm">
                          {searchQuery 
                            ? "ვერ მოიძებნა" 
                            : activeFilter === "unread"
                              ? "ახალი შეტყობინებები არ არის"
                              : "საუბრები არ არის"
                          }
                        </p>
                      </div>
                    ) : (
                      <div>
                        {filteredConversations.map((conversation, index) => (
                          <motion.div
                            key={conversation.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.3) }}
                          >
                            <ConversationCard
                              conversation={conversation}
                              onClick={() => handleConversationClick(conversation)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                // Chat View
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col h-full"
                >
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 p-4 border-b border-border/50">
                    <button
                      onClick={handleBack}
                      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="relative">
                      <Avatar className="w-10 h-10">
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
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{selectedConversation.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.type === "room" 
                          ? `${selectedConversation.roomParticipantCount} მონაწილე`
                          : selectedConversation.isOnline ? "ონლაინ" : "ოფლაინ"
                        }
                      </p>
                    </div>

                    <button
                      onClick={onClose}
                      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : currentMessages.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center h-full text-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Send className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-sm">ჯერ შეტყობინებები არ არის</p>
                        <p className="text-muted-foreground/60 text-xs mt-1">დაიწყე საუბარი!</p>
                      </motion.div>
                    ) : (
                      <>
                        {currentMessages.map((message: any, index: number) => {
                          const isMe = selectedConversation.type === "room"
                            ? message.user_id === user?.id
                            : message.sender_id === user?.id;
                          const nickname = selectedConversation.type === "room"
                            ? message.nickname
                            : selectedConversation.name;
                          const avatarUrl = selectedConversation.type === "room"
                            ? message.avatar_url
                            : selectedConversation.avatarUrl;

                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: Math.min(index * 0.03, 0.3) }}
                              className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
                            >
                              {!isMe && (
                                <button
                                  onClick={() => setUserMenuTarget({ 
                                    userId: selectedConversation.type === "room" ? message.user_id : selectedConversation.id, 
                                    nickname 
                                  })}
                                  className="flex-shrink-0"
                                >
                                  <Avatar className="w-8 h-8 ring-2 ring-background shadow-md">
                                    <AvatarImage src={avatarUrl || undefined} />
                                    <AvatarFallback 
                                      className="text-xs text-primary-foreground font-bold"
                                      style={{
                                        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 50%) 100%)"
                                      }}
                                    >
                                      {nickname?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                              )}

                              <div
                                className={cn(
                                  "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm",
                                  isMe ? "rounded-br-sm" : "rounded-bl-sm"
                                )}
                                style={isMe ? {
                                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 45%) 100%)",
                                  color: "white",
                                  boxShadow: "0 4px 15px hsla(var(--primary), 0.35)",
                                } : {
                                  background: "hsl(var(--card))",
                                  boxShadow: "0 2px 10px hsla(var(--foreground), 0.08)",
                                  border: "1px solid hsl(var(--border) / 0.5)",
                                }}
                              >
                                {!isMe && selectedConversation.type === "room" && (
                                  <button
                                    onClick={() => setUserMenuTarget({ userId: message.user_id, nickname })}
                                    className="text-xs font-semibold mb-1 block hover:opacity-80 transition-opacity"
                                    style={{ color: "hsl(var(--primary))" }}
                                  >
                                    {nickname}
                                  </button>
                                )}
                                <p className="text-sm break-words">{message.message}</p>
                                <p className={cn(
                                  "text-xs mt-1.5",
                                  isMe ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {formatTime(message.created_at)}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-3 border-t border-border/50">
                    {/* Typing indicator for rooms */}
                    {selectedConversation.type === "room" && typingUsers.length > 0 && (
                      <div className="flex items-center gap-2 px-2 pb-2 text-xs text-muted-foreground">
                        <div className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span>
                          {typingUsers.length === 1
                            ? `${typingUsers[0].nickname} წერს...`
                            : `${typingUsers.length} მომხმარებელი წერს...`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="შეტყობინება..."
                        className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <motion.button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || sending}
                        className={cn(
                          "p-3 rounded-xl transition-colors",
                          inputValue.trim() && !sending
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                        whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                        whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
                      >
                        <Send className={cn("w-5 h-5", sending && "animate-pulse")} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Action Menu for Report/Block */}
            {userMenuTarget && (
              <UserActionMenu
                isOpen={!!userMenuTarget}
                onClose={() => setUserMenuTarget(null)}
                targetUserId={userMenuTarget.userId}
                targetUserName={userMenuTarget.nickname}
                roomId={selectedConversation?.type === "room" ? selectedConversation.id : undefined}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
