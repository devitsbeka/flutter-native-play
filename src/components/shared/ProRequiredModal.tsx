import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useProPurchase } from "@/hooks/useProPurchase";
import { useStorePrice } from "@/hooks/useStorePrice";
import { getPriceDisplay } from "@/utils/currency";
import { PRICES } from "@/config/pricing";
import { SubscriptionTerms } from "@/components/shared/SubscriptionTerms";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import type { ProFeature } from "@/hooks/useProGating";
import crownIcon from "@/assets/icons/crown-2.png";

const FEATURE_KEYS: Record<ProFeature, string> = {
  rooms: "proModal.featureRooms",
  trivia: "proModal.featureTrivia",
  collection: "proModal.featureCollection",
  avatar: "proModal.featureAvatar",
  animation: "proModal.featureAnimation",
  general: "proModal.featureGeneral",
};

interface ProRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: ProFeature;
}

export function ProRequiredModal({ isOpen, onClose, feature = "general" }: ProRequiredModalProps) {
  const navigate = useNavigate();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const { t } = useLanguage();
  // The button below starts a real auto-renewing purchase on iOS, so the
  // price and billing period must be on screen before the tap (3.1.2) —
  // this modal used to show neither. StoreKit's localized figure, with the
  // bundled USD price only as the not-yet-loaded fallback.
  const storePrice = useStorePrice();
  const proPrice = storePrice("pro", PRICES.pro_monthly.USD, "pro_monthly");
  const monthLabel = getPriceDisplay(3.99).monthLabel;

  const handleUpgrade = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await initiateProCheckout("pro");
      if (result.success) {
        onClose();
      }
    } else {
      onClose();
      navigate("/profile?tab=PRO");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* overflow-y-auto, NOT overflow-hidden: tailwind-merge treats them as
          conflicting, so `hidden` deleted the dialog's own scroll — and on a
          320x568 device the clipped tail was exactly the subscription
          disclosure this modal is required to show. */}
      <DialogContent className="max-w-[320px] p-0 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-purple-500/15 via-background to-background border-purple-500/30">
        <DialogTitle className="sr-only">{t("proModal.dialogTitle")}</DialogTitle>
        
        <div className="flex flex-col items-center px-6 py-8">
          {/* Crown Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              y: [0, -6, 0]
            }}
            transition={{ 
              scale: { type: "spring", stiffness: 300, damping: 20 },
              rotate: { type: "spring", stiffness: 300, damping: 20 },
              y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            <img 
              src={crownIcon} 
              alt="Crown" 
              className="w-14 h-14 object-contain drop-shadow-lg"
            />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-xl text-foreground mb-3"
          >
            {t("proModal.title")}
          </motion.h2>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground text-center text-sm mb-3"
          >
            {t(FEATURE_KEYS[feature])} {t("proModal.becomeProSuffix")}
          </motion.p>

          {/* The price of what the button below buys */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mb-4 text-center"
          >
            <span className="text-xl font-black text-foreground">{proPrice.display}</span>
            <span className="ml-1 text-sm text-muted-foreground">{monthLabel}</span>
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            <ChunkyButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleUpgrade}
              disabled={isProcessing}
              showParticles={true}
              icon={<img src={crownIcon} alt="" className="w-5 h-5 object-contain" />}
            >
              {isProcessing ? t("proModal.loading") : t("proModal.becomePro")}
            </ChunkyButton>
          </motion.div>

          {/* Cancel */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            onClick={onClose}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("proModal.cancel")}
          </motion.button>

          {/* Renewal terms + legal links, required beside the buy button.
              onNavigate closes the modal so the legal page isn't opened
              underneath it. */}
          <SubscriptionTerms className="mt-4 text-center" onNavigate={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
