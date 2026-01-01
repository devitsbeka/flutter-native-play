import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";
import { MissionsModal } from "./MissionsModal";
import { AvatarGeneratorModal } from "@/components/profile/AvatarGeneratorModal";
import { calculateLevel } from "@/utils/levelCalculation";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

// Icon imports for menu items
import iconMissions from "@/assets/icons/icon-compass.png";
import iconAvatar from "@/assets/icons/icon-profile.png";
import iconEvents from "@/assets/icons/icon-gem.png";
import iconPass from "@/assets/icons/icon-trophy-3d.png";
import iconNotifications from "@/assets/icons/icon-shop-3d.png";
import iconSettings from "@/assets/icons/icon-powers-3d.png";
import iconHelp from "@/assets/icons/icon-map-3d.png";
import iconPrivacy from "@/assets/icons/icon-coin.png";
import iconLogout from "@/assets/icons/icon-ad-free.png";

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: iconMissions, label: "მისიები", onClick: "missions", badge: "3" },
  { icon: iconAvatar, label: "AI Avatar", onClick: "avatar", badge: "ახალი" },
  { icon: iconEvents, label: "ივენთები", onClick: "events" },
  { icon: iconPass, label: "ტრივია პასი", onClick: "pass" },
  { icon: iconNotifications, label: "შეტყობინებები", onClick: "notifications" },
  { icon: iconSettings, label: "პარამეტრები", onClick: "settings" },
  { icon: iconHelp, label: "დახმარება", onClick: "help" },
  { icon: iconPrivacy, label: "კონფიდენციალურობა", onClick: "privacy" },
  { icon: iconLogout, label: "გამოსვლა", onClick: "logout" },
];

export function SideMenuDrawer({ isOpen, onClose }: SideMenuDrawerProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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

  // Filter out logout for non-authenticated users
  const visibleItems = user 
    ? menuItems 
    : menuItems.filter(item => item.onClick !== "logout");

  return (
    <>
      <MissionsModal isOpen={isMissionsOpen} onClose={() => setIsMissionsOpen(false)} />
      <AvatarGeneratorModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
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

              {/* 3x3 Grid Menu */}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {visibleItems.map((item, index) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleItemClick(item.onClick)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${
                        item.onClick === "logout" 
                          ? "bg-destructive/10 hover:bg-destructive/20" 
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      {/* Badge */}
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] text-center">
                          {item.badge}
                        </span>
                      )}
                      
                      {/* Icon */}
                      <div className="h-12 w-12 flex items-center justify-center">
                        <img 
                          src={item.icon} 
                          alt={item.label}
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                      
                      {/* Label */}
                      <span className={`text-xs font-medium text-center leading-tight ${
                        item.onClick === "logout" 
                          ? "text-destructive" 
                          : "text-foreground"
                      }`}>
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
