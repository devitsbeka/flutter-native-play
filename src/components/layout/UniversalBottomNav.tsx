import { useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Home, Play, Compass, Store, Trophy, Headphones, Plus, Hourglass, Lock } from "lucide-react";
import { t } from "@/lib/i18n";
import { usePendingChallenges } from "@/hooks/usePendingChallenges";
import { useNewContentIndicators } from "@/hooks/useNewContentIndicators";
import { useNavigationPrefetch } from "@/hooks/useNavigationPrefetch";
import { toast } from "sonner";
import { GuestMaxPlaysModal } from "@/components/home/GuestMaxPlaysModal";

// Eager preload main route chunks for instant navigation
const preloadRouteChunks = () => {
  import("@/pages/Discover");
  import("@/pages/PowerUps");
  import("@/pages/Leaderboards");
  import("@/pages/TeamV2");
};
interface UniversalBottomNavProps {
  onPlayClick?: () => void;
  onTeamClick?: () => void;
  onTeamPlayClick?: () => void;
  playsRemaining?: number;
  maxPlays?: number;
  canPlay?: boolean;
  isVip?: boolean;
  vipLoading?: boolean;
  onWatchAdClick?: () => void;
  isGuest?: boolean;
  hidden?: boolean;
  vipExpiresAt?: string;
}

export function UniversalBottomNav({ 
  onPlayClick, 
  onTeamClick, 
  onTeamPlayClick,
  playsRemaining = 5,
  maxPlays = 5,
  canPlay = true,
  isVip = false,
  vipLoading = false,
  onWatchAdClick,
  isGuest = false,
  hidden = false,
  vipExpiresAt,
}: UniversalBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingChallenges } = usePendingChallenges();
  const { indicators } = useNewContentIndicators();
  const { prefetchRoute } = useNavigationPrefetch();
  
  const isHome = location.pathname === "/";
  const isTeam = location.pathname === "/team";
  const isActive = (path: string) => location.pathname === path;

  // Eager preload all main route chunks after initial render
  useEffect(() => {
    const timer = setTimeout(preloadRouteChunks, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Prefetch route data and code on touch start (mobile)
  const handleRouteTouchStart = useCallback((path: string) => {
    prefetchRoute(path);
  }, [prefetchRoute]);

  // Determine center button behavior
  const showPlayButton = isHome;
  const isPurpleVariant = false;

  const handleCenterClick = () => {
    if (isHome) {
      onPlayClick?.();
    } else {
      navigate("/");
    }
  };

  const [showGuestModal, setShowGuestModal] = useState(false);

  const handleLockedNavClick = () => {
    setShowGuestModal(true);
  };

  // Hide nav when requested (e.g., when side menu is open)
  if (hidden) {
    return (
      <GuestMaxPlaysModal
        isOpen={showGuestModal}
        isBlocking={false}
        onClose={() => setShowGuestModal(false)}
        onRegister={() => {
          setShowGuestModal(false);
          navigate("/auth?mode=signup");
        }}
        onContinuePlaying={() => setShowGuestModal(false)}
      />
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 overflow-visible">
      {/* Wave divider at top */}
      <svg 
        className="absolute w-full" 
        style={{ top: -14, left: 0, right: 0 }}
        height="16" 
        viewBox="0 0 1440 16" 
        preserveAspectRatio="none"
      >
        <path 
          d="M0,14 C180,4 360,16 540,8 C720,0 900,16 1080,10 C1260,4 1380,14 1440,6 L1440,16 L0,16 Z" 
          fill="#F8F9FA"
        />
      </svg>
      
      {/* Solid color container */}
      <div 
        className="relative overflow-visible"
        style={{
          background: "#F8F9FA",
          // Half the home-indicator inset, not all of it. The row already
          // carries py-5, so reserving the full 34px put roughly 54px of
          // empty bar under the icons and floated the whole nav visibly high.
          // Half keeps the icons clear of the indicator without the gap
          // reading as a mistake. The floor matters on devices with no
          // indicator at all, where the inset is 0.
          paddingBottom: "max(0.25rem, calc(env(safe-area-inset-bottom, 0px) / 2))",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08), 0 -1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Navigation items container */}
        <div className="flex items-center py-5 min-h-[80px] overflow-visible">
          {/* Explore - always accessible */}
          <div 
            className="flex-1 flex justify-center"
            onTouchStart={() => handleRouteTouchStart("/discover")}
          >
            <NavButton
              onboardingId="explore"
              onClick={() => {
                if (isActive("/discover")) {
                  const mainEl = document.getElementById("main-scroll-container");
                  if (mainEl) {
                    mainEl.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                } else {
                  navigate("/discover");
                }
              }}
              isActive={isActive("/discover")}
              icon={Compass}
              hasNewContent={indicators.explore}
              isLocked={false}
            />
          </div>

          {/* Shop - always accessible */}
          <div 
            className="flex-1 flex justify-center pr-4"
            onTouchStart={() => handleRouteTouchStart("/power-ups")}
          >
            <NavButton
              onboardingId="shop"
              onClick={() => {
                if (isActive("/power-ups")) {
                  const mainEl = document.getElementById("main-scroll-container");
                  if (mainEl) {
                    mainEl.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                } else {
                  navigate("/power-ups");
                }
              }}
              isActive={isActive("/power-ups")}
              icon={Store}
              hasNewContent={indicators.shop}
              isLocked={false}
            />
          </div>

          {/* Center Play Button - floats above, overlapping nav bar */}
          <div className="flex-1 flex justify-center overflow-visible pointer-events-auto" style={{ zIndex: 60 }}>
            <div 
              className="relative overflow-visible pointer-events-auto" 
              style={{ width: 90, height: 90, marginTop: -42, zIndex: 60 }}
            >
              <Hex3DPlayButton 
                onClick={handleCenterClick}
                isPlayButton={showPlayButton}
                isPlusIcon={false}
                variant={isVip ? "gold" : canPlay ? (new Date() < new Date("2026-02-22T23:59:59") ? "gold" : "mint") : "exhausted"}
                playsRemaining={playsRemaining}
                maxPlays={maxPlays}
                isVip={isVip}
                canPlay={canPlay}
                isLoading={vipLoading}
                vipExpiresAt={vipExpiresAt}
              />
            </div>
          </div>

          {/* Rank */}
          <div 
            className="flex-1 flex justify-center pl-4"
            onTouchStart={() => handleRouteTouchStart("/leaderboards")}
          >
            <NavButton
              onboardingId="rank"
              onClick={isGuest ? handleLockedNavClick : () => {
                if (isActive("/leaderboards")) {
                  // Leaderboards has its own scroll container on mobile
                  const leaderboardEl = document.getElementById("leaderboard-scroll-container");
                  const mainEl = document.getElementById("main-scroll-container");
                  if (leaderboardEl) {
                    leaderboardEl.scrollTo({ top: 0, behavior: "smooth" });
                  } else if (mainEl) {
                    mainEl.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                } else {
                  navigate("/leaderboards");
                }
              }}
              isActive={isActive("/leaderboards")}
              icon={Trophy}
              hasNewContent={!isGuest && indicators.rank}
              isLocked={isGuest}
            />
          </div>

          {/* Team */}
          <div 
            className="flex-1 flex justify-center"
            onTouchStart={() => handleRouteTouchStart("/team")}
          >
            <NavButton
              onboardingId="team"
              onClick={isGuest ? handleLockedNavClick : () => {
                if (isActive("/team")) {
                  const mainEl = document.getElementById("main-scroll-container");
                  if (mainEl) {
                    mainEl.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                } else {
                  (onTeamClick || (() => navigate("/team")))();
                }
              }}
              isActive={isActive("/team")}
              icon={Headphones}
              badgeCount={isGuest ? 0 : pendingChallenges.length}
              hasNewContent={!isGuest && indicators.team}
              isLocked={isGuest}
            />
          </div>
        </div>
      </div>

      <GuestMaxPlaysModal
        isOpen={showGuestModal}
        isBlocking={false}
        onClose={() => setShowGuestModal(false)}
        onRegister={() => {
          setShowGuestModal(false);
          navigate("/auth?mode=signup");
        }}
        onContinuePlaying={() => setShowGuestModal(false)}
      />
    </div>
  );
}

function NavButton({ 
  onClick, 
  isActive, 
  icon: Icon,
  badgeCount = 0,
  hasNewContent = false,
  isLocked = false,
  onboardingId,
}: { 
  onClick: () => void;
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  badgeCount?: number;
  hasNewContent?: boolean;
  isLocked?: boolean;
  onboardingId?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-onboarding-id={onboardingId}
      className="relative flex flex-col items-center justify-center w-14 h-12 flex-shrink-0 gap-1 active:scale-95 transition-transform duration-75"
    >
      <div className="relative" style={{ opacity: isLocked ? 0.35 : isActive ? 1 : 0.5 }}>
        {/* Icon */}
        <div className="w-8 h-8 flex items-center justify-center">
          <Icon className="w-6 h-6 text-gray-800" />
        </div>
        
        {/* Lock indicator for guests */}
        {isLocked && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(180deg, #6B7280 0%, #4B5563 100%)",
              boxShadow: "0 2px 4px rgba(75, 85, 99, 0.5)",
            }}
          >
            <Lock className="w-2.5 h-2.5 text-white" />
          </div>
        )}
        
        {/* Badge count (for Team challenges) */}
        {!isLocked && badgeCount > 0 && (
          <div
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(180deg, #FF6B6B 0%, #EF4444 100%)",
              boxShadow: "0 2px 4px rgba(239, 68, 68, 0.5)",
            }}
          >
            <span className="text-[9px] font-bold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          </div>
        )}
        
        {/* Purple "new content" indicator dot */}
        {!isLocked && hasNewContent && badgeCount === 0 && (
          <div
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
            style={{
              background: "linear-gradient(180deg, #A855F7 0%, #9333EA 100%)",
              boxShadow: "0 0 6px rgba(168, 85, 247, 0.6)",
            }}
          />
        )}
      </div>
      
      {/* Active indicator dot */}
      {!isLocked && (
        <div
          className={`w-1 h-1 rounded-full transition-all duration-150 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          style={{
            background: "linear-gradient(180deg, #5EE8B5 0%, #3FC99A 100%)",
            boxShadow: "0 0 4px rgba(94, 232, 181, 0.6)",
          }}
        />
      )}
    </button>
  );
}

// VIP Badge with countdown support
function VipBadge({ vipExpiresAt }: { vipExpiresAt?: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!vipExpiresAt) return;

    const DAY_MS = 24 * 60 * 60 * 1000;

    const calcTimeLeft = () => {
      const diff = new Date(vipExpiresAt).getTime() - Date.now();
      if (diff <= 0) return "";
      if (diff > DAY_MS) return ""; // more than 24h
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    let interval: number | undefined;
    let timeout: number | undefined;

    const clearTimers = () => {
      if (interval !== undefined) { clearInterval(interval); interval = undefined; }
      if (timeout !== undefined) { clearTimeout(timeout); timeout = undefined; }
    };

    // Tick at 1s only inside the final 24h; before that a single timeout waits
    // for the 24h boundary (setTimeout delay is clamped to the int32 max).
    const schedule = () => {
      clearTimers();
      setTimeLeft(calcTimeLeft());
      const diff = new Date(vipExpiresAt).getTime() - Date.now();
      if (diff <= 0) return; // expired — badge shows ∞ / nothing to count
      if (diff > DAY_MS) {
        timeout = window.setTimeout(schedule, Math.min(diff - DAY_MS, 2_147_483_647));
      } else {
        interval = window.setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearTimers();
      } else {
        schedule();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    if (document.hidden) {
      setTimeLeft(calcTimeLeft());
    } else {
      schedule();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimers();
    };
  }, [vipExpiresAt]);

  return (
    <div 
      className="flex items-center gap-0.5 px-2 py-0.5 rounded-full"
      style={{
        background: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
        boxShadow: "0 2px 6px rgba(217, 119, 6, 0.5)",
      }}
    >
      {timeLeft ? (
        <span className="text-[9px] font-bold text-white tabular-nums">{timeLeft}</span>
      ) : (
        <span className="text-[12px] font-bold text-white">∞</span>
      )}
    </div>
  );
}

interface Hex3DPlayButtonProps {
  onClick: () => void;
  isPlayButton: boolean;
  isPlusIcon?: boolean;
  variant?: "mint" | "purple" | "gold" | "exhausted";
  playsRemaining?: number;
  maxPlays?: number;
  isVip?: boolean;
  canPlay?: boolean;
  isLoading?: boolean;
  vipExpiresAt?: string;
}

function Hex3DPlayButton({ 
  onClick, 
  isPlayButton, 
  isPlusIcon = false, 
  variant = "mint",
  playsRemaining = 5,
  maxPlays = 5,
  isVip = false,
  canPlay = true,
  isLoading = false,
  vipExpiresAt,
}: Hex3DPlayButtonProps) {
  const colorSchemes = {
    mint: {
      depth: "linear-gradient(180deg, #5DD8B0 0%, #4BC9A0 50%, #3DB890 100%)",
      bevel: "linear-gradient(180deg, #7EECC5 0%, #6ADDB5 100%)",
      face: "radial-gradient(circle at 40% 35%, #8AFFDA 0%, #6EFFC2 25%, #5EE8B5 50%, #4DD8A5 75%, #3FC99A 100%)",
      sparkle: "rgba(180,255,220,0.95)",
      sparkleShadow: "0 0 6px rgba(150,255,210,0.9), 0 0 10px rgba(100,230,180,0.6)",
    },
    purple: {
      depth: "linear-gradient(180deg, #6B21A8 0%, #581C87 50%, #4C1D95 100%)",
      bevel: "linear-gradient(180deg, #A855F7 0%, #9333EA 100%)",
      face: "radial-gradient(circle at 40% 35%, #C084FC 0%, #A855F7 25%, #9333EA 50%, #7C3AED 75%, #6D28D9 100%)",
      sparkle: "rgba(220,180,255,0.95)",
      sparkleShadow: "0 0 6px rgba(200,150,255,0.9), 0 0 10px rgba(160,100,230,0.6)",
    },
    gold: {
      depth: "linear-gradient(180deg, #D97706 0%, #B45309 50%, #92400E 100%)",
      bevel: "linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)",
      face: "radial-gradient(circle at 40% 35%, #FDE68A 0%, #FCD34D 25%, #FBBF24 50%, #F59E0B 75%, #D97706 100%)",
      sparkle: "rgba(255,230,150,0.95)",
      sparkleShadow: "0 0 6px rgba(255,220,100,0.9), 0 0 10px rgba(250,200,80,0.6)",
    },
    exhausted: {
      depth: "linear-gradient(180deg, #6B7280 0%, #4B5563 50%, #374151 100%)",
      bevel: "linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)",
      face: "radial-gradient(circle at 40% 35%, #D1D5DB 0%, #9CA3AF 25%, #6B7280 50%, #4B5563 75%, #374151 100%)",
      sparkle: "rgba(200,200,200,0.5)",
      sparkleShadow: "0 0 4px rgba(180,180,180,0.5)",
    },
  };

  const colors = colorSchemes[variant];
  const showExhausted = variant === "exhausted" && isPlayButton;
  const isPromo = !isVip && variant === "gold" && new Date() < new Date("2026-02-22T23:59:59");
  const [showGlow, setShowGlow] = useState(isPromo);

  useEffect(() => {
    if (isPromo) {
      const timer = setTimeout(() => setShowGlow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isPromo]);

  // Listen for pro-gift-claimed event to trigger glow
  useEffect(() => {
    const handler = () => {
      setShowGlow(true);
      setTimeout(() => setShowGlow(false), 3000);
    };
    window.addEventListener("pro-gift-claimed", handler);
    return () => window.removeEventListener("pro-gift-claimed", handler);
  }, []);

  return (
    <div className="relative pointer-events-auto">
      {/* Promo golden glow animation */}
      {showGlow && (
        <motion.div
          className="absolute rounded-full"
          style={{ inset: -8, zIndex: 55 }}
          initial={{ opacity: 0.8, scale: 0.95 }}
          animate={{ 
            opacity: [0.8, 0.4, 0.8, 0],
            scale: [0.95, 1.15, 1.05, 1.2],
          }}
          transition={{ duration: 2, ease: "easeOut" }}
          onAnimationComplete={() => setShowGlow(false)}
        >
          <div className="w-full h-full rounded-full" style={{
            background: "radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0) 70%)",
            boxShadow: "0 0 30px rgba(251,191,36,0.6), 0 0 60px rgba(251,191,36,0.3)",
          }} />
        </motion.div>
      )}
      {/* Badge above button */}
      {isPlayButton && !isPlusIcon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-[70]"
        >
          {isVip ? (
            // VIP badge - countdown if expiring within 24h, otherwise infinity
            <VipBadge vipExpiresAt={vipExpiresAt} />
          ) : canPlay ? (
            // Plays remaining badge
            <div 
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full"
              style={{
                background: "linear-gradient(180deg, #5EE8B5 0%, #3FC99A 100%)",
                boxShadow: "0 2px 6px rgba(94, 232, 181, 0.4)",
              }}
            >
              <span className="text-[10px] font-bold text-white">{playsRemaining}/{maxPlays}</span>
            </div>
          ) : (
            // Exhausted badge
            <motion.div 
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: "linear-gradient(180deg, #6B7280 0%, #4B5563 100%)",
                boxShadow: "0 2px 6px rgba(75, 85, 99, 0.4)",
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Hourglass className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">0</span>
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.button
        onClick={onClick}
        data-onboarding-id="play"
        className="relative z-[60]"
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.92, y: 4 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        style={{ width: 90, height: 90, cursor: 'pointer' }}
      >
        {/* Bottom 3D depth layer */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 0,
            top: 6,
            background: colors.depth,
          }}
        />
        
        {/* Middle bevel layer */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 3,
            top: 4,
            bottom: 8,
            background: colors.bevel,
          }}
        />
        
        {/* Main face - radial gradient */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            inset: 4,
            top: 0,
            bottom: 12,
            background: colors.face,
          }}
        >
          
          {/* Sparkle particles */}
          {variant !== "exhausted" && [...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: i % 2 === 0 ? 4 : 3,
                height: i % 2 === 0 ? 4 : 3,
                background: colors.sparkle,
                boxShadow: colors.sparkleShadow,
                left: `${20 + (i * 12)}%`,
                top: `${25 + ((i % 3) * 18)}%`,
              }}
              animate={{
                y: [-5, 5, -5],
                x: [i % 2 === 0 ? -3 : 3, i % 2 === 0 ? 3 : -3, i % 2 === 0 ? -3 : 3],
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                duration: 1.5 + (i * 0.25),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
          
          {/* Icon */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
          >
            {isPlusIcon ? (
              <Plus 
                className="w-8 h-8" 
                color="#ffffff"
                strokeWidth={3}
              />
            ) : showExhausted ? (
              <motion.div
                animate={{ rotate: [0, 180] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Hourglass 
                  className="w-7 h-7" 
                  color="#ffffff"
                  strokeWidth={2.5}
                />
              </motion.div>
            ) : isPlayButton ? (
              /* PRO players get the play triangle too. The button's job is to
                 start a game, and the crown answered a question nobody was
                 asking at that moment — the ∞ badge above it already says the
                 plays are unlimited. */
              <Play 
                className="w-8 h-8 ml-1" 
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth={0}
              />
            ) : (
              <Home 
                className="w-7 h-7" 
                color="#ffffff"
                strokeWidth={2.5}
              />
            )}
          </div>
        </div>

        {/* Progress ring for exhausted state */}
        {showExhausted && (
          <svg 
            className="absolute inset-0 w-full h-full" 
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="45"
              cy="45"
              r="40"
              fill="none"
              stroke="rgba(94, 232, 181, 0.3)"
              strokeWidth="4"
            />
            <motion.circle
              cx="45"
              cy="45"
              r="40"
              fill="none"
              stroke="#5EE8B5"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              style={{ 
                strokeDasharray: "251.2",
              }}
            />
          </svg>
        )}
      </motion.button>

    </div>
  );
}
