import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LuckySpinModal } from "@/components/game/LuckySpinModal";
import iconWheel from "@/assets/icon-wheel.png";
import iconVip from "@/assets/icon-vip.png";
import iconLeaderboard from "@/assets/icon-leaderboard.png";
import iconMap from "@/assets/icon-map.png";

interface QuickActionsBarProps {
  className?: string;
}

export function QuickActionsBar({ className = "" }: QuickActionsBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <LuckySpinModal isOpen={isSpinModalOpen} onClose={() => setIsSpinModalOpen(false)} />
      
      <div className={`px-6 pb-6 ${className}`}>
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
                label="ბორბალი"
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
                label="რეიტინგი"
                onClick={() => navigate("/leaderboards")}
                isActive={isActive("/leaderboards")}
              />
              <div className="w-px h-14 self-center" style={{ background: "rgba(30, 41, 59, 0.08)" }} />
              <QuickButton 
                iconSrc={iconMap}
                label="რუქა"
                onClick={() => navigate("/adventure-map")}
                isActive={isActive("/adventure-map")}
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
