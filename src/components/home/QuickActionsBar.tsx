import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { LuckySpinModal } from "@/components/game/LuckySpinModal";
import iconWheel from "@/assets/icon-wheel.png";
import iconVip from "@/assets/icon-vip.png";
import iconLeaderboard from "@/assets/icon-leaderboard.png";
import iconShop from "@/assets/icons/icon-shop-3d.png";

interface QuickActionsBarProps {
  className?: string;
}

export function QuickActionsBar({ className = "" }: QuickActionsBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);
  const { t } = useLanguage();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <LuckySpinModal isOpen={isSpinModalOpen} onClose={() => setIsSpinModalOpen(false)} />
      
      <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 safe-bottom ${className}`}>
        <div className="relative max-w-xs mx-auto">
          {/* 3D Shadow */}
          <div 
            className="absolute inset-0 rounded-2xl"
            style={{ background: "hsl(195 30% 55%)", transform: "translateY(4px)" }}
          />
          {/* Main Container */}
          <div 
            className="relative rounded-2xl p-4"
            style={{ background: "linear-gradient(180deg, hsl(195 40% 88%) 0%, hsl(195 35% 82%) 100%)" }}
          >
            <div className="flex justify-between items-start">
              <QuickButton 
                iconSrc={iconWheel}
                label={t("extra.quickWheel")}
                onClick={() => setIsSpinModalOpen(true)}
              />
              <div className="w-px h-14 self-center" style={{ background: "rgba(30, 41, 59, 0.08)" }} />
              <QuickButton 
                iconSrc={iconVip}
                label="VIP"
                onClick={() => navigate("/vip")}
                isActive={isActive("/vip")}
              />
              <div className="w-px h-14 self-center" style={{ background: "rgba(30, 41, 59, 0.08)" }} />
              <QuickButton 
                iconSrc={iconLeaderboard}
                label={t("extra.quickRating")}
                onClick={() => navigate("/leaderboards")}
                isActive={isActive("/leaderboards")}
              />
              <div className="w-px h-14 self-center" style={{ background: "rgba(30, 41, 59, 0.08)" }} />
              <QuickButton 
                iconSrc={iconShop}
                label={t("extra.quickShop")}
                onClick={() => navigate("/power-ups")}
                isActive={isActive("/power-ups")}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuickButton({ 
  iconSrc, 
  label,
  onClick,
  isActive = false,
}: { 
  iconSrc: string; 
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-1"
      whileTap={{ scale: 0.95 }}
    >
      <img 
        src={iconSrc} 
        alt={label} 
        className={`h-12 w-12 object-contain transition-all ${isActive ? 'scale-110' : ''}`} 
      />
      <span className={`text-xs font-semibold ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
        {label}
      </span>
    </motion.button>
  );
}
