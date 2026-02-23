import { toastIcon, ICON_URLS } from "@/lib/toast-icons";
import crownIcon from "@/assets/icons/crown-3d.png";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Check, Lock, Sparkles, Crown } from "lucide-react";
import { useAvatarFrames, AVATAR_FRAMES, AvatarFrame } from "@/hooks/useAvatarFrames";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/hooks/useAuth";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import confetti from "canvas-confetti";
import gemIcon from "@/assets/icons/icon-gem.png";

interface AvatarFrameShopProps {
  onClose?: () => void;
}

const rarityColors = {
  common: "from-gray-400 to-gray-500",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-orange-500",
};

const rarityLabels = {
  common: "ჩვეულებრივი",
  rare: "იშვიათი",
  epic: "ეპიკური",
  legendary: "ლეგენდარული",
};

const rarityShadows = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#7C3AED",
  legendary: "#F59E0B",
};

export function AvatarFrameShop({ onClose }: AvatarFrameShopProps) {
  const { profile } = useAuth();
  const { unlockFrame, equipFrame, isFrameUnlocked, equippedFrame } = useAvatarFrames();
  const { gems, spendGems, canAffordGems } = useCurrency();
  const { isVip } = useVipStatus();
  const { playSound } = useSound();
  const { notify } = useNotificationModal();
  const { t } = useLanguage();
  const [selectedFrame, setSelectedFrame] = useState<AvatarFrame | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async (frame: AvatarFrame) => {
    // VIP-only frame handling
    if (frame.vipOnly) {
      if (!isVip) {
        notify.error("ეს ჩარჩო მხოლოდ VIP მომხმარებლებისთვისაა!", { icon: toastIcon(crownIcon) });
        playSound("wrong-answer");
        return;
      }
      
      // VIP frames are free - auto-unlock if not already
      if (!isFrameUnlocked(frame.id)) {
        const unlocked = await unlockFrame(frame.id);
        if (!unlocked) return;
      }
      
      // Toggle equip
      const newFrameId = equippedFrame === frame.id ? null : frame.id;
      await equipFrame(newFrameId);
      playSound("correct-answer");
      
      if (newFrameId) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#F59E0B"],
          zIndex: 9999,
        });
      }
      return;
    }

    if (isFrameUnlocked(frame.id)) {
      // Already unlocked - just equip/unequip
      const newFrameId = equippedFrame === frame.id ? null : frame.id;
      await equipFrame(newFrameId);
      playSound("correct-answer");
      return;
    }

    if (!canAffordGems(frame.price)) {
      notify.error("არ გაქვს საკმარისი ალმასი!", { icon: "💎" });
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(true);

    try {
      const spent = await spendGems(frame.price, {
        productId: frame.id,
        productType: "frame",
        valueReceived: { frame_id: frame.id },
      });
      if (!spent) {
        setIsPurchasing(false);
        return;
      }

      const unlocked = await unlockFrame(frame.id);
      if (!unlocked) {
        setIsPurchasing(false);
        return;
      }

      // Auto-equip the newly purchased frame
      await equipFrame(frame.id);

      playSound("reward");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#A855F7", "#EC4899", "#8B5CF6", "#F59E0B"],
        zIndex: 9999,
      });

      notify.success(`${frame.name} ${t('shop.frameUnlocked')}`, { icon: toastIcon(ICON_URLS.partyPopper) });
    } catch (error) {
      console.error("Purchase failed:", error);
      notify.error(t('shop.purchaseFailed'));
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview Section - 3D chunky card */}
      <div 
        className="flex flex-col items-center gap-4 py-4 rounded-2xl"
        style={{
          background: "#F9FAFB",
          boxShadow: "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        <p className="text-sm text-gray-500 font-medium">გადახედვა</p>
        <AvatarWithFrame
          imageUrl={profile?.avatar_url || undefined}
          size="xl"
          showVipBadge={false}
          frameOverride={selectedFrame || undefined}
        />
        {selectedFrame && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="font-bold text-gray-800">{selectedFrame.name}</p>
            <p className="text-sm text-gray-500">{selectedFrame.description}</p>
          </motion.div>
        )}
      </div>

      {/* Frames Grid - 3D chunky cards */}
      <div className="grid grid-cols-3 gap-3">
        {AVATAR_FRAMES.map((frame) => {
          const isVipFrame = frame.vipOnly === true;
          const isUnlocked = isVipFrame ? isVip : isFrameUnlocked(frame.id);
          const isEquipped = equippedFrame === frame.id;
          const canAfford = isVipFrame ? isVip : canAffordGems(frame.price);
          const isSelected = selectedFrame?.id === frame.id;
          const isLocked = isVipFrame ? !isVip : (!isUnlocked && !canAfford);

          return (
            <motion.button
              key={frame.id}
              onClick={() => {
                setSelectedFrame(frame);
                if (isUnlocked || canAfford) {
                  handlePurchase(frame);
                }
              }}
              onMouseEnter={() => setSelectedFrame(frame)}
              className="relative p-3 rounded-2xl transition-all"
              style={{
                background: isVipFrame
                  ? isSelected
                    ? "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)"
                    : isEquipped
                      ? "linear-gradient(180deg, #FEF3C7 0%, #FCD34D 100%)"
                      : "linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)"
                  : isSelected
                    ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                    : isEquipped
                      ? "linear-gradient(180deg, #D1FAE5 0%, #A7F3D0 100%)"
                      : "#F9FAFB",
                boxShadow: isVipFrame
                  ? isSelected
                    ? "0 3px 0 #D97706"
                    : isEquipped
                      ? "0 3px 0 #F59E0B"
                      : "0 2px 0 #F59E0B"
                  : isSelected
                    ? "0 3px 0 #C4B5FD"
                    : isEquipped
                      ? "0 3px 0 #6EE7B7"
                      : "0 2px 0 #E5E7EB",
                border: isVipFrame
                  ? "2px solid #F59E0B"
                  : isSelected
                    ? "2px solid #A78BFA"
                    : isEquipped
                      ? "2px solid #34D399"
                      : "2px solid transparent",
                opacity: isLocked ? 0.5 : 1,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98, y: 2 }}
              disabled={isPurchasing}
            >
              {/* VIP badge for VIP-only frames */}
              {isVipFrame ? (
                <div
                  className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-0.5"
                  style={{ boxShadow: "0 1px 0 #D97706" }}
                >
                  <Crown className="w-2.5 h-2.5" />
                  VIP
                </div>
              ) : (
                /* Rarity badge */
                <div
                  className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white bg-gradient-to-r ${
                    rarityColors[frame.rarity]
                  }`}
                  style={{
                    boxShadow: `0 1px 0 ${rarityShadows[frame.rarity]}`,
                  }}
                >
                  {rarityLabels[frame.rarity]}
                </div>
              )}

              {/* Frame preview */}
              <div
                className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-r ${frame.gradient} ${
                  frame.animationClass || ""
                } flex items-center justify-center mb-2`}
                style={{
                  boxShadow: isEquipped
                    ? "0 0 20px rgba(34, 197, 94, 0.4), 0 3px 0 rgba(0,0,0,0.15)"
                    : isVipFrame && isVip
                      ? "0 0 15px rgba(245, 158, 11, 0.4), 0 3px 0 rgba(0,0,0,0.15)"
                      : "0 3px 0 rgba(0,0,0,0.15)",
                }}
              >
                {isEquipped ? (
                  <Check className="w-6 h-6 text-white" />
                ) : isUnlocked ? (
                  isVipFrame ? (
                    <Crown className="w-5 h-5 text-white" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )
                ) : (
                  <Lock className="w-5 h-5 text-white/60" />
                )}
              </div>

              {/* Name */}
              <p className="text-xs font-semibold text-gray-800 text-center truncate">
                {frame.name}
              </p>

              {/* Price or Status */}
              <div className="flex items-center justify-center gap-1 mt-1">
                {isEquipped ? (
                  <span className="text-[10px] text-green-600 font-bold">აქტიური</span>
                ) : isVipFrame ? (
                  isVip ? (
                    <span className="text-[10px] text-amber-600 font-bold">უფასო</span>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                      <Crown className="w-3 h-3" /> VIP
                    </span>
                  )
                ) : isUnlocked ? (
                  <span className="text-[10px] text-gray-500">გახსნილი</span>
                ) : (
                  <>
                    <img src={gemIcon} alt="" className="w-4 h-4" />
                    <span
                      className={`text-xs font-bold ${
                        canAfford ? "text-gray-800" : "text-red-500"
                      }`}
                    >
                      {frame.price}
                    </span>
                  </>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
