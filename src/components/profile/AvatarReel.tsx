import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import gemIcon from "@/assets/icons/icon-gem.png";

interface ReelItem {
  id: string;
  path: string;
  price: number; // 0 = free
}

// Canonical /src/assets paths — stable across builds, resolveAvatarUrl()
// maps them to the bundled URLs at runtime (same scheme as AvatarModal).
const REEL_AVATARS: ReelItem[] = [
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

const SLOT_WIDTH = 88; // layout width of one carousel slot, px
const SETTLE_MS = 250; // scroll quiet time before the centered avatar applies

// Snap carousel: the whole strip drags left/right, the middle slot is the
// selection — whatever settles there (free or already owned) becomes the
// avatar and wears the bold stroke. Unowned premium avatars settle in the
// middle without applying; tapping them buys with gems (ledger:
// purchase_transactions, product_type "avatar") and equips.
export function AvatarReel() {
  const { user, profile, updateProfile } = useAuth();
  const { spendGems, canAffordGems } = useCurrency();
  const { openAvatarModal } = useAvatarModal();
  const { t } = useLanguage();

  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [centerIdx, setCenterIdx] = useState(0);
  // A custom (uploaded/AI) avatar isn't a preset — pin it as the first slot
  // for the session so the user can always scroll back to it.
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const settleTimer = useRef<number | null>(null);
  const suppressSettle = useRef(true);
  const dragState = useRef({ startX: 0, startScroll: 0, dragging: false, moved: false });

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

  useEffect(() => {
    const url = profile?.avatar_url;
    if (!url || customUrl) return;
    const resolved = resolveAvatarUrl(url);
    if (!REEL_AVATARS.some((a) => resolveAvatarUrl(a.path) === resolved)) {
      setCustomUrl(url);
    }
  }, [profile?.avatar_url, customUrl]);

  const items: ReelItem[] = useMemo(
    () => [...(customUrl ? [{ id: "custom", path: customUrl, price: 0 }] : []), ...REEL_AVATARS],
    [customUrl]
  );

  const currentResolved = resolveAvatarUrl(profile?.avatar_url);
  const resolveItem = (item: ReelItem) => resolveAvatarUrl(item.path) || item.path;
  const selectedIdx = items.findIndex((a) => resolveItem(a) === currentResolved);

  const centerItem = useCallback((idx: number, smooth = true) => {
    const c = containerRef.current;
    const el = itemRefs.current[idx];
    if (!c || !el) return;
    const target = el.offsetLeft + el.offsetWidth / 2 - c.clientWidth / 2;
    c.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Center the selected avatar on mount (and when the pinned custom slot
  // appears and shifts indexes) without triggering an auto-apply.
  useEffect(() => {
    const idx = selectedIdx >= 0 ? selectedIdx : 0;
    setCenterIdx(idx);
    suppressSettle.current = true;
    centerItem(idx, false);
    const timer = window.setTimeout(() => {
      suppressSettle.current = false;
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customUrl]);

  // Re-center when the avatar changes from outside (e.g. the avatar studio)
  useEffect(() => {
    if (selectedIdx < 0 || selectedIdx === centerIdx) return;
    suppressSettle.current = true;
    centerItem(selectedIdx);
    const timer = window.setTimeout(() => {
      suppressSettle.current = false;
    }, 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResolved]);

  const applyAvatar = async (item: ReelItem) => {
    setBusyId(item.id);
    try {
      const patch =
        item.id === "custom"
          ? { avatar_url: item.path }
          : { avatar_url: item.path, animated_avatar_url: null, has_face_photo: false };
      const result = await updateProfile(patch as any);
      if (result?.error) throw result.error;
      toast.success(t("avatar.avatarUpdated"));
    } catch (error) {
      console.error("Avatar select failed:", error);
      toast.error(t("shop.purchaseFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const purchaseAndApply = async (item: ReelItem) => {
    if (!canAffordGems(item.price)) {
      toast.error(t("extra.frameNotEnoughGems"));
      return;
    }
    setBusyId(item.id);
    try {
      const spent = await spendGems(item.price, {
        productId: item.id,
        productType: "avatar",
        valueReceived: { avatar: item.path },
      });
      if (!spent) {
        toast.error(t("extra.frameNotEnoughGems"));
        return;
      }
      setOwnedIds((prev) => new Set(prev).add(item.id));
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.4 },
        colors: ["#A855F7", "#EC4899", "#38BDF8"],
        zIndex: 9999,
      });
    } catch (error) {
      console.error("Avatar purchase failed:", error);
      toast.error(t("shop.purchaseFailed"));
      return;
    } finally {
      setBusyId(null);
    }
    await applyAvatar(item);
  };

  const nearestIndex = () => {
    const c = containerRef.current;
    if (!c) return 0;
    const mid = c.scrollLeft + c.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const distance = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  };

  // Whatever settles in the middle becomes the avatar — except unowned
  // premium ones, which wait for an explicit tap so gems never auto-spend.
  const handleSettle = (idx: number) => {
    if (suppressSettle.current || busyId || !user) return;
    const item = items[idx];
    if (!item || resolveItem(item) === currentResolved) return;
    if (item.price !== 0 && !ownedIds.has(item.id)) return;
    void applyAvatar(item);
  };

  const handleScroll = () => {
    const best = nearestIndex();
    setCenterIdx(best);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => handleSettle(best), SETTLE_MS);
  };

  const handleItemClick = (idx: number) => {
    if (dragState.current.moved || busyId) return;
    if (idx !== centerIdx) {
      centerItem(idx);
      return;
    }
    const item = items[idx];
    const isOwned = item.price === 0 || ownedIds.has(item.id);
    if (!isOwned) {
      void purchaseAndApply(item);
    } else if (resolveItem(item) !== currentResolved) {
      void applyAvatar(item);
    }
  };

  // Mouse drag-to-scroll (touch scrolls natively); snap is suspended during
  // the drag and restored on release, then we glide to the nearest slot.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const c = containerRef.current;
    if (!c) return;
    dragState.current = { startX: e.clientX, startScroll: c.scrollLeft, dragging: true, moved: false };
    c.style.scrollSnapType = "none";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = dragState.current;
    if (!s.dragging) return;
    const c = containerRef.current;
    if (!c) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    c.scrollLeft = s.startScroll - dx;
  };

  const endDrag = () => {
    const s = dragState.current;
    if (!s.dragging) return;
    s.dragging = false;
    const c = containerRef.current;
    if (c) {
      c.style.scrollSnapType = "";
      centerItem(nearestIndex());
    }
    // Let the click that follows pointerup see the moved flag, then reset it
    window.setTimeout(() => {
      dragState.current.moved = false;
    }, 50);
  };

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onDragStart={(e) => e.preventDefault()}
        className="flex items-center h-36 overflow-x-auto scrollbar-hide snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
        style={{
          paddingLeft: `calc(50% - ${SLOT_WIDTH / 2}px)`,
          paddingRight: `calc(50% - ${SLOT_WIDTH / 2}px)`,
        }}
      >
        {items.map((item, idx) => {
          const isCenter = idx === centerIdx;
          const src = resolveItem(item);
          const isOwned = item.price === 0 || ownedIds.has(item.id);
          const isBusy = busyId === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => (itemRefs.current[idx] = el)}
              onClick={() => handleItemClick(idx)}
              className="relative shrink-0 h-full snap-center flex items-center justify-center"
              style={{ width: SLOT_WIDTH, zIndex: isCenter ? 10 : 1 }}
            >
              <div
                className={`relative rounded-full transition-transform duration-200 ease-out ${isBusy ? "animate-pulse" : ""}`}
                style={{ transform: `scale(${isCenter ? 1.7 : 1})` }}
              >
                <div
                  className={`w-16 h-16 rounded-full overflow-hidden bg-white ${
                    isCenter ? "border-[3px] border-white ring-2 ring-primary" : "border-2 border-white/80"
                  }`}
                  style={{
                    boxShadow: isCenter ? "0 4px 14px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.12)",
                  }}
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
                    <span
                      className={`text-[10px] font-black leading-none ${
                        canAffordGems(item.price) ? "text-slate-700" : "text-red-500"
                      }`}
                    >
                      {item.price}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Avatar studio (upload / AI) - pinned to the center slot */}
      <button
        onClick={() => openAvatarModal()}
        className="absolute left-1/2 top-1/2 z-20 p-2 bg-primary rounded-full shadow-lg"
        style={{ transform: "translate(26px, 24px)" }}
        aria-label="Edit avatar"
      >
        <Sparkles className="w-4 h-4 text-primary-foreground" />
      </button>
    </div>
  );
}
