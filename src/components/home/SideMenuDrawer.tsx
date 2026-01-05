import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";
import { MissionsModal } from "./MissionsModal";
import { AvatarGeneratorModal } from "@/components/profile/AvatarGeneratorModal";
import { SettingsModal } from "./SettingsModal";
import { HelpModal } from "./HelpModal";
import { PrivacyModal } from "./PrivacyModal";
import { calculateLevel } from "@/utils/levelCalculation";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

// Icon imports for menu items
import iconRewards from "@/assets/icons/icon-gift-bottle.png";
import iconMissions from "@/assets/icons/icon-mission-crystal.png";
import iconTreasure from "@/assets/icons/icon-chest-tablet.png";
import iconShop from "@/assets/icons/icon-magical-shop.png";
import iconParty from "@/assets/icons/icon-party.png";
import iconOtherGames from "@/assets/icons/icon-other-games.png";

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: iconRewards, label: "ჯილდოები", onClick: "rewards" },
  { icon: iconMissions, label: "მისიები", onClick: "missions" },
  { icon: iconTreasure, label: "განძის ყუთი", onClick: "treasure" },
  { icon: iconShop, label: "მაღაზია", onClick: "shop" },
  { icon: iconParty, label: "Party", onClick: "party" },
  { icon: iconOtherGames, label: "სხვა თამაშები", onClick: "other-games" },
];

const bottomLinks = [
  { label: "პარამეტრები", onClick: "settings" },
  { label: "დახმარება", onClick: "help" },
  { label: "კონფიდენციალურობა", onClick: "privacy" },
];

export function SideMenuDrawer({ isOpen, onClose }: SideMenuDrawerProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const levelInfo = calculateLevel(profile?.total_points || 0);

  const handleItemClick = (action: string) => {
    if (action === "missions") {
      setIsMissionsOpen(true);
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

  // Grid items only (first 5), bottom links separate
  const visibleGridItems = menuItems;

  return (
    <>
      <MissionsModal isOpen={isMissionsOpen} onClose={() => setIsMissionsOpen(false)} />
      <AvatarGeneratorModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Central Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-4 m-auto w-[calc(100%-32px)] max-w-[360px] h-fit max-h-[85vh] bg-background rounded-3xl z-50 shadow-2xl overflow-hidden"
            >
              {/* Header with User Info */}
              <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>

                {/* User Profile */}
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-background/50 backdrop-blur flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                      <Avatar
                        imageUrl={profile?.avatar_url || undefined}
                        emoji={profile?.nickname?.charAt(0) || "👤"}
                        size="lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-xl font-bold text-foreground truncate">
                        {profile?.nickname || "მოთამაშე"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                          დონე {levelInfo.level}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {profile?.total_points?.toLocaleString() || 0} ქულა
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
                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mt-8"
                  >
                    <User className="h-5 w-5" />
                    შესვლა
                  </button>
                )}
              </div>

              {/* Grid Menu */}
              <div className="p-4 pb-2">
                <div className="grid grid-cols-3 gap-2">
                  {visibleGridItems.map((item, index) => (
                    <motion.button
                      key={item.label}
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
                  {/* პარამეტრები */}
                  <button
                    onClick={() => handleItemClick("settings")}
                    className="text-left py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    პარამეტრები
                  </button>

                  {/* დახმარება */}
                  <button
                    onClick={() => handleItemClick("help")}
                    className="text-left py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    დახმარება
                  </button>

                  {/* კონფიდენციალურობა */}
                  <button
                    onClick={() => handleItemClick("privacy")}
                    className="text-left py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    კონფიდენციალურობა
                  </button>

                  {user && (
                    <button
                      onClick={handleSignOut}
                      className="text-left py-2 px-1 text-sm text-destructive hover:text-destructive/80 transition-colors"
                    >
                      გამოსვლა
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
