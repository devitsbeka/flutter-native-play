import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Compass, 
  Store, 
  Trophy, 
  Users, 
  Bell, 
  Menu,
  Settings,
  HelpCircle,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { usePendingChallenges } from "@/hooks/usePendingChallenges";
import { Avatar } from "@/components/shared/Avatar";
import { DesktopPlayButton } from "./DesktopPlayButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UnifiedDesktopNavProps {
  onPlayClick?: () => void;
  playsRemaining?: number;
  maxPlays?: number;
  canPlay?: boolean;
  isVip?: boolean;
  showPlayButton?: boolean;
}

const navItems = [
  { id: "home", label: "მთავარი", icon: Home, path: "/" },
  { id: "explore", label: "აღმოჩენა", icon: Compass, path: "/discover" },
  { id: "shop", label: "მაღაზია", icon: Store, path: "/power-ups" },
  { id: "rank", label: "რეიტინგი", icon: Trophy, path: "/leaderboards" },
  { id: "team", label: "გუნდი", icon: Users, path: "/team" },
];

export function UnifiedDesktopNav({
  onPlayClick,
  playsRemaining = 5,
  maxPlays = 5,
  canPlay = true,
  isVip = false,
  showPlayButton = true,
}: UnifiedDesktopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { pendingChallenges } = usePendingChallenges();
  const pendingCount = pendingChallenges?.length || 0;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // NavButton component for consistency
  const NavButton = ({
    icon: Icon,
    label,
    onClick,
    active = false,
    badge,
    children,
  }: {
    icon?: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
    badge?: number;
    children?: React.ReactNode;
  }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl
              transition-colors duration-200
              ${active 
                ? 'bg-primary/10 text-foreground font-semibold' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative flex items-center justify-center w-6 h-6">
              {children || (Icon && (
                <Icon 
                  className={`w-6 h-6 ${active ? 'stroke-[2.5]' : ''}`}
                />
              ))}
              {badge && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            {/* Label - hidden on tablet (lg), visible on desktop (xl) */}
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
    <nav className="hidden lg:flex flex-col w-[72px] xl:w-[220px] min-w-[72px] xl:min-w-[220px] h-screen sticky top-0 border-r border-border/40 bg-background/95 backdrop-blur-sm pt-6 pb-4 transition-all duration-200 z-40">
      {/* Logo */}
      <div className="px-3 xl:px-4 mb-6 flex justify-center xl:justify-start">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-display font-bold text-foreground cursor-pointer"
          onClick={() => navigate("/")}
        >
          {/* Icon on tablet, full text on desktop */}
          <span className="xl:hidden text-2xl">🎯</span>
          <span className="hidden xl:inline">MyTrivia</span>
        </motion.div>
      </div>

      {/* Main Navigation */}
      <div className="px-2 xl:px-3 space-y-1">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            icon={item.icon}
            label={item.label}
            onClick={() => navigate(item.path)}
            active={isActive(item.path)}
            badge={item.id === "team" ? pendingCount : undefined}
          />
        ))}

        {/* Notifications with badge */}
        <NavButton
          icon={Bell}
          label="შეტყობინებები"
          onClick={() => navigate("/notifications")}
          active={isActive("/notifications")}
          badge={unreadCount}
        />

        {/* Profile */}
        <NavButton
          label="პროფილი"
          onClick={() => navigate("/profile")}
          active={isActive("/profile")}
        >
          <Avatar
            imageUrl={profile?.avatar_url || undefined}
            emoji={profile?.nickname?.charAt(0) || "👤"}
            size="sm"
          />
        </NavButton>
      </div>

      {/* Play Button - Positioned in middle section */}
      {showPlayButton && (
        <div className="px-2 xl:px-3 py-4">
          <DesktopPlayButton
            onClick={onPlayClick}
            playsRemaining={playsRemaining}
            maxPlays={maxPlays}
            canPlay={canPlay}
            isVip={isVip}
            isCompact={false}
          />
        </div>
      )}

      {/* Bottom Section - More menu */}
      <div className="px-2 xl:px-3 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Menu className="w-6 h-6" />
              <span className="text-[15px] hidden xl:inline">მეტი</span>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              პარამეტრები
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/support")}>
              <HelpCircle className="mr-2 h-4 w-4" />
              დახმარება
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              გასვლა
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
