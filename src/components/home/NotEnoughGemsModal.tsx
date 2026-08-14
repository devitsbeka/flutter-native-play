import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGemPurchase } from "@/hooks/useGemPurchase";
import { useAuth } from "@/contexts/AuthContext";
import gemIcon from "@/assets/icons/icon-gem.png";
import { useStorePrice } from "@/hooks/useStorePrice";
import { GEM_PACKS, type GemPack } from "@/config/gemPacks";

// Packs live in config so the native store SKUs stay attached to them.
type GemPackage = GemPack;
const GEM_PACKAGES = GEM_PACKS;

interface NotEnoughGemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGems: number;
  requiredGems: number;
}

export function NotEnoughGemsModal({
  isOpen,
  onClose,
  currentGems,
  requiredGems,
}: NotEnoughGemsModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { initiateCheckout, isProcessing } = useGemPurchase();
  // On iOS the figure has to be StoreKit's own localized string, not the USD
  // number compiled into gemPacks.ts. Apple charges in the storefront's
  // currency, so a Georgian buyer shown "$0.79" is quoted a price the store
  // never charges — guideline 2.3.1, on the screen a reviewer taps to buy.
  const storePrice = useStorePrice();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  
  const gemsNeeded = Math.max(0, requiredGems - currentGems);

  // Find suggested package (smallest that covers the need)
  const suggestedPackage = GEM_PACKAGES.find(pkg => pkg.gems >= gemsNeeded) || GEM_PACKAGES[0];

  const headerIcon = (
    <img src={gemIcon} alt="" className="w-16 h-16 object-contain" />
  );

  const handleBuyPackage = async (pkg: GemPackage) => {
    if (!user) {
      onClose();
      return;
    }
    
    setSelectedPackage(pkg.id);
    await initiateCheckout({
      id: pkg.id,
      name: pkg.name,
      gems: pkg.gems,
      priceGel: pkg.priceUsd,
    });
    setSelectedPackage(null);
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title={t("modals.notEnoughGems")}
      subtitle={t("modals.gemsRequired", { amount: requiredGems })}
      variant="primary"
      fullScreen={false}
    >
      {/* Current balance */}
      <div 
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(180deg, #F3E8FF 0%, #E9D5FF 100%)",
          boxShadow: "0 2px 0 #D8B4FE",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-purple-700">{t("modals.yourBalance")}</span>
          <div className="flex items-center gap-2">
            <img src={gemIcon} alt="" className="w-6 h-6" />
            <span className="font-bold text-lg text-purple-900">{currentGems}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-red-500 font-medium">{t("modals.youNeed")}</span>
          <div className="flex items-center gap-2">
            <img src={gemIcon} alt="" className="w-5 h-5" />
            <span className="font-bold text-red-500">{gemsNeeded}</span>
          </div>
        </div>
      </div>

      {/* Gem packages */}
      <div className="space-y-2.5 mb-4">
        {GEM_PACKAGES.map((pkg) => {
          const isSuggested = pkg.id === suggestedPackage.id;
          const isLoading = isProcessing && selectedPackage === pkg.id;
          
          return (
            <motion.button
              key={pkg.id}
              onClick={() => handleBuyPackage(pkg)}
              disabled={isProcessing}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative ${
                isSuggested 
                  ? "ring-2 ring-purple-400 ring-offset-2"
                  : ""
              }`}
              style={{
                background: isSuggested 
                  ? "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)"
                  : "linear-gradient(180deg, #FAFAFA 0%, #F5F5F5 100%)",
                boxShadow: "0 2px 0 #E5E7EB",
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Badge */}
              {/* Gem icon */}
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <img src={gemIcon} alt="" className="w-7 h-7" />
              </div>

              {/* Info */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{pkg.gems}</span>
                  <span className="text-gray-500 text-sm">{t("shop.gem")}</span>
                  {pkg.bonus && (
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                      +{pkg.bonus}%
                    </span>
                  )}
                </div>
              </div>

              {/* Price button */}
              <div 
                className="px-4 py-2 rounded-xl font-bold text-white text-sm flex items-center gap-1"
                style={{
                  background: "linear-gradient(180deg, #9333EA 0%, #7C3AED 100%)",
                  boxShadow: "0 3px 0 #6D28D9",
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>{storePrice(pkg.productId, pkg.priceUsd).display}</>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <GameModalFooter
        primaryLabel={t("common.close")}
        onPrimary={onClose}
        primaryVariant="secondary"
      />
    </GameModal>
  );
}
