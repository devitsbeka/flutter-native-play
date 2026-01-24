import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, MessageCircle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { useUnreadMessages } from "@/hooks/useChat";
import { NotificationsPanel } from "@/components/home/NotificationsPanel";
import { RoomChatsPanel } from "@/components/team/RoomChatsPanel";

interface HeaderActionsProps {
  className?: string;
}

export function HeaderActions({ className = "" }: HeaderActionsProps) {
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showRoomChatsPanel, setShowRoomChatsPanel] = useState(false);
  const { unreadCount } = useNotifications();
  const { totalUnread: unreadRoomMessagesCount } = useUnreadRoomMessages();
  const { unreadCounts: unreadFriendCounts } = useUnreadMessages();
  const unreadFriendMessagesCount = Object.values(unreadFriendCounts).reduce(
    (sum, n) => sum + n,
    0
  );
  const unreadMessagesCount = unreadRoomMessagesCount + unreadFriendMessagesCount;

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Bell icon - minimal style like overview page */}
        <motion.button
          className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowNotificationsPanel(true)}
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(180deg, #A855F7 0%, #9333EA 100%)",
                boxShadow: "0 2px 4px rgba(168, 85, 247, 0.5)",
              }}
            >
              <span className="text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </motion.div>
          )}
        </motion.button>

        {/* Messages icon - minimal style like overview page */}
        <motion.button
          className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowRoomChatsPanel(true)}
        >
          <MessageCircle className="w-5 h-5 text-gray-600" />
          {unreadMessagesCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(180deg, #A855F7 0%, #9333EA 100%)",
                boxShadow: "0 2px 4px rgba(168, 85, 247, 0.5)",
              }}
            >
              <span className="text-[9px] font-bold text-white">
                {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
              </span>
            </motion.div>
          )}
        </motion.button>
      </div>

      {/* Panels */}
      <NotificationsPanel
        isOpen={showNotificationsPanel}
        onClose={() => setShowNotificationsPanel(false)}
      />
      <RoomChatsPanel
        isOpen={showRoomChatsPanel}
        onClose={() => setShowRoomChatsPanel(false)}
      />
    </>
  );
}