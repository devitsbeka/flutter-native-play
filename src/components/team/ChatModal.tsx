import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ArrowLeft, MoreVertical } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { useUserModeration } from "@/hooks/useUserModeration";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserActionMenu } from "@/components/shared/UserActionMenu";
import { Friend } from "@/hooks/useFriends";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
}

export function ChatModal({ isOpen, onClose, friend }: ChatModalProps) {
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useChat(friend?.friendId || null);
  const { filterBlockedUsers, isUserBlocked } = useUserModeration();
  const [inputValue, setInputValue] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out messages from blocked users
  const filteredMessages = filterBlockedUsers(messages);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    
    const success = await sendMessage(inputValue);
    if (success) {
      setInputValue("");
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "დღეს";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "გუშინ";
    } else {
      return date.toLocaleDateString("ka-GE", { day: "numeric", month: "short" });
    }
  };

  // Group messages by date (using filtered messages)
  const groupedMessages = filteredMessages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof filteredMessages>);

  if (!friend) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          {/* Background - New whitish style */}
          <div 
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)"
            }}
          />

          {/* Content */}
          <div className="relative h-full flex flex-col">
            {/* Header - 3D chunky style */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)",
                borderBottom: "3px solid #E5E7EB",
              }}
            >
              <motion.button
                onClick={onClose}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: "#F3F4F6",
                  boxShadow: "0 2px 0 #D1D5DB",
                }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>

              <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-white shadow-md">
                  <AvatarImage src={friend.avatarUrl || undefined} />
                  <AvatarFallback 
                    className="text-white font-bold"
                    style={{
                      background: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
                    }}
                  >
                    {friend.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {friend.isOnline && (
                  <div 
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ background: "#22C55E" }}
                  />
                )}
              </div>

              <div className="flex-1">
                <p className="font-medium text-gray-900">{friend.nickname}</p>
                <p className={`text-xs ${friend.isOnline ? "text-green-600" : "text-gray-400"}`}>
                  {friend.isOnline ? "ონლაინ" : "ოფლაინ"}
                </p>
              </div>

              {/* More Options Button */}
              <motion.button
                onClick={() => setShowUserMenu(true)}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: "#F3F4F6",
                  boxShadow: "0 2px 0 #D1D5DB",
                }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </motion.button>

              <motion.button
                onClick={onClose}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: "#F3F4F6",
                  boxShadow: "0 2px 0 #D1D5DB",
                }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{
                      background: "#F3F4F6",
                      boxShadow: "0 3px 0 #E5E7EB",
                    }}
                  >
                    <Send className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm">ჯერ შეტყობინებები არ არის</p>
                  <p className="text-gray-400 text-xs mt-1">დაიწყე საუბარი {friend.nickname}-თან</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date} className="space-y-2">
                    {/* Date separator */}
                    <div className="flex items-center justify-center">
                      <span 
                        className="px-3 py-1 rounded-full text-xs"
                        style={{
                          background: "#F3F4F6",
                          color: "#6B7280",
                        }}
                      >
                        {formatDate(dateMessages[0].created_at)}
                      </span>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((message, index) => {
                      const isMe = message.sender_id === user?.id;
                      const showAvatar = !isMe && (
                        index === 0 || 
                        dateMessages[index - 1]?.sender_id !== message.sender_id
                      );

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && (
                            <div className="w-8">
                              {showAvatar && (
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={friend.avatarUrl || undefined} />
                                  <AvatarFallback 
                                    className="text-white text-xs"
                                    style={{
                                      background: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
                                    }}
                                  >
                                    {friend.nickname.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}

                          <div
                            className="max-w-[75%] px-4 py-2 rounded-2xl"
                            style={isMe ? {
                              background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                              color: "white",
                              borderBottomRightRadius: "4px",
                              boxShadow: "0 2px 0 #6D28D9",
                            } : {
                              background: "#F3F4F6",
                              color: "#374151",
                              borderBottomLeftRadius: "4px",
                              boxShadow: "0 2px 0 #E5E7EB",
                            }}
                          >
                            <p className="text-sm break-words">{message.message}</p>
                            <p className={`text-xs mt-1 ${isMe ? "text-white/70" : "text-gray-400"}`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - 3D chunky style */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-4 py-3"
              style={{
                background: "#FFFFFF",
                borderTop: "3px solid #E5E7EB",
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="შეტყობინება..."
                  className="flex-1 px-4 py-3 rounded-2xl text-gray-800 placeholder-gray-400 transition-colors focus:outline-none"
                  style={{
                    background: "#F3F4F6",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                    border: "2px solid #E5E7EB",
                  }}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  className="p-3 rounded-2xl transition-colors"
                  style={{
                    background: inputValue.trim() && !sending
                      ? "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)"
                      : "#E5E7EB",
                    boxShadow: inputValue.trim() && !sending
                      ? "0 3px 0 #6D28D9"
                      : "0 2px 0 #D1D5DB",
                    color: inputValue.trim() && !sending ? "white" : "#9CA3AF",
                  }}
                  whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                  whileTap={inputValue.trim() ? { scale: 0.95, y: 2 } : {}}
                >
                  <Send className={`w-5 h-5 ${sending ? "animate-pulse" : ""}`} />
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* User Action Menu for Report/Block */}
          <UserActionMenu
            isOpen={showUserMenu}
            onClose={() => setShowUserMenu(false)}
            targetUserId={friend.friendId}
            targetUserName={friend.nickname}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
