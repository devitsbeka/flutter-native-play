import { useState } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsPanel } from "@/components/home/NotificationsPanel";
import SpotlightSearch from "@/components/search/SpotlightSearch";

interface HeaderActionsProps {
  className?: string;
}

export function HeaderActions({ className = "" }: HeaderActionsProps) {
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        <SpotlightSearch variant="button" />
        <motion.button
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors"
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
                background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
                boxShadow: "0 2px 4px rgba(239, 68, 68, 0.5)",
              }}
            >
              <span className="text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </motion.div>
          )}
        </motion.button>
      </div>

      <NotificationsPanel
        isOpen={showNotificationsPanel}
        onClose={() => setShowNotificationsPanel(false)}
      />
    </>
  );
}
