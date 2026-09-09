import { useNavigate } from "react-router-dom";

import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";

import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

/**
 * The coin / gem balance pills (Figma 1102:4980, 1102:4983).
 *
 * Two sizes, because they have two homes. "default" is the Figma size, on
 * the game-mode selection screen's own row (CreateRoomPage), where the pills
 * are the row. "compact" is for the app header, where they share a 76px row
 * with a burger and either a wordmark or a page title: at the full size the
 * pair is 234px of a 358px row, which leaves the title nothing and pushes
 * the home's logo off the end.
 *
 * One component either way — these are the same two numbers, and a second
 * copy of the markup is how the two would drift apart.
 */
const PILL_BASE =
  "flex shrink-0 items-center rounded-[18px] border border-solid border-[#e8e0f5] " +
  "bg-white/60 shadow-[0px_2.94px_0px_0px_#d8d0e8,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)] " +
  "active:translate-y-[1px]";

const SIZES = {
  default: {
    pill: "h-[43px] gap-[4px] pl-[7px] pr-[13px]",
    icon: "h-[32.3px] w-[32.3px]",
    text: "text-[16.16px] leading-[25.13px]",
  },
  compact: {
    pill: "h-[36px] gap-[3px] pl-[5px] pr-[10px]",
    icon: "h-[26px] w-[26px]",
    text: "text-[14px] leading-[20px]",
  },
} as const;

export function BalancePills({
  coins,
  gems,
  onCoinsClick,
  onGemsClick,
  size = "default",
}: {
  coins: number;
  gems: number;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  const label = `font-[Nunito] font-black tracking-[-0.146px] text-[#334155] ${s.text}`;
  return (
    <>
      <button type="button" onClick={onCoinsClick} className={`${PILL_BASE} ${s.pill}`}>
        <img alt="" src={coinIcon} className={`${s.icon} object-contain`} />
        <span className={label}>{formatCompactNumber(coins)}</span>
      </button>
      <button type="button" onClick={onGemsClick} className={`${PILL_BASE} ${s.pill}`}>
        <img alt="" src={gemIcon} className={`${s.icon} object-contain`} />
        <span className={label}>{formatCompactNumber(gems)}</span>
      </button>
    </>
  );
}

export default BalancePills;

/**
 * The balance strip as a row of its own, for the main screens that have no
 * profile card to carry the numbers.
 *
 * The home keeps its balances on the profile card. Explore, the shop and the
 * rating board have nowhere like that, so they hang this under their header
 * (PageHeader's `belowRow`), where it inherits the header's surface and its
 * stickiness — over Explore's cover at rest, on the white the header docks
 * to once the sheet is up, on the page wash everywhere else.
 *
 * The online-game hub is deliberately not one of them: the friends reel is
 * already on that row there, and two strips under one header is a header
 * nobody can see past.
 *
 * Phones only. From md up the row above has the width for the balances a
 * page wants to show (the shop puts its own pills beside the title there),
 * and a full-width band for two numbers is a waste of a screen that size.
 */
export function BalanceStripRow() {
  const { coins, gems } = useCurrency();
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-[11px] pb-[10px] pl-[22px] pr-[18px] pt-[2px] md:hidden">
      <BalancePills
        coins={coins}
        gems={gems}
        onCoinsClick={() => navigate("/power-ups?section=coins")}
        onGemsClick={() => navigate("/power-ups?section=gems-lari")}
      />
    </div>
  );
}
