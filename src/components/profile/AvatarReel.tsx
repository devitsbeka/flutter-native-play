import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Maximize2, Plus, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { supabase } from "@/integrations/supabase/client";
import { mascotAvatarUrl, resolveAvatarUrl } from "@/utils/avatarUtils";
import { MASCOTS } from "@/config/mascots";
import { AvatarViewer } from "@/components/profile/AvatarViewer";

interface ReelItem {
  id: string;
  path: string;
  // "create" is not an avatar — it is the slot that opens the studio to make
  // one. It rides in the same list so the carousel's snapping, centering and
  // index maths treat it like any other slot.
  kind: "preset" | "generated" | "custom" | "create";
  genId?: string; // avatar_generations row id, kind "generated" only
  animatedUrl?: string | null;
}

// Making a new avatar was reachable only from the chip under a focused
// NON-preset avatar — so a player wearing a mascot, which is everyone who has
// not made one yet, had no way in from this screen at all. It leads the reel.
const CREATE_ITEM: ReelItem = { id: "create-new", path: "", kind: "create" };

// The eight animals, stored by id (`mascot:owl`) the way the studio stores
// them — never a bundled file's URL, whose build hash goes stale on the
// next deploy. The eight blue Kings this reel used to offer are retired
// (owner's ask); anyone still wearing one is dealt an animal.
const REEL_AVATARS: ReelItem[] = MASCOTS.map((m) => ({
  id: `mascot-${m.id}`,
  path: mascotAvatarUrl(m.id),
  kind: "preset" as const,
}));

const SLOT_WIDTH = 104; // layout width of one carousel slot, px
const CENTER_SCALE = 2; // the middle avatar is twice the size of the others

// Snap carousel: dragging only browses (the centered item enlarges gently —
// pure transform, no layout shifts, so the scroll stays fast). Tapping an
// avatar focuses it: it grows fully and shows the "choose" chip plus the
// view-full-size button; the next drag dismisses the focus. The
// actual avatar keeps a persistent check badge wherever it sits. Order: the
// player's own avatars (uploaded / AI-generated) first, then the presets.
export function AvatarReel() {
  const { user, profile, updateProfile } = useAuth();
  const { openAvatarModal } = useAvatarModal();
  const { t } = useLanguage();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [centerIdx, setCenterIdx] = useState(0);
  // Index the user explicitly tapped — unlocks the choose/view actions
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  // The user's own AI-generated/animated avatars (avatar_generations rows)
  const [generated, setGenerated] = useState<ReelItem[]>([]);
  // An uploaded photo avatar isn't a preset or a generation — pin it as the
  // first slot for the session so the user can always scroll back to it.
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  // The avatar being looked at full size. Null when the viewer is closed.
  const [viewing, setViewing] = useState<ReelItem | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragState = useRef({ startX: 0, startScroll: 0, dragging: false, moved: false });

  // Load the user's generated avatars so they ride the carousel too
  useEffect(() => {
    if (!user) return;
    supabase
      .from("avatar_generations")
      .select("id, avatar_url, animated_avatar_url")
      .eq("user_id", user.id)
      // Scene generations belong to the homepage, not the circle avatar reel
      .not("avatar_url", "like", "%/scene_%")
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
    // resolved URL — they lead the reel ahead of the mascot presets.
    const seen = new Set<string>();
    const own: ReelItem[] = [];
    const candidates: ReelItem[] = [
      ...(customUrl ? [{ id: "custom", path: customUrl, kind: "custom" as const }] : []),
      ...generated,
    ];
    for (const item of candidates) {
      const key = resolveAvatarUrl(item.path) || item.path;
      if (seen.has(key)) continue;
      seen.add(key);
      own.push(item);
    }
    return [CREATE_ITEM, ...own, ...REEL_AVATARS];
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
      // mirroring the avatar studio's "use previous avatar" flow. Only
      // portrait rows swap flags — the chosen homepage scene keeps its own.
      if (item.kind === "generated" && user) {
        await supabase.from("avatar_generations").update({ is_current: false }).eq("user_id", user.id).not("avatar_url", "like", "%/scene_%");
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
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  };

  // Remove one of the player's own avatars from the reel (generated rows are
  // deleted from history; an uploaded custom is just unpinned). The applied
  // avatar and presets can't be removed.
  const removeItem = async (item: ReelItem) => {
    setBusyId(item.id);
    try {
      if (item.kind === "generated" && item.genId) {
        const { error } = await supabase.from("avatar_generations").delete().eq("id", item.genId);
        if (error) throw error;
        setGenerated((prev) => prev.filter((g) => g.id !== item.id));
      } else if (item.kind === "custom") {
        setCustomUrl(null);
      }
      setFocusedIdx(null);
    } catch (error) {
      console.error("Avatar remove failed:", error);
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
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

  // Tapping focuses the avatar (centering it if needed) and reveals the
  // choose/view actions — applying happens only through the chip
  const handleItemClick = (idx: number) => {
    if (dragState.current.moved || busyId) return;
    // The create slot is an action, not a choice — one tap opens the studio
    // rather than focusing a thing that then needs a second tap.
    if (items[idx]?.kind === "create") {
      openAvatarModal();
      return;
    }
    // Tapping the one already focused opens it full size. 128px in a strip
    // is the largest a player could ever see a picture they paid to have
    // made, and the tap that would have enlarged it did nothing.
    if (idx === focusedIdx && idx === centerIdx) {
      setViewing(items[idx]);
      return;
    }
    setFocusedIdx(idx);
    if (idx !== centerIdx) centerItem(idx);
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
    if (Math.abs(dx) > 4) {
      s.moved = true;
      setFocusedIdx(null);
    }
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
        onTouchMove={() => setFocusedIdx(null)}
        onDragStart={(e) => e.preventDefault()}
        className="flex items-center h-40 overflow-x-auto scrollbar-hide snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
        style={{
          paddingLeft: `calc(50% - ${SLOT_WIDTH / 2}px)`,
          paddingRight: `calc(50% - ${SLOT_WIDTH / 2}px)`,
        }}
      >
        {items.map((item, idx) => {
          const isCenter = idx === centerIdx;
          const isSelected = idx === selectedIdx;
          const isBusy = busyId === item.id;

          if (item.kind === "create") {
            return (
              <button
                key={item.id}
                ref={(el) => (itemRefs.current[idx] = el)}
                onClick={() => handleItemClick(idx)}
                aria-label={t("avatar.createNew")}
                className="relative shrink-0 h-full snap-center flex items-center justify-center"
                style={{ width: SLOT_WIDTH, zIndex: isCenter ? 10 : 1 }}
              >
                <div
                  className="relative rounded-full transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${isCenter ? CENTER_SCALE : 1})` }}
                >
                  {/* Grey, not the brand purple. This slot sits in a row of
                      faces and is the one thing in it that is not a face;
                      drawn in the accent colour it pulled the eye first, and
                      the avatar the player has actually chosen — the one
                      wearing the green tick — came second. */}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center bg-white/80 border-2 border-dashed ${
                      isCenter ? "border-slate-400" : "border-slate-300"
                    }`}
                  >
                    <Camera className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" strokeWidth={3.5} />
                  </div>
                </div>
              </button>
            );
          }

          const src = resolveItem(item);
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
                style={{ transform: `scale(${isCenter ? CENTER_SCALE : 1})` }}
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
                    it sits — the enlarged middle slot is just a preview */}
                {isSelected && (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center z-10">
                    <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions for the tapped avatar: "choose" applies it (hidden when it's
          already the applied one), and the arrows open it full size.
          Dragging dismisses both.

          There used to be a sparkles button beside them opening the avatar
          studio. It read as the retired "animate" control — same icon, same
          place — and the studio was never behind it anyway: the create slot
          at the head of the reel opens it in one tap. */}
      {focusedIdx !== null && focusedIdx === centerIdx && items[centerIdx] && !busyId && (
        <>
          {/* Remove — top-right of the enlarged avatar; own avatars only,
              and never the one currently in use */}
          {items[centerIdx].kind !== "preset" && items[centerIdx].kind !== "create" && centerIdx !== selectedIdx && (
            <button
              onClick={() => void removeItem(items[centerIdx])}
              aria-label="Remove avatar"
              className="absolute z-30 w-7 h-7 rounded-full bg-white text-red-500 border border-border/40 shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
              style={{ left: "calc(50% + 34px)", top: 14 }}
            >
              <X className="w-4 h-4" strokeWidth={3} />
            </button>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20 flex items-center gap-2">
          {centerIdx !== selectedIdx && (
            <button
              onClick={() => {
                void applyAvatar(items[centerIdx]).then(() => setFocusedIdx(null));
              }}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-[13px] font-bold shadow-lg whitespace-nowrap"
            >
              {t("extra.avatarChooseBtn")}
            </button>
          )}
          {/* Full size, and from there the animate button. Spelled out as its
              own control rather than left to the second tap alone: a gesture
              nothing on screen mentions is a feature only the person who
              wrote it knows about. */}
          {items[centerIdx].kind !== "create" && (
            <button
              onClick={() => setViewing(items[centerIdx])}
              className="w-8 h-8 rounded-full bg-white text-primary border border-border/40 flex items-center justify-center shadow-lg"
              aria-label={t("extra.avatarViewLarge")}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          </div>
        </>
      )}

      <AvatarViewer
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        imageUrl={viewing ? resolveItem(viewing) : ""}
        animatedUrl={viewing?.animatedUrl}
      />
    </div>
  );
}
