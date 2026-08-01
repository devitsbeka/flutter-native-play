import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import videoBg from "@/assets/figma-home/video-bg.png";
import worldMap from "@/assets/figma-home/world-map.jpg";
import avatarPhoto from "@/assets/figma-home/avatar-photo.png";
import avatarSmall from "@/assets/figma-home/avatar-small.png";
import missionsIcon from "@/assets/figma-home/missions-icon.png";
import powersIcon from "@/assets/figma-home/powers-icon.png";
import power1 from "@/assets/figma-home/power-1.png";
import power2 from "@/assets/figma-home/power-2.png";
import power3 from "@/assets/figma-home/power-3.png";
import power4 from "@/assets/figma-home/power-4.png";
import coinsImg from "@/assets/figma-home/coins.png";
import gemsImg from "@/assets/figma-home/gems.png";
import line1 from "@/assets/figma-home/line-1.svg";
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

const DESIGN_W = 1400;
const DESIGN_H = 946;

// Radial "spotlight" vignette from the Figma design (node 2109:2315)
const RADIAL_VIGNETTE =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 1400 946' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -66.22 -112 0 700 473)'><stop stop-color='rgba(0,0,0,0)' offset='0'/><stop stop-color='rgba(0,0,0,0)' offset='0.5'/><stop stop-color='rgba(255,255,255,0)' offset='0.5'/><stop stop-color='rgba(255,255,255,0.15)' offset='0.65'/><stop stop-color='rgba(255,255,255,0.35)' offset='0.8'/><stop stop-color='rgba(255,255,255,0.7)' offset='1'/></radialGradient></defs></svg>\")";

const CARD_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";

function useFitScale() {
  const [scale, setScale] = useState(() =>
    typeof window === "undefined"
      ? 1
      : Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H),
  );
  useEffect(() => {
    const onResize = () =>
      setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

function VerticalLine({ left }: { left: number }) {
  return (
    <div
      className="absolute flex h-[946px] items-center justify-center top-0 w-0"
      style={{ left }}
    >
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

function CountBadge({ left, top }: { left: number; top: number }) {
  return (
    <div
      className="absolute bg-[rgba(0,0,0,0.4)] border-[1.78px] border-white border-solid content-stretch flex h-[19.583px] items-center justify-center min-w-[19.583px] px-[7.121px] py-[1.78px] rounded-[8900.613px] shadow-[0px_10.682px_14.242px_0px_rgba(10,13,18,0.08),0px_3.561px_5.341px_0px_rgba(10,13,18,0.03)]"
      style={{ left, top }}
    >
      <p className="font-['Nunito'] font-bold leading-[14.242px] relative shrink-0 text-[10.682px] text-white tracking-[-0.1424px] whitespace-nowrap">
        34
      </p>
    </div>
  );
}

interface LoggedInHomeProps {
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
}

export function LoggedInHome({
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
}: LoggedInHomeProps) {
  const navigate = useNavigate();
  const scale = useFitScale();

  const navItems = [
    { icon: navHome, top: 291, path: "/", label: "მთავარი" },
    { icon: navDiscover, top: 343, path: "/discover", label: "აღმოჩენა" },
    { icon: navShop, top: 395, path: "/power-ups", label: "მაღაზია" },
    { icon: navRating, top: 447, path: "/leaderboards", label: "რეიტინგი" },
    { icon: navOnline, top: 499, path: "/team", label: "ონლაინ თამაში" },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f9dbff]">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Background video frame (node 2109:2311) */}
          <div className="absolute bg-[#f9dbff] h-[946px] left-0 top-0 w-[1400px]">
            <div className="absolute h-[946px] left-0 top-0 w-[1396px]">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img alt="" className="absolute h-full left-[-1.97%] max-w-none top-0 w-[127.72%]" src={videoBg} />
              </div>
            </div>
            <div
              className="absolute h-[946px] left-[59px] top-0 w-[399px]"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(249,219,255,0.5) 0%, rgba(249,219,255,0.3) 45%, rgba(249,219,255,0.5) 100%)",
              }}
            />
          </div>

          {/* Sidebar content over radial vignette (node 2109:2315) */}
          <div
            className="absolute h-[946px] left-0 top-0 w-[1400px]"
            style={{ backgroundImage: RADIAL_VIGNETTE }}
          >
            {/* Avatar rings (node 2112:6787) */}
            <div className="absolute contents left-[117px] top-[194.5px]">
              <div className="absolute border-[23.057px] border-[rgba(255,255,255,0.95)] border-solid left-[117px] pointer-events-none rounded-[9606.182px] shadow-[0px_5.764px_15.371px_0px_rgba(0,0,0,0.12)] size-[269px] top-[194.5px]">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[9606.182px]"
                  style={{ background: "linear-gradient(to bottom, #ffffff 0%, #f8f6fc 50%, #f0ecf8 100%)" }}
                />
                <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_2.882px_7.686px_0px_rgba(140,120,180,0.2)]" />
              </div>
              <div className="absolute left-[134.91px] pointer-events-none rounded-[10225.935px] size-[233.175px] top-[212.41px]">
                <div aria-hidden className="absolute bg-white inset-0 rounded-[10225.935px]" />
                <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_2.045px_8.182px_0px_rgba(0,0,0,0.05)]" />
              </div>
              <div className="absolute left-[139px] rounded-[10225.935px] size-[224.993px] top-[216.5px]">
                <img
                  alt={nickname}
                  className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[10225.935px] size-full"
                  src={avatarUrl || avatarPhoto}
                />
              </div>
            </div>

            <VerticalLine left={62} />
            <VerticalLine left={458} />

            {/* Missions card (node 2109:2407) */}
            <div className="absolute border-[#e8e0f5] border-[1.638px] border-solid h-[60px] left-[102px] overflow-hidden rounded-[28.38px] shadow-[0px_3.275px_0px_0px_#d8d0e8,0px_4.913px_13.102px_0px_rgba(0,0,0,0.1)] top-[718px] w-[317px]">
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
                  <div className="flex flex-col items-start relative size-full">
                    <div className="h-[16.377px] relative shrink-0 w-full">
                      <p className="[word-break:break-word] font-['Nunito'] font-bold leading-[16.377px] text-[#1f2937] text-[11.464px] tracking-[-0.131px] whitespace-nowrap">
                        მისიები
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute border-[#d5d0d8] border-[1.78px] border-solid flex h-[19.583px] items-center justify-center left-[272.36px] min-w-[19.583px] px-[7.121px] py-[1.78px] rounded-[8900.613px] top-[17.36px]">
                <p className="font-['Nunito'] font-bold leading-[14.242px] relative shrink-0 text-[#9783a3] text-[10.682px] tracking-[-0.1424px] whitespace-nowrap">
                  34
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.638px_0px_0px_white]" />
            </div>

            {/* Powers card (node 2109:2444) */}
            <div className="absolute border-[#e8e0f5] border-[1.638px] border-solid h-[153px] left-[102px] overflow-hidden rounded-[28.38px] shadow-[0px_3.275px_0px_0px_#d8d0e8,0px_4.913px_13.102px_0px_rgba(0,0,0,0.1)] top-[555px] w-[317px]">
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
            </div>

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
                <div className="flex flex-col items-center relative size-full">
                  <p className="font-['Nunito'] font-bold leading-[21.28px] relative shrink-0 text-[15.2px] text-center text-white tracking-[0.38px] whitespace-nowrap">
                    ითამაშე
                  </p>
                </div>
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

            {/* Coins / gems (node 2112:6937) */}
            <div className="absolute contents left-[97px] top-[127px]">
              <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Nunito'] font-bold leading-[28px] left-[179px] text-[#374151] text-[18px] text-center top-[144.05px] tracking-[-0.16px] whitespace-nowrap">
                {coins.toLocaleString("en-US")}
              </p>
              <p className="[word-break:break-word] absolute font-['Nunito'] font-normal leading-[16.377px] left-[151px] text-[#1f2937] text-[11.464px] top-[127px] tracking-[-0.131px] whitespace-nowrap">
                ქულა:
              </p>
              <div className="absolute flex gap-[8px] items-center left-[97px] top-[127px]">
                <div className="bg-[rgba(255,255,255,0.9)] relative rounded-[9999px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] shrink-0 size-[40px]">
                  <div className="flex items-center justify-center relative size-full">
                    <div className="relative shrink-0 size-[40px]">
                      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={coinsImg} />
                    </div>
                  </div>
                </div>
                <div className="h-[28px] relative shrink-0 w-[58px]" />
              </div>
              <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Nunito'] font-bold leading-[28px] left-[319px] text-[#374151] text-[18px] text-center top-[144.05px] tracking-[-0.16px] whitespace-nowrap">
                {gems.toLocaleString("en-US")}
              </p>
              <div className="absolute flex gap-[8px] items-center left-[253px] top-[127px]">
                <div className="bg-[rgba(255,255,255,0.9)] relative rounded-[9999px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] shrink-0 size-[40px]">
                  <div className="flex items-center justify-center relative size-full">
                    <div className="relative shrink-0 size-[40px]">
                      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={gemsImg} />
                    </div>
                  </div>
                </div>
                <div className="h-[28px] relative shrink-0 w-[22px]" />
              </div>
              <p className="[word-break:break-word] absolute font-['Nunito'] font-normal leading-[16.377px] left-[306px] text-[#1f2937] text-[11.464px] top-[127px] tracking-[-0.131px] whitespace-nowrap">
                ალმასი
              </p>
            </div>

            {/* Level pill (node 2112:6915) */}
            <div className="absolute border-[2.818px] border-[rgba(255,255,255,0.3)] border-solid h-[58px] left-[177px] overflow-hidden rounded-[9391.903px] shadow-[0px_4.696px_0px_0px_#7c3aed,0px_7.514px_15.029px_0px_rgba(0,0,0,0.25)] top-[422px] w-[152px]">
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-[9391.903px]"
                style={{ background: "linear-gradient(to bottom, #c084fc 0%, #a855f7 50%, #9333ea 100%)" }}
              />
              <div className="absolute h-[52.6px] left-0 overflow-hidden rounded-[9391.903px] top-0 w-[111.775px]">
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
                className="absolute h-[26.3px] left-0 opacity-30 rounded-tl-[9391.903px] rounded-tr-[9391.903px] top-0 w-[111.775px]"
                style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0))" }}
              />
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_3.757px_7.514px_0px_rgba(255,255,255,0.25),inset_0px_-2.818px_5.636px_0px_rgba(0,0,0,0.2)]" />
            </div>
            <div className="[word-break:break-word] absolute contents left-[214.6px] top-[430.87px] tracking-[-0.1503px] whitespace-nowrap">
              <p className="absolute font-['Nunito'] font-bold leading-[22.543px] left-[220.24px] text-[15.029px] text-white top-[430.87px]">
                დონე {level}
              </p>
              <p className="absolute font-['Nunito'] font-normal leading-[15.029px] left-[214.6px] text-[11.271px] text-[rgba(255,255,255,0.8)] top-[453.42px]">
                {xpCurrent.toLocaleString("en-US")} / {xpTotal.toLocaleString("en-US")} XP
              </p>
            </div>

            {/* Power-up count badges */}
            <CountBadge left={148} top={656} />
            <CountBadge left={220} top={656} />
            <CountBadge left={292} top={656} />
            <CountBadge left={366} top={656} />

            {/* Soft glow (node 2113:6967) */}
            <div className="absolute h-[405px] left-[62px] opacity-40 overflow-hidden top-0 w-[102px]">
              <div className="absolute bg-[#f0c9ff] blur-[17px] h-[172px] left-0 top-0 w-[45px]" />
            </div>
          </div>

          {/* Bottom-left mini avatar (node 2112:6840) */}
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="absolute bg-[#f3f4f6] flex items-center justify-center left-[16px] overflow-hidden rounded-[14998.5px] size-[32px] top-[896px]"
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
              className="absolute flex items-center justify-center left-[20px] size-[24px]"
              style={{ top: item.top }}
            >
              <img alt="" className="block max-w-none size-[24px]" src={item.icon} />
            </button>
          ))}
          {[552.25, 558.25, 564.25].map((top) => (
            <div key={top} className="absolute h-[1.5px] left-[23.25px] w-[17.5px]" style={{ top }}>
              <img alt="" className="block max-w-none size-full" src={menuLine} />
            </div>
          ))}

          {/* World map (node 2113:6964) */}
          <div className="absolute h-[947px] left-[458px] top-0 w-[942px]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-full left-[-0.03%] max-w-none top-0 w-[150.8%]" src={worldMap} />
            </div>
          </div>

          {/* World menu button (node 2113:7030) */}
          <div className="absolute bg-[rgba(110,105,134,0.15)] flex items-center justify-center left-[489px] rounded-[999px] size-[40px] top-[18px]">
            <div className="relative shrink-0 size-[20px]">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={gridIcon} />
            </div>
          </div>

          {/* Notifications (node 2113:7016) */}
          <div className="absolute flex flex-col items-start left-[1325px] top-[18px]">
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
              <div className="absolute bg-[#dd2334] h-[19px] left-[26px] rounded-[100px] top-[-6px] w-[34.578px]">
                <div className="flex items-center justify-center px-[5px] relative size-full">
                  <p className="[word-break:break-word] font-['Inter'] font-medium leading-[13px] not-italic relative shrink-0 text-[13px] text-center text-white tracking-[-0.0762px] whitespace-nowrap">
                    {unreadCount > 20 ? "20+" : unreadCount}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* World selector pill (node 2113:7015) */}
          <div className="absolute border-[#e8e0f5] border-[1.638px] border-solid h-[60px] left-[791px] overflow-hidden rounded-[28.38px] shadow-[0px_3.275px_0px_0px_#d8d0e8,0px_4.913px_13.102px_0px_rgba(0,0,0,0.1)] top-[818px] w-[317px]">
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

          {/* Greeting (node 2113:7023) */}
          <div className="[word-break:break-word] absolute font-['Google_Sans','Nunito',sans-serif] left-[100px] not-italic text-[28px] top-[19px] tracking-[-0.16px] whitespace-nowrap">
            <p className="leading-[38px] mb-0 text-[rgba(31,41,55,0.6)]">გამარჯობა</p>
            <p className="leading-[38px] text-[#1f2937]">{nickname}!</p>
          </div>

          {/* World title (node 2113:7028) */}
          <p className="[word-break:break-word] absolute font-['Google_Sans','Nunito',sans-serif] leading-[38px] left-[542px] not-italic opacity-[0.99] text-[22px] text-[rgba(31,41,55,0.6)] top-[19px] tracking-[-0.16px] whitespace-nowrap">
            სამყარო ალფა
          </p>

          {/* World level badge (node 2113:7046) */}
          <div className="absolute border-[#6e6985] border-[1.78px] border-solid flex h-[19.583px] items-center justify-center left-[713px] min-w-[19.583px] px-[7.121px] py-[1.78px] rounded-[8900.613px] top-[30px]">
            <p className="[word-break:break-word] font-['Nunito'] font-bold leading-[14.242px] relative shrink-0 text-[#6e6986] text-[10.682px] tracking-[-0.1424px] whitespace-nowrap">
              დონე I
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoggedInHome;
