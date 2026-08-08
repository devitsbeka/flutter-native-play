import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";
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
  kind: "preset" | "generated" | "custom";
  genId?: string; // avatar_generations row id, kind "generated" only
  animatedUrl?: string | null;
}

// Canonical /src/assets paths — stable across builds, resolveAvatarUrl()
// maps them to the bundled URLs at runtime (same scheme as AvatarModal).
const REEL_AVATARS: ReelItem[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    id: `mascot-avatar-${n}`,
    path: `/src/assets/avatars/mascot-avatar-${n}.png`,
    price: 0,
    kind: "preset" as const,
  })),
  // Premium set, priced in gems (gems themselves are bought with real money)
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    id: `bot-avatar-${n}`,
    path: `/src/assets/avatars/bot-avatar-${n}.png`,
    price: n <= 4 ? 30 : n <= 7 ? 50 : 80,
    kind: "preset" as const,
  })),
];

const SLOT_WIDTH = 88; // layout width of one carousel slot, px

// Snap carousel: the strip drags left/right for browsing; the centered item
// enlarges, but selection happens only on an explicit tap — the actually
// selected avatar keeps a persistent badge wherever it sits in the strip.
// Order: the player's own avatars (uploaded / AI-generated) come first, the
// premium set next, and the basic mascots last. Unowned premium avatars are
// bought with gems on tap (ledger: purchase_transactions, type "avatar").
export function AvatarReel() {
  const { user, profile, updateProfile } = useAuth();
  const { spendGems, canAffordGems } = useCurrency();
  const { openAvatarModal } = useAvatarModal();
  const { t } = useLanguage();

  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [centerIdx, setCenterIdx] = useState(0);
  // The user's own AI-generated/animated avatars (avatar_generations rows)
  const [generated, setGenerated] = useState<ReelItem[]>([]);
  // An uploaded photo avatar isn't a preset or a generation — pin it as the
  // first slot for the session so the user can always scroll back to it.
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
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

  // Load the user's generated avatars so they ride the carousel too
  useEffect(() => {
    if (!user) return;
    supabase
      .from("avatar_generations")
      .select("id, avatar_url, animated_avatar_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (data) {
          setGenerated(
            data.map((g) => ({
              id: `gen-${g.id}`,
              genId: g.id,
              path: g.avatar_url,
              animatedUrl: g.animated_avatar_url,
              price: 0,
              kind: "generated" as const,
            }))
          );
        }
      });
  }, [user]);

  useEffect(() => {
    const url = profile?.avatar_url;
    if (!url || customUrl) return;
    const resolved = resolveAvatarUrl(url);
    if (
      !REEL_AVATARS.some((a) => resolveAvatarUrl(a.path) === resolved) &&
      !generated.some((g) => g.path === url)
    ) {
      setCustomUrl(url);
    }
  }, [profile?.avatar_url, customUrl, generated]);

  const items: ReelItem[] = useMemo(() => {
    // The player's own avatars (uploaded + AI-generated), deduped by
    // resolved URL — they lead the reel ahead of every preset.
    const seen = new Set<string>();
    const own: ReelItem[] = [];
    const candidates: ReelItem[] = [
      ...(customUrl ? [{ id: "custom", path: customUrl, price: 0, kind: "custom" as const }] : []),
      ...generated,
    ];
    for (const item of candidates) {
      const key = resolveAvatarUrl(item.path) || item.path;
      if (seen.has(key)) continue;
      seen.add(key);
      own.push(item);
    }
    // Own avatars first, premium set next, basic mascots last
    return [
      ...own,
      ...REEL_AVATARS.filter((a) => a.price > 0),
      ...REEL_AVATARS.filter((a) => a.price === 0),
    ];
  }, [customUrl, generated]);

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

  // Start centered on the selected avatar (re-run when the custom/generated
  // slots load in and shift indexes).
  useEffect(() => {
    const idx = selectedIdx >= 0 ? selectedIdx : 0;
    setCenterIdx(idx);
    centerItem(idx, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Re-center when the avatar changes from outside (e.g. the avatar studio)
  useEffect(() => {
    if (selectedIdx < 0 || selectedIdx === centerIdx) return;
    centerItem(selectedIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResolved]);

  const applyAvatar = async (item: ReelItem) => {
    setBusyId(item.id);
    try {
      // Generated avatars keep their animation and is_current bookkeeping,
      // mirroring the avatar studio's "use previous avatar" flow
      if (item.kind === "generated" && user) {
        await supabase.from("avatar_generations").update({ is_current: false }).eq("user_id", user.id);
        await supabase.from("avatar_generations").update({ is_current: true }).eq("id", item.genId!);
      }
      const patch =
        item.kind === "custom"
          ? { avatar_url: item.path }
          : item.kind === "generated"
            ? { avatar_url: item.path, animated_avatar_url: item.animatedUrl || null }
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

  // Scrolling only browses — selection is an explicit tap, so dragging
  // through the strip can never change the avatar by accident.
  const handleScroll = () => {
    setCenterIdx(nearestIndex());
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
          const isSelected = idx === selectedIdx;
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
                    isCenter
                      ? "border-[3px] border-white ring-2 ring-primary"
                      : isSelected
                        ? "border-2 border-white ring-2 ring-emerald-500"
                        : "border-2 border-white/80"
                  }`}
                  style={{
                    boxShadow: isCenter ? "0 4px 14px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.12)",
                  }}
                >
                  <img src={src} alt="" className="w-full h-full object-cover select-none" draggable={false} />
                </div>

                {/* Persistent marker on the ACTUAL selected avatar, wherever
                    it sits — the enlarged middle slot is just browsing */}
                {isSelected && (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center z-10">
                    <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                  </div>
                )}

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
