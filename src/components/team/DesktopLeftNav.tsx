import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Home, 
  Search, 
  Compass, 
  Users, 
  MessageCircle, 
  Bell, 
  PlusSquare, 
  BarChart3, 
  Settings,
  Menu
} from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";

interface DesktopLeftNavProps {
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
  onCreateClick: () => void;
}

const navItems = [
  { id: "home", label: "მთავარი", icon: Home, path: "/" },
  { id: "search", label: "ძიება", icon: Search, path: "/search" },
  { id: "explore", label: "აღმოჩენა", icon: Compass, path: "/explore" },
  { id: "team", label: "გუნდი", icon: Users, path: "/team" },
];

export function DesktopLeftNav({ 
  onNotificationsClick, 
  onMessagesClick, 
  onCreateClick 
}: DesktopLeftNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const { totalUnread: unreadMessagesCount } = useUnreadRoomMessages();

  const isActive = (path: string) => {
    if (path === "/team") return location.pathname === "/team";
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="hidden xl:flex flex-col w-[220px] min-w-[220px] h-screen sticky top-0 border-r border-border/40 bg-background pt-6 pb-4">
      {/* Logo */}
      <div className="px-6 mb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-display font-bold text-foreground"
        >
          MyTrivia
        </motion.div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.path)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors
                ${active 
                  ? "bg-muted/60 text-foreground font-semibold" 
                  : "text-foreground/80 hover:bg-muted/40"
                }
              `}
            >
              <Icon className={`w-6 h-6 ${active ? "stroke-[2.5px]" : ""}`} />
              <span className="text-[15px]">{item.label}</span>
            </motion.button>
          );
        })}

        {/* Messages with badge */}
        <motion.button
          onClick={onMessagesClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors text-foreground/80 hover:bg-muted/40"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-destructive rounded-full">
                {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[15px]">შეტყობინებები</span>
        </motion.button>

        {/* Notifications with badge */}
        <motion.button
          onClick={onNotificationsClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors text-foreground/80 hover:bg-muted/40"
        >
          <div className="relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-destructive rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[15px]">ნოტიფიკაციები</span>
        </motion.button>

        {/* Create */}
        <motion.button
          onClick={onCreateClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors text-foreground/80 hover:bg-muted/40"
        >
          <PlusSquare className="w-6 h-6" />
          <span className="text-[15px]">შექმნა</span>
        </motion.button>

        {/* Dashboard */}
        <motion.button
          onClick={() => navigate("/profile")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors text-foreground/80 hover:bg-muted/40"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[15px]">დეშბორდი</span>
        </motion.button>

        {/* Profile */}
        <motion.button
          onClick={() => navigate("/profile")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors text-foreground/80 hover:bg-muted/40"
        >
          <Avatar
            imageUrl={profile?.avatar_url || undefined}
            emoji={profile?.nickname?.charAt(0) || "👤"}
            size="sm"
          />
          <span className="text-[15px]">პროფილი</span>
        </motion.button>
      </div>

      {/* Bottom Section */}
      <div className="px-3 space-y-1 mt-auto">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors text-foreground/80 hover:bg-muted/40"
        >
          <Menu className="w-6 h-6" />
          <span className="text-[15px]">მეტი</span>
        </motion.button>
      </div>
    </nav>
  );
}
