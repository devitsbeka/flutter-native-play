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
  LogOut,
  ChevronDown,
  User,
  Plus,
  Shield,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { usePendingChallenges } from "@/hooks/usePendingChallenges";
import { Avatar } from "@/components/shared/Avatar";
import { DesktopPlayButton } from "./DesktopPlayButton";
import { LiveBadge } from "@/components/social/LiveBadge";
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
              {children ? children : Icon ? (
                <Icon 
                  className="w-6 h-6"
                  strokeWidth={active ? 2.5 : 1.5}
                />
              ) : null}
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            {/* Label - hidden on small tablet (md), visible on larger tablet/desktop (lg) */}
            <span className="text-[15px] hidden lg:inline">{label}</span>
          </motion.button>
        </TooltipTrigger>
        {/* Tooltip only shows on small tablet (md) where label is hidden */}
        <TooltipContent side="right" className="lg:hidden">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <nav className="hidden md:flex flex-col w-[72px] lg:w-[220px] min-w-[72px] lg:min-w-[220px] h-screen sticky top-0 border-r border-white/30 bg-white/85 backdrop-blur-xl pt-6 pb-4 transition-all duration-200 z-50">
      {/* Logo */}
      <div className="px-3 lg:px-4 mb-4 flex justify-center lg:justify-start">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <span className="lg:hidden text-2xl">🎯</span>
          <span className="hidden lg:flex items-center">
            <span className="text-xl font-slackey text-foreground tracking-tight">MyTrivia</span>
            <LiveBadge />
          </span>
        </motion.div>
      </div>

      {/* Profile Dropdown - at top */}
      <div className="px-2 lg:px-3 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-foreground hover:bg-muted/50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Avatar
                  imageUrl={profile?.avatar_url || undefined}
                  emoji={profile?.nickname?.charAt(0) || "👤"}
                  size="xs"
                  className="!w-6 !h-6"
                />
              </div>
              <span className="text-[15px] font-medium hidden lg:inline truncate flex-1 text-left">
                {profile?.nickname || "მომხმარებელი"}
              </span>
              <ChevronDown className="w-4 h-4 hidden lg:block text-muted-foreground" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
              პროფილის ნახვა
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              ექაუნთის დამატება
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Navigation */}
      <div className="px-2 lg:px-3 space-y-1">
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
      </div>


      {/* Bottom Section - More menu */}
      <div className="px-2 lg:px-3 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Menu className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-[15px] hidden lg:inline">მეტი</span>
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
            <DropdownMenuItem onClick={() => navigate("/privacy-policy")}>
              <Shield className="mr-2 h-4 w-4" strokeWidth={1.5} />
              კონფიდენციალურობა
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/terms")}>
              <FileText className="mr-2 h-4 w-4" strokeWidth={1.5} />
              მომსახურების პირობები
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
