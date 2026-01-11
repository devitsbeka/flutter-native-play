import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Users } from "lucide-react";
import { useMyRooms, MyRoom } from "@/hooks/useMyRooms";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useUserModeration } from "@/hooks/useUserModeration";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserActionMenu } from "@/components/shared/UserActionMenu";
import { cn } from "@/lib/utils";
import { getGradientById } from "@/config/roomGradients";
import roomCoverPlaceholder from "@/assets/room-cover-placeholder.png";

interface RoomChatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MiniRoomCardProps {
  room: MyRoom;
  isSelected: boolean;
  unreadCount: number;
  onClick: () => void;
}

function MiniRoomCard({ room, isSelected, unreadCount, onClick }: MiniRoomCardProps) {
  const gradient = getGradientById(room.background_gradient);
  const displayName = room.room_name || "თამაშის ოთახი";
  const isPlaying = room.status === "playing";

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 w-[140px] rounded-xl overflow-hidden transition-all",
        isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background"
      )}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Gradient background */}
      <div
        className="relative p-2 rounded-xl min-h-[100px]"
        style={{ background: gradient?.gradient }}
      >
        {/* Cover image overlay */}
        <div
          className="absolute inset-0 opacity-20 overflow-hidden rounded-xl"
          style={{
            backgroundImage: `url(${room.cover_image || roomCoverPlaceholder})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Status badge */}
        <div className="relative z-10 mb-1.5">
          {isPlaying ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[9px] font-medium">
              მოლოდინი
            </span>
          )}
        </div>

        {/* Room name with icon */}
        <div className="relative z-10 flex items-center gap-1 mb-0.5">
          {room.room_icon && (
            <img src={room.room_icon} alt="" className="w-3.5 h-3.5 object-contain" />
          )}
          <h4 className="font-bold text-white text-xs truncate drop-shadow-md">
            {displayName}
          </h4>
        </div>

        {/* Category name */}
        {room.category_name && (
          <p className="relative z-10 text-[9px] text-white/70 truncate mb-1.5">
            {room.category_name}
          </p>
        )}

        {/* Bottom: participants count + avatars */}
        <div className="relative z-10 flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-lg p-1">
          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-white/20 rounded">
            <Users className="w-2.5 h-2.5 text-white/80" />
            <span className="text-[9px] font-bold text-white">
              {room.participants.length}
            </span>
          </div>

          {/* Stacked avatars */}
          <div className="flex -space-x-1.5">
            {room.participants.slice(0, 3).map((p) => (
              <div
                key={p.user_id}
                className="w-5 h-5 rounded-full overflow-hidden border border-white/40 bg-white/20"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-[7px] font-bold">
                    {p.nickname?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {room.participants.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-white/30 border border-white/40 flex items-center justify-center">
                <span className="text-[7px] font-bold text-white">
                  +{room.participants.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-red-500 rounded-full shadow-lg z-20">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </motion.button>
  );
}

export function RoomChatsPanel({ isOpen, onClose }: RoomChatsPanelProps) {
  const { user } = useAuth();
  const { rooms, loading: roomsLoading } = useMyRooms();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const { messages, loading: messagesLoading, sendMessage } = useRoomChat(selectedRoomId);
  const { unreadCounts, markRoomAsRead, totalUnread } = useUnreadRoomMessages();
  const { typingUsers, setIsTyping } = useTypingIndicator(selectedRoomId);
  const { filterBlockedUsers } = useUserModeration();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [userMenuTarget, setUserMenuTarget] = useState<{ userId: string; nickname: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter blocked users from messages
  const filteredMessages = filterBlockedUsers(messages);

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

            {/* Room cards - horizontal scroll */}
            <div className="flex gap-3 p-3 overflow-x-auto scrollbar-hide border-b border-border/30">
              {roomsLoading ? (
                <div className="flex gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="w-[140px] h-[100px] rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">ოთახები არ არის</p>
              ) : (
                rooms.map((room) => (
                  <MiniRoomCard
                    key={room.id}
                    room={room}
                    isSelected={selectedRoomId === room.id}
                    unreadCount={unreadCounts[room.id] || 0}
                    onClick={() => setSelectedRoomId(room.id)}
                  />
                ))
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!selectedRoomId ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="flex flex-col items-center justify-center h-full text-center"
                >
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
                  >
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </motion.div>
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-muted-foreground"
                  >
                    აირჩიე ოთახი ჩატის სანახავად
                  </motion.p>
                </motion.div>
              ) : messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="flex flex-col items-center justify-center h-full text-center"
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
                    ჯერ შეტყობინებები არ არის
                  </motion.p>
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground/60 text-xs mt-1"
                  >
                    დაიწყე საუბარი!
                  </motion.p>
                </motion.div>
              ) : (
                <>
                  {filteredMessages.map((message, index) => {
                    const isMe = message.user_id === user?.id;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ 
                          opacity: 0, 
                          y: 20, 
                          scale: 0.9,
                          x: isMe ? 30 : -30 
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
                          delay: Math.min(index * 0.04, 0.5)
                        }}
                        className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
                      >
                        {!isMe && (
                          <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: Math.min(index * 0.04, 0.5) + 0.1 }}
                            onClick={() => setUserMenuTarget({ userId: message.user_id, nickname: message.nickname })}
                            className="flex-shrink-0"
                          >
                            <Avatar className="w-8 h-8 ring-2 ring-background shadow-md">
                              <AvatarImage src={message.avatar_url || undefined} />
                              <AvatarFallback 
                                className="text-xs text-white font-bold"
                                style={{
                                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 50%) 100%)"
                                }}
                              >
                                {message.nickname.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </motion.button>
                        )}

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className={cn(
                            "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm",
                            isMe
                              ? "rounded-br-sm"
                              : "rounded-bl-sm"
                          )}
                          style={isMe ? {
                            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 45%) 100%)",
                            color: "white",
                            boxShadow: "0 4px 15px hsla(var(--primary), 0.35)",
                          } : {
                            background: "hsl(var(--card))",
                            backdropFilter: "blur(8px)",
                            boxShadow: "0 2px 10px hsla(var(--foreground), 0.08)",
                            border: "1px solid hsl(var(--border) / 0.5)",
                          }}
                        >
                          {!isMe && (
                            <button
                              onClick={() => setUserMenuTarget({ userId: message.user_id, nickname: message.nickname })}
                              className="text-xs font-semibold mb-1 block hover:opacity-80 transition-opacity"
                              style={{ color: "hsl(var(--primary))" }}
                            >
                              {message.nickname}
                            </button>
                          )}
                          <p className="text-sm break-words">{message.message}</p>
                          <p className={cn(
                            "text-xs mt-1.5",
                            isMe ? "text-white/70" : "text-muted-foreground"
                          )}>
                            {formatTime(message.created_at)}
                          </p>
                        </motion.div>
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

            {/* User Action Menu for Report/Block */}
            {userMenuTarget && (
              <UserActionMenu
                isOpen={!!userMenuTarget}
                onClose={() => setUserMenuTarget(null)}
                targetUserId={userMenuTarget.userId}
                targetUserName={userMenuTarget.nickname}
                roomId={selectedRoomId || undefined}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
