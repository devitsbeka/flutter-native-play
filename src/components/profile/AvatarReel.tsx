import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

// Carousel around the profile's big avatar: the selected avatar is always the
// center element (passed in as `center`, with its own bold ring), presets fan
// out left and right and each side scrolls. Tapping a preset selects it —
// premium ones are bought once with gems (ledger: purchase_transactions,
// product_type "avatar") and then behave like free ones forever.
export function AvatarReel({ center }: { center: React.ReactNode }) {
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
  const selectedIndex = REEL_AVATARS.findIndex((a) => resolveAvatarUrl(a.path) === currentResolved);
  // Selected preset moves into the center slot; with a custom photo avatar
  // (not in the list) just split the presets evenly around it.
  const splitAt = selectedIndex >= 0 ? selectedIndex : Math.ceil(REEL_AVATARS.length / 2);
  const leftItems = REEL_AVATARS.slice(0, splitAt);
  const rightItems = REEL_AVATARS.slice(selectedIndex >= 0 ? selectedIndex + 1 : splitAt);

  const handleTap = async (avatar: ReelAvatar) => {
    if (!user || busyId) return;
    const isOwned = avatar.price === 0 || ownedIds.has(avatar.id);

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
          origin: { y: 0.4 },
          colors: ["#A855F7", "#EC4899", "#38BDF8"],
          zIndex: 9999,
        });
      }
      const result = await updateProfile({
        avatar_url: avatar.path,
        animated_avatar_url: null,
        has_face_photo: false,
      } as any);
      if (result?.error) throw result.error;
      toast.success(t("avatar.avatarUpdated"));
    } catch (error) {
      console.error("Avatar select failed:", error);
      toast.error(t("shop.purchaseFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = (avatar: ReelAvatar) => {
    const src = resolveAvatarUrl(avatar.path);
    const isOwned = avatar.price === 0 || ownedIds.has(avatar.id);
    const isBusy = busyId === avatar.id;
    return (
      <motion.button
        key={avatar.id}
        onClick={() => handleTap(avatar)}
        disabled={!!busyId}
        className="relative shrink-0 disabled:opacity-70"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        <div
          className={`w-14 h-14 rounded-full overflow-hidden border-[3px] border-white/90 bg-white ${isBusy ? "animate-pulse" : ""}`}
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
        >
          <img src={src} alt="" className="w-full h-full object-cover select-none" draggable={false} />
        </div>

        {/* Gem price pill for premium avatars not yet owned */}
        {!isOwned && (
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
          >
            <img src={gemIcon} alt="" className="w-3 h-3 object-contain" />
            <span className={`text-[10px] font-black leading-none ${canAffordGems(avatar.price) ? "text-slate-700" : "text-red-500"}`}>
              {avatar.price}
            </span>
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      {/* Left side - nearest neighbor sits next to the center, scroll for more */}
      <div className="flex-1 min-w-0 flex flex-row-reverse items-center gap-2.5 overflow-x-auto scrollbar-hide py-2 pl-1">
        {leftItems.slice().reverse().map(renderItem)}
      </div>

      {/* Selected avatar - always the middle, bold stroke lives on the element itself */}
      <div className="shrink-0">{center}</div>

      {/* Right side */}
      <div className="flex-1 min-w-0 flex items-center gap-2.5 overflow-x-auto scrollbar-hide py-2 pr-1">
        {rightItems.map(renderItem)}
      </div>
    </div>
  );
}
