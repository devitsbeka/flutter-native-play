import { useState } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsPanel } from "@/components/home/NotificationsPanel";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { isOnActivityScreen } from "@/utils/activityRoute";

interface HeaderActionsProps {
  className?: string;
  /** Pages with their own in-page search (Discover) hide this one so the
      header doesn't show two magnifying glasses side by side. */
  showSearch?: boolean;
}

export function HeaderActions({ className = "", showSearch = true }: HeaderActionsProps) {
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const { unreadCount } = useNotifications();
  const { pathname } = useLocation();

  // On the activity screen the bell has nowhere to go: the panel it opens is
  // the same list, drawn as a sheet with a close button over the page you are
  // already reading. Tapping it looked like a no-op that had somehow added a
  // second copy of the screen.
  //
  // It stays on show, because the count is the point — it is the only place
  // the number of unread notifications is visible. It just stops being a
  // control: no press, no hover lift, no tap scale.
  const isDestination = isOnActivityScreen(pathname);

  const badge = unreadCount > 0 && (
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
  );

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {showSearch && <SpotlightSearch variant="button" />}

        {isDestination ? (
          // A readout, not a button. role="status" so a screen reader
          // announces the count rather than offering a control that does
          // nothing, and cursor-default so a mouse does not promise one.
          <div
            role="status"
            aria-label={String(unreadCount)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full cursor-default"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {badge}
          </div>
        ) : (
          <motion.button
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNotificationsPanel(true)}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {badge}
          </motion.button>
        )}
      </div>

      <NotificationsPanel
        isOpen={showNotificationsPanel}
        onClose={() => setShowNotificationsPanel(false)}
      />
    </>
  );
}
