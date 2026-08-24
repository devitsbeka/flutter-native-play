import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { LoggedInHomeV2Props } from "./LoggedInHomeV2";
import { WorldMap } from "@/features/world-map/WorldMap";

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
import crown from "@/assets/figma-home/crown.svg";
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

// Sheet heights. Collapsed is the "15% of the page" peek from the design
// note, floored so the play button still has room on a short phone; the
// safe-area inset is added on top of both so the handle sits above the home
// indicator rather than under it.
const COLLAPSED_H = "calc(max(15dvh, 112px) + var(--safe-bottom))";
const EXPANDED_H = "calc(82dvh + var(--safe-bottom))";

// Vertical drag past this many px commits the gesture. Below it the sheet
// snaps back, so a scroll that starts on the handle does not toggle state.
const DRAG_COMMIT_PX = 48;

const CARD_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(254,254,254,0.62))";
const CARD_CHROME =
  "border border-[#e8e0f5] rounded-[24px] shadow-[0px_3px_0px_0px_#d8d0e8,0px_5px_13px_0px_rgba(0,0,0,0.08)]";

/** Small round-rect count chip, as on the desktop power/mission cards. */
function CountChip({ value }: { value: number }) {
  return (
    <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-[1.78px] border-[#d5d0d8] px-[7px] font-['Nunito'] text-[11px] font-bold tracking-[-0.14px] text-[#9783a3]">
      {value}
    </span>
  );
}

/** Power tile with its stock badge, sized for a thumb rather than a cursor. */
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
 * The desktop component paints a fixed 1400x946 stage and scales it to fit,
 * which on a 390px-wide phone lands at 0.28 and renders the whole design at
 * thumbnail size. This is a separate layout rather than a set of responsive
 * tweaks: the map wants the entire screen, and everything the sidebar held
 * moves into a bottom sheet that opens on tap.
 *
 * Note the sheet body carries its own `overflow-y-auto`. nativeShell.ts
 * disables the webview's document scroller on iOS (CLAUDE.md rule 4b), so a
 * panel that simply grows past the viewport is frozen on the device.
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
  const [expanded, setExpanded] = useState(false);
  // Live finger offset while dragging, so the sheet tracks the thumb instead
  // of only animating after release. null = not dragging.
  const [dragY, setDragY] = useState<number | null>(null);
  const dragStart = useRef<number | null>(null);
  // A drag that ends on the handle still produces a click, which would run
  // the toggle below and undo the gesture. Set when a drag commits so the
  // click that follows it is swallowed.
  const swallowClick = useRef(false);

  // Android hardware back / browser back closes the sheet before it leaves
  // the page, which is what a bottom sheet is expected to do.
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
    // Dragging resizes the sheet, which slides the handle out from under the
    // finger — without capture the move and up events land on whatever is
    // beneath it and the gesture is dropped half-way.
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStart.current === null) return;
      const delta = e.clientY - dragStart.current;
      // Only allow dragging toward the state the sheet is not already in, so
      // it never lifts above its expanded height or below its peek.
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
    } else if (!expanded && delta < -DRAG_COMMIT_PX) {
      swallowClick.current = true;
      setExpanded(true);
    }
  }, [dragY, expanded]);

  const toggle = useCallback(() => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    setExpanded((v) => !v);
  }, []);

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

  return (
    // z-10 lifts the page above GlobalSplineBackground's fixed overlays.
    <div className="fixed inset-0 z-10 overflow-hidden bg-[#ddc2f9]">
      {/* Map owns the full screen — it is the default view, per the design. */}
      <div className="absolute inset-0">
        <WorldMap
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

      {/* Top bar: identity on the left, wallet and alerts on the right. Sits
          inside the safe-area inset so it clears the notch. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-30 flex items-center gap-[10px] px-[14px]"
        style={{ top: "calc(var(--safe-top) + 10px)" }}
      >
        <img alt="" className="pointer-events-none h-[16px] w-[24px] shrink-0" src={crown} />
        <p className="pointer-events-none truncate font-['Google_Sans','Nunito',sans-serif] text-[15px] tracking-[-0.16px] text-[rgba(31,41,55,0.75)]">
          სამყარო ალფა
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-[10px]">
          <button
            type="button"
            aria-label="ქულა"
            onClick={onShop}
            className="pointer-events-auto flex h-[34px] items-center gap-[6px] rounded-full bg-[rgba(255,255,255,0.85)] px-[10px] shadow-[0px_2px_6px_rgba(0,0,0,0.12)]"
          >
            <img alt="" className="size-[20px] object-contain" src={coinNew} />
            <span className="font-['Nunito'] text-[14px] font-bold text-[#374151]">
              {coins.toLocaleString("en-US")}
            </span>
          </button>
          <button
            type="button"
            aria-label="ალმასი"
            onClick={onShop}
            className="pointer-events-auto flex h-[34px] items-center gap-[6px] rounded-full bg-[rgba(255,255,255,0.85)] px-[10px] shadow-[0px_2px_6px_rgba(0,0,0,0.12)]"
          >
            <img alt="" className="size-[20px] object-contain" src={gemNew} />
            <span className="font-['Nunito'] text-[14px] font-bold text-[#374151]">
              {gems.toLocaleString("en-US")}
            </span>
          </button>
          <button
            type="button"
            aria-label="ცნობები"
            onClick={() => navigate("/notifications")}
            className="pointer-events-auto relative flex size-[34px] items-center justify-center rounded-full bg-white shadow-[0px_2px_6px_rgba(0,0,0,0.12)]"
          >
            <img alt="" className="size-[18px]" src={bellIcon} />
            {unreadCount > 0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#dd2334] px-[4px] font-['Inter'] text-[11px] font-medium text-white">
                {unreadCount > 20 ? "20+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrim. Only catches taps once the sheet is open, so the map stays
          fully interactive in the default state. */}
      <button
        type="button"
        aria-label="დახურვა"
        tabIndex={expanded ? 0 : -1}
        onClick={() => setExpanded(false)}
        className={`absolute inset-0 z-30 bg-black/30 transition-opacity duration-300 ${
          expanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Bottom sheet */}
      <section
        aria-label="პროფილი და ძალები"
        className="absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-[28px] bg-[#efe3fb] shadow-[0px_-6px_24px_rgba(60,30,90,0.22)]"
        style={{
          // Dragging adjusts the height rather than translating the sheet:
          // it is anchored to the bottom edge, so a transform would lift it
          // clear of the edge and show the map through the gap underneath.
          height: dragY
            ? `calc(${expanded ? EXPANDED_H : COLLAPSED_H} - ${dragY}px)`
            : expanded
              ? EXPANDED_H
              : COLLAPSED_H,
          transition: dragY === null ? "height 320ms cubic-bezier(0.32,0.72,0,1)" : "none",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        {/* Grab handle — also the tap target that toggles the sheet. */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "პანელის დახურვა" : "პანელის გახსნა"}
          onClick={toggle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex w-full shrink-0 items-center justify-center py-[10px] touch-none"
        >
          <span className="h-[5px] w-[44px] rounded-full bg-[rgba(90,60,130,0.28)]" />
        </button>

        {/* Peek row. Always visible; the play button stays tappable without
            opening the sheet first, which is the one action that matters. */}
        <div className="flex shrink-0 items-center gap-[12px] px-[16px] pb-[12px]">
          <button type="button" aria-label={nickname} onClick={onAvatar} className="shrink-0">
            <img
              alt=""
              className="size-[52px] rounded-full border-[3px] border-white object-cover shadow-[0px_2px_8px_rgba(0,0,0,0.15)]"
              src={avatarUrl || avatarPhoto}
            />
          </button>

          <button type="button" onClick={onLevel} className="min-w-0 flex-1 text-left">
            <p className="truncate font-['Nunito'] text-[15px] font-bold tracking-[-0.15px] text-[#3b2d55]">
              დონე {level}
            </p>
            <p className="truncate font-['Nunito'] text-[12px] text-[rgba(59,45,85,0.7)]">
              {xpCurrent.toLocaleString("en-US")} / {xpTotal.toLocaleString("en-US")} XP
            </p>
          </button>

          <button
            type="button"
            onClick={onPlay}
            className="relative flex h-[48px] shrink-0 items-center justify-center gap-[8px] rounded-[24px] border-[2px] border-[#34d399] px-[22px] shadow-[0px_4px_0px_0px_#047857,0px_6px_16px_0px_rgba(16,185,129,0.45)]"
            style={{ background: "linear-gradient(to bottom, #6ee7b7 0%, #10b981 50%, #059669 100%)" }}
          >
            <img alt="" className="size-[18px]" src={playIcon} />
            <span className="font-['Nunito'] text-[15px] font-bold tracking-[0.38px] text-white">
              ითამაშე
            </span>
          </button>
        </div>

        {/* Expanded body. Its own scroller — see the note in the file header. */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-[16px] pb-[16px] transition-opacity duration-200 ${
            expanded ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!expanded}
        >
          {/* Powers */}
          <button
            type="button"
            onClick={onPowers}
            className={`relative mb-[12px] w-full overflow-hidden p-[14px] text-left ${CARD_CHROME}`}
            style={{ background: CARD_GRADIENT }}
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

          {/* Missions */}
          <button
            type="button"
            onClick={onMissions}
            className={`relative mb-[12px] flex w-full items-center gap-[10px] overflow-hidden p-[14px] text-left ${CARD_CHROME}`}
            style={{ background: CARD_GRADIENT }}
          >
            <img alt="" className="size-[34px] shrink-0 object-contain" src={missionsIcon} />
            <span className="font-['Nunito'] text-[13px] font-bold tracking-[-0.13px] text-[#1f2937]">
              მისიები
            </span>
            <span className="ml-auto">
              <CountChip value={34} />
            </span>
          </button>

          {/* Friends — horizontal, so a long list never grows the sheet. */}
          <div className="-mx-[16px] mb-[12px] flex gap-[14px] overflow-x-auto px-[16px] pb-[4px]">
            <button
              type="button"
              onClick={onAddFriend}
              className="flex w-[60px] shrink-0 flex-col items-center gap-[6px]"
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
                className="flex w-[60px] shrink-0 flex-col items-center gap-[6px]"
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

          {/* Destinations that lived on the desktop left rail */}
          <div
            className={`mb-[12px] flex items-center justify-between overflow-hidden px-[8px] py-[12px] ${CARD_CHROME}`}
            style={{ background: CARD_GRADIENT }}
          >
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                aria-label={item.label}
                onClick={() => navigate(item.path)}
                className="flex size-[48px] items-center justify-center rounded-full active:bg-black/5"
              >
                <img alt="" className="size-[24px]" src={item.icon} />
              </button>
            ))}
            <button
              type="button"
              aria-label="მენიუ"
              onClick={onMenu}
              className="flex size-[48px] items-center justify-center rounded-full active:bg-black/5"
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
