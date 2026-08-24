import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { WorldMap } from "@/features/world-map/WorldMap";
import { LoggedInHomeV2Mobile } from "./LoggedInHomeV2Mobile";

import worldMap from "@/assets/figma-home/world-map.jpg";
import avatarPhoto from "@/assets/figma-home/avatar-photo.png";
import avatarSmall from "@/assets/figma-home/avatar-small.png";
import missionsIcon from "@/assets/figma-home/missions-icon.png";
import powersIcon from "@/assets/figma-home/powers-icon.png";
import power1 from "@/assets/figma-home/power-1.png";
import power2 from "@/assets/figma-home/power-2.png";
import power3 from "@/assets/figma-home/power-3.png";
import power4 from "@/assets/figma-home/power-4.png";
import coinNew from "@/assets/figma-home/coin-new.png";
import gemNew from "@/assets/figma-home/gem-new.png";
import line1 from "@/assets/figma-home/line-1.svg";
import line2 from "@/assets/figma-home/line-2.svg";
import line3 from "@/assets/figma-home/line-3.svg";
import playIcon from "@/assets/figma-home/play-icon.svg";
import crown from "@/assets/figma-home/crown.svg";
import navHome from "@/assets/figma-home/nav-home.svg";
import navDiscover from "@/assets/figma-home/nav-discover.svg";
import navShop from "@/assets/figma-home/nav-shop.svg";
import navRating from "@/assets/figma-home/nav-rating.svg";
import navOnline from "@/assets/figma-home/nav-online.svg";
import menuLine from "@/assets/figma-home/menu-line.svg";
import gridIcon from "@/assets/figma-home/grid-icon.svg";
import bellIcon from "@/assets/figma-home/bell-icon.svg";
import batteryCharge from "@/assets/figma-home/battery-charge.svg";
import plusIcon from "@/assets/figma-home/plus-icon.svg";
import friendGloria from "@/assets/figma-home/friend-gloria.png";
import friendTrivia from "@/assets/figma-home/friend-trivia.png";
import friendGiga from "@/assets/figma-home/friend-giga.png";
import friendGiorgi from "@/assets/figma-home/friend-giorgi.png";
import friendTiko from "@/assets/figma-home/friend-tiko.png";

const DESIGN_W = 1400;
const DESIGN_H = 946;

const CARD_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";
// Sidebar panel wash (node 2113:7452)
const SIDEBAR_GRADIENT =
  "linear-gradient(-81.66296290800389deg, rgba(255, 255, 255, 0) 25.343%, rgba(243, 229, 255, 0.8) 128.15%)";

// Scale the 946px-tall design to the viewport, anchored to the left edge.
// On screens wider than the 1400px canvas the stage grows so the world map
// fills the remaining width (the map artwork extends beyond its design crop).
function useStage() {
  const calc = () => {
    if (typeof window === "undefined") return { scale: 1, stageW: DESIGN_W };
    const scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    return { scale, stageW: Math.max(DESIGN_W, Math.ceil(window.innerWidth / scale)) };
  };
  const [stage, setStage] = useState(calc);
  useEffect(() => {
    const onResize = () => setStage(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return stage;
}

// Matches MOBILE_BREAKPOINT in @/hooks/use-mobile.
const MOBILE_BREAKPOINT = 768;

// Deliberately not useIsMobile: that hook starts at false and corrects in an
// effect, so a phone would render the desktop stage for one frame — mounting
// the WebGL world, tearing it down and mounting it again. This reads the
// viewport synchronously in the state initializer instead.
function useIsPhone() {
  const read = () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
  const [isPhone, setIsPhone] = useState(read);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsPhone(read());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isPhone;
}

function VerticalLine({ left, src }: { left: number; src: string }) {
  return (
    <div className="absolute flex h-[946px] items-center justify-center top-0 w-0 pointer-events-none" style={{ left }}>
      <div className="flex-none rotate-90">
        <div className="h-0 relative w-[946px]">
          <div className="absolute inset-[-1px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={src} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CountBadge({ left, top }: { left: number; top: number }) {
  return (
    <div
      className="absolute bg-[rgba(0,0,0,0.4)] border-[1.78px] border-white border-solid content-stretch flex h-[19.583px] items-center justify-center min-w-[19.583px] px-[7.121px] py-[1.78px] rounded-[8900.613px] shadow-[0px_10.682px_14.242px_0px_rgba(10,13,18,0.08),0px_3.561px_5.341px_0px_rgba(10,13,18,0.03)] pointer-events-none"
      style={{ left, top }}
    >
      <p className="font-['Nunito'] font-bold leading-[14.242px] relative shrink-0 text-[10.682px] text-white tracking-[-0.1424px] whitespace-nowrap">
        34
      </p>
    </div>
  );
}

// Compact coin / gem stat in the top-right header
function HeaderStat({ left, img, value, onClick, label }: { left: number; img: string; value: string; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute flex gap-[10px] h-[36px] items-center top-[32px] z-30"
      style={{ left }}
    >
      <div className="h-[28px] relative shrink-0 w-[28px]">
        <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={img} />
      </div>
      <span className="font-['Nunito'] font-bold leading-[28px] text-[#374151] text-[18px] tracking-[-0.16px] whitespace-nowrap">
        {value}
      </span>
    </button>
  );
}

// Category pin placed on the world map. Unlocked pins show a gem and reveal
// their name on hover; locked pins show a padlock and don't navigate.
function MapPin({
  left,
  top,
  label,
  locked,
  onClick,
}: {
  left: number;
  top: number;
  label: string;
  locked?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={locked ? `${label} — ჩაკეტილია` : label}
      aria-disabled={locked}
      onClick={locked ? undefined : onClick}
      className={`group absolute flex h-[40px] items-center justify-center min-w-[46px] px-[10px] rounded-[20px] shadow-[0px_4px_10px_rgba(0,0,0,0.18),0px_1px_0px_rgba(255,255,255,0.8)_inset] z-10 transition-colors duration-300 ${
        locked
          ? "bg-[rgba(255,255,255,0.92)] cursor-not-allowed"
          : "bg-[rgba(255,255,255,0.95)] hover:bg-gradient-to-r hover:from-white hover:to-[#d6f5e8]"
      }`}
      style={{ left, top }}
    >
      {locked ? (
        <Lock className="size-[18px]" fill="#fbbf24" stroke="#d97706" strokeWidth={1.5} />
      ) : (
        <>
          <div className="h-[22px] relative shrink-0 w-[27px]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[125%] left-0 max-w-none top-[-12.5%] w-full" src={gemNew} />
            </div>
          </div>
          <span className="font-['Nunito'] font-bold max-w-0 opacity-0 overflow-hidden text-[#1f6f52] text-[13.35px] tracking-[-0.15px] transition-all duration-300 whitespace-nowrap group-hover:max-w-[140px] group-hover:ml-[7px] group-hover:opacity-100">
            {label}
          </span>
        </>
      )}
    </button>
  );
}

// Friend avatar with gradient ring and status dot (nodes 2114:7694..7733)
function FriendItem({ left, img, name, onClick }: { left: number; img: string; name: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="absolute flex flex-col gap-[8px] h-[88px] items-center top-[102px] w-[64px] z-30" style={{ left }}>
      <div className="relative shrink-0 size-[64px]">
        <div
          className="absolute left-0 top-0 rounded-full size-[64px]"
          style={{ backgroundImage: "linear-gradient(135deg, rgb(148, 163, 184) 0%, rgb(203, 213, 225) 100%)" }}
        />
        <div className="absolute bg-white left-[3px] top-[3px] rounded-full size-[58px]" />
        <img alt={name} className="absolute left-[5px] top-[5px] max-w-none object-cover rounded-full size-[56px] pointer-events-none" src={img} />
        <div className="absolute bg-[#94a3b8] border-2 border-white border-solid left-[48px] rounded-full size-[16px] top-[48px]" />
      </div>
      <p className="[word-break:break-word] font-['Nunito'] font-medium leading-[16px] max-w-[64px] overflow-hidden text-[#334155] text-[12px] text-center tracking-[-0.16px] whitespace-nowrap">
        {name}
      </p>
    </button>
  );
}

export interface LoggedInHomeV2Props {
  nickname: string;
  avatarUrl?: string | null;
  coins: number;
  gems: number;
  level: number;
  xpCurrent: number;
  xpTotal: number;
  playsRemaining: number;
  unreadCount: number;
  onPlay: () => void;
  onMissions: () => void;
  onPowers: () => void;
  onLevel: () => void;
  onShop: () => void;
  onAvatar: () => void;
  onAddFriend: () => void;
  onMenu: () => void;
}

export function LoggedInHomeV2({
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
  const isPhone = useIsPhone();
  const { scale, stageW } = useStage();
  const mapW = stageW - 458;

  // The stage below is a fixed 1400x946 canvas scaled to fit, which on a
  // phone lands around 0.28 and renders the whole design at thumbnail size.
  // Phones get a layout built for them instead: map full-bleed, everything
  // else in a bottom sheet.
  if (isPhone) {
    return (
      <LoggedInHomeV2Mobile
        nickname={nickname}
        avatarUrl={avatarUrl}
        coins={coins}
        gems={gems}
        level={level}
        xpCurrent={xpCurrent}
        xpTotal={xpTotal}
        playsRemaining={playsRemaining}
        unreadCount={unreadCount}
        onPlay={onPlay}
        onMissions={onMissions}
        onPowers={onPowers}
        onLevel={onLevel}
        onShop={onShop}
        onAvatar={onAvatar}
        onAddFriend={onAddFriend}
        onMenu={onMenu}
      />
    );
  }

  const navItems = [
    { icon: navHome, top: 291, path: "/", label: "მთავარი" },
    { icon: navDiscover, top: 343, path: "/discover", label: "აღმოჩენა" },
    { icon: navShop, top: 395, path: "/power-ups", label: "მაღაზია" },
    { icon: navRating, top: 447, path: "/leaderboards", label: "რეიტინგი" },
    { icon: navOnline, top: 499, path: "/team", label: "ონლაინ თამაში" },
  ];

  const friends = [
    { img: friendGloria, name: "Gloria" },
    { img: friendTrivia, name: "TriviaMaste" },
    { img: friendGiga, name: "Giga" },
    { img: friendGiorgi, name: "Giorgi K." },
    { img: friendTiko, name: "თიკო" },
  ];

  // The map image is drawn 1420.5px wide (947 * 3:2) whenever the map window
  // is narrower than that; past it, object-cover scales the artwork up from
  // the top-left, so pin anchors scale by the same factor to stay on their islands.
  const mapK = Math.max(1, mapW / 1420.5);

  const pins = [
    { label: "კინო", x: 743, y: 445, onClick: () => navigate("/discover") },
    { label: "მუსიკა", x: 964, y: 592, onClick: () => navigate("/discover") },
    { label: "ტექნოლოგიები", x: 705, y: 708, onClick: () => navigate("/discover") },
    { label: "დღის მისიები", x: 1213, y: 795, onClick: onMissions },
    { label: "ისტორია", x: 1087, y: 273, locked: true },
    { label: "გეოგრაფია", x: 1017, y: 343, locked: true },
    { label: "სპორტი", x: 1160, y: 326, locked: true },
    { label: "ხელოვნება", x: 1069, y: 435, locked: true },
  ];

  return (
    // z-10 lifts the page above GlobalSplineBackground's fixed overlays
    // (white radial mask at z-1, particles at z-2/3) which otherwise paint
    // a white fade over the whole homepage.
    <div className="fixed inset-0 safe-screen overflow-hidden bg-[#ddc2f9] z-10">
      <div
        className="absolute left-0 top-1/2 origin-top-left"
        style={{
          width: stageW,
          height: DESIGN_H,
          transform: `translateY(-50%) scale(${scale})`,
          transformOrigin: "left center",
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Interactive 3D world, full-bleed behind the whole stage so the
              sidebar fades into it. The previous static artwork plus DOM pins
              remain as the no-WebGL / error fallback. */}
          <div className="absolute h-[947px] left-0 top-0 overflow-hidden" style={{ width: stageW }}>
            <WorldMap
              resolutionBoost={Math.min(2, Math.max(1, scale))}
              onMissions={onMissions}
              onDiscover={() => navigate("/discover")}
              onPlay={onPlay}
              fallback={
                <div className="absolute top-0 h-[947px]" style={{ left: 458, width: mapW }}>
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img
                      alt=""
                      className="absolute h-full w-full max-w-none top-0 left-0 object-cover"
                      style={{ objectPosition: "left top" }}
                      src={worldMap}
                    />
                  </div>
                  {pins.map((p) => (
                    <MapPin
                      key={p.label}
                      left={(p.x - 458) * mapK}
                      top={p.y * mapK}
                      label={p.label}
                      locked={p.locked}
                      onClick={p.onClick}
                    />
                  ))}
                </div>
              }
            />
          </div>

          {/* Sidebar panel (node 2113:7452) */}
          <div
            className="absolute h-[946px] left-0 top-0 w-[458px] overflow-hidden z-20"
            style={{ backgroundImage: `linear-gradient(to right, rgba(236,220,252,0.97) 0%, rgba(236,220,252,0.92) 55%, rgba(236,220,252,0.55) 84%, rgba(236,220,252,0) 100%), ${SIDEBAR_GRADIENT}` }}
          >
            {/* Avatar rings (node 2112:6787) */}
            <div className="absolute border-[23.057px] border-[rgba(255,255,255,0.95)] border-solid left-[117px] pointer-events-none rounded-[9606.182px] shadow-[0px_5.764px_15.371px_0px_rgba(0,0,0,0.12)] size-[269px] top-[211px]">
              <div
                aria-hidden
                className="absolute inset-0 rounded-[9606.182px]"
                style={{ background: "linear-gradient(to bottom, #ffffff 0%, #f8f6fc 50%, #f0ecf8 100%)" }}
              />
              <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_2.882px_7.686px_0px_rgba(140,120,180,0.2)]" />
            </div>
            <div className="absolute left-[134.91px] pointer-events-none rounded-[10225.935px] size-[233.175px] top-[228.91px]">
              <div aria-hidden className="absolute bg-white inset-0 rounded-[10225.935px]" />
              <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_2.045px_8.182px_0px_rgba(0,0,0,0.05)]" />
            </div>
            <div className="absolute left-[139px] rounded-[10225.935px] size-[224.993px] top-[233px]">
              <img
                alt=""
                className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[10225.935px] size-full"
                src={avatarUrl || avatarPhoto}
              />
            </div>
            <button
              type="button"
              aria-label={nickname}
              onClick={onAvatar}
              className="absolute left-[139px] rounded-full size-[224.993px] top-[233px]"
            />

            <VerticalLine left={62} src={line1} />
            <VerticalLine left={458} src={line2} />

            {/* Missions card (node 2109:2407) */}
            <button
              type="button"
              onClick={onMissions}
              className="absolute border-[#e8e0f5] border-[1.638px] border-solid h-[60px] left-[102px] overflow-hidden rounded-[28.38px] shadow-[0px_3.275px_0px_0px_#d8d0e8,0px_4.913px_13.102px_0px_rgba(0,0,0,0.1)] top-[718px] w-[317px] text-left"
            >
              <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[28.38px]" style={{ background: CARD_GRADIENT }} />
              <div className="absolute flex gap-[13.102px] h-[45.857px] items-center left-[13.1px] right-[13.1px] top-[5.43px]">
                <div className="relative shrink-0">
                  <div className="flex flex-col items-center justify-center relative size-full">
                    <div className="relative shrink-0 size-[45.857px]">
                      <div className="flex flex-col items-center justify-center relative size-full">
                        <div className="absolute flex items-center justify-center left-[3.26px] size-[39.212px] top-[0.93px]">
                          <div className="flex-none rotate-[1.86deg]">
                            <div className="relative shadow-[0px_3.275px_4.913px_0px_rgba(0,0,0,0.07),0px_1.638px_3.275px_0px_rgba(0,0,0,0.06)] size-[38px]">
                              <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={missionsIcon} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute left-[52.26px] top-[14.74px] w-[63.562px]">
                  <p className="[word-break:break-word] font-['Nunito'] font-bold leading-[16.377px] text-[#1f2937] text-[11.464px] tracking-[-0.131px] whitespace-nowrap">
                    მისიები
                  </p>
                </div>
              </div>
              <div className="absolute border-[#d5d0d8] border-[1.78px] border-solid flex h-[19.583px] items-center justify-center left-[272.36px] min-w-[19.583px] px-[7.121px] py-[1.78px] rounded-[8900.613px] top-[17.36px]">
                <p className="font-['Nunito'] font-bold leading-[14.242px] relative shrink-0 text-[#9783a3] text-[10.682px] tracking-[-0.1424px] whitespace-nowrap">
                  34
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.638px_0px_0px_white]" />
            </button>

            {/* Powers card (node 2109:2444) */}
            <button
              type="button"
              onClick={onPowers}
              className="absolute border-[#e8e0f5] border-[1.638px] border-solid h-[153px] left-[102px] overflow-hidden rounded-[28.38px] shadow-[0px_3.275px_0px_0px_#d8d0e8,0px_4.913px_13.102px_0px_rgba(0,0,0,0.1)] top-[555px] w-[317px] text-left"
            >
              <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[28.38px]" style={{ background: CARD_GRADIENT }} />
              <div className="absolute h-[38px] left-[13.1px] right-[13.1px] top-[11.36px]">
                <div className="absolute flex flex-col items-center justify-center left-0 size-[38px] top-0">
                  <div className="absolute flex items-center justify-center left-[-0.48px] size-[39.212px] top-[-3.1px]">
                    <div className="flex-none rotate-[1.86deg]">
                      <div className="relative shadow-[0px_3.275px_4.913px_0px_rgba(0,0,0,0.07),0px_1.638px_3.275px_0px_rgba(0,0,0,0.06)] size-[38px]">
                        <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={powersIcon} />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="[word-break:break-word] absolute font-['Nunito'] font-bold leading-[16.377px] left-[51.1px] text-[#1f2937] text-[11.464px] top-[10.81px] tracking-[-0.131px] whitespace-nowrap">
                  ძალები
                </p>
                <div className="absolute border-[#d5d0d8] border-[1.78px] border-solid flex h-[19.583px] items-center justify-center left-[260.26px] min-w-[19.583px] px-[7.121px] py-[1.78px] rounded-[8900.613px] top-[9px]">
                  <p className="font-['Nunito'] font-bold leading-[14.242px] relative shrink-0 text-[#9783a3] text-[10.682px] tracking-[-0.1424px] whitespace-nowrap">
                    34
                  </p>
                </div>
              </div>
              <div className="absolute left-[19.36px] size-[47.385px] top-[72.67px]">
                <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={power1} />
              </div>
              <div className="absolute left-[91.57px] size-[47.385px] top-[72.67px]">
                <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={power2} />
              </div>
              <div className="absolute left-[163.77px] size-[47.385px] top-[72.67px]">
                <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={power3} />
              </div>
              <div className="absolute left-[235.98px] size-[47.385px] top-[72.67px]">
                <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={power4} />
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.638px_0px_0px_white]" />
            </button>

            {/* Play button (node 2109:2377) */}
            <button
              type="button"
              onClick={onPlay}
              className="absolute border-[#34d399] border-[2.28px] border-solid flex gap-[9.12px] h-[60px] items-center justify-center left-[102px] min-w-[152px] px-[38.76px] py-[2.28px] rounded-[28px] shadow-[0px_4.56px_0px_0px_#047857,0px_7.6px_18.24px_0px_rgba(16,185,129,0.5)] top-[818px] w-[317px]"
            >
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-[28px]"
                style={{ background: "linear-gradient(to bottom, #6ee7b7 0%, #10b981 50%, #059669 100%)" }}
              />
              <div className="relative shrink-0 size-[21.28px]">
                <div className="absolute inset-[0_-7.89%_-26.34%_0]">
                  <img alt="" className="block max-w-none size-full" src={playIcon} />
                </div>
              </div>
              <div className="drop-shadow-[0px_3.04px_2.28px_rgba(0,0,0,0.07),0px_1.52px_1.52px_rgba(0,0,0,0.06)] relative shrink-0">
                <p className="font-['Nunito'] font-bold leading-[21.28px] relative shrink-0 text-[15.2px] text-center text-white tracking-[0.38px] whitespace-nowrap">
                  ითამაშე
                </p>
              </div>
              <div className="absolute bg-white left-[11.82px] opacity-[0.99] rounded-[8725.6px] size-[5.236px] top-[5.74px]" />
              <div className="absolute bg-[rgba(255,255,255,0.8)] left-[24.16px] opacity-[0.94] rounded-[8130.046px] size-[4.879px] top-[30.24px]" />
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2.28px_0px_0px_rgba(255,255,255,0.35)]" />
            </button>

            {/* Crown logo (node 2112:6838) */}
            <div className="absolute left-[19px] top-[14px] w-[26px] h-[18px]">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={crown} />
            </div>

            {/* Remaining games (node 2112:6874) */}
            <div className="absolute contents left-[178px] top-[896px]">
              <div className="absolute left-[178px] opacity-70 overflow-hidden size-[18px] top-[898px]">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={batteryCharge} />
              </div>
              <p className="[word-break:break-word] absolute font-['Nunito'] font-medium leading-[22.5px] left-[204px] opacity-70 text-[12px] text-[rgba(31,23,48,0.7)] top-[896px] tracking-[-0.16px] whitespace-nowrap">
                დარჩენილია {playsRemaining} თამაში
              </p>
            </div>

            {/* Level pill (node 2112:6915) */}
            <button
              type="button"
              aria-label={`დონე ${level}`}
              onClick={onLevel}
              className="absolute border-[2.818px] border-[rgba(255,255,255,0.3)] border-solid h-[58px] left-[177px] overflow-hidden rounded-[9391.903px] shadow-[0px_4.696px_0px_0px_#7c3aed,0px_7.514px_15.029px_0px_rgba(0,0,0,0.25)] top-[438.5px] w-[152px]"
            >
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-[9391.903px]"
                style={{ background: "linear-gradient(to bottom, #c084fc 0%, #a855f7 50%, #9333ea 100%)" }}
              />
              <div className="absolute h-[52.6px] left-0 overflow-hidden rounded-[9391.903px] top-0 w-[111.775px] pointer-events-none">
                <div className="absolute bg-[rgba(255,255,255,0.28)] left-[57.46px] opacity-[0.31] rounded-[9449.1px] size-[3.78px] top-[35.64px]" />
                <div className="absolute bg-[rgba(255,255,255,0.29)] h-[3.084px] left-[5.64px] opacity-[0.38] rounded-[10280.471px] top-[35.26px] w-[4.113px]" />
                <div className="absolute bg-[rgba(255,255,255,0.23)] h-[3.47px] left-[0.96px] opacity-[0.53] rounded-[11565.752px] top-[9.11px] w-[4.627px]" />
                <div className="absolute bg-[rgba(255,255,255,0.2)] left-[86.79px] opacity-[0.31] rounded-[9467.602px] size-[2.841px] top-[44.83px]" />
                <div className="absolute bg-[rgba(255,255,255,0.24)] left-[59.95px] opacity-[0.48] rounded-[11234.877px] size-[4.494px] top-[13.07px]" />
                <div className="absolute bg-[rgba(255,255,255,0.22)] h-[4.676px] left-[71.17px] opacity-[0.56] rounded-[11688.6px] top-[1.67px] w-[7.014px]" />
                <div className="absolute bg-[rgba(255,255,255,0.48)] left-[70.31px] opacity-[0.3] rounded-[9405.24px] size-[3.762px] top-[0.2px]" />
                <div className="absolute bg-[rgba(255,255,255,0.52)] h-[4.823px] left-[70.39px] opacity-[0.66] rounded-[12055.445px] top-[33.5px] w-[6.028px]" />
                <div className="absolute bg-[rgba(255,255,255,0.56)] h-[6.603px] left-[31.07px] opacity-[0.45] rounded-[11003.365px] top-[18.9px] w-[5.502px]" />
                <div className="absolute bg-[rgba(255,255,255,0.21)] h-[2.25px] left-[93.38px] opacity-[0.48] rounded-[11250.654px] top-[-2.74px] w-[4.501px]" />
                <div className="absolute bg-[rgba(255,255,255,0.23)] h-[1.901px] left-[84.78px] opacity-[0.31] rounded-[9505.451px] top-[3.45px] w-[2.852px]" />
                <div className="absolute bg-[rgba(255,255,255,0.54)] left-[43.7px] opacity-[0.31] rounded-[9513.435px] size-[3.806px] top-[2px]" />
              </div>
              <div
                className="absolute h-[26.3px] left-0 opacity-30 pointer-events-none rounded-tl-[9391.903px] rounded-tr-[9391.903px] top-0 w-[111.775px]"
                style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0))" }}
              />
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_3.757px_7.514px_0px_rgba(255,255,255,0.25),inset_0px_-2.818px_5.636px_0px_rgba(0,0,0,0.2)]" />
            </button>
            <div className="[word-break:break-word] absolute contents left-[214.6px] top-[447.37px] tracking-[-0.1503px] whitespace-nowrap pointer-events-none">
              <p className="absolute font-['Nunito'] font-bold leading-[22.543px] left-[220.24px] text-[15.029px] text-white top-[447.37px]">
                დონე {level}
              </p>
              <p className="absolute font-['Nunito'] font-normal leading-[15.029px] left-[214.6px] text-[11.271px] text-[rgba(255,255,255,0.8)] top-[469.92px]">
                {xpCurrent.toLocaleString("en-US")} / {xpTotal.toLocaleString("en-US")} XP
              </p>
            </div>

            {/* Power-up count badges */}
            <CountBadge left={148} top={656} />
            <CountBadge left={220} top={656} />
            <CountBadge left={292} top={656} />
            <CountBadge left={366} top={656} />
          </div>

          {/* Bottom-left mini avatar (node 2112:6840) */}
          <button
            type="button"
            aria-label="პროფილი"
            onClick={() => navigate("/profile")}
            className="absolute bg-[#f3f4f6] flex items-center justify-center left-[16px] overflow-hidden rounded-[14998.5px] size-[32px] top-[896px] z-30"
          >
            <div className="relative shrink-0 size-[36px]">
              <img alt={nickname} className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={avatarUrl || avatarSmall} />
            </div>
          </button>

          {/* Left nav icons (node 2112:6798) */}
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              aria-label={item.label}
              onClick={() => navigate(item.path)}
              className="absolute flex items-center justify-center left-[20px] size-[24px] z-30"
              style={{ top: item.top }}
            >
              <img alt="" className="block max-w-none size-[24px]" src={item.icon} />
            </button>
          ))}
          <button
            type="button"
            aria-label="მენიუ"
            onClick={onMenu}
            className="absolute left-[16px] top-[545px] size-[32px] z-30"
          >
            {[7.25, 13.25, 19.25].map((top) => (
              <div key={top} className="absolute h-[1.5px] left-[7.25px] w-[17.5px]" style={{ top }}>
                <img alt="" className="block max-w-none size-full" src={menuLine} />
              </div>
            ))}
          </button>

          {/* Top-right compact stats */}
          <HeaderStat left={stageW - 390} img={coinNew} value={coins.toLocaleString("en-US")} onClick={onShop} label="ქულა" />
          <HeaderStat left={stageW - 232} img={gemNew} value={gems.toLocaleString("en-US")} onClick={onShop} label="ალმასი" />

          {/* Notifications (node 2113:7016) */}
          <div className="absolute flex flex-col items-start top-[30px] z-30" style={{ left: stageW - 90 }}>
            <button
              type="button"
              aria-label="ცნობები"
              onClick={() => navigate("/notifications")}
              className="bg-white relative rounded-[999px] shrink-0 size-[40px]"
            >
              <div className="flex items-center justify-center relative size-full">
                <div className="relative shrink-0 size-[20px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={bellIcon} />
                </div>
              </div>
            </button>
            {unreadCount > 0 && (
              <div className="absolute bg-[#dd2334] h-[19px] left-[26px] pointer-events-none rounded-[100px] top-[-6px] w-[34.578px]">
                <div className="flex items-center justify-center px-[5px] relative size-full">
                  <p className="[word-break:break-word] font-['Inter'] font-medium leading-[13px] not-italic relative shrink-0 text-[13px] text-center text-white tracking-[-0.0762px] whitespace-nowrap">
                    {unreadCount > 20 ? "20+" : unreadCount}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* World selector pill (node 2113:7015) — decorative for now; the
              /world page was removed, so this no longer navigates anywhere */}
          <div
            aria-hidden
            className="absolute border-[#e8e0f5] border-[1.638px] border-solid h-[60px] overflow-hidden rounded-[28.38px] shadow-[0px_3.275px_0px_0px_#d8d0e8,0px_4.913px_13.102px_0px_rgba(0,0,0,0.1)] top-[818px] w-[317px] z-20"
            style={{ left: 458 + mapW / 2 - 138 }}
          >
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[28.38px]" style={{ background: CARD_GRADIENT }} />
            <div className="absolute contents left-[13.36px] mix-blend-luminosity top-[4.36px]">
              <div className="absolute h-[47px] left-[15px] mix-blend-luminosity opacity-[0.19] top-[6px] w-[74px]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-full left-[-0.02%] max-w-none top-0 w-[132.46%]" src={worldMap} />
                </div>
              </div>
              <div className="absolute flex h-[47px] items-center justify-center left-[89px] mix-blend-luminosity top-[6px] w-[74px]">
                <div className="-scale-y-100 flex-none rotate-180">
                  <div className="h-[47px] opacity-[0.19] relative w-[74px]">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <img alt="" className="absolute h-full left-[-0.02%] max-w-none top-0 w-[132.46%]" src={worldMap} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute h-[47px] left-[163px] mix-blend-luminosity opacity-[0.19] top-[6px] w-[74px]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-full left-[-0.02%] max-w-none top-0 w-[132.46%]" src={worldMap} />
                </div>
              </div>
              <div className="absolute flex h-[47px] items-center justify-center left-[237px] mix-blend-luminosity top-[6px] w-[74px]">
                <div className="-scale-y-100 flex-none rotate-180">
                  <div className="h-[47px] opacity-[0.19] relative rounded-bl-[125px] rounded-tl-[125px] w-[74px]">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-bl-[125px] rounded-tl-[125px]">
                      <img alt="" className="absolute h-full left-[-0.02%] max-w-none top-0 w-[132.46%]" src={worldMap} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute border-[#e8e0f5] border-[1.638px] border-solid h-[47px] left-[3.36px] overflow-hidden rounded-[28.38px] shadow-[0px_3.275px_0px_0px_#d8d0e8,0px_4.913px_13.102px_0px_rgba(0,0,0,0.1)] top-[4.36px] w-[65px]">
              <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[28.38px]" style={{ background: CARD_GRADIENT }} />
              <div className="absolute h-[47px] left-[-1.64px] rounded-[124px] top-[-1.64px] w-[65px]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[124px]">
                  <img alt="" className="absolute h-full left-[-0.03%] max-w-none top-0 w-[150.8%]" src={worldMap} />
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.638px_0px_0px_white]" />
            </div>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.638px_0px_0px_white]" />
          </div>

          {/* Header: world title + level badge + menu button in one evenly
              spaced, vertically centered row */}
          <div className="absolute flex gap-[16px] items-center left-[117px] top-[30px] z-30">
            <p className="[word-break:break-word] font-['Google_Sans','Nunito',sans-serif] leading-[38px] not-italic opacity-[0.99] text-[22px] text-[rgba(31,41,55,0.6)] tracking-[-0.16px] whitespace-nowrap pointer-events-none">
              სამყარო ალფა
            </p>
            <div className="border-[#6e6985] border-[1.78px] border-solid flex h-[19.583px] items-center justify-center min-w-[19.583px] px-[7.121px] py-[1.78px] rounded-[8900.613px] shrink-0">
              <p className="[word-break:break-word] font-['Nunito'] font-bold leading-[14.242px] relative shrink-0 text-[#6e6986] text-[10.682px] tracking-[-0.1424px] whitespace-nowrap">
                დონე I
              </p>
            </div>
            <button
              type="button"
              aria-label="მენიუ"
              onClick={onMenu}
              className="bg-[rgba(110,105,134,0.15)] flex items-center justify-center rounded-[999px] shrink-0 size-[40px]"
            >
              <div className="relative shrink-0 size-[20px]">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={gridIcon} />
              </div>
            </button>
          </div>
          <div className="absolute flex h-[37px] items-center justify-center left-[463px] top-[31px] w-0 pointer-events-none z-10">
            <div className="flex-none rotate-90">
              <div className="h-0 relative w-[37px]">
                <div className="absolute inset-[-1px_0_0_0]">
                  <img alt="" className="block max-w-none size-full" src={line3} />
                </div>
              </div>
            </div>
          </div>

          {/* Friends row, starting from the left content column */}
          <button type="button" onClick={onAddFriend} className="absolute flex flex-col gap-[8px] h-[88px] items-center left-[117px] top-[102px] w-[64px] z-30">
            <div
              className="border-2 border-[#c084fc] border-dashed flex items-center justify-center relative rounded-full shrink-0 size-[64px]"
              style={{ backgroundImage: "linear-gradient(135deg, rgb(243, 232, 255) 0%, rgb(233, 213, 255) 100%)" }}
            >
              <div className="relative shrink-0 size-[24px]">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={plusIcon} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Nunito'] font-medium leading-[16px] max-w-[64px] overflow-hidden text-[#475569] text-[12px] text-center tracking-[-0.16px] whitespace-nowrap">
              დამატება
            </p>
          </button>
          {friends.map((f, i) => (
            <FriendItem key={f.name} left={117 + 103 * (i + 1)} img={f.img} name={f.name} onClick={() => navigate("/team")} />
          ))}

        </div>
      </div>
    </div>
  );
}

export default LoggedInHomeV2;
