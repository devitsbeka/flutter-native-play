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
  Menu
} from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // Shared NavButton component for consistency
  const NavButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    active = false, 
    badge = 0,
    children 
  }: { 
    icon?: React.ElementType; 
    label: string; 
    onClick: () => void; 
    active?: boolean; 
    badge?: number;
    children?: React.ReactNode;
  }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
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
            <div className="relative flex-shrink-0">
              {children || (Icon && <Icon className={`w-6 h-6 ${active ? "stroke-[2.5px]" : ""}`} />)}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-destructive rounded-full">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            {/* Label - hidden on tablet, visible on desktop */}
            <span className="text-[15px] hidden xl:inline">{label}</span>
          </motion.button>
        </TooltipTrigger>
        {/* Tooltip only shows on tablet (lg) where label is hidden */}
        <TooltipContent side="right" className="xl:hidden">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <nav className="hidden lg:flex flex-col w-[72px] xl:w-[220px] min-w-[72px] xl:min-w-[220px] h-screen sticky top-0 border-r border-border/40 bg-background pt-6 pb-4 transition-all duration-200">
      {/* Logo */}
      <div className="px-3 xl:px-6 mb-8 flex justify-center xl:justify-start">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-display font-bold text-foreground"
        >
          {/* Icon on tablet, full text on desktop */}
          <span className="xl:hidden text-2xl">🎯</span>
          <span className="hidden xl:inline">MyTrivia</span>
        </motion.div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-2 xl:px-3 space-y-1">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            icon={item.icon}
            label={item.label}
            onClick={() => navigate(item.path)}
            active={isActive(item.path)}
          />
        ))}

        {/* Messages with badge */}
        <NavButton
          icon={MessageCircle}
          label="შეტყობინებები"
          onClick={onMessagesClick}
          badge={unreadMessagesCount}
        />


        {/* Create */}
        <NavButton
          icon={PlusSquare}
          label="შექმნა"
          onClick={onCreateClick}
        />

        {/* Dashboard */}
        <NavButton
          icon={BarChart3}
          label="დეშბორდი"
          onClick={() => navigate("/profile")}
        />

        {/* Profile */}
        <NavButton
          label="პროფილი"
          onClick={() => navigate("/profile")}
        >
          <Avatar
            imageUrl={profile?.avatar_url || undefined}
            emoji={profile?.nickname?.charAt(0) || "👤"}
            size="sm"
          />
        </NavButton>
      </div>

      {/* Bottom Section */}
      <div className="px-2 xl:px-3 space-y-1 mt-auto">
        <NavButton
          icon={Menu}
          label="მეტი"
          onClick={() => {}}
        />
      </div>
    </nav>
  );
}
