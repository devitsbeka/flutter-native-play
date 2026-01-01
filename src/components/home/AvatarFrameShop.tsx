import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, Sparkles } from "lucide-react";
import { useAvatarFrames, AVATAR_FRAMES, AvatarFrame } from "@/hooks/useAvatarFrames";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/hooks/useAuth";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
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

export function AvatarFrameShop({ onClose }: AvatarFrameShopProps) {
  const { profile } = useAuth();
  const { unlockFrame, equipFrame, isFrameUnlocked, equippedFrame } = useAvatarFrames();
  const { gems, spendGems, canAffordGems } = useCurrency();
  const { playSound } = useSound();
  const [selectedFrame, setSelectedFrame] = useState<AvatarFrame | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async (frame: AvatarFrame) => {
    if (isFrameUnlocked(frame.id)) {
      // Already unlocked - just equip/unequip
      const newFrameId = equippedFrame === frame.id ? null : frame.id;
      await equipFrame(newFrameId);
      playSound("correct-answer");
      return;
    }

    if (!canAffordGems(frame.price)) {
      toast.error("არ გაქვს საკმარისი ლალი!");
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(true);

    try {
      const spent = await spendGems(frame.price);
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

      toast.success(`${frame.name} ჩარჩო გახსნილია! 🎉`);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("შეძენა ვერ მოხერხდა");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview Section */}
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-sm text-white/60">გადახედვა</p>
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
            <p className="font-bold text-white">{selectedFrame.name}</p>
            <p className="text-sm text-white/60">{selectedFrame.description}</p>
          </motion.div>
        )}
      </div>

      {/* Frames Grid */}
      <div className="grid grid-cols-3 gap-3">
        {AVATAR_FRAMES.map((frame) => {
          const isUnlocked = isFrameUnlocked(frame.id);
          const isEquipped = equippedFrame === frame.id;
          const canAfford = canAffordGems(frame.price);
          const isSelected = selectedFrame?.id === frame.id;

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
              className={`relative p-3 rounded-2xl transition-all ${
                isSelected
                  ? "bg-white/20 ring-2 ring-white/40"
                  : "bg-white/10 hover:bg-white/15"
              } ${!isUnlocked && !canAfford ? "opacity-50" : ""}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPurchasing}
            >
              {/* Rarity badge */}
              <div
                className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white bg-gradient-to-r ${
                  rarityColors[frame.rarity]
                }`}
              >
                {rarityLabels[frame.rarity]}
              </div>

              {/* Frame preview */}
              <div
                className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-r ${frame.gradient} ${
                  frame.animationClass || ""
                } flex items-center justify-center mb-2`}
                style={{
                  boxShadow: isEquipped
                    ? "0 0 20px rgba(139, 92, 246, 0.6)"
                    : undefined,
                }}
              >
                {isEquipped ? (
                  <Check className="w-6 h-6 text-white" />
                ) : isUnlocked ? (
                  <Sparkles className="w-5 h-5 text-white" />
                ) : (
                  <Lock className="w-5 h-5 text-white/60" />
                )}
              </div>

              {/* Name */}
              <p className="text-xs font-semibold text-white text-center truncate">
                {frame.name}
              </p>

              {/* Price or Status */}
              <div className="flex items-center justify-center gap-1 mt-1">
                {isEquipped ? (
                  <span className="text-[10px] text-green-400 font-bold">აქტიური</span>
                ) : isUnlocked ? (
                  <span className="text-[10px] text-white/60">გახსნილი</span>
                ) : (
                  <>
                    <img src={gemIcon} alt="" className="w-4 h-4" />
                    <span
                      className={`text-xs font-bold ${
                        canAfford ? "text-white" : "text-red-400"
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
