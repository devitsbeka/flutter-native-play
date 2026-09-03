import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, User, Play, Compass, Store, Trophy, Headphones, Settings, ChevronRight, LogOut, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { Avatar } from "@/components/shared/Avatar";
import { GreenPlayButton } from "@/components/shared/GreenPlayButton";
import { MissionsModal } from "./MissionsModal";
import { DailyRewardsModal } from "./DailyRewardsModal";
import { ChestRewardModal } from "./ChestRewardModal";
import { calculateLevel } from "@/utils/levelCalculation";
import { usePlayGuard } from "@/contexts/PlayGuardContext";

import { TeamMenuScreen } from "@/components/team/TeamMenuScreen";
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Navigation items that replace bottom nav
const navItemsConfig = [
  { icon: Compass, labelKey: "menu.discover", route: "/discover" },
  { icon: Store, labelKey: "menu.shop", route: "/power-ups" },
  { icon: Trophy, labelKey: "menu.leaderboard", route: "/leaderboards" },
  { icon: Headphones, labelKey: "menu.triviaLive", route: "/team" },
];

export function SideMenuDrawer({ isOpen, onClose }: SideMenuDrawerProps) {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const { openAvatarModal } = useAvatarModal();
  const { guardPlay } = usePlayGuard();
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isDailyRewardsOpen, setIsDailyRewardsOpen] = useState(false);
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);

  const currentStreak = profile?.current_streak || 1;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  const handleNavItemClick = (route: string) => {
    onClose();
    navigate(route);
  };

  const handlePlayClick = () => {
    const allowed = guardPlay(() => { onClose(); navigate('/game'); });
    if (!allowed) {
      onClose(); // Close drawer so play-limit modal is visible
      return;
    }
    onClose();
    navigate('/game');
  };

  const handleCategorySelect = (category: { id: string; name: string }) => {
    setIsCategorySelectorOpen(false);
    onClose();
    navigate(`/category/${category.id}`);
  };

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Logout error:', error);
        return;
      }
      onClose();
      navigate("/");
    } catch (err) {
      console.error('Logout exception:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <MissionsModal isOpen={isMissionsOpen} onClose={() => setIsMissionsOpen(false)} />
      <DailyRewardsModal isOpen={isDailyRewardsOpen} onClose={() => setIsDailyRewardsOpen(false)} currentStreak={currentStreak} />
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      <AnimatePresence>
        {isTeamMenuOpen && (
          <TeamMenuScreen
            onClose={() => setIsTeamMenuOpen(false)}
            onSelectCreateRoom={() => {
              setIsTeamMenuOpen(false);
              onClose();
              navigate('/create-room');
            }}
            onSelectTrivia={() => {
              setIsTeamMenuOpen(false);
              onClose();
              navigate('/team', { state: { openTrivia: true } });
            }}
            onSelectCollection={() => {
              setIsTeamMenuOpen(false);
              onClose();
              navigate('/team', { state: { openCollection: true } });
            }}
            onSelectPersonalTrivia={() => {
              setIsTeamMenuOpen(false);
              onClose();
              navigate('/team', { state: { openPersonalTrivia: true } });
            }}
            onSelectRandom={() => {
              if (!guardPlay(() => {
                setIsTeamMenuOpen(false);
                onClose();
                navigate('/game');
              })) return;
              setIsTeamMenuOpen(false);
              onClose();
              navigate('/game');
            }}
            onSelectLibrary={() => {
              setIsTeamMenuOpen(false);
              setIsCategorySelectorOpen(true);
            }}
          />
        )}
      </AnimatePresence>
      
      <CategorySelectorModal
        open={isCategorySelectorOpen}
        onOpenChange={setIsCategorySelectorOpen}
        onSelect={handleCategorySelect}
      />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 safe-screen z-[60] bg-background flex flex-col overflow-hidden"
          >
            {/* Video background */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
              <BackgroundVideo
                sources={[
                  { src: "/videos/floating-blob.webm", type: "video/webm" },
                  { src: "/videos/floating-blob.mp4", type: "video/mp4" },
                ]}
                still="/videos/floating-blob-still.jpg"
                className="absolute inset-0 pointer-events-none"
                style={{ filter: "blur(8px)" }}
              />
              {/* White radial overlay */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, transparent 40%, rgba(255,255,255,0.3) 60%, rgba(255,255,255,0.6) 80%, rgba(255,255,255,1) 100%)",
                }}
              />
            </div>

            {/* Fixed Header */}
            <div className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-bold text-foreground">{t("menu.menuTitle")}</h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="relative z-10 flex-1 overflow-y-auto">
              {/* User Profile Section */}
              <div className="p-3 border-b border-border/30">
                {user ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                    <button 
                      onClick={() => {
                        onClose();
                        navigate("/profile");
                      }}
                      className="h-16 w-16 rounded-2xl bg-background/50 backdrop-blur flex items-center justify-center overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer"
                    >
                      <Avatar
                        imageUrl={profile?.avatar_url || undefined}
                        emoji={profile?.nickname?.charAt(0) || "👤"}
                        size="lg"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-xl font-bold text-foreground truncate">
                        {profile?.nickname || t("menu.player")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                          {t("common.level")} {levelInfo.level}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {profile?.total_points?.toLocaleString() || 0} {t("menu.points")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigate("/profile");
                        onClose();
                      }}
                      className="p-2 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      navigate("/auth");
                      onClose();
                    }}
                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
                  >
                    <User className="h-5 w-5" />
                    {t("menu.signIn")}
                  </button>
                )}
              </div>

              {/* Big Play Button — the shared chunky green one, so the menu's
                  call to action reads the same as the home and category pages */}
              <div className="px-3 pb-3" style={{ marginTop: "-5px" }}>
                <GreenPlayButton
                  onClick={handlePlayClick}
                  className="h-[56px] w-full text-lg"
                  icon={<Play className="h-6 w-6 fill-white text-white" />}
                >
                  {t("menu.play")}
                </GreenPlayButton>
              </div>

              {/* Navigation Items (replacing bottom nav) */}
              <div className="px-3 pb-2">
                <div className="flex flex-col" style={{ gap: "2px" }}>
                  {navItemsConfig.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.labelKey}
                        onClick={() => handleNavItemClick(item.route)}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-muted/50 active:scale-95"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-base font-medium text-foreground">
                          {t(item.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Settings and Logout */}
              <div className="px-3 pb-10 pt-2 border-t border-border/30 mt-2 flex flex-col gap-1">
                <button
                  onClick={() => handleNavItemClick("/settings")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-muted/50 active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-base font-medium text-foreground flex-1 text-left">
                    {t("menu.settings")}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Logout Button */}
                {user && (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-destructive/10 active:scale-95"
                  >
                    <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-destructive" />
                    </div>
                    <span className="text-base font-medium text-destructive flex-1 text-left">
                      {t("menu.signOut")}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
