import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LogOut, User, Play } from "lucide-react";
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
import { PlayCategoryModal } from "@/components/leaderboard/PlayCategoryModal";

// Icon imports for menu items
import iconRewards from "@/assets/icons/icon-coin-purse.png";
import iconMissions from "@/assets/icons/icon-mission-crystal.png";
import iconTreasure from "@/assets/icons/icon-chest-box.png";
import iconShop from "@/assets/icons/icon-magical-shop.png";
import iconParty from "@/assets/group-of-people.png";
import iconOtherGames from "@/assets/icons/icon-other-games.png";

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Menu items now use translation keys
const menuItemsConfig = [
  { icon: iconRewards, labelKey: "menu.rewards", onClick: "rewards" },
  { icon: iconMissions, labelKey: "menu.missions", onClick: "missions" },
  { icon: iconTreasure, labelKey: "menu.treasure", onClick: "treasure" },
  { icon: iconShop, labelKey: "menu.shop", onClick: "shop" },
  { icon: iconParty, labelKey: "menu.party", onClick: "party" },
  { icon: iconOtherGames, labelKey: "menu.otherGames", onClick: "other-games" },
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
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  const currentStreak = profile?.current_streak || 1;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  const handleItemClick = (action: string) => {
    if (action === "rewards") {
      setIsDailyRewardsOpen(true);
      return;
    }
    if (action === "missions") {
      setIsMissionsOpen(true);
      return;
    }
    if (action === "treasure") {
      setIsChestModalOpen(true);
      return;
    }
    if (action === "shop") {
      onClose();
      navigate("/power-ups");
      return;
    }
    if (action === "party") {
      onClose();
      navigate("/team", { state: { openPersonalTrivia: true } });
      return;
    }
    if (action === "other-games") {
      toast.info(t("menu.comingSoon"));
      return;
    }
    if (action === "avatar") {
      setIsAvatarModalOpen(true);
      return;
    }
    if (action === "settings") {
      setIsSettingsOpen(true);
      return;
    }
    if (action === "help") {
      setIsHelpOpen(true);
      return;
    }
    if (action === "privacy") {
      setIsPrivacyOpen(true);
      return;
    }
    if (action === "logout") {
      handleSignOut();
      return;
    }
    console.log("Menu action:", action);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate("/");
  };

  const handlePlayClick = () => {
    setIsPlayModalOpen(true);
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setIsPlayModalOpen(false);
    onClose();
    if (categoryId) {
      navigate(`/category/${categoryId}`);
    } else {
      // Random category - navigate to leaderboard or random game
      navigate('/leaderboard');
    }
  };

  // Build menu items with translations
  const menuItems = menuItemsConfig.map(item => ({
    ...item,
    label: t(item.labelKey)
  }));

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
      <PlayCategoryModal 
        open={isPlayModalOpen} 
        onOpenChange={setIsPlayModalOpen}
        onSelectCategory={handleCategorySelect}
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

              {/* Big Play Button */}
              <div className="px-4 py-4">
                <motion.button
                  onClick={handlePlayClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/30"
                >
                  <Play className="w-6 h-6 fill-current" />
                  {t("menu.play")}
                </motion.button>
              </div>

              {/* Grid Menu */}
              <div className="p-4 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  {menuItems.map((item, index) => (
                    <motion.button
                      key={item.labelKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleItemClick(item.onClick)}
                      className="relative flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 bg-muted/50 hover:bg-muted"
                    >
                      {/* Icon */}
                      <div className="h-12 w-12 flex items-center justify-center">
                        <img 
                          src={item.icon} 
                          alt={item.label}
                          className="h-11 w-11 object-contain"
                        />
                      </div>
                      
                      {/* Label */}
                      <span className="text-[11px] font-medium text-center leading-tight text-foreground">
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Bottom Text Links */}
              <div className="px-4 pb-4 pt-2 border-t border-border mt-2">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleItemClick("settings")}
                    className="text-left py-3 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                  >
                    {t("menu.settings")}
                  </button>

                  <button
                    onClick={() => handleItemClick("help")}
                    className="text-left py-3 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                  >
                    {t("menu.help")}
                  </button>

                  <button
                    onClick={() => handleItemClick("privacy")}
                    className="text-left py-3 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                  >
                    {t("menu.privacy")}
                  </button>

                  {user && (
                    <button
                      onClick={handleSignOut}
                      className="text-left py-3 px-3 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("menu.signOut")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
