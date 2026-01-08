import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, ArrowLeft } from "lucide-react";
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 border-0">
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            {friendProfile && (
              <>
                <SmartAvatar
                  avatarUrl={friendProfile.avatar_url}
                  animatedAvatarUrl={friendProfile.animated_avatar_url}
                  fallback={friendProfile.nickname}
                  size="sm"
                  showSparkle={false}
                />
                <SheetTitle className="text-lg font-semibold text-foreground">
                  {friendProfile.nickname}
                </SheetTitle>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">დაიწყეთ საუბარი!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
