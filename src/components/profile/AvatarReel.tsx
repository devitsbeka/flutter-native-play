import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import gemIcon from "@/assets/icons/icon-gem.png";

interface ReelAvatar {
  id: string;
  path: string;
  price: number; // 0 = free
}

// Canonical /src/assets paths — stable across builds, resolveAvatarUrl()
// maps them to the bundled URLs at runtime (same scheme as AvatarModal).
const REEL_AVATARS: ReelAvatar[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    id: `mascot-avatar-${n}`,
    path: `/src/assets/avatars/mascot-avatar-${n}.png`,
    price: 0,
  })),
  // Premium set, priced in gems (gems themselves are bought with real money)
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    id: `bot-avatar-${n}`,
    path: `/src/assets/avatars/bot-avatar-${n}.png`,
    price: n <= 4 ? 30 : n <= 7 ? 50 : 80,
  })),
];

// Horizontally scrollable strip of preset avatars. Free ones apply on tap;
// premium ones are bought once with gems (ledger: purchase_transactions,
// product_type "avatar") and then behave like free ones forever.
export function AvatarReel() {
  const { user, profile, updateProfile } = useAuth();
  const { spendGems, canAffordGems } = useCurrency();
  const { t } = useLanguage();
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("purchase_transactions")
      .select("product_id")
      .eq("user_id", user.id)
      .eq("product_type", "avatar")
      .then(({ data }) => {
        if (data) {
          setOwnedIds(new Set(data.map((r) => r.product_id).filter(Boolean) as string[]));
        }
      });
  }, [user]);

  const currentResolved = resolveAvatarUrl(profile?.avatar_url);

  const applyAvatar = async (avatar: ReelAvatar) => {
    const result = await updateProfile({
      avatar_url: avatar.path,
      animated_avatar_url: null,
      has_face_photo: false,
    } as any);
    if (result?.error) throw result.error;
    toast.success(t("avatar.avatarUpdated"));
  };

  const handleTap = async (avatar: ReelAvatar) => {
    if (!user || busyId) return;
    const isOwned = avatar.price === 0 || ownedIds.has(avatar.id);
    const isCurrent = currentResolved === resolveAvatarUrl(avatar.path);
    if (isCurrent) return;

    if (!isOwned && !canAffordGems(avatar.price)) {
      toast.error(t("extra.frameNotEnoughGems"));
      return;
    }

    setBusyId(avatar.id);
    try {
      if (!isOwned) {
        const spent = await spendGems(avatar.price, {
          productId: avatar.id,
          productType: "avatar",
          valueReceived: { avatar: avatar.path },
        });
        if (!spent) {
          toast.error(t("extra.frameNotEnoughGems"));
          return;
        }
        setOwnedIds((prev) => new Set(prev).add(avatar.id));
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.5 },
          colors: ["#A855F7", "#EC4899", "#38BDF8"],
          zIndex: 9999,
        });
      }
      await applyAvatar(avatar);
    } catch (error) {
      console.error("Avatar select failed:", error);
      toast.error(t("shop.purchaseFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-2 -mx-1">
        {REEL_AVATARS.map((avatar, index) => {
          const src = resolveAvatarUrl(avatar.path);
          const isOwned = avatar.price === 0 || ownedIds.has(avatar.id);
          const isCurrent = currentResolved === src;
          const isBusy = busyId === avatar.id;
          return (
            <motion.button
              key={avatar.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.4) }}
              onClick={() => handleTap(avatar)}
              disabled={!!busyId}
              className="relative shrink-0 flex flex-col items-center disabled:opacity-70"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              <div
                className={`w-16 h-16 rounded-full overflow-hidden border-[3px] bg-white transition-all ${
                  isCurrent ? "border-primary ring-2 ring-primary/30" : "border-white/80"
                } ${isBusy ? "animate-pulse" : ""}`}
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
              >
                <img src={src} alt="" className="w-full h-full object-cover select-none" draggable={false} />
              </div>

              {isCurrent && (
                <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Gem price pill for premium avatars not yet owned */}
              {!isOwned && (
                <div
                  className="absolute -bottom-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white shadow"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
                >
                  <img src={gemIcon} alt="" className="w-3.5 h-3.5 object-contain" />
                  <span className={`text-[11px] font-black ${canAffordGems(avatar.price) ? "text-slate-700" : "text-red-500"}`}>
                    {avatar.price}
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
