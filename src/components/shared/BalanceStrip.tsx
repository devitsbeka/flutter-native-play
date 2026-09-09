import { formatCompactNumber } from "@/lib/utils";

import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

/**
 * The coin / gem balance pills (Figma 1102:4980, 1102:4983).
 *
 * They were written on the game-mode selection screen (CreateRoomPage) and
 * the phone home now carries the same strip in the same place — under the
 * header, above the friends reel — so the two live here rather than as two
 * copies that drift apart. The strip itself (its insets, and whatever else
 * sits on the row, e.g. the Upgrade pill) stays with each screen; this is
 * only the pair of counters.
 */
export function BalancePills({
  coins,
  gems,
  onCoinsClick,
  onGemsClick,
}: {
  coins: number;
  gems: number;
  onCoinsClick: () => void;
  onGemsClick: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCoinsClick}
        className="flex h-[43px] shrink-0 items-center gap-[4px] rounded-[18px] border border-solid border-[#e8e0f5] bg-white/60 pl-[7px] pr-[13px] shadow-[0px_2.94px_0px_0px_#d8d0e8,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px]"
      >
        <img alt="" src={coinIcon} className="h-[32.3px] w-[32.3px] object-contain" />
        <span className="font-[Nunito] text-[16.16px] font-black leading-[25.13px] tracking-[-0.146px] text-[#334155]">
          {formatCompactNumber(coins)}
        </span>
      </button>
      <button
        type="button"
        onClick={onGemsClick}
        className="flex h-[43px] shrink-0 items-center gap-[4px] rounded-[18px] border border-solid border-[#e8e0f5] bg-white/60 pl-[7px] pr-[13px] shadow-[0px_2.94px_0px_0px_#d8d0e8,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px]"
      >
        <img alt="" src={gemIcon} className="h-[32.3px] w-[32.3px] object-contain" />
        <span className="font-[Nunito] text-[16.16px] font-black leading-[25.13px] tracking-[-0.146px] text-[#334155]">
          {formatCompactNumber(gems)}
        </span>
      </button>
    </>
  );
}

export default BalancePills;
