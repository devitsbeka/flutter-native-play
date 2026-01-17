import { motion } from "framer-motion";
import { Settings, HelpCircle, Shield, FileText, LogOut } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}

function MenuItem({ icon: Icon, label, onClick, variant = "default" }: MenuItemProps) {
  const isDestructive = variant === "destructive";
  
  return (
    <motion.button
      onClick={onClick}
      className="w-full py-3.5 px-5 rounded-xl font-medium transition-all flex items-center gap-4"
      style={{
        background: isDestructive 
          ? "linear-gradient(180deg, #FEE2E2 0%, #FECACA 100%)"
          : "linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)",
        boxShadow: isDestructive
          ? "0 3px 0 #FCA5A5, 0 4px 8px rgba(239, 68, 68, 0.15)"
          : "0 3px 0 #E5E7EB, 0 4px 8px rgba(0, 0, 0, 0.05)",
        color: isDestructive ? "#DC2626" : "#374151",
      }}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98, y: 0 }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: isDestructive 
            ? "linear-gradient(180deg, #FCA5A5 0%, #F87171 100%)"
            : "linear-gradient(180deg, #E0E7FF 0%, #C7D2FE 100%)",
        }}
      >
        <Icon 
          className="w-5 h-5" 
          style={{ color: isDestructive ? "#FFFFFF" : "#6366F1" }} 
          strokeWidth={1.5}
        />
      </div>
      <span className="text-[15px]">{label}</span>
    </motion.button>
  );
}

export function MoreMenuModal({
  isOpen,
  onClose,
  onNavigate,
  onSignOut,
}: MoreMenuModalProps) {
  const handleNavigation = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const handleSignOut = () => {
    onSignOut();
    onClose();
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="primary"
      title="მეტი"
    >
      <div className="flex flex-col gap-2 py-2">
        <MenuItem
          icon={Settings}
          label="პარამეტრები"
          onClick={() => handleNavigation("/settings")}
        />
        <MenuItem
          icon={HelpCircle}
          label="დახმარება"
          onClick={() => handleNavigation("/support")}
        />
        <MenuItem
          icon={Shield}
          label="კონფიდენციალურობა"
          onClick={() => handleNavigation("/privacy-policy")}
        />
        <MenuItem
          icon={FileText}
          label="მომსახურების პირობები"
          onClick={() => handleNavigation("/terms")}
        />
        
        <div className="my-2 border-t border-border" />
        
        <MenuItem
          icon={LogOut}
          label="გასვლა"
          onClick={handleSignOut}
          variant="destructive"
        />
      </div>
    </GameModal>
  );
}
