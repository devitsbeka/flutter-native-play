import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ArrowLeft } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Friend } from "@/hooks/useFriends";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
}

export function ChatModal({ isOpen, onClose, friend }: ChatModalProps) {
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useChat(friend?.friendId || null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

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
          {/* Background */}
          <div 
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, hsl(260 70% 65%) 0%, hsl(280 60% 55%) 50%, hsl(300 50% 45%) 100%)"
            }}
          />

          {/* Content */}
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm border-b border-white/10"
            >
              <motion.button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>

              <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-white/30">
                  <AvatarImage src={friend.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                    {friend.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {friend.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-purple-700" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-medium text-white">{friend.nickname}</p>
                <p className={`text-xs ${friend.isOnline ? "text-green-300" : "text-white/50"}`}>
                  {friend.isOnline ? "ონლაინ" : "ოფლაინ"}
                </p>
              </div>

              <motion.button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <Send className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="text-white/60 text-sm">ჯერ შეტყობინებები არ არის</p>
                  <p className="text-white/40 text-xs mt-1">დაიწყე საუბარი {friend.nickname}-თან</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date} className="space-y-2">
                    {/* Date separator */}
                    <div className="flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs">
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
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                    {friend.nickname.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                              isMe
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm"
                                : "bg-white/15 text-white rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm break-words">{message.message}</p>
                            <p className={`text-xs mt-1 ${isMe ? "text-white/70" : "text-white/50"}`}>
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

            {/* Input */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border-t border-white/10"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="შეტყობინება..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/15 text-white placeholder-white/40 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  className={`p-3 rounded-2xl transition-colors ${
                    inputValue.trim() && !sending
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-white/10 text-white/40"
                  }`}
                  whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                  whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
                >
                  <Send className={`w-5 h-5 ${sending ? "animate-pulse" : ""}`} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
