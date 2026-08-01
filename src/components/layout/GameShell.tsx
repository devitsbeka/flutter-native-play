import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WorldMap } from "@/features/world-map/WorldMap";
import { GameShellContext } from "./GameShellContext";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useNotifications } from "@/hooks/useNotifications";

import worldMapImg from "@/assets/figma-home/world-map.jpg";
import avatarSmall from "@/assets/figma-home/avatar-small.png";
import coinNew from "@/assets/figma-home/coin-new.png";
import gemNew from "@/assets/figma-home/gem-new.png";
import line1 from "@/assets/figma-home/line-1.svg";
import crown from "@/assets/figma-home/crown.svg";
import navHome from "@/assets/figma-home/nav-home.svg";
import navDiscover from "@/assets/figma-home/nav-discover.svg";
import navShop from "@/assets/figma-home/nav-shop.svg";
import navRating from "@/assets/figma-home/nav-rating.svg";
import navOnline from "@/assets/figma-home/nav-online.svg";
import menuLine from "@/assets/figma-home/menu-line.svg";
import gridIcon from "@/assets/figma-home/grid-icon.svg";
import bellIcon from "@/assets/figma-home/bell-icon.svg";

const DESIGN_W = 1400;
const DESIGN_H = 946;

// Same wash as the homepage sidebar (node 2113:7452) fading into the world.
const SIDEBAR_GRADIENT =
  "linear-gradient(to right, rgba(236,220,252,0.97) 0%, rgba(236,220,252,0.92) 55%, rgba(236,220,252,0.55) 84%, rgba(236,220,252,0) 100%), linear-gradient(-81.66296290800389deg, rgba(255, 255, 255, 0) 25.343%, rgba(243, 229, 255, 0.8) 128.15%)";

// Identical stage math to the homepage so every page shares its geometry.
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

interface GameShellProps {
  title: string;
  children: ReactNode;
}

/**
 * Persistent app chrome shared by every page reached from the left menu:
 * the icon rail, the 458px content panel fading into the world, the header
 * stats, and the ambient 3D world canvas behind it all — identical geometry
 * and styling to the logged-in homepage, so navigation never changes the
 * layout, only the panel content.
 */
export function GameShell({ title, children }: GameShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { coins, gems } = useCurrency();
  const { unreadCount } = useNotifications();
  const { scale, stageW } = useStage();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { icon: navHome, top: 291, path: "/", label: "მთავარი" },
    { icon: navDiscover, top: 343, path: "/discover", label: "აღმოჩენა" },
    { icon: navShop, top: 395, path: "/power-ups", label: "მაღაზია" },
    { icon: navRating, top: 447, path: "/leaderboards", label: "რეიტინგი" },
    { icon: navOnline, top: 499, path: "/team", label: "ონლაინ თამაში" },
  ];

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#ddc2f9] z-10">
      <SideMenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div
        className="absolute left-0 top-1/2"
        style={{
          width: stageW,
          height: DESIGN_H,
          transform: `translateY(-50%) scale(${scale})`,
          transformOrigin: "left center",
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Ambient world canvas behind everything */}
          <div className="absolute h-[947px] left-0 top-0 overflow-hidden" style={{ width: stageW }}>
            <WorldMap
              resolutionBoost={Math.min(2, Math.max(1, scale))}
              onMissions={() => navigate("/")}
              onDiscover={() => navigate("/discover")}
              onPlay={() => navigate("/")}
              fallback={
                <div className="absolute top-0 h-[947px] overflow-hidden pointer-events-none" style={{ left: 458, width: stageW - 458 }}>
                  <img
                    alt=""
                    className="absolute h-full w-full max-w-none top-0 left-0 object-cover"
                    style={{ objectPosition: "left top" }}
                    src={worldMapImg}
                  />
                </div>
              }
            />
          </div>

          {/* 458px content panel fading into the world */}
          <div
            className="absolute h-[946px] left-0 top-0 w-[458px]"
            style={{ backgroundImage: SIDEBAR_GRADIENT } as CSSProperties}
          >
            <div className="absolute left-[19px] top-[14px] w-[26px] h-[18px]">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={crown} />
            </div>
            {/* Page content scroller: right of the rail, under the header */}
            <div className="absolute bottom-0 left-[62px] right-0 top-[88px]">
              <GameShellContext.Provider value>{children}</GameShellContext.Provider>
            </div>
          </div>

          <VerticalLine left={62} />

          {/* Icon rail with active-route highlight */}
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              aria-label={item.label}
              aria-current={isActive(item.path) ? "page" : undefined}
              onClick={() => navigate(item.path)}
              className={`absolute flex items-center justify-center left-[14px] rounded-full size-[36px] transition-colors ${
                isActive(item.path) ? "bg-[rgba(168,85,247,0.18)]" : "hover:bg-[rgba(168,85,247,0.08)]"
              }`}
              style={{ top: item.top - 6 }}
            >
              <img alt="" className="block max-w-none size-[24px]" src={item.icon} />
            </button>
          ))}
          <button type="button" aria-label="მენიუ" onClick={() => setMenuOpen(true)} className="absolute left-[16px] top-[545px] size-[32px]">
            {[7.25, 13.25, 19.25].map((top) => (
              <div key={top} className="absolute h-[1.5px] left-[7.25px] w-[17.5px]" style={{ top }}>
                <img alt="" className="block max-w-none size-full" src={menuLine} />
              </div>
            ))}
          </button>

          {/* Bottom-left mini avatar */}
          <button
            type="button"
            aria-label="პროფილი"
            onClick={() => navigate("/profile")}
            className="absolute bg-[#f3f4f6] flex items-center justify-center left-[16px] overflow-hidden rounded-full size-[32px] top-[896px]"
          >
            <img alt="" className="max-w-none object-cover size-[36px]" src={profile?.avatar_url || avatarSmall} />
          </button>

          {/* Header: page title + menu, stats right — same row as homepage */}
          <div className="absolute flex gap-[16px] items-center left-[117px] top-[30px] z-10">
            <p className="font-['Google_Sans','Nunito',sans-serif] leading-[38px] not-italic text-[22px] text-[rgba(31,41,55,0.6)] tracking-[-0.16px] whitespace-nowrap pointer-events-none">
              {title}
            </p>
            <button
              type="button"
              aria-label="მენიუ"
              onClick={() => setMenuOpen(true)}
              className="bg-[rgba(110,105,134,0.15)] flex items-center justify-center rounded-full shrink-0 size-[40px]"
            >
              <img alt="" className="block max-w-none size-[20px]" src={gridIcon} />
            </button>
          </div>
          <HeaderStat left={stageW - 390} img={coinNew} value={coins.toLocaleString("en-US")} onClick={() => navigate("/power-ups")} label="ქულა" />
          <HeaderStat left={stageW - 232} img={gemNew} value={gems.toLocaleString("en-US")} onClick={() => navigate("/power-ups")} label="ალმასი" />
          <div className="absolute flex flex-col items-start top-[30px] z-10" style={{ left: stageW - 90 }}>
            <button
              type="button"
              aria-label="ცნობები"
              onClick={() => navigate("/notifications")}
              className="bg-white relative rounded-full shrink-0 size-[40px] flex items-center justify-center"
            >
              <img alt="" className="block max-w-none size-[20px]" src={bellIcon} />
            </button>
            {unreadCount > 0 && (
              <div className="absolute bg-[#dd2334] flex h-[19px] items-center justify-center left-[26px] pointer-events-none px-[5px] rounded-[100px] top-[-6px] min-w-[34px]">
                <p className="font-['Inter'] font-medium leading-[13px] text-[13px] text-center text-white tracking-[-0.0762px] whitespace-nowrap">
                  {unreadCount > 20 ? "20+" : unreadCount}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VerticalLine({ left }: { left: number }) {
  return (
    <div className="absolute flex h-[946px] items-center justify-center top-0 w-0 pointer-events-none" style={{ left }}>
      <div className="flex-none rotate-90">
        <div className="h-0 relative w-[946px]">
          <div className="absolute inset-[-1px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={line1} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ left, img, value, onClick, label }: { left: number; img: string; value: string; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="absolute flex gap-[10px] h-[36px] items-center top-[32px] z-10" style={{ left }}>
      <div className="h-[28px] relative shrink-0 w-[28px]">
        <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={img} />
      </div>
      <span className="font-['Nunito'] font-bold leading-[28px] text-[#374151] text-[18px] tracking-[-0.16px] whitespace-nowrap">{value}</span>
    </button>
  );
}

export default GameShell;
