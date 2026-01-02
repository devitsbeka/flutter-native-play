import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useState } from "react";
import { GemShopModal } from "@/components/home/GemShopModal";
import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";

import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";
import addPowerIcon from "@/assets/powers/add-power.png";

interface PowerUpInfo {
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
}

const POWER_UP_INFO: PowerUpInfo[] = [
  {
    type: "5050",
    name: "50/50",
    description: "წაშლის 2 არასწორ პასუხს",
    icon: fiftyFiftyIcon,
  },
  {
    type: "freeze",
    name: "გაყინვა",
    description: "დრო გაიყინება 10 წამით",
    icon: freezeIcon,
  },
  {
    type: "replace",
    name: "შეცვლა",
    description: "ცვლის კითხვას ახლით",
    icon: replaceIcon,
  },
  {
    type: "time-drain",
    name: "დრო+",
    description: "ამატებს 10 წამს",
    icon: timeDrainIcon,
  },
];

export default function PowerUps() {
  const navigate = useNavigate();
  const { powerUps, isLoading } = useUserPowerUps();
  const [showShopModal, setShowShopModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-20 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex items-center justify-between px-4 pt-12 pb-6"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <h1 className="text-2xl font-display text-white">შენი ძალები</h1>
        
        <button
          onClick={() => setShowTutorialModal(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
          style={{ boxShadow: "0 4px 0 #b45309" }}
        >
          <HelpCircle className="w-6 h-6 text-white" />
        </button>
      </motion.header>

      {/* Power-ups Grid */}
      <div className="relative z-10 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-6"
        >
          {POWER_UP_INFO.map((powerUp, index) => {
            const count = isLoading ? 0 : powerUps[powerUp.type];
            const isEmpty = count === 0;
            
            return (
              <motion.div
                key={powerUp.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className={`relative p-6 rounded-3xl backdrop-blur-sm ${
                  isEmpty 
                    ? "bg-white/5 opacity-60" 
                    : "bg-white/10"
                }`}
                style={{
                  boxShadow: isEmpty ? "none" : "0 8px 32px rgba(0, 0, 0, 0.2)",
                }}
              >
                {/* Count badge */}
                <div 
                  className="absolute -top-2 -right-2 min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: isEmpty 
                      ? "linear-gradient(135deg, #6b7280, #4b5563)"
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                    boxShadow: isEmpty ? "none" : "0 2px 0 #15803d",
                    color: "white",
                  }}
                >
                  {count}
                </div>

                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <img
                    src={powerUp.icon}
                    alt={powerUp.name}
                    className={`w-full h-full object-contain ${isEmpty ? "grayscale" : ""}`}
                  />
                </div>

                {/* Name */}
                <h3 className="text-white font-bold text-lg mb-1 text-center">
                  {powerUp.name}
                </h3>

                {/* Description */}
                <p className="text-white/60 text-sm text-center">
                  {powerUp.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Buy More Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => setShowShopModal(true)}
          className="w-full mt-8 py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            boxShadow: "0 6px 0 #5B21B6",
            color: "white",
          }}
        >
          <img src={addPowerIcon} alt="Add" className="w-8 h-8" />
          მეტი ძალის შეძენა
        </motion.button>
      </div>

      {/* Gem Shop Modal with powerup tab */}
      <GemShopModal
        isOpen={showShopModal}
        onClose={() => setShowShopModal(false)}
        defaultCategory="powerup"
      />
      
      {/* Tutorial Modal */}
      <PowerUpTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />
    </div>
  );
}
