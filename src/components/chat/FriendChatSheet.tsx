import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, ChevronLeft, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ka } from "date-fns/locale";

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read_at: string | null;
}

interface FriendProfile {
  nickname: string;
  avatar_url: string | null;
  animated_avatar_url: string | null;
}

interface FriendChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string | null;
  friendProfile: FriendProfile | null;
}

export function FriendChatSheet({ isOpen, onClose, friendId, friendProfile }: FriendChatSheetProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
  useEffect(() => {
    if (!isOpen || !user || !friendId) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        // Mark messages as read
        await supabase
          .from("chat_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("sender_id", friendId)
          .eq("receiver_id", user.id)
          .is("read_at", null);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [isOpen, user, friendId]);

  // Real-time subscription
  useEffect(() => {
    if (!isOpen || !user || !friendId) return;

    const channel = supabase
      .channel(`chat-${user.id}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Only add if it's relevant to this conversation
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
            // Mark as read if received
            if (newMsg.sender_id === friendId) {
              supabase
                .from("chat_messages")
                .update({ read_at: new Date().toISOString() })
                .eq("id", newMsg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user, friendId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !friendId || sending) return;

    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: friendId,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, "HH:mm");
    }
    return format(date, "d MMM, HH:mm", { locale: ka });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

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
      return format(date, "d MMMM", { locale: ka });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            {friendProfile && (
              <div className="flex items-center gap-3">
                <SmartAvatar
                  avatarUrl={friendProfile.avatar_url}
                  animatedAvatarUrl={friendProfile.animated_avatar_url}
                  fallback={friendProfile.nickname}
                  size="sm"
                  showSparkle={false}
                />
                <h2 className="text-lg font-bold text-foreground">
                  {friendProfile.nickname}
                </h2>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
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
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
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
              Object.entries(groupedMessages).map(([date, dateMessages], groupIndex) => (
                <div key={date} className="space-y-3">
                  {/* Date separator */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: groupIndex * 0.05 }}
                    className="flex items-center justify-center"
                  >
                    <span className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                      {formatDate(dateMessages[0].created_at)}
                    </span>
                  </motion.div>

                  {/* Messages */}
                  {dateMessages.map((msg, index) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ 
                          opacity: 0, 
                          y: 20, 
                          scale: 0.9,
                          x: isMine ? 20 : -20 
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
                          delay: (groupIndex * 0.05) + (index * 0.03)
                        }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="max-w-[75%] rounded-2xl px-4 py-2"
                          style={isMine ? {
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
                          <p className="text-sm break-words">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine ? "opacity-70" : "text-muted-foreground"
                            }`}
                          >
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="დაწერეთ შეტყობინება..."
                className="flex-1"
                disabled={sending}
              />
              <ChunkyButton
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                variant="primary"
                size="sm"
                className="w-12"
              >
                <Send className="w-4 h-4" />
              </ChunkyButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
