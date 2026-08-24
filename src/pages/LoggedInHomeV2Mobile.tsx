import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { LoggedInHomeV2Props } from "./LoggedInHomeV2";
import { WorldMap } from "@/features/world-map/WorldMap";
import { adventureWorld } from "@/features/world-map/data/adventureWorld";
import { selectCurrentQuest, selectRouteProgress } from "@/features/world-map/selectors";
import { useProgressionStore } from "@/features/world-map/state/worldStore";
import { resolveCategoryIcon } from "@/features/world-map/assets/categoryIcons";
import { useSound } from "@/contexts/SoundContext";

import worldMap from "@/assets/figma-home/world-map.jpg";
import avatarPhoto from "@/assets/figma-home/avatar-photo.png";
import missionsIcon from "@/assets/figma-home/missions-icon.png";
import powersIcon from "@/assets/figma-home/powers-icon.png";
import power1 from "@/assets/figma-home/power-1.png";
import power2 from "@/assets/figma-home/power-2.png";
import power3 from "@/assets/figma-home/power-3.png";
import power4 from "@/assets/figma-home/power-4.png";
import coinNew from "@/assets/figma-home/coin-new.png";
import gemNew from "@/assets/figma-home/gem-new.png";
import playIcon from "@/assets/figma-home/play-icon.svg";
import navHome from "@/assets/figma-home/nav-home.svg";
import navDiscover from "@/assets/figma-home/nav-discover.svg";
import navShop from "@/assets/figma-home/nav-shop.svg";
import navRating from "@/assets/figma-home/nav-rating.svg";
import navOnline from "@/assets/figma-home/nav-online.svg";
import gridIcon from "@/assets/figma-home/grid-icon.svg";
import bellIcon from "@/assets/figma-home/bell-icon.svg";
import batteryCharge from "@/assets/figma-home/battery-charge.svg";
import plusIcon from "@/assets/figma-home/plus-icon.svg";
import friendGloria from "@/assets/figma-home/friend-gloria.png";
import friendTrivia from "@/assets/figma-home/friend-trivia.png";
import friendGiga from "@/assets/figma-home/friend-giga.png";
import friendGiorgi from "@/assets/figma-home/friend-giorgi.png";
import friendTiko from "@/assets/figma-home/friend-tiko.png";

// Quest card heights. Collapsed is the reference's bottom card; expanded
// turns the same card into the full panel. The safe-area inset is added on
// top of both so the handle clears the home indicator.
const COLLAPSED_H = "calc(max(15dvh, 132px) + var(--safe-bottom))";
const EXPANDED_H = "calc(84dvh + var(--safe-bottom))";

// Vertical drag past this many px commits the gesture. Below it the card
// snaps back, so a scroll that starts on the handle does not toggle state.
const DRAG_COMMIT_PX = 48;

// Spring used everywhere a surface moves. Slight overshoot is what separates
// "animated" from "alive".
const SPRING = "cubic-bezier(0.32, 1.28, 0.5, 1)";

const CARD = "rounded-[22px] bg-white/95 shadow-[0_4px_0_0_#e2d6f2,0_8px_20px_rgba(60,30,90,0.14)]";

/** Press feedback shared by every tappable surface on this screen. */
const PRESSABLE = "transition-transform duration-100 active:scale-[0.96]";

function CountChip({ value }: { value: number }) {
  return (
    <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-[1.78px] border-[#d5d0d8] px-[7px] font-['Nunito'] text-[11px] font-bold tracking-[-0.14px] text-[#9783a3]">
      {value}
    </span>
  );
}

function PowerTile({ img, count }: { img: string; count: number }) {
  return (
    <div className="relative size-[52px] shrink-0">
      <img alt="" className="pointer-events-none size-full object-contain" src={img} />
      <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-[1.78px] border-white bg-[rgba(0,0,0,0.4)] px-[6px] font-['Nunito'] text-[10px] font-bold text-white">
        {count}
      </span>
    </div>
  );
}

/**
 * Phone layout for the /dev/v2 world-map homepage.
 *
 * Structure follows the reference: a floating HUD strip at the top (avatar,
 * name, level, XP bar, wallet), the map owning everything between, and a
 * "current quest" card at the bottom that expands into the full panel.
 *
 * The desktop component paints a fixed 1400x946 stage and scales it to fit,
 * which on a 390px phone lands at 0.28 and renders the design at thumbnail
 * size — hence a separate layout rather than responsive tweaks.
 *
 * The expanded body carries its own `overflow-y-auto`. nativeShell.ts kills
 * the webview's document scroller on iOS (CLAUDE.md rule 4b), so a panel that
 * simply grows past the viewport is frozen on the device.
 */
export function LoggedInHomeV2Mobile({
  nickname,
  avatarUrl,
  coins,
  gems,
  level,
  xpCurrent,
  xpTotal,
  playsRemaining,
  unreadCount,
  onPlay,
  onMissions,
  onPowers,
  onLevel,
  onShop,
  onAvatar,
  onAddFriend,
  onMenu,
}: LoggedInHomeV2Props) {
  const navigate = useNavigate();
  const { vibrate } = useSound();
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState<number | null>(null);
  const dragStart = useRef<number | null>(null);
  // A drag that ends on the handle still produces a click, which would run
  // the toggle and undo the gesture. Set when a drag commits so the click
  // that trails pointerup is swallowed.
  const swallowClick = useRef(false);

  const nodeStates = useProgressionStore((s) => s.nodeStates);
  const quest = useMemo(() => selectCurrentQuest(adventureWorld, nodeStates), [nodeStates]);
  const route = useMemo(() => selectRouteProgress(adventureWorld, nodeStates), [nodeStates]);

  // XP bar fills from 0 on mount rather than snapping to its value — the
  // progress is the reward, so it should be seen moving.
  const [barReady, setBarReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const xpPct = xpTotal > 0 ? Math.min(100, (xpCurrent / xpTotal) * 100) : 0;

  // Android hardware back / browser back closes the card before leaving the
  // page, which is what a bottom sheet is expected to do.
  useEffect(() => {
    if (!expanded) return;
    const onPop = () => setExpanded(false);
    window.history.pushState({ sheet: true }, "");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.sheet) window.history.back();
    };
  }, [expanded]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = e.clientY;
    setDragY(0);
    // Dragging resizes the card, sliding the handle out from under the
    // finger — without capture the move and up events land on whatever is
    // beneath it and the gesture is dropped half-way.
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStart.current === null) return;
      const delta = e.clientY - dragStart.current;
      // Only allow dragging toward the state the card is not already in.
      setDragY(expanded ? Math.max(0, delta) : Math.min(0, delta));
    },
    [expanded]
  );

  const endDrag = useCallback(() => {
    const delta = dragY;
    dragStart.current = null;
    setDragY(null);
    if (delta === null) return;
    if (expanded && delta > DRAG_COMMIT_PX) {
      swallowClick.current = true;
      setExpanded(false);
      vibrate(10);
    } else if (!expanded && delta < -DRAG_COMMIT_PX) {
      swallowClick.current = true;
      setExpanded(true);
      vibrate(10);
    }
  }, [dragY, expanded, vibrate]);

  const toggle = useCallback(() => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    setExpanded((v) => !v);
    vibrate(10);
  }, [vibrate]);

  const startQuest = useCallback(() => {
    vibrate(20);
    const action = quest?.node.action?.kind;
    if (action === "missions") onMissions();
    else if (action === "discover") navigate("/discover");
    else onPlay();
  }, [quest, onMissions, onPlay, navigate, vibrate]);

  const navItems = [
    { icon: navHome, path: "/", label: "მთავარი" },
    { icon: navDiscover, path: "/discover", label: "აღმოჩენა" },
    { icon: navShop, path: "/power-ups", label: "მაღაზია" },
    { icon: navRating, path: "/leaderboards", label: "რეიტინგი" },
    { icon: navOnline, path: "/team", label: "ონლაინ თამაში" },
  ];

  const friends = [
    { img: friendGloria, name: "Gloria" },
    { img: friendTrivia, name: "TriviaMaste" },
    { img: friendGiga, name: "Giga" },
    { img: friendGiorgi, name: "Giorgi K." },
    { img: friendTiko, name: "თიკო" },
  ];

  const powers = [power1, power2, power3, power4];
  const avatar = avatarUrl || avatarPhoto;
  const questIcon = quest ? resolveCategoryIcon(quest.node.label, quest.node.icon) : null;

  return (
    // z-10 lifts the page above GlobalSplineBackground's fixed overlays.
    <div className="fixed inset-0 z-10 overflow-hidden bg-[#ddc2f9]">
      {/* Map owns the full screen and is travelled by vertical drag. */}
      <div className="absolute inset-0">
        <WorldMap
          verticalScroll
          avatarUrl={avatar}
          onMissions={onMissions}
          onDiscover={() => navigate("/discover")}
          onPlay={onPlay}
          fallback={
            <img
              alt=""
              className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
              src={worldMap}
            />
          }
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* HUD strip: identity + progress on the left, wallet on the right.  */}
      {/* ---------------------------------------------------------------- */}
      <div
        className="absolute inset-x-0 z-30 px-[12px]"
        style={{ top: "calc(var(--safe-top) + 8px)" }}
      >
        <div className={`flex items-center gap-[10px] px-[10px] py-[8px] ${CARD}`}>
          <button
            type="button"
            aria-label={nickname}
            onClick={onAvatar}
            className={`relative shrink-0 ${PRESSABLE}`}
          >
            <img
              alt=""
              className="size-[46px] rounded-full border-[3px] border-[#ffb020] object-cover"
              src={avatar}
            />
            <span className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-[#ffb020] px-[6px] font-['Nunito'] text-[9px] font-extrabold leading-[13px] text-white">
              Lv {level}
            </span>
          </button>

          <button type="button" onClick={onLevel} className="min-w-0 flex-1 text-left">
            <p className="truncate font-['Nunito'] text-[15px] font-extrabold tracking-[-0.2px] text-[#3b2d55]">
              {nickname}
            </p>
            <span className="mt-[4px] block h-[9px] w-full overflow-hidden rounded-full bg-[#ece4f7]">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-[#ffcf4d] to-[#ff9f2e]"
                style={{
                  width: barReady ? `${xpPct}%` : "0%",
                  transition: `width 900ms ${SPRING}`,
                }}
              />
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-[6px]">
            <button
              type="button"
              aria-label="ქულა"
              onClick={onShop}
              className={`flex h-[30px] items-center gap-[4px] rounded-full border-[1.5px] border-[#ffd98a] bg-[#fff8e8] px-[8px] ${PRESSABLE}`}
            >
              <img alt="" className="size-[16px] object-contain" src={coinNew} />
              <span className="font-['Nunito'] text-[13px] font-extrabold text-[#b9761a]">
                {coins.toLocaleString("en-US")}
              </span>
            </button>
            <button
              type="button"
              aria-label="ალმასი"
              onClick={onShop}
              className={`flex h-[30px] items-center gap-[4px] rounded-full border-[1.5px] border-[#c9b0f5] bg-[#f6f0ff] px-[8px] ${PRESSABLE}`}
            >
              <img alt="" className="size-[16px] object-contain" src={gemNew} />
              <span className="font-['Nunito'] text-[13px] font-extrabold text-[#7b3fc4]">
                {gems.toLocaleString("en-US")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapter caption + alerts, floating clear of the HUD card. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 flex items-center gap-[8px] px-[18px]"
        style={{ top: "calc(var(--safe-top) + 78px)" }}
      >
        <span className="rounded-full bg-black/25 px-[10px] py-[3px] font-['Nunito'] text-[11px] font-bold text-white backdrop-blur-sm">
          {quest?.chapter ?? adventureWorld.name} · {route.done}/{route.total}
        </span>
        <button
          type="button"
          aria-label="ცნობები"
          onClick={() => navigate("/notifications")}
          className={`pointer-events-auto relative ml-auto flex size-[34px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.16)] ${PRESSABLE}`}
        >
          <img alt="" className="size-[18px]" src={bellIcon} />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#dd2334] px-[4px] font-['Inter'] text-[11px] font-medium text-white">
              {unreadCount > 20 ? "20+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Scrim — only catches taps once the card is open. */}
      <button
        type="button"
        aria-label="დახურვა"
        tabIndex={expanded ? 0 : -1}
        onClick={() => setExpanded(false)}
        className={`absolute inset-0 z-30 bg-black/35 transition-opacity duration-300 ${
          expanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Current quest card → full panel                                   */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-label="მიმდინარე ქვესტი"
        className="absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-[28px] bg-[#f6efff] shadow-[0_-6px_24px_rgba(60,30,90,0.26)]"
        style={{
          // Dragging adjusts height rather than translating: the card is
          // anchored to the bottom edge, so a transform would lift it clear
          // and show the map through the gap underneath.
          height: dragY
            ? `calc(${expanded ? EXPANDED_H : COLLAPSED_H} - ${dragY}px)`
            : expanded
              ? EXPANDED_H
              : COLLAPSED_H,
          transition: dragY === null ? `height 380ms ${SPRING}` : "none",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "პანელის დახურვა" : "პანელის გახსნა"}
          onClick={toggle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex w-full shrink-0 touch-none items-center justify-center py-[9px]"
        >
          <span className="h-[5px] w-[44px] rounded-full bg-[rgba(90,60,130,0.28)]" />
        </button>

        {/* Peek row — the reference's quest card. Kept tappable while
            collapsed so START never needs the panel opened first. */}
        <div className="flex shrink-0 items-center gap-[12px] px-[16px] pb-[14px]">
          {questIcon ? (
            <span className="flex size-[54px] shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-[#7ee34a] to-[#3d9410] shadow-[0_4px_0_0_#2f7409,0_6px_12px_rgba(40,20,70,0.25)]">
              <img alt="" className="size-[30px] object-contain" src={questIcon} />
            </span>
          ) : (
            <span className="flex size-[54px] shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-[#7ee34a] to-[#3d9410]">
              <img alt="" className="size-[22px]" src={playIcon} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-['Nunito'] text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9783a3]">
              {quest ? quest.kindLabel : "მზად ხარ?"}
            </p>
            <p className="truncate font-['Nunito'] text-[16px] font-extrabold leading-[21px] tracking-[-0.2px] text-[#2f2348]">
              {quest ? quest.node.label : "ითამაშე"}
            </p>
          </div>

          <button
            type="button"
            onClick={startQuest}
            className="relative flex h-[46px] shrink-0 items-center justify-center rounded-[23px] border-[2px] border-[#ffc247] bg-gradient-to-b from-[#ffc247] to-[#ff9412] px-[22px] shadow-[0_4px_0_0_#c96a04,0_6px_16px_rgba(255,148,18,0.4)] transition-all duration-100 active:translate-y-[3px] active:shadow-[0_1px_0_0_#c96a04]"
          >
            <span className="font-['Nunito'] text-[14px] font-extrabold uppercase tracking-[0.6px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
              დაწყება
            </span>
          </button>
        </div>

        {/* Expanded body — its own scroller, see the note in the header. */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-[16px] pb-[16px] transition-opacity duration-200 ${
            expanded ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!expanded}
        >
          <button
            type="button"
            onClick={onPlay}
            className={`mb-[12px] flex h-[52px] w-full items-center justify-center gap-[8px] rounded-[26px] border-[2px] border-[#34d399] bg-gradient-to-b from-[#6ee7b7] via-[#10b981] to-[#059669] shadow-[0_4px_0_0_#047857,0_6px_16px_rgba(16,185,129,0.45)] transition-all duration-100 active:translate-y-[3px] active:shadow-[0_1px_0_0_#047857]`}
          >
            <img alt="" className="size-[18px]" src={playIcon} />
            <span className="font-['Nunito'] text-[15px] font-extrabold tracking-[0.38px] text-white">
              ითამაშე
            </span>
          </button>

          <button
            type="button"
            onClick={onPowers}
            className={`mb-[12px] w-full p-[14px] text-left ${CARD} ${PRESSABLE}`}
          >
            <div className="mb-[12px] flex items-center gap-[10px]">
              <img alt="" className="size-[34px] shrink-0 object-contain" src={powersIcon} />
              <span className="font-['Nunito'] text-[13px] font-bold tracking-[-0.13px] text-[#1f2937]">
                ძალები
              </span>
              <span className="ml-auto">
                <CountChip value={34} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-[8px]">
              {powers.map((p, i) => (
                <PowerTile key={i} img={p} count={34} />
              ))}
            </div>
          </button>

          <button
            type="button"
            onClick={onMissions}
            className={`mb-[12px] flex w-full items-center gap-[10px] p-[14px] text-left ${CARD} ${PRESSABLE}`}
          >
            <img alt="" className="size-[34px] shrink-0 object-contain" src={missionsIcon} />
            <span className="font-['Nunito'] text-[13px] font-bold tracking-[-0.13px] text-[#1f2937]">
              მისიები
            </span>
            <span className="ml-auto">
              <CountChip value={34} />
            </span>
          </button>

          <div className="-mx-[16px] mb-[12px] flex gap-[14px] overflow-x-auto px-[16px] pb-[4px]">
            <button
              type="button"
              onClick={onAddFriend}
              className={`flex w-[60px] shrink-0 flex-col items-center gap-[6px] ${PRESSABLE}`}
            >
              <span
                className="flex size-[56px] items-center justify-center rounded-full border-2 border-dashed border-[#c084fc]"
                style={{ backgroundImage: "linear-gradient(135deg, rgb(243,232,255) 0%, rgb(233,213,255) 100%)" }}
              >
                <img alt="" className="size-[20px]" src={plusIcon} />
              </span>
              <span className="truncate font-['Nunito'] text-[11px] font-medium text-[#475569]">
                დამატება
              </span>
            </button>
            {friends.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => navigate("/team")}
                className={`flex w-[60px] shrink-0 flex-col items-center gap-[6px] ${PRESSABLE}`}
              >
                <img
                  alt=""
                  className="size-[56px] rounded-full border-[3px] border-white object-cover"
                  src={f.img}
                />
                <span className="w-full truncate text-center font-['Nunito'] text-[11px] font-medium text-[#334155]">
                  {f.name}
                </span>
              </button>
            ))}
          </div>

          <div className={`mb-[12px] flex items-center justify-between px-[8px] py-[12px] ${CARD}`}>
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                aria-label={item.label}
                onClick={() => navigate(item.path)}
                className={`flex size-[48px] items-center justify-center rounded-full active:bg-black/5 ${PRESSABLE}`}
              >
                <img alt="" className="size-[24px]" src={item.icon} />
              </button>
            ))}
            <button
              type="button"
              aria-label="მენიუ"
              onClick={onMenu}
              className={`flex size-[48px] items-center justify-center rounded-full active:bg-black/5 ${PRESSABLE}`}
            >
              <img alt="" className="size-[20px]" src={gridIcon} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-[8px] opacity-70">
            <img alt="" className="size-[16px]" src={batteryCharge} />
            <span className="font-['Nunito'] text-[12px] font-medium tracking-[-0.16px] text-[rgba(31,23,48,0.7)]">
              დარჩენილია {playsRemaining} თამაში
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoggedInHomeV2Mobile;
