import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LogOut, User, Play, Compass, Store, Trophy, Headphones, ChevronDown, Settings, HelpCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar } from "@/components/shared/Avatar";
import { MissionsModal } from "./MissionsModal";
import { DailyRewardsModal } from "./DailyRewardsModal";
import { ChestRewardModal } from "./ChestRewardModal";
import { AvatarGeneratorModal } from "@/components/profile/AvatarGeneratorModal";
import { SettingsModal } from "./SettingsModal";
import { HelpModal } from "./HelpModal";
import { PrivacyModal } from "./PrivacyModal";
import { calculateLevel } from "@/utils/levelCalculation";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { TeamMenuScreen } from "@/components/team/TeamMenuScreen";
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isDailyRewardsOpen, setIsDailyRewardsOpen] = useState(false);
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  const currentStreak = profile?.current_streak || 1;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  const handleNavItemClick = (route: string) => {
    onClose();
    navigate(route);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate("/");
  };

  const handlePlayClick = () => {
    setIsTeamMenuOpen(true);
  };

  const handleCategorySelect = (category: { id: string; name: string }) => {
    setIsCategorySelectorOpen(false);
    onClose();
    navigate(`/category/${category.id}`);
  };

  if (!isOpen) return null;

  return (
    <>
      <MissionsModal isOpen={isMissionsOpen} onClose={() => setIsMissionsOpen(false)} />
      <DailyRewardsModal isOpen={isDailyRewardsOpen} onClose={() => setIsDailyRewardsOpen(false)} currentStreak={currentStreak} />
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      <AvatarGeneratorModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <AnimatePresence>
        {isTeamMenuOpen && (
          <TeamMenuScreen
            onClose={() => setIsTeamMenuOpen(false)}
            onSelectCreateRoom={() => {
              setIsTeamMenuOpen(false);
              onClose();
              navigate('/team', { state: { openCreateRoom: true } });
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
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-bold text-foreground">{t("menu.menuTitle")}</h2>
              </div>
              <LanguageSwitcher compact />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* User Profile Section */}
              <div className="p-4 border-b border-border/30">
                {user ? (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                    <div className="h-16 w-16 rounded-2xl bg-background/50 backdrop-blur flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                      <Avatar
                        imageUrl={profile?.avatar_url || undefined}
                        emoji={profile?.nickname?.charAt(0) || "👤"}
                        size="lg"
                      />
                    </div>
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

              {/* Big Play Button - 3D Mint Style */}
              <div className="px-4 py-4">
                <motion.button
                  onClick={handlePlayClick}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98, y: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="relative w-full overflow-hidden rounded-2xl"
                  style={{ height: 56 }}
                >
                  {/* Bottom depth layer */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      top: 6,
                      background: "linear-gradient(180deg, #5DD8B0 0%, #4BC9A0 50%, #3DB890 100%)",
                    }}
                  />
                  
                  {/* Middle bevel layer */}
                  <div
                    className="absolute rounded-2xl"
                    style={{
                      inset: 0,
                      top: 2,
                      bottom: 8,
                      background: "linear-gradient(180deg, #7EECC5 0%, #6ADDB5 100%)",
                    }}
                  />
                  
                  {/* Main face */}
                  <div
                    className="absolute rounded-2xl overflow-hidden"
                    style={{
                      inset: 0,
                      bottom: 10,
                      background: "radial-gradient(circle at 40% 35%, #8AFFDA 0%, #6EFFC2 25%, #5EE8B5 50%, #4DD8A5 75%, #3FC99A 100%)",
                    }}
                  >
                    {/* Sparkle particles */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: i % 2 === 0 ? 4 : 3,
                          height: i % 2 === 0 ? 4 : 3,
                          background: "rgba(180,255,220,0.95)",
                          boxShadow: "0 0 6px rgba(150,255,210,0.9), 0 0 10px rgba(100,230,180,0.6)",
                          left: `${10 + (i * 10)}%`,
                          top: `${30 + ((i % 3) * 15)}%`,
                        }}
                        animate={{
                          y: [-3, 3, -3],
                          opacity: [0.5, 1, 0.5],
                          scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{
                          duration: 1.5 + (i * 0.2),
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.12,
                        }}
                      />
                    ))}
                    
                    {/* Button content */}
                    <div className="relative h-full flex items-center justify-center gap-3">
                      <Play className="w-6 h-6 fill-white text-white" />
                      <span className="text-white font-bold text-lg" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                        {t("menu.play")}
                      </span>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Navigation Items (replacing bottom nav) */}
              <div className="px-4 pb-2">
                <div className="flex flex-col gap-1">
                  {navItemsConfig.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.labelKey}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleNavItemClick(item.route)}
                        className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-muted/50 active:scale-98"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-base font-medium text-foreground">
                          {t(item.labelKey)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Settings Collapsible Section */}
              <div className="px-4 pb-4 pt-2 border-t border-border/30 mt-2">
                <Collapsible open={isSettingsExpanded} onOpenChange={setIsSettingsExpanded}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <Settings className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="text-base font-medium text-foreground">
                          {t("menu.settings")}
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: isSettingsExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 flex flex-col gap-1">
                      <button
                        onClick={() => setIsHelpOpen(true)}
                        className="flex items-center gap-4 p-3 rounded-xl text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {t("menu.help")}
                        </span>
                      </button>

                      <button
                        onClick={() => setIsPrivacyOpen(true)}
                        className="flex items-center gap-4 p-3 rounded-xl text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {t("menu.privacy")}
                        </span>
                      </button>

                      {user && (
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-4 p-3 rounded-xl text-left hover:bg-destructive/10 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-destructive" />
                          </div>
                          <span className="text-sm text-destructive">
                            {t("menu.signOut")}
                          </span>
                        </button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
