import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Target, 
  Sparkles, 
  Award, 
  Settings, 
  HelpCircle, 
  LogOut,
  User,
  Bell,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Target, label: "მისიები", description: "დღიური დავალებები", badge: "3", onClick: "missions" },
  { icon: Sparkles, label: "ივენთები", description: "სპეციალური გამოწვევები", badge: "ახალი", onClick: "events" },
  { icon: Award, label: "ტრივია პასი", description: "ექსკლუზიური ჯილდოები", onClick: "pass" },
  { icon: Bell, label: "შეტყობინებები", description: "სიახლეები და განახლებები", onClick: "notifications" },
];

const bottomItems = [
  { icon: Settings, label: "პარამეტრები", onClick: "settings" },
  { icon: HelpCircle, label: "დახმარება", onClick: "help" },
  { icon: Shield, label: "კონფიდენციალურობა", onClick: "privacy" },
];

export function SideMenuDrawer({ isOpen, onClose }: SideMenuDrawerProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleItemClick = (action: string) => {
    console.log("Menu action:", action);
    // For now, just close the drawer
    // These features can be implemented later
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate("/");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-background z-50 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="font-display text-lg font-bold">მენიუ</span>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* User Profile Section */}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    <Avatar
                      imageUrl={profile?.avatar_url || undefined}
                      emoji={profile?.nickname?.charAt(0) || "👤"}
                      size="md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {profile?.nickname || "მოთამაშე"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      დონე 1 • {profile?.total_points || 0} ქულა
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    navigate("/auth");
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
                >
                  <User className="h-4 w-4" />
                  შესვლა
                </button>
              )}
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(item.onClick)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Bottom Section */}
            <div className="p-3 border-t border-border space-y-1">
              {bottomItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(item.onClick)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </button>
              ))}
              
              {user && (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">გამოსვლა</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
