import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import logoDark from "@/assets/mytrivia-logo.svg";
import {
  Home,
  Compass,
  Store,
  Trophy,
  Users,
  Lock,
  PanelLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { usePendingChallenges } from "@/hooks/usePendingChallenges";
import crownIcon from "@/assets/crown-icon.png";

import { useNavigationPrefetch } from "@/hooks/useNavigationPrefetch";
import { Avatar } from "@/components/shared/Avatar";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { useLanguage } from "@/contexts/LanguageContext";


interface UnifiedDesktopNavProps {
  onPlayClick?: () => void;
  playsRemaining?: number;
  maxPlays?: number;
  canPlay?: boolean;
  isVip?: boolean;
  showPlayButton?: boolean;
}

// Items that require authentication
const LOCKED_FOR_GUESTS = ["rank", "team"];

const NAV_ITEM_DEFS = [
  { id: "home", icon: Home, path: "/", labelKey: "extra.navHome" },
  { id: "explore", icon: Compass, path: "/discover", labelKey: "extra.navDiscover" },
  { id: "shop", icon: Store, path: "/power-ups", labelKey: "extra.navShop" },
  { id: "rank", icon: Trophy, path: "/leaderboards", labelKey: "extra.navRating" },
  { id: "team", icon: Users, path: "/team", labelKey: "extra.navOnlineGame" },
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
  const { profile, user } = useAuth();
  // PRO badge/stroke on the profile button — read from the VIP context rather
  // than the isVip prop, which not every page passes down
  const { isVip: isProUser } = useVipStatus();
  const { pendingChallenges } = usePendingChallenges();
  const pendingCount = pendingChallenges?.length || 0;
  const { prefetchRoute } = useNavigationPrefetch();
  const { t } = useLanguage();

  const navItems = NAV_ITEM_DEFS.map(item => ({ ...item, label: t(item.labelKey) }));

  // Guest detection
  const isGuest = !user && !profile;
  
  // Collapsed: the wide (lg+) sidebar shrinks to the icon rail; persisted
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem("sidebar_collapsed", prev ? "0" : "1");
      } catch { /* ignore */ }
      return !prev;
    });
  };

  // Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Prefetch route data and code on hover
  const handleNavHover = useCallback((path: string) => {
    prefetchRoute(path);
  }, [prefetchRoute]);

  // Handle locked nav click
  const handleNavClick = (item: typeof navItems[0]) => {
    const isLocked = isGuest && LOCKED_FOR_GUESTS.includes(item.id);
    
    if (isLocked) {
      setPendingNavPath(item.path);
      setShowAuthModal(true);
      return;
    }
    
    if (isActive(item.path)) {
      // Already on this page - scroll to top
      if (item.path === "/team") {
        const mainEl = document.getElementById("team-main-content");
        if (mainEl) {
          mainEl.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      navigate(item.path);
    }
  };

  // NavButton component for consistency - all icons use strokeWidth 1.5
  const NavButton = ({
    icon: Icon,
    label,
    onClick,
    active = false,
    badge,
    children,
    isLocked = false,
    onboardingId,
  }: {
    icon?: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
    badge?: number;
    children?: React.ReactNode;
    isLocked?: boolean;
    onboardingId?: string;
  }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            data-onboarding-id={onboardingId}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl
              transition-all duration-200
              ${active 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
              }
              ${isLocked ? 'opacity-60' : ''}
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative flex items-center justify-center w-6 h-6">
              {children ? children : Icon ? (
                <Icon 
                  className={`w-6 h-6 transition-all ${active ? 'text-primary' : ''}`}
                  strokeWidth={active ? 2 : 1.5}
                />
              ) : null}
              {isLocked && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                </span>
              )}
              {badge !== undefined && badge > 0 && !isLocked && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            {/* Label - hidden on small tablet (md) and when collapsed */}
            <span className={`text-[15px] hidden ${collapsed ? "" : "lg:inline"}`}>{label}</span>
          </motion.button>
        </TooltipTrigger>
        {/* Tooltip shows wherever the label is hidden */}
        <TooltipContent side="right" className={collapsed ? "" : "lg:hidden"}>
          {isLocked ? `${label} 🔒` : label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      <nav className={`hidden md:flex flex-col w-[72px] min-w-[72px] ${collapsed ? "" : "lg:w-[220px] lg:min-w-[220px]"} h-screen sticky top-0 border-r border-purple-900/20 bg-white/50 backdrop-blur-xl pt-[14px] lg:pt-4 pb-4 transition-all duration-200 z-50`}>

        {/* Logo + collapse toggle (lg+). Expanded: wordmark left, panel
            toggle right. Collapsed: crown-only logo with the centered
            toggle stacked under it. */}
        {collapsed ? (
          <div className="hidden lg:flex flex-col items-center gap-2 mb-4">
            <button onClick={() => navigate("/")} aria-label="MyTrivia" className="cursor-pointer">
              <img src={crownIcon} alt="MyTrivia" className="h-8 w-8 object-contain select-none" draggable={false} />
            </button>
            <button
              onClick={toggleCollapsed}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-between px-4 mb-4">
            <button onClick={() => navigate("/")} aria-label="MyTrivia" className="flex items-center cursor-pointer">
              <img src={logoDark} alt="MyTrivia" className="h-10 w-auto select-none" draggable={false} />
            </button>
            <button
              onClick={toggleCollapsed}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Subtle separator between logo and navigation */}
        <div className={`${collapsed ? "hidden" : "hidden lg:block"} mx-4 mb-4 border-t border-purple-900/10`} />

        {/* Main Navigation */}
        <div className="px-2 lg:px-3 space-y-1">
          {navItems.map((item) => {
            const isLockedItem = isGuest && LOCKED_FOR_GUESTS.includes(item.id);
              return (
                <div 
                  key={item.id}
                  onMouseEnter={() => !isLockedItem && handleNavHover(item.path)}
                  onFocus={() => !isLockedItem && handleNavHover(item.path)}
              >
                <NavButton
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleNavClick(item)}
                  active={isActive(item.path)}
                  badge={item.id === "team" ? pendingCount : undefined}
                  isLocked={isLockedItem}
                  onboardingId={["explore", "shop", "rank", "team"].includes(item.id) ? item.id : undefined}
                />
              </div>
            );
          })}

        </div>

        {/* Promo Card - Desktop only, guests only */}
        {!profile && (
          <div className={`${collapsed ? "hidden" : "hidden lg:block"} px-3 mt-auto mb-4`}>
            <motion.button
              onClick={() => navigate("/auth")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl p-4 relative overflow-hidden text-left cursor-pointer"
              style={{
                background: "linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(79, 70, 229, 0.08) 100%)",
                border: "1px solid rgba(147, 51, 234, 0.15)",
              }}
            >
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary/10 blur-xl" />
              <div className="absolute -bottom-2 -left-2 w-12 h-12 rounded-full bg-indigo-500/10 blur-lg" />
              
              <div className="relative z-10">
                <h3 className="font-bold text-foreground text-sm mb-1">
                  {t("extra.promoJoinFriends")}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {t("extra.promoPlayTrivia")}
                </p>
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-primary-foreground"
                  style={{
                    background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.9) 100%)",
                    boxShadow: "0 2px 0 hsl(var(--primary)/0.3), 0 2px 8px hsl(var(--primary)/0.2)",
                  }}
                >
                  {t("extra.promoPlayFree")}
                </div>
              </div>
            </motion.button>
          </div>
        )}

        {/* Bottom Section - profile */}
        <div className={`px-2 lg:px-3 space-y-2 ${profile ? 'mt-auto' : ''}`}>
          {/* Profile Button - at the very bottom */}
          {/* Icon rail (tablet, or collapsed desktop): avatar only */}
          <div className={`md:flex ${collapsed ? "" : "lg:hidden"} items-center justify-center`}>
            <div
              className={`relative rounded-full p-1 w-12 h-12 aspect-square flex items-center justify-center cursor-pointer ${
                isProUser ? "ring-2 ring-[#E3BC37]" : ""
              }`}
              style={{
                background: "linear-gradient(145deg, #FFFFFF 0%, #F5F3FA 100%)",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.9)",
              }}
              onClick={() => {
                prefetchRoute("/profile");
                navigate("/profile");
              }}
            >
              <SmartAvatar
                avatarUrl={profile?.avatar_url}
                animatedAvatarUrl={profile?.animated_avatar_url}
                fallback={profile?.nickname?.charAt(0) || "?"}
                size="sm"
                playOnHover
                clickable
              />
            </div>
          </div>

          {/* Desktop: full profile button */}
          <motion.button
            onClick={() => {
              prefetchRoute("/profile");
              navigate("/profile");
            }}
            className={`${collapsed ? "hidden" : "hidden lg:flex"} w-full items-center gap-3 px-3 py-2.5 rounded-full text-foreground transition-colors`}
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
              boxShadow: "0 3px 0 #D8D0E8, 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
              border: "2px solid #E8E0F5",
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isProUser ? "ring-2 ring-[#E3BC37]" : ""
              }`}
            >
              <Avatar
                imageUrl={profile?.avatar_url || undefined}
                emoji={profile?.nickname?.charAt(0) || "👤"}
                size="xs"
                className="!w-6 !h-6"
              />
            </div>
            <span className="text-[15px] font-medium truncate flex-1 text-left">
              {profile?.nickname || t("extra.guestUser")}
            </span>
            {isProUser && (
              <img src={crownIcon} alt="PRO" className="w-5 h-5 shrink-0 select-none" draggable={false} />
            )}
          </motion.button>
        </div>
      </nav>


      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingNavPath(null);
        }}
        returnToPath={pendingNavPath || undefined}
        message={t("extra.authRequiredMessage")}
      />
    </>
  );
}
