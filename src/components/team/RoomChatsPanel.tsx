import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Users } from "lucide-react";
import { useMyRooms } from "@/hooks/useMyRooms";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface RoomChatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoomChatsPanel({ isOpen, onClose }: RoomChatsPanelProps) {
  const { user } = useAuth();
  const { rooms, loading: roomsLoading } = useMyRooms();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const { messages, loading: messagesLoading, sendMessage } = useRoomChat(selectedRoomId);
  const { unreadCounts, markRoomAsRead } = useUnreadRoomMessages();
  const { typingUsers, setIsTyping } = useTypingIndicator(selectedRoomId);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select first room if none selected
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  // Mark room as read when selected
  useEffect(() => {
    if (selectedRoomId && isOpen) {
      markRoomAsRead(selectedRoomId);
    }
  }, [selectedRoomId, isOpen, markRoomAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when room selected
  useEffect(() => {
    if (selectedRoomId && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedRoomId, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    
    setSending(true);
    setIsTyping(false);
    const success = await sendMessage(inputValue);
    if (success) {
      setInputValue("");
    }
    setSending(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.trim()) {
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

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-card flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">ოთახის ჩატები</h2>
                  <p className="text-xs text-muted-foreground">
                    {rooms.length} ოთახი
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room tabs */}
            <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide border-b border-border/30">
              {roomsLoading ? (
                <div className="flex items-center gap-2 px-4">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">იტვირთება...</span>
                </div>
              ) : rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">ოთახები არ არის</p>
              ) : (
                rooms.map((room) => {
                  const unreadCount = unreadCounts[room.id] || 0;
                  return (
                    <motion.button
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={cn(
                        "relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0",
                        selectedRoomId === room.id
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-secondary/80 text-muted-foreground hover:bg-secondary"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Users className="w-4 h-4" />
                      <span className="max-w-[100px] truncate">
                        {room.room_name || room.category_name || room.room_code}
                      </span>
                      <span className="text-xs opacity-60">
                        ({room.participants.length})
                      </span>
                      {unreadCount > 0 && selectedRoomId !== room.id && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!selectedRoomId ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">აირჩიე ოთახი ჩატის სანახავად</p>
                </div>
              ) : messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Send className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">ჯერ შეტყობინებები არ არის</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">დაიწყე საუბარი!</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isMe = message.user_id === user?.id;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
                      >
                        {!isMe && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={message.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/20 text-primary">
                              {message.nickname.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={cn(
                            "max-w-[75%] px-3 py-2 rounded-2xl",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-secondary text-secondary-foreground rounded-bl-sm"
                          )}
                        >
                          {!isMe && (
                            <p className="text-xs font-medium opacity-70 mb-0.5">
                              {message.nickname}
                            </p>
                          )}
                          <p className="text-sm break-words">{message.message}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
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

            {/* Input area */}
            {selectedRoomId && (
              <div className="p-3 border-t border-border/50">
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
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
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
