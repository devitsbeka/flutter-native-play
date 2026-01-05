import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import adFreeIcon from "@/assets/icons/icon-ad-free.png";
import { useInAppPurchases, IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdFreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdFreeModal({ isOpen, onClose }: AdFreeModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { purchase, restorePurchases, purchasing } = useInAppPurchases();
  const [restoring, setRestoring] = useState(false);

  const benefits = [
    t("shop.noAdsWhilePlaying"),
    t("shop.unlimitedPowerUpsDaily"),
    t("shop.exclusiveAvatarFrames"),
    t("shop.priorityMatchmaking"),
  ];

  const handlePurchase = async () => {
    if (!user) {
      onClose();
      navigate("/auth");
      return;
    }
    const result = await purchase(IAP_PRODUCTS.AD_FREE);
    if (result.success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);
    if (success) {
      onClose();
    }
  };

  // Custom icon with the ad-free image
  const customIcon = (
    <div className="relative">
      <motion.img 
        src={adFreeIcon} 
        alt="Ad-Free" 
        className="w-14 h-14 object-contain"
        animate={{ 
          y: [0, -3, 0],
          rotate: [0, 3, -3, 0],
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Sparkles className="w-5 h-5 text-amber-500" />
      </motion.div>
    </div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("shop.goAdFree")}
      subtitle={t("shop.unlockPremium")}
      icon={customIcon}
      showSparkles
    >
      {/* Benefits list */}
      <div className="space-y-3 mb-6">
        {benefits.map((benefit, index) => (
          <motion.div
            key={benefit}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              background: "#F9FAFB",
              boxShadow: "0 2px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
            }}
          >
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                boxShadow: "0 2px 0 #6D28D9",
              }}
            >
              <Check className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">{benefit}</span>
          </motion.div>
        ))}
      </div>

      <GameModalFooter
        primaryLabel={purchasing ? t("shop.processing") : t("shop.unlockFor")}
        onPrimary={handlePurchase}
        secondaryLabel={restoring ? t("shop.processing") : t("shop.restorePurchase")}
        onSecondary={handleRestore}
        primaryVariant="primary"
      />
    </GameModal>
  );
}