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
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import { DesktopPlayButton } from "./DesktopPlayButton";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
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
  const { coins, gems } = useCurrency();
  const pendingCount = pendingChallenges?.length || 0;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // NavButton component for consistency - all icons use strokeWidth 1.5
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
                  className="w-6 h-6"
                  strokeWidth={active ? 2.5 : 1.5}
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

        {/* Profile - 15% smaller avatar (20px instead of 24px) */}
        <NavButton
          label="პროფილი"
          onClick={() => navigate("/profile")}
          active={isActive("/profile")}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <Avatar
              imageUrl={profile?.avatar_url || undefined}
              emoji={profile?.nickname?.charAt(0) || "👤"}
              size="xs"
              className="!w-5 !h-5"
            />
          </div>
        </NavButton>
      </div>

      {/* Currency Display + Play Button Section */}
      <div className="px-2 xl:px-3 py-4 mt-2 space-y-3">
        {/* Currency Display */}
        <div className="flex flex-col xl:flex-row items-center justify-center gap-2">
          {/* Coins */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border/50"
                  whileHover={{ scale: 1.05 }}
                >
                  <img src={coinIcon} alt="Coins" className="w-4 h-4" />
                  <span className="text-xs font-bold text-foreground hidden xl:inline">
                    {formatCompactNumber(coins)}
                  </span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" className="xl:hidden">
                {formatCompactNumber(coins)} მონეტა
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Gems */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border/50"
                  whileHover={{ scale: 1.05 }}
                >
                  <img src={gemIcon} alt="Gems" className="w-4 h-4" />
                  <span className="text-xs font-bold text-foreground hidden xl:inline">
                    {formatCompactNumber(gems)}
                  </span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" className="xl:hidden">
                {formatCompactNumber(gems)} ბრილიანტი
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Play Button - smaller version in nav */}
        {showPlayButton && (
          <DesktopPlayButton
            onClick={onPlayClick}
            playsRemaining={playsRemaining}
            maxPlays={maxPlays}
            canPlay={canPlay}
            isVip={isVip}
            isCompact={true}
            size="md"
          />
        )}
      </div>

      {/* Bottom Section - More menu */}
      <div className="px-2 xl:px-3 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Menu className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-[15px] hidden xl:inline">მეტი</span>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
              პარამეტრები
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/support")}>
              <HelpCircle className="mr-2 h-4 w-4" strokeWidth={1.5} />
              დახმარება
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
              გასვლა
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
